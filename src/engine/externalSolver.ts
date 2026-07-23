/**
 * Lazy adapter around the `nonogram-solver` npm package.
 * Their cell codes: 0 = unknown, 1 = filled, -1 = empty.
 * Ours:           0 = undecided, 1 = filled, 2 = cross.
 *
 * Loaded on demand so the main game bundle stays lean.
 */
import type { CellValue, PuzzleDefinition } from '@/engine/types'
import { deriveClues } from '@/engine/grid'

export type ExternalSolveStatus = 'solved' | 'stuck' | 'contradiction'

export interface ExternalSolveResult {
  status: ExternalSolveStatus
  snapshot: number[]
}

interface ExternalPuzzle {
  snapshot: number[]
  isFinished: boolean
  isSolved: boolean
}

type PuzzleClass = new (data: {
  rows: number[][]
  columns: number[][]
  content?: number[]
}) => ExternalPuzzle

type StrategyClass = new (solvers: unknown[]) => {
  solve: (puzzle: ExternalPuzzle, withTrial?: boolean) => void
}

let loaded:
  | {
      Puzzle: PuzzleClass
      Strategy: StrategyClass
      allSolvers: unknown[]
    }
  | null = null

async function loadSolver() {
  if (loaded) return loaded
  const [{ default: Puzzle }, { default: Strategy }, { default: allSolvers }] =
    await Promise.all([
      import('nonogram-solver/src/Puzzle.js'),
      import('nonogram-solver/src/Strategy.js'),
      import('nonogram-solver/src/allSolvers.js'),
    ])
  loaded = {
    Puzzle: Puzzle as unknown as PuzzleClass,
    Strategy: Strategy as unknown as StrategyClass,
    allSolvers: allSolvers as unknown[],
  }
  return loaded
}

function normalizeHints(hints: number[][]): number[][] {
  return hints.map((h) => {
    if (h.length === 1 && h[0] === 0) return []
    return h.slice()
  })
}

export function toExternalContent(grid: CellValue[]): number[] {
  return grid.map((v) => {
    if (v === 1) return 1
    if (v === 2) return -1
    return 0
  })
}

export function fromExternalSnapshot(snapshot: number[]): CellValue[] {
  return snapshot.map((v) => {
    if (v === 1) return 1
    if (v === -1) return 2
    return 0
  })
}

export async function runExternalSolver(
  rows: number[][],
  columns: number[][],
  content?: number[],
  withTrialAndError = true,
): Promise<ExternalSolveResult> {
  const { Puzzle, Strategy, allSolvers } = await loadSolver()
  const puzzle = new Puzzle({
    rows: normalizeHints(rows),
    columns: normalizeHints(columns),
    content,
  })
  const strategy = new Strategy(allSolvers)
  strategy.solve(puzzle, withTrialAndError)

  if (puzzle.isFinished) {
    return {
      status: puzzle.isSolved ? 'solved' : 'contradiction',
      snapshot: puzzle.snapshot.slice(),
    }
  }
  return { status: 'stuck', snapshot: puzzle.snapshot.slice() }
}

export async function areCluesSolvable(
  rows: number[][],
  columns: number[][],
): Promise<boolean> {
  const result = await runExternalSolver(rows, columns)
  return result.status === 'solved'
}

export async function isPartialContradictory(
  puzzle: PuzzleDefinition,
  grid: CellValue[],
): Promise<boolean> {
  const { rows, cols } = deriveClues(puzzle.solution, puzzle.size)
  const result = await runExternalSolver(
    rows,
    cols,
    toExternalContent(grid),
    true,
  )
  return result.status === 'contradiction'
}

export async function validatePuzzleWithExternalSolver(
  puzzle: PuzzleDefinition,
): Promise<{ ok: boolean; reason?: string }> {
  const { rows, cols } = deriveClues(puzzle.solution, puzzle.size)
  try {
    const result = await runExternalSolver(rows, cols)
    if (result.status === 'contradiction') {
      return { ok: false, reason: 'clues contradict' }
    }
    if (result.status === 'stuck') {
      return { ok: true }
    }
    for (let i = 0; i < puzzle.solution.length; i += 1) {
      const want = puzzle.solution[i] === 1 ? 1 : -1
      const got = result.snapshot[i]
      if (got !== 0 && got !== want) {
        return { ok: false, reason: 'solver disagrees with solution' }
      }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'solver failed',
    }
  }
}

/**
 * Apply forced logical deductions for the current grid only.
 * Called explicitly from the Logic button — never on load or every move.
 * Trial-and-error is off so it does not auto-solve the whole puzzle.
 */
export async function applySolverDeductions(
  puzzle: PuzzleDefinition,
  grid: CellValue[],
): Promise<{ grid: CellValue[]; changed: number }> {
  const { rows, cols } = deriveClues(puzzle.solution, puzzle.size)
  const result = await runExternalSolver(
    rows,
    cols,
    toExternalContent(grid),
    false,
  )
  if (result.status === 'contradiction') {
    return { grid: grid.slice(), changed: 0 }
  }

  const next = grid.slice() as CellValue[]
  let changed = 0
  for (let i = 0; i < result.snapshot.length; i += 1) {
    const v = result.snapshot[i]!
    if (v === 1 && next[i] === 0) {
      next[i] = 1
      changed += 1
    } else if (v === -1 && next[i] === 0) {
      next[i] = 2
      changed += 1
    }
  }
  return { grid: next, changed }
}

export { isMoveIncorrect } from '@/engine/moveCheck'
