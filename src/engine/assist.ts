import type { CellValue } from './types'
import { isEmptyMark } from './types'

/**
 * Which clue numbers are satisfied enough to strike through.
 * Matches completed (bounded) runs from both ends using fills + X marks.
 */
export function struckClueFlags(
  clues: number[],
  cells: CellValue[],
): boolean[] {
  if (clues.length === 1 && clues[0] === 0) {
    return cells.every((c) => c !== 1) && cells.every((c) => c !== 0)
      ? [true]
      : [false]
  }

  const struck = clues.map(() => false)
  if (clues.every((c) => c === 0)) return struck

  // Fully marked line that matches clues → strike all
  if (cells.every((c) => c !== 0) && lineMatchesClues(cells, clues)) {
    return clues.map(() => true)
  }

  const n = cells.length

  // Forward: consume clues from the left when runs are locked by edge/X
  {
    let clueIndex = 0
    let i = 0
    while (i < n && clueIndex < clues.length) {
      const cell = cells[i]!
      if (cell === 0) break
      if (isEmptyMark(cell)) {
        i += 1
        continue
      }
      const start = i
      let run = 0
      while (i < n && cells[i] === 1) {
        run += 1
        i += 1
      }
      const leftOk = start === 0 || isEmptyMark(cells[start - 1]!)
      const rightOk = i === n || isEmptyMark(cells[i]!)
      if (!leftOk || !rightOk) break
      if (run === clues[clueIndex]) {
        struck[clueIndex] = true
        clueIndex += 1
      } else {
        break
      }
    }
  }

  // Reverse: consume clues from the right
  {
    let clueIndex = clues.length - 1
    let i = n - 1
    while (i >= 0 && clueIndex >= 0) {
      const cell = cells[i]!
      if (cell === 0) break
      if (isEmptyMark(cell)) {
        i -= 1
        continue
      }
      const end = i
      let run = 0
      while (i >= 0 && cells[i] === 1) {
        run += 1
        i -= 1
      }
      const rightOk = end === n - 1 || isEmptyMark(cells[end + 1]!)
      const leftOk = i < 0 || isEmptyMark(cells[i]!)
      if (!leftOk || !rightOk) break
      if (run === clues[clueIndex]) {
        struck[clueIndex] = true
        clueIndex -= 1
      } else {
        break
      }
    }
  }

  return struck
}

/** Fill remaining unknowns with crosses when a line is fully solved. */
export function autoMarkCompletedLine(
  cells: CellValue[],
  clues: number[],
): CellValue[] | null {
  if (cells.some((c) => c === 0) === false) return null
  const filledOnly = cells.map((c) => (c === 1 ? 1 : c === 0 ? 0 : 0))
  // Check if known fills already force completion when empties become crosses
  const trial = cells.map((c) => (c === 0 ? 2 : c)) as CellValue[]
  if (!lineMatchesClues(trial, clues)) return null
  // Also require that every fill is already placed (no new fills invented)
  if (trial.some((c, i) => c === 1 && filledOnly[i] !== 1 && cells[i] === 0)) {
    return null
  }
  const knownFills = cells.filter((c) => c === 1).length
  const needed = clues.reduce((a, b) => a + b, 0)
  if (knownFills !== needed) return null
  if (!lineMatchesClues(trial, clues)) return null
  let changed = false
  const next = cells.slice() as CellValue[]
  for (let i = 0; i < next.length; i += 1) {
    if (next[i] === 0) {
      next[i] = 2
      changed = true
    }
  }
  return changed ? next : null
}

function lineMatchesClues(cells: CellValue[], clues: number[]): boolean {
  const runs: number[] = []
  let run = 0
  for (const cell of cells) {
    if (cell === 1) run += 1
    else if (run > 0) {
      runs.push(run)
      run = 0
    }
  }
  if (run > 0) runs.push(run)
  const actual = runs.length ? runs : [0]
  if (actual.length !== clues.length) return false
  return actual.every((v, i) => v === clues[i])
}

/** First empty cell that should be filled (solution=1), else first that should be crossed. */
export function findHintCell(
  grid: CellValue[],
  solution: number[],
): { index: number; value: 1 | 2 } | null {
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === 0 && solution[i] === 1) return { index: i, value: 1 }
  }
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === 0 && solution[i] !== 1) return { index: i, value: 2 }
  }
  return null
}

export function findFirstError(
  grid: CellValue[],
  solution: number[],
): { index: number; expected: 0 | 1 } | null {
  for (let i = 0; i < grid.length; i += 1) {
    const cell = grid[i]!
    const sol = solution[i]! === 1 ? 1 : 0
    if (cell === 1 && sol === 0) return { index: i, expected: 0 }
    if (isEmptyMark(cell) && sol === 1) return { index: i, expected: 1 }
  }
  return null
}
