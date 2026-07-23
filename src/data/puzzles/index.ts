import type { PuzzleDefinition } from '@/engine/types'

/** Sizes offered in Play / Library. (30×30 is daily-only.) */
export const LIBRARY_SIZES = [10, 15, 20, 25] as const

/**
 * Max puzzles exposed per size in Play / Library.
 * Full pack stays loaded; raise this (e.g. +20) later to unlock more without re-importing.
 */
export const LIBRARY_PER_SIZE = 20

/** Full catalog for library sizes (all puzzles kept; exposure capped by LIBRARY_PER_SIZE). */
let libraryCatalog: PuzzleDefinition[] = []
/** All 30×30 (+ any non-library sizes) — Daily Challenge only. */
let dailyPool: PuzzleDefinition[] = []

function exposeLibrary(puzzles: PuzzleDefinition[]): PuzzleDefinition[] {
  return LIBRARY_SIZES.flatMap((size) =>
    puzzles.filter((p) => p.size === size).slice(0, LIBRARY_PER_SIZE),
  )
}

export function setPuzzlekitCatalog(allSquare: PuzzleDefinition[]): void {
  const sorted = [...allSquare].sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size
    return a.id.localeCompare(b.id)
  })

  const bySize = new Map<number, PuzzleDefinition[]>()
  for (const puzzle of sorted) {
    const list = bySize.get(puzzle.size) ?? []
    list.push(puzzle)
    bySize.set(puzzle.size, list)
  }

  const nextCatalog: PuzzleDefinition[] = []
  const nextDaily: PuzzleDefinition[] = []

  // Keep every 10 / 15 / 20 / 25 puzzle in catalog; UI exposes LIBRARY_PER_SIZE each.
  for (const size of LIBRARY_SIZES) {
    const list = bySize.get(size) ?? []
    list.forEach((puzzle, index) => {
      nextCatalog.push({
        ...puzzle,
        name: String(index + 1),
        tags: [...(puzzle.tags ?? []).filter((t) => t !== 'daily'), 'library'],
      })
    })
    bySize.delete(size)
  }

  // Remaining sizes (all 30×30) go entirely into the daily pool
  for (const list of bySize.values()) {
    list.forEach((puzzle, index) => {
      nextDaily.push({
        ...puzzle,
        name: String(index + 1),
        tags: [...(puzzle.tags ?? []).filter((t) => t !== 'library'), 'daily'],
      })
    })
  }

  libraryCatalog = nextCatalog
  dailyPool = nextDaily
}

/** Exposed library puzzles only (capped per size). */
export function getLibraryPuzzles(): PuzzleDefinition[] {
  return exposeLibrary(libraryCatalog)
}

export function getDailyPool(): PuzzleDefinition[] {
  return dailyPool
}

export function getAllPlayablePuzzles(): PuzzleDefinition[] {
  return [...getLibraryPuzzles(), ...dailyPool]
}

export function getPuzzleById(id: string): PuzzleDefinition | undefined {
  return (
    libraryCatalog.find((p) => p.id === id) ??
    dailyPool.find((p) => p.id === id)
  )
}

export type SizeFolderId = `size-${number}`

export interface SizeFolder {
  id: SizeFolderId
  size: number
  name: string
  description: string
}

export function getSizeFolders(): SizeFolder[] {
  return LIBRARY_SIZES.map((size) => ({
    id: `size-${size}` as SizeFolderId,
    size,
    name: `${size}×${size}`,
    description: `${getPuzzlesInFolder(`size-${size}`).length} puzzles`,
  })).filter((folder) => getPuzzlesInFolder(folder.id).length > 0)
}

export function getFolderById(id: string): SizeFolder | undefined {
  return getSizeFolders().find((f) => f.id === id)
}

export function getPuzzlesInFolder(folderId: string): PuzzleDefinition[] {
  const match = /^size-(\d+)$/.exec(folderId)
  if (!match) return []
  const size = Number(match[1])
  if (!(LIBRARY_SIZES as readonly number[]).includes(size)) return []
  return libraryCatalog
    .filter((p) => p.size === size)
    .sort((a, b) => Number(a.name) - Number(b.name))
    .slice(0, LIBRARY_PER_SIZE)
}

/** Next unsolved puzzle in the same size pack (after current, wrapping), or null. */
export function getNextLibraryPuzzle(
  currentId: string,
  isCompleted: (id: string) => boolean,
): PuzzleDefinition | null {
  const current = getPuzzleById(currentId)
  if (!current) return null
  if (!(LIBRARY_SIZES as readonly number[]).includes(current.size)) return null
  const pack = getPuzzlesInFolder(`size-${current.size}`)
  if (!pack.length) return null
  const idx = pack.findIndex((p) => p.id === currentId)
  const start = idx >= 0 ? idx + 1 : 0
  for (let step = 0; step < pack.length; step += 1) {
    const puzzle = pack[(start + step) % pack.length]!
    if (puzzle.id === currentId) continue
    if (!isCompleted(puzzle.id)) return puzzle
  }
  return null
}

export function getAllPuzzles(): PuzzleDefinition[] {
  return getAllPlayablePuzzles()
}

export function getExternalPuzzleCount(): number {
  return libraryCatalog.length + dailyPool.length
}

export function setExternalPuzzles(puzzles: PuzzleDefinition[]): void {
  setPuzzlekitCatalog(puzzles)
}
