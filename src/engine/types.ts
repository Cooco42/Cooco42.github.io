export type CellValue = 0 | 1 | 2 // empty | filled | cross

export type ToolMode = 'fill' | 'cross' | 'erase' | 'pan'

export type Difficulty =
  | 'beginner'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface PuzzleMeta {
  id: string
  name: string
  difficulty: Difficulty
  size: number
  tags?: string[]
  estimatedMinutes?: number
}

export interface PuzzleDefinition extends PuzzleMeta {
  /** Row-major solution: 1 = filled, 0 = empty */
  solution: number[]
}

export interface PuzzleProgress {
  puzzleId: string
  grid: CellValue[]
  startedAt: number
  updatedAt: number
  completedAt: number | null
  mistakes: number
  hintsUsed: number
  elapsedMs: number
  lockedCells?: boolean[]
  /** When this progress is for a Daily calendar day (YYYY-MM-DD). */
  dailyDateKey?: string | null
}

export interface DailyRecord {
  dateKey: string // YYYY-MM-DD
  puzzleId: string
  completed: boolean
  completedAt: number | null
}

export interface UserStats {
  puzzlesCompleted: number
  totalPlayMs: number
  currentStreak: number
  bestStreak: number
  lastDailyDate: string | null
  completedByDifficulty: Record<Difficulty, number>
}

export interface UserProfile {
  id: string
  email: string
  name: string
  picture?: string
  lastSyncedAt: number | null
}

export interface AppSettings {
  theme: ThemeMode
  sound: boolean
  haptics: boolean
  showTimer: boolean
  confirmReset: boolean
  autoMarkComplete: boolean
  strikeClues: boolean
}

export interface HintMove {
  row: number
  col: number
  value: CellValue
}

export type HintLevel = 1 | 2 | 3

export interface HintResult {
  level: HintLevel
  title: string
  explanation: string
  move: HintMove
  technique: string
}

export interface LineAnalysis {
  index: number
  axis: 'row' | 'col'
  clues: number[]
  cells: CellValue[]
}

export function isEmptyMark(value: CellValue): boolean {
  return value === 2
}

export function isKnownEmpty(value: CellValue): boolean {
  return value === 2
}

/** Normalize legacy saves that used dots (3) into crosses (2). */
export function normalizeGrid(grid: number[]): CellValue[] {
  return grid.map((cell) => {
    if (cell === 1) return 1
    if (cell === 2 || cell === 3) return 2
    return 0
  })
}
