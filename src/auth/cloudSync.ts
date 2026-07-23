import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { getFirestoreDb, isFirebaseConfigured } from '@/auth/firebase'
import type { PuzzleProgress, UserStats } from '@/engine/types'
import { normalizeGrid } from '@/engine/types'

function userProgressCol(uid: string) {
  const db = getFirestoreDb()
  if (!db) return null
  return collection(db, 'users', uid, 'progress')
}

function userStatsDoc(uid: string) {
  const db = getFirestoreDb()
  if (!db) return null
  return doc(db, 'users', uid, 'meta', 'stats')
}

export async function pullCloudSave(uid: string): Promise<{
  progress: PuzzleProgress[]
  stats: UserStats | null
}> {
  if (!isFirebaseConfigured()) return { progress: [], stats: null }
  const progressCol = userProgressCol(uid)
  const statsRef = userStatsDoc(uid)
  if (!progressCol || !statsRef) return { progress: [], stats: null }

  const [progressSnap, statsSnap] = await Promise.all([
    getDocs(progressCol),
    getDoc(statsRef),
  ])

  const progress: PuzzleProgress[] = progressSnap.docs.map((d) => {
    const data = d.data() as PuzzleProgress
    return {
      ...data,
      puzzleId: data.puzzleId || d.id,
      grid: normalizeGrid(data.grid ?? []),
    }
  })

  const stats = statsSnap.exists() ? (statsSnap.data() as UserStats) : null
  return { progress, stats }
}

export async function pushProgressCloud(
  uid: string,
  progress: PuzzleProgress,
): Promise<void> {
  const progressCol = userProgressCol(uid)
  if (!progressCol) return
  await setDoc(doc(progressCol, progress.puzzleId), progress, { merge: true })
}

export async function pushStatsCloud(uid: string, stats: UserStats): Promise<void> {
  const statsRef = userStatsDoc(uid)
  if (!statsRef) return
  await setDoc(statsRef, stats, { merge: true })
}

/** Merge local + cloud by newest updatedAt / completedAt preference. */
export function mergeProgressMaps(
  local: Record<string, PuzzleProgress>,
  remote: PuzzleProgress[],
): Record<string, PuzzleProgress> {
  const out = { ...local }
  for (const item of remote) {
    const existing = out[item.puzzleId]
    if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      out[item.puzzleId] = item
    }
  }
  return out
}

export function mergeStats(local: UserStats, remote: UserStats | null): UserStats {
  if (!remote) return local
  return {
    puzzlesCompleted: Math.max(local.puzzlesCompleted, remote.puzzlesCompleted),
    totalPlayMs: Math.max(local.totalPlayMs, remote.totalPlayMs),
    currentStreak: Math.max(local.currentStreak, remote.currentStreak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    lastDailyDate:
      (local.lastDailyDate ?? '') >= (remote.lastDailyDate ?? '')
        ? local.lastDailyDate
        : remote.lastDailyDate,
    completedByDifficulty: {
      beginner: Math.max(
        local.completedByDifficulty.beginner,
        remote.completedByDifficulty.beginner,
      ),
      easy: Math.max(local.completedByDifficulty.easy, remote.completedByDifficulty.easy),
      medium: Math.max(
        local.completedByDifficulty.medium,
        remote.completedByDifficulty.medium,
      ),
      hard: Math.max(local.completedByDifficulty.hard, remote.completedByDifficulty.hard),
      expert: Math.max(
        local.completedByDifficulty.expert,
        remote.completedByDifficulty.expert,
      ),
    },
  }
}

/** Upload all local progress + stats after sign-in. */
export async function pushAllCloud(
  uid: string,
  progressMap: Record<string, PuzzleProgress>,
  stats: UserStats,
): Promise<void> {
  const db = getFirestoreDb()
  const progressCol = userProgressCol(uid)
  if (!db || !progressCol) return

  const entries = Object.values(progressMap)
  const chunk = 400
  for (let i = 0; i < entries.length; i += chunk) {
    const batch = writeBatch(db)
    for (const p of entries.slice(i, i + chunk)) {
      batch.set(doc(progressCol, p.puzzleId), p, { merge: true })
    }
    await batch.commit()
  }
  await pushStatsCloud(uid, stats)
}
