import { create } from 'zustand'
import { differenceInCalendarDays, subDays } from 'date-fns'
import {
  defaultSettings,
  defaultStats,
  getAllDailyRecords,
  getAllProgress,
  getContinueProgress,
  loadProfile,
  loadSettings,
  loadStats,
  saveDailyRecord,
  saveProfile,
  saveProgress,
  saveSettings,
  saveStats,
  clearAllUserData,
  clearProfile,
  bumpDifficultyCount,
} from '@/db'
import {
  mergeProgressMaps,
  mergeStats,
  pullCloudSave,
  pushAllCloud,
  pushProgressCloud,
  pushStatsCloud,
} from '@/auth/cloudSync'
import { isFirebaseConfigured } from '@/auth/firebase'
import {
  dateFromDateKey,
  dateKeyFromDate,
  getDailyPuzzle,
  getDailyPuzzleId,
  isDailyDatePlayable,
} from '@/data/daily'
import { PuzzlekitNonogramLoader } from '@/data/loaders/PuzzlekitNonogramLoader'
import { getPuzzleById, setExternalPuzzles } from '@/data/puzzles'
import { createEmptyGrid, isPuzzleSolved } from '@/engine/grid'
import type {
  AppSettings,
  CellValue,
  DailyRecord,
  PuzzleProgress,
  UserProfile,
  UserStats,
} from '@/engine/types'

interface AppState {
  ready: boolean
  settings: AppSettings
  stats: UserStats
  profile: UserProfile | null
  progressMap: Record<string, PuzzleProgress>
  dailyRecords: Record<string, DailyRecord>
  continueId: string | null
  hydrate: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  upsertProgress: (progress: PuzzleProgress) => Promise<void>
  completePuzzle: (
    puzzleId: string,
    grid: CellValue[],
    elapsedMs: number,
    hintsUsed: number,
    dailyDateKey?: string | null,
  ) => Promise<void>
  setProfile: (profile: UserProfile | null) => Promise<void>
  resetData: () => Promise<void>
}

async function syncFromCloud(
  profile: UserProfile,
  localProgress: Record<string, PuzzleProgress>,
  localStats: UserStats,
): Promise<{ progressMap: Record<string, PuzzleProgress>; stats: UserStats }> {
  if (!isFirebaseConfigured()) {
    return { progressMap: localProgress, stats: localStats }
  }
  try {
    const remote = await pullCloudSave(profile.id)
    const progressMap = mergeProgressMaps(localProgress, remote.progress)
    const stats = mergeStats(localStats, remote.stats)
    await pushAllCloud(profile.id, progressMap, stats)
    for (const p of Object.values(progressMap)) {
      await saveProgress(p)
    }
    await saveStats(stats)
    return { progressMap, stats }
  } catch (error) {
    console.warn('[Nonogram] Cloud sync failed:', error)
    return { progressMap: localProgress, stats: localStats }
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  stats: defaultStats(),
  profile: null,
  progressMap: {},
  dailyRecords: {},
  continueId: null,

  hydrate: async () => {
    try {
      const imported = await PuzzlekitNonogramLoader.loadFromUrl()
      setExternalPuzzles(imported)
    } catch (error) {
      console.warn('[Nonogram] Puzzlekit dataset unavailable:', error)
    }

    const [settings, stats, profile, progress, daily] = await Promise.all([
      loadSettings(),
      loadStats(),
      loadProfile(),
      getAllProgress(),
      getAllDailyRecords(),
    ])
    const continueProgress = await getContinueProgress()
    let progressMap = Object.fromEntries(progress.map((p) => [p.puzzleId, p]))
    const dailyRecords = Object.fromEntries(daily.map((d) => [d.dateKey, d]))
    let nextStats = stats
    let nextProfile = profile

    if (profile && isFirebaseConfigured()) {
      const synced = await syncFromCloud(profile, progressMap, stats)
      progressMap = synced.progressMap
      nextStats = synced.stats
      nextProfile = { ...profile, lastSyncedAt: Date.now() }
      await saveProfile(nextProfile)
    }

    set({
      ready: true,
      settings: { ...settings, theme: 'light' },
      stats: nextStats,
      profile: nextProfile,
      progressMap,
      dailyRecords,
      continueId: continueProgress?.puzzleId ?? null,
    })

    applyTheme('light')
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch, theme: 'light' as const }
    await saveSettings(settings)
    set({ settings })
    applyTheme('light')
  },

  upsertProgress: async (progress) => {
    await saveProgress(progress)
    const progressMap = { ...get().progressMap, [progress.puzzleId]: progress }
    set({
      progressMap,
      continueId: progress.completedAt
        ? get().continueId === progress.puzzleId
          ? null
          : get().continueId
        : progress.puzzleId,
    })
    const profile = get().profile
    if (profile && isFirebaseConfigured()) {
      void pushProgressCloud(profile.id, progress).catch((error) =>
        console.warn('[Nonogram] Cloud progress push failed:', error),
      )
    }
  },

  completePuzzle: async (puzzleId, grid, elapsedMs, hintsUsed, dailyDateKey) => {
    const puzzle = getPuzzleById(puzzleId)
    if (!puzzle || !isPuzzleSolved(grid, puzzle)) return

    const existing = get().progressMap[puzzleId]
    const todayKey = dateKeyFromDate()
    const resolvedDailyKey =
      dailyDateKey && isDailyDatePlayable(dailyDateKey)
        ? dailyDateKey
        : existing?.dailyDateKey && isDailyDatePlayable(existing.dailyDateKey)
          ? existing.dailyDateKey
          : getDailyPuzzleId() === puzzleId && isDailyDatePlayable(todayKey)
            ? todayKey
            : null

    const progress: PuzzleProgress = {
      puzzleId,
      grid,
      startedAt: existing?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
      completedAt: Date.now(),
      mistakes: existing?.mistakes ?? 0,
      hintsUsed,
      elapsedMs,
      dailyDateKey: resolvedDailyKey,
    }
    await saveProgress(progress)

    let stats = {
      ...get().stats,
      totalPlayMs: get().stats.totalPlayMs + elapsedMs,
    }
    const alreadyCompleted = Boolean(existing?.completedAt)
    if (!alreadyCompleted) {
      stats = bumpDifficultyCount(stats, puzzle.difficulty)
    }

    let nextDailyRecords = get().dailyRecords

    if (resolvedDailyKey) {
      const dailyPuzzle = getDailyPuzzle(dateFromDateKey(resolvedDailyKey))
      if (dailyPuzzle?.id === puzzleId) {
        const prior = nextDailyRecords[resolvedDailyKey]
        const record: DailyRecord = {
          dateKey: resolvedDailyKey,
          puzzleId,
          completed: true,
          completedAt: prior?.completedAt ?? Date.now(),
        }
        await saveDailyRecord(record)
        nextDailyRecords = { ...nextDailyRecords, [resolvedDailyKey]: record }

        if (resolvedDailyKey === todayKey && !prior?.completed) {
          const yesterdayKey = dateKeyFromDate(subDays(new Date(), 1))
          const last = stats.lastDailyDate
          let currentStreak = 1
          if (last === todayKey) {
            currentStreak = stats.currentStreak
          } else if (
            last === yesterdayKey ||
            (last &&
              differenceInCalendarDays(
                dateFromDateKey(todayKey),
                dateFromDateKey(last),
              ) === 1)
          ) {
            currentStreak = stats.currentStreak + 1
          }
          stats = {
            ...stats,
            currentStreak,
            bestStreak: Math.max(stats.bestStreak, currentStreak),
            lastDailyDate: todayKey,
          }
        }
      }
    }

    await saveStats(stats)
    set({
      stats,
      progressMap: { ...get().progressMap, [puzzleId]: progress },
      dailyRecords: nextDailyRecords,
      continueId: get().continueId === puzzleId ? null : get().continueId,
    })

    const profile = get().profile
    if (profile && isFirebaseConfigured()) {
      void Promise.all([
        pushProgressCloud(profile.id, progress),
        pushStatsCloud(profile.id, stats),
      ]).catch((error) => console.warn('[Nonogram] Cloud complete push failed:', error))
    }
  },

  setProfile: async (profile) => {
    if (!profile) {
      await clearProfile()
      set({ profile: null })
      return
    }

    await saveProfile(profile)
    set({ profile })

    if (!isFirebaseConfigured()) return

    const synced = await syncFromCloud(profile, get().progressMap, get().stats)
    const stamped = { ...profile, lastSyncedAt: Date.now() }
    await saveProfile(stamped)
    set({
      profile: stamped,
      progressMap: synced.progressMap,
      stats: synced.stats,
    })
  },

  resetData: async () => {
    await clearAllUserData()
    set({
      stats: defaultStats(),
      progressMap: {},
      dailyRecords: {},
      continueId: null,
    })
  },
}))

export function applyTheme(_theme: AppSettings['theme'] = 'light') {
  const root = document.documentElement
  root.dataset.theme = 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', '#fdd044')
}

export function startFreshProgress(
  puzzleId: string,
  size: number,
  dailyDateKey?: string | null,
): PuzzleProgress {
  const now = Date.now()
  return {
    puzzleId,
    grid: createEmptyGrid(size),
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    dailyDateKey: dailyDateKey ?? null,
  }
}
