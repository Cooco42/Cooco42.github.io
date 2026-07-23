import type { PuzzleDefinition } from './types'
import { cluesFromLine } from './grid'

/** Validate catalog entries — useful when adding thousands of puzzles later. */
export function assertValidPuzzle(puzzle: PuzzleDefinition): void {
  const { size, solution, id } = puzzle
  if (solution.length !== size * size) {
    throw new Error(`Puzzle ${id}: solution length mismatch`)
  }
  if (solution.some((v) => v !== 0 && v !== 1)) {
    throw new Error(`Puzzle ${id}: solution must be 0/1`)
  }
  for (let r = 0; r < size; r += 1) {
    cluesFromLine(solution.slice(r * size, r * size + size))
  }
}
