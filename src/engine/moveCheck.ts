import type { CellValue, PuzzleDefinition } from '@/engine/types'

/**
 * Fast in-game move check against the published solution.
 * (Does not load the heavy nonogram-solver package.)
 */
export function isMoveIncorrect(
  puzzle: PuzzleDefinition,
  row: number,
  col: number,
  value: CellValue,
): boolean {
  if (value === 0) return false
  const expected = puzzle.solution[row * puzzle.size + col] === 1 ? 1 : 0
  if (value === 1) return expected !== 1
  if (value === 2) return expected !== 0
  return false
}
