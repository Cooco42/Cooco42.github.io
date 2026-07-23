import type { PuzzleDefinition } from '@/engine/types'

/**
 * Guided practice board — 10×10 cottage silhouette (no tip images).
 */
export const TUTORIAL_PUZZLE: PuzzleDefinition = {
  id: 'tutorial-10',
  name: 'Tutorial',
  difficulty: 'beginner',
  size: 10,
  tags: ['tutorial'],
  estimatedMinutes: 5,
  // Simple house — row 4 and row 9 are full (clue 10).
  solution: [
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0,
    0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
    0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
    0, 1, 1, 1, 1, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
    1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
    1, 1, 0, 0, 0, 0, 0, 0, 1, 1,
    1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ],
}

export type TutorialStepId =
  | 'welcome'
  | 'tip-boxes'
  | 'tip-crosses'
  | 'clues'
  | 'fill'
  | 'cross'
  | 'finish'

export interface TutorialStep {
  id: TutorialStepId
  title: string
  body: string
  mode?: 'fill' | 'cross' | 'erase' | 'pan'
  /** Hide the practice board for tip-only slides. */
  hideBoard?: boolean
  /** If set, only these cells may be painted this step (and must become this value). */
  targetCells?: Array<{ row: number; col: number; value: 0 | 1 | 2 }>
  requireComplete?: boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    body: 'Nonograms are picture puzzles. Numbers (clues) say how many filled blocks sit in each row and column. We’ll cover two basic ideas, then practice on a 10×10 board.',
    hideBoard: true,
  },
  {
    id: 'tip-boxes',
    title: 'Simple boxes',
    body: 'On a 10-wide line, clue 10 fills every cell. A box against the edge (or against ✕) often forces the rest of that block inward — nowhere else for it to go.',
    hideBoard: true,
  },
  {
    id: 'tip-crosses',
    title: 'Simple crosses',
    body: 'Mark ✕ where a block can never sit. Once boxes are placed, cross the cells that would make a clue too long or put a block in the wrong gap.',
    hideBoard: true,
  },
  {
    id: 'clues',
    title: 'Read the clues',
    body: 'Practice board (10×10). Look at the numbers above and beside the grid — they describe the finished picture. Row 5 says 10: that whole row must be filled.',
  },
  {
    id: 'fill',
    title: 'Fill tool',
    body: 'Fill mode is on. Paint the entire fifth row (clue 10) — ten filled cells across.',
    mode: 'fill',
    targetCells: Array.from({ length: 10 }, (_, col) => ({
      row: 4,
      col,
      value: 1 as const,
    })),
  },
  {
    id: 'cross',
    title: 'Mark blanks with ✕',
    body: 'Switch to ✕ and mark the eight empty cells at both ends of the top row — cells that cannot be filled for this picture.',
    mode: 'cross',
    targetCells: [
      { row: 0, col: 0, value: 2 },
      { row: 0, col: 1, value: 2 },
      { row: 0, col: 2, value: 2 },
      { row: 0, col: 3, value: 2 },
      { row: 0, col: 6, value: 2 },
      { row: 0, col: 7, value: 2 },
      { row: 0, col: 8, value: 2 },
      { row: 0, col: 9, value: 2 },
    ],
  },
  {
    id: 'finish',
    title: 'Finish the picture',
    body: 'Keep reading the clues to fill boxes and mark empties until the cottage appears. That’s the core loop — Tips & Tricks has more techniques when you’re ready.',
    requireComplete: true,
  },
]
