import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppSettings,
  DailyRecord,
  Difficulty,
  PuzzleProgress,
  UserProfile,
  UserStats,
} from '@/engine/types'

interface SettingsRow {
  id: 'app'
  value: AppSettings
}

interface StatsRow {
  id: 'app'
  value: UserStats
}

interface SyncItem {
  id?: number
  type: string
  payload: unknown
  createdAt: number
}

interface CoachChatRow {
  puzzleId: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    text: string
  }>
  updatedAt: number
}

interface NonogramDB extends DBSchema {
  progress: {
    key: string
    value: PuzzleProgress
    indexes: { 'by-updated': number }
  }
  daily: {
    key: string
    value: DailyRecord
  }
  settings: {
    key: string
    value: SettingsRow
  }
  stats: {
    key: string
    value: StatsRow
  }
  profile: {
    key: string
    value: UserProfile
  }
  syncQueue: {
    key: number
    value: SyncItem
    indexes: { 'by-created': number }
  }
  coachChats: {
    key: string
    value: CoachChatRow
  }
}

const DB_NAME = 'nonogram-db'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<NonogramDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NonogramDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const progress = db.createObjectStore('progress', { keyPath: 'puzzleId' })
          progress.createIndex('by-updated', 'updatedAt')
          db.createObjectStore('daily', { keyPath: 'dateKey' })
          db.createObjectStore('settings', { keyPath: 'id' })
          db.createObjectStore('stats', { keyPath: 'id' })
          db.createObjectStore('profile', { keyPath: 'id' })
          const sync = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          sync.createIndex('by-created', 'createdAt')
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('coachChats')) {
          db.createObjectStore('coachChats', { keyPath: 'puzzleId' })
        }
      },
    })
  }
  return dbPromise
}

export const defaultSettings: AppSettings = {
  theme: 'light',
  sound: true,
  haptics: true,
  showTimer: false,
  confirmReset: true,
  autoMarkComplete: true,
  strikeClues: true,
}

export const defaultStats = (): UserStats => ({
  puzzlesCompleted: 0,
  totalPlayMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastDailyDate: null,
  completedByDifficulty: {
    beginner: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  },
})

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb()
  const row = await db.get('settings', 'app')
  return { ...defaultSettings, ...(row?.value ?? {}) }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { id: 'app', value: settings })
}

export async function loadStats(): Promise<UserStats> {
  const db = await getDb()
  const row = await db.get('stats', 'app')
  return row?.value ?? defaultStats()
}

export async function saveStats(stats: UserStats): Promise<void> {
  const db = await getDb()
  await db.put('stats', { id: 'app', value: stats })
}

export async function getProgress(
  puzzleId: string,
): Promise<PuzzleProgress | undefined> {
  const db = await getDb()
  return db.get('progress', puzzleId)
}

export async function saveProgress(progress: PuzzleProgress): Promise<void> {
  const db = await getDb()
  await db.put('progress', progress)
  await enqueueSync('progress', progress)
}

export async function getAllProgress(): Promise<PuzzleProgress[]> {
  const db = await getDb()
  return db.getAll('progress')
}

export async function getContinueProgress(): Promise<
  PuzzleProgress | undefined
> {
  const all = await getAllProgress()
  return all
    .filter((p) => !p.completedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

export async function getDailyRecord(
  dateKey: string,
): Promise<DailyRecord | undefined> {
  const db = await getDb()
  return db.get('daily', dateKey)
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const db = await getDb()
  await db.put('daily', record)
  await enqueueSync('daily', record)
}

export async function getAllDailyRecords(): Promise<DailyRecord[]> {
  const db = await getDb()
  return db.getAll('daily')
}

export async function loadProfile(): Promise<UserProfile | null> {
  const db = await getDb()
  const all = await db.getAll('profile')
  return all[0] ?? null
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDb()
  await db.clear('profile')
  await db.put('profile', profile)
}

export async function clearProfile(): Promise<void> {
  const db = await getDb()
  await db.clear('profile')
}

export async function clearAllUserData(): Promise<void> {
  const db = await getDb()
  await db.clear('progress')
  await db.clear('daily')
  await db.clear('stats')
  await db.clear('syncQueue')
  if (db.objectStoreNames.contains('coachChats')) {
    await db.clear('coachChats')
  }
  await saveStats(defaultStats())
}

export async function loadCoachChat(puzzleId: string): Promise<CoachChatRow['messages']> {
  const db = await getDb()
  const row = await db.get('coachChats', puzzleId)
  return row?.messages ?? []
}

export async function saveCoachChat(
  puzzleId: string,
  messages: CoachChatRow['messages'],
): Promise<void> {
  const db = await getDb()
  await db.put('coachChats', {
    puzzleId,
    messages: messages.slice(-80),
    updatedAt: Date.now(),
  })
}

async function enqueueSync(type: string, payload: unknown): Promise<void> {
  const db = await getDb()
  await db.add('syncQueue', { type, payload, createdAt: Date.now() })
}

export async function getSyncQueue() {
  const db = await getDb()
  return db.getAll('syncQueue')
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDb()
  await db.clear('syncQueue')
}

export function bumpDifficultyCount(
  stats: UserStats,
  difficulty: Difficulty,
): UserStats {
  return {
    ...stats,
    puzzlesCompleted: stats.puzzlesCompleted + 1,
    completedByDifficulty: {
      ...stats.completedByDifficulty,
      [difficulty]: stats.completedByDifficulty[difficulty] + 1,
    },
  }
}
