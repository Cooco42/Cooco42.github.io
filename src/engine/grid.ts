import type { CellValue, PuzzleDefinition } from './types'

export function createEmptyGrid(size: number): CellValue[] {
  return Array.from({ length: size * size }, () => 0)
}

export function cloneGrid(grid: CellValue[]): CellValue[] {
  return grid.slice()
}

export function indexOf(row: number, col: number, size: number): number {
  return row * size + col
}

export function getRow(grid: CellValue[], row: number, size: number): CellValue[] {
  const start = row * size
  return grid.slice(start, start + size)
}

export function getCol(grid: CellValue[], col: number, size: number): CellValue[] {
  const cells: CellValue[] = []
  for (let row = 0; row < size; row += 1) {
    cells.push(grid[indexOf(row, col, size)]!)
  }
  return cells
}

export function setRow(
  grid: CellValue[],
  row: number,
  size: number,
  values: CellValue[],
): CellValue[] {
  const next = cloneGrid(grid)
  for (let col = 0; col < size; col += 1) {
    next[indexOf(row, col, size)] = values[col]!
  }
  return next
}

export function setCol(
  grid: CellValue[],
  col: number,
  size: number,
  values: CellValue[],
): CellValue[] {
  const next = cloneGrid(grid)
  for (let row = 0; row < size; row += 1) {
    next[indexOf(row, col, size)] = values[row]!
  }
  return next
}

/** Derive nonogram clues from a binary solution row/col. */
export function cluesFromLine(line: number[]): number[] {
  const clues: number[] = []
  let run = 0
  for (const cell of line) {
    if (cell === 1) {
      run += 1
    } else if (run > 0) {
      clues.push(run)
      run = 0
    }
  }
  if (run > 0) clues.push(run)
  return clues.length > 0 ? clues : [0]
}

export function deriveClues(solution: number[], size: number): {
  rows: number[][]
  cols: number[][]
} {
  const rows: number[][] = []
  const cols: number[][] = []

  for (let r = 0; r < size; r += 1) {
    rows.push(cluesFromLine(solution.slice(r * size, r * size + size)))
  }

  for (let c = 0; c < size; c += 1) {
    const col: number[] = []
    for (let r = 0; r < size; r += 1) {
      col.push(solution[r * size + c]!)
    }
    cols.push(cluesFromLine(col))
  }

  return { rows, cols }
}

export function lineRuns(cells: CellValue[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const cell of cells) {
    if (cell === 1) {
      run += 1
    } else if (run > 0) {
      runs.push(run)
      run = 0
    }
  }
  if (run > 0) runs.push(run)
  return runs.length > 0 ? runs : cells.every((c) => c !== 0) ? [0] : []
}

export function isLineComplete(cells: CellValue[], clues: number[]): boolean {
  if (cells.some((c) => c === 0)) return false
  const filled = cells.map((c) => (c === 1 ? 1 : 0))
  const actual = cluesFromLine(filled)
  if (actual.length !== clues.length) return false
  return actual.every((v, i) => v === clues[i])
}

export function isPuzzleSolved(
  grid: CellValue[],
  puzzle: PuzzleDefinition,
): boolean {
  if (grid.length !== puzzle.solution.length) return false
  for (let i = 0; i < grid.length; i += 1) {
    const expected = puzzle.solution[i] === 1 ? 1 : 0
    const actual = grid[i] === 1 ? 1 : 0
    if (expected !== actual) return false
  }
  return true
}

export function countFilled(grid: CellValue[]): number {
  let count = 0
  for (const cell of grid) if (cell === 1) count += 1
  return count
}

export function solutionFilledCount(solution: number[]): number {
  return solution.reduce((acc, cell) => acc + (cell === 1 ? 1 : 0), 0)
}
