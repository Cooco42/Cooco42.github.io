import { format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'
import { getDailyPool } from '@/data/puzzles'
import type { PuzzleDefinition } from '@/engine/types'

/** First calendar day a 30×30 daily is playable (device-local). */
export const DAILY_EPOCH = '2026-07-22'

export function dateKeyFromDate(date = new Date()): string {
  return format(startOfDay(date), 'yyyy-MM-dd')
}

export function dateFromDateKey(dateKey: string): Date {
  return startOfDay(parseISO(dateKey))
}

export function getDailyEpochDate(): Date {
  return dateFromDateKey(DAILY_EPOCH)
}

/** True for epoch ≤ date ≤ today (local). Future and pre-epoch are locked. */
export function isDailyDatePlayable(date: Date | string): boolean {
  const day = typeof date === 'string' ? dateFromDateKey(date) : startOfDay(date)
  const epoch = getDailyEpochDate()
  const today = startOfDay(new Date())
  if (isBefore(day, epoch)) return false
  if (isAfter(day, today)) return false
  return true
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Daily puzzles come only from the 30×30 daily pool — never from the Library.
 * Deterministic date → puzzle (offline). Returns null if pack not loaded,
 * date is before DAILY_EPOCH, or date is in the future.
 */
export function getDailyPuzzle(date = new Date()): PuzzleDefinition | null {
  if (!isDailyDatePlayable(date)) return null
  const pool = getDailyPool()
  const size30 = pool.filter((p) => p.size === 30)
  const active = size30.length > 0 ? size30 : pool
  if (active.length === 0) return null
  const key = dateKeyFromDate(date)
  const index = hashString(`nonogram-daily-pool:${key}`) % active.length
  return active[index]!
}

export function getDailyPuzzleId(date = new Date()): string | null {
  return getDailyPuzzle(date)?.id ?? null
}
