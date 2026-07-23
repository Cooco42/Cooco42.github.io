import type { Difficulty, PuzzleDefinition } from '@/engine/types'
import { deriveClues } from '@/engine/grid'

/** Raw puzzlekit Nonogram dataset root. */
export interface PuzzlekitNonogramDataset {
  count: number
  count_sol: number
  name: string
  data: Record<string, PuzzlekitNonogramEntry>
}

export interface PuzzlekitNonogramEntry {
  problem: string
  solution: string
  source?: string
  info?: string
}

export interface ParsedNonogramHints {
  height: number
  width: number
  /** Row clues top→bottom */
  rowClues: number[][]
  /** Column clues left→right */
  colClues: number[][]
}

export interface ParsedNonogramSolution {
  height: number
  width: number
  /** Row-major 0/1 solution */
  grid: number[]
}

/**
 * Loads puzzlekit Nonogram JSON and converts entries into our PuzzleDefinition format.
 *
 * Dataset problem layout (verified against solutions):
 *   line 1: `<rows> <cols>`
 *   next `cols` lines: column clues (left → right)
 *   next `rows` lines: row clues (top → bottom)
 *
 * Solution cells: `x` = filled, `-` = empty.
 */
export class PuzzlekitNonogramLoader {
  static readonly DEFAULT_ASSET_PATH = '/data/nonogram.json'

  static async loadFromUrl(
    url: string = PuzzlekitNonogramLoader.DEFAULT_ASSET_PATH,
  ): Promise<PuzzleDefinition[]> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to load Nonogram dataset (${response.status}): ${url}`,
      )
    }
    const raw = (await response.json()) as PuzzlekitNonogramDataset
    return PuzzlekitNonogramLoader.parseDataset(raw)
  }

  static parseDataset(
    raw: PuzzlekitNonogramDataset,
    options: { validateHints?: boolean } = {},
  ): PuzzleDefinition[] {
    const validateHints = options.validateHints ?? true
    const puzzles: PuzzleDefinition[] = []
    let skipped = 0
    for (const [id, entry] of Object.entries(raw.data ?? {})) {
      if (!entry?.solution?.trim()) {
        skipped += 1
        continue
      }
      try {
        puzzles.push(
          PuzzlekitNonogramLoader.convertEntry(id, entry, { validateHints }),
        )
      } catch {
        skipped += 1
      }
    }
    if (skipped > 0) {
      console.info(
        `[PuzzlekitNonogramLoader] loaded ${puzzles.length}, skipped ${skipped} (missing solution or non-square)`,
      )
    }
    return puzzles.sort((a, b) => a.size - b.size || a.name.localeCompare(b.name))
  }

  static convertEntry(
    id: string,
    entry: PuzzlekitNonogramEntry,
    options: { validateHints?: boolean } = {},
  ): PuzzleDefinition {
    const solution = PuzzlekitNonogramLoader.parseSolution(entry.solution)
    const hints = PuzzlekitNonogramLoader.parseProblem(entry.problem)

    if (hints.height !== solution.height || hints.width !== solution.width) {
      throw new Error(
        `Size mismatch for ${id}: problem ${hints.height}x${hints.width} vs solution ${solution.height}x${solution.width}`,
      )
    }

    if (hints.height !== hints.width) {
      throw new Error(
        `Non-square puzzle ${id} (${hints.height}x${hints.width}) is not supported yet`,
      )
    }

    if (options.validateHints ?? true) {
      PuzzlekitNonogramLoader.assertHintsMatchSolution(hints, solution.grid)
    }

    const size = solution.height
    const difficulty = PuzzlekitNonogramLoader.difficultyForSize(size)
    const shortId = id.replace(/[^\w.-]+/g, '-')

    return {
      id: `pk-${shortId}`,
      name: shortId,
      difficulty,
      size,
      tags: ['puzzlekit', `size-${size}`],
      estimatedMinutes: Math.max(3, Math.round((size * size) / 12)),
      solution: solution.grid,
    }
  }

  /** Parse row/column hint block from a puzzlekit problem string. */
  static parseProblem(problem: string): ParsedNonogramHints {
    const lines = problem.replace(/\r\n/g, '\n').replace(/\s+$/g, '').split('\n')
    if (lines.length < 1) throw new Error('Empty problem')

    const [height, width] = PuzzlekitNonogramLoader.parseSize(lines[0]!)
    const body = lines.slice(1)
    if (body.length !== height + width) {
      throw new Error(
        `Expected ${height + width} clue lines, got ${body.length}`,
      )
    }

    const colClues = body
      .slice(0, width)
      .map((line) => PuzzlekitNonogramLoader.parseClueLine(line))
    const rowClues = body
      .slice(width)
      .map((line) => PuzzlekitNonogramLoader.parseClueLine(line))

    return { height, width, rowClues, colClues }
  }

  /** Parse solution matrix into a row-major 0/1 grid. */
  static parseSolution(solution: string): ParsedNonogramSolution {
    const lines = solution
      .replace(/\r\n/g, '\n')
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 1) throw new Error('Empty solution')
    const [height, width] = PuzzlekitNonogramLoader.parseSize(lines[0]!)
    const rows = lines.slice(1, 1 + height)
    if (rows.length !== height) {
      throw new Error(`Expected ${height} solution rows, got ${rows.length}`)
    }

    const grid: number[] = []
    for (const row of rows) {
      const tokens = row.split(/\s+/).filter(Boolean)
      if (tokens.length !== width) {
        throw new Error(
          `Expected ${width} cells, got ${tokens.length} in “${row}”`,
        )
      }
      for (const token of tokens) {
        if (token === 'x' || token === 'X' || token === '1' || token === '#') {
          grid.push(1)
        } else if (
          token === '-' ||
          token === '.' ||
          token === '0' ||
          token === 'o'
        ) {
          grid.push(0)
        } else {
          throw new Error(`Unknown solution token “${token}”`)
        }
      }
    }

    return { height, width, grid }
  }

  static difficultyForSize(size: number): Difficulty {
    if (size <= 5) return 'beginner'
    if (size <= 10) return 'beginner'
    if (size <= 15) return 'easy'
    if (size <= 20) return 'medium'
    if (size <= 25) return 'hard'
    return 'expert'
  }

  private static parseSize(line: string): [number, number] {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 2) throw new Error(`Invalid size line: ${line}`)
    const height = Number(parts[0])
    const width = Number(parts[1])
    if (!Number.isFinite(height) || !Number.isFinite(width)) {
      throw new Error(`Invalid size line: ${line}`)
    }
    return [height, width]
  }

  private static parseClueLine(line: string): number[] {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '-' || trimmed === '.') return [0]
    const values = trimmed.split(/\s+/).map((part) => {
      const n = Number(part)
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Invalid clue token “${part}”`)
      }
      return n
    })
    if (values.length === 1 && values[0] === 0) return [0]
    return values.filter((n) => n > 0).length ? values.filter((n) => n > 0) : [0]
  }

  private static assertHintsMatchSolution(
    hints: ParsedNonogramHints,
    grid: number[],
  ): void {
    const derived = deriveClues(grid, hints.width)
    if (hints.height !== hints.width) return

    for (let r = 0; r < hints.height; r += 1) {
      if (!sameClues(hints.rowClues[r]!, derived.rows[r]!)) {
        throw new Error(`Row ${r + 1} clues do not match solution`)
      }
    }
    for (let c = 0; c < hints.width; c += 1) {
      if (!sameClues(hints.colClues[c]!, derived.cols[c]!)) {
        throw new Error(`Column ${c + 1} clues do not match solution`)
      }
    }
  }
}

function sameClues(a: number[], b: number[]): boolean {
  const norm = (clues: number[]) =>
    clues.length === 0 || (clues.length === 1 && clues[0] === 0)
      ? [0]
      : clues.filter((n) => n > 0)
  const left = norm(a)
  const right = norm(b)
  return (
    left.length === right.length && left.every((value, i) => value === right[i])
  )
}
