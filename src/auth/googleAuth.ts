import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'
import { clearSyncQueue, getSyncQueue, loadProfile, saveProfile } from '@/db'
import { getFirebaseAuth, isFirebaseConfigured } from '@/auth/firebase'
import type { UserProfile } from '@/engine/types'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          prompt: (cb?: (notification: {
            isNotDisplayed: () => boolean
            isSkippedMoment: () => boolean
          }) => void) => void
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void
          disableAutoSelect: () => void
          revoke: (hint: string, cb: () => void) => void
        }
      }
    }
  }
}

let scriptLoaded = false

function loadGisScript(): Promise<void> {
  if (scriptLoaded || window.google?.accounts?.id) {
    scriptLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

function parseJwt(token: string): Record<string, string> {
  const base64 = token.split('.')[1]
  if (!base64) return {}
  const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json) as Record<string, string>
}

export function isGoogleConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export async function initGoogleAuth(
  onCredential: (profile: UserProfile) => void,
): Promise<boolean> {
  if (!CLIENT_ID) return false
  await loadGisScript()
  window.google?.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response: { credential: string }) => {
      void (async () => {
        const payload = parseJwt(response.credential)
        let uid = payload.sub ?? crypto.randomUUID()

        if (isFirebaseConfigured()) {
          try {
            const auth = getFirebaseAuth()
            if (auth) {
              const cred = GoogleAuthProvider.credential(response.credential)
              const result = await signInWithCredential(auth, cred)
              uid = result.user.uid
            }
          } catch (error) {
            console.warn('[Nonogram] Firebase sign-in failed:', error)
          }
        }

        const profile: UserProfile = {
          id: uid,
          email: payload.email ?? '',
          name: payload.name ?? 'Player',
          picture: payload.picture,
          lastSyncedAt: null,
        }
        onCredential(profile)
      })()
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  })
  return true
}

export function renderGoogleButton(element: HTMLElement): void {
  if (!CLIENT_ID || !window.google?.accounts?.id) return
  element.innerHTML = ''
  window.google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 280,
  })
}

export async function signOutGoogle(email?: string): Promise<void> {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect()
    if (email) {
      await new Promise<void>((resolve) => {
        window.google!.accounts.id.revoke(email, () => resolve())
      })
    }
  }
  const auth = getFirebaseAuth()
  if (auth?.currentUser) {
    await signOut(auth)
  }
}

/** Legacy queue flush — cloud sync now goes through Firestore via appStore. */
export async function flushSyncQueue(): Promise<void> {
  const queue = await getSyncQueue()
  if (queue.length === 0) return

  const endpoint = import.meta.env.VITE_SYNC_ENDPOINT as string | undefined
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: queue }),
      })
    } catch {
      return
    }
  }

  await clearSyncQueue()
  const profile = await loadProfile()
  if (profile) {
    await saveProfile({ ...profile, lastSyncedAt: Date.now() })
  }
}
