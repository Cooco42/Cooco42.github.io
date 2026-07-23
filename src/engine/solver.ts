import type { CellValue } from './types'
import { isEmptyMark } from './types'

/**
 * Generate all placements of clue blocks that are compatible with known cells.
 * Used by the offline solver / AI hint engine.
 */
export function generateValidPlacements(
  clues: number[],
  cells: CellValue[],
): number[][] {
  const n = cells.length
  const placements: number[][] = []

  if (clues.length === 1 && clues[0] === 0) {
    const empty = Array.from({ length: n }, () => 0)
    if (isCompatible(empty, cells)) placements.push(empty)
    return placements
  }

  function place(blockIndex: number, start: number, current: number[]): void {
    if (blockIndex === clues.length) {
      const filled = current.slice()
      for (let i = 0; i < n; i += 1) {
        if (filled[i] === undefined) filled[i] = 0
      }
      if (isCompatible(filled as number[], cells)) {
        placements.push(filled as number[])
      }
      return
    }

    const block = clues[blockIndex]!
    const remainingBlocks = clues.slice(blockIndex + 1)
    const remainingWidth =
      remainingBlocks.reduce((a, b) => a + b, 0) + remainingBlocks.length

    for (let pos = start; pos + block - 1 < n - remainingWidth; pos += 1) {
      const next = current.slice()
      let fits = true
      for (let i = 0; i < block; i += 1) {
        const idx = pos + i
        if (isEmptyMark(cells[idx]!)) {
          fits = false
          break
        }
        next[idx] = 1
      }
      if (!fits) continue

      const after = pos + block
      if (after < n) {
        if (cells[after] === 1) continue
        next[after] = 0
        place(blockIndex + 1, after + 1, next)
      } else {
        place(blockIndex + 1, after, next)
      }
    }
  }

  place(0, 0, Array.from({ length: n }))
  return placements
}

function isCompatible(placement: number[], cells: CellValue[]): boolean {
  for (let i = 0; i < cells.length; i += 1) {
    const known = cells[i]!
    const proposed = placement[i]!
    if (known === 1 && proposed !== 1) return false
    if (isEmptyMark(known) && proposed !== 0) return false
  }
  return true
}

/** Cells that are filled (or empty) in every valid placement. */
export function forcedCellsFromPlacements(
  placements: number[][],
  cells: CellValue[],
): Array<{ index: number; value: CellValue }> {
  if (placements.length === 0) return []
  const forced: Array<{ index: number; value: CellValue }> = []
  const n = cells.length

  for (let i = 0; i < n; i += 1) {
    if (cells[i] !== 0) continue
    const first = placements[0]![i]!
    const allSame = placements.every((p) => p[i] === first)
    if (!allSame) continue
    forced.push({ index: i, value: first === 1 ? 1 : 2 })
  }

  return forced
}

export function overlapForce(
  clues: number[],
  size: number,
): Array<{ index: number; value: 1 }> {
  if (clues.length === 1 && clues[0] === 0) return []
  const total = clues.reduce((a, b) => a + b, 0) + (clues.length - 1)
  if (total > size) return []

  const left = earliestPlacement(clues, size)
  const right = latestPlacement(clues, size)
  const forced: Array<{ index: number; value: 1 }> = []

  for (let i = 0; i < size; i += 1) {
    if (left[i] === 1 && right[i] === 1) {
      forced.push({ index: i, value: 1 })
    }
  }
  return forced
}

function earliestPlacement(clues: number[], size: number): number[] {
  const line = Array.from({ length: size }, () => 0)
  let pos = 0
  for (const block of clues) {
    for (let i = 0; i < block; i += 1) line[pos + i] = 1
    pos += block + 1
  }
  return line
}

function latestPlacement(clues: number[], size: number): number[] {
  const line = Array.from({ length: size }, () => 0)
  let pos = size
  for (let b = clues.length - 1; b >= 0; b -= 1) {
    const block = clues[b]!
    pos -= block
    for (let i = 0; i < block; i += 1) line[pos + i] = 1
    pos -= 1
  }
  return line
}
