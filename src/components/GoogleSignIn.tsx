import { useEffect, useRef, useState } from 'react'
import {
  initGoogleAuth,
  isGoogleConfigured,
  renderGoogleButton,
  signOutGoogle,
} from '@/auth/googleAuth'
import { useAppStore } from '@/store/appStore'

export function GoogleSignIn({ compact = false }: { compact?: boolean }) {
  const profile = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const configured = isGoogleConfigured()

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    void initGoogleAuth((next) => {
      void setProfile(next)
    }).then((ok) => {
      if (!cancelled) setReady(ok)
    })
    return () => {
      cancelled = true
    }
  }, [configured, setProfile])

  useEffect(() => {
    if (!ready || !buttonRef.current || profile) return
    renderGoogleButton(buttonRef.current)
  }, [ready, profile])

  if (profile) {
    return (
      <div className={`google-auth${compact ? ' google-auth--compact' : ''}`}>
        {profile.picture ? (
          <img
            className="google-auth__avatar"
            src={profile.picture}
            alt=""
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="google-auth__avatar google-auth__avatar--fallback">
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        {!compact && (
          <div className="google-auth__meta">
            <strong>{profile.name}</strong>
            <span>{profile.email}</span>
          </div>
        )}
        <button
          type="button"
          className="google-auth__out"
          onClick={() => {
            void signOutGoogle(profile.email).then(() => setProfile(null))
          }}
        >
          Sign out
        </button>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="google-auth google-auth--setup">
        <p className="google-auth__hint">
          To enable Google Sign-In, create an OAuth Client ID in Google Cloud,
          add <code>http://localhost:5173</code> and your LAN URL as authorized
          JavaScript origins, then set <code>VITE_GOOGLE_CLIENT_ID</code> in{' '}
          <code>.env</code> and restart.
        </p>
        <a
          className="btn btn-secondary"
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
        >
          Open Google Cloud
        </a>
      </div>
    )
  }

  return (
    <div className={`google-auth${compact ? ' google-auth--compact' : ''}`}>
      {ready ? (
        <div ref={buttonRef} className="google-auth__button" />
      ) : (
        <p className="google-auth__hint">Loading Google Sign-In…</p>
      )}
    </div>
  )
}
