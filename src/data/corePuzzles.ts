import type { PuzzleDefinition } from '@/engine/types'

function pack(rows: string[]): number[] {
  return rows.flatMap((row) =>
    row.split('').map((ch) => (ch === '#' || ch === '1' ? 1 : 0)),
  )
}

function puzzle(
  partial: Omit<PuzzleDefinition, 'solution' | 'size'> & {
    rows: string[]
  },
): PuzzleDefinition {
  const size = partial.rows.length
  if (partial.rows.some((r) => r.length !== size)) {
    throw new Error(`Puzzle ${partial.id} has inconsistent row lengths`)
  }
  return {
    id: partial.id,
    name: partial.name,
    difficulty: partial.difficulty,
    size,
    tags: partial.tags,
    estimatedMinutes: partial.estimatedMinutes,
    solution: pack(partial.rows),
  }
}

/** Core original black & white puzzles. */
export const CORE_PUZZLES: PuzzleDefinition[] = [
  // —— Beginner 5×5 ——
  puzzle({
    id: 'b5-heart',
    name: 'Heart',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    tags: ['shape'],
    rows: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  }),
  puzzle({
    id: 'b5-plus',
    name: 'Plus',
    difficulty: 'beginner',
    estimatedMinutes: 1,
    tags: ['symbol'],
    rows: ['..#..', '..#..', '#####', '..#..', '..#..'],
  }),
  puzzle({
    id: 'b5-smile',
    name: 'Smile',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    tags: ['face'],
    rows: ['#...#', '.....', '#...#', '.###.', '.....'],
  }),
  puzzle({
    id: 'b5-arrow',
    name: 'Arrow',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    tags: ['symbol'],
    rows: ['..#..', '.###.', '#####', '..#..', '..#..'],
  }),
  puzzle({
    id: 'b5-diamond',
    name: 'Diamond',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    tags: ['shape'],
    rows: ['..#..', '.###.', '#####', '.###.', '..#..'],
  }),

  // —— Beginner 10×10 ——
  puzzle({
    id: 'b10-cat',
    name: 'Sitting Cat',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    tags: ['animal'],
    rows: [
      '##......##',
      '#.#....#.#',
      '##########',
      '#.#.#.#.##',
      '##########',
      '.###..###.',
      '.##....##.',
      '.##....##.',
      '.##....##.',
      '####..####',
    ],
  }),
  puzzle({
    id: 'b10-house',
    name: 'Cottage',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    tags: ['scene'],
    rows: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '##########',
      '##.####.##',
      '##.####.##',
      '##......##',
      '##..##..##',
      '##########',
    ],
  }),
  puzzle({
    id: 'b10-tree',
    name: 'Pine',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    tags: ['nature'],
    rows: [
      '....##....',
      '...####...',
      '..######..',
      '...####...',
      '..######..',
      '.########.',
      '..######..',
      '....##....',
      '....##....',
      '...####...',
    ],
  }),
  puzzle({
    id: 'b10-mug',
    name: 'Coffee Mug',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    tags: ['object'],
    rows: [
      '..######..',
      '.########.',
      '.##....##.',
      '.##....###',
      '.##....#.#',
      '.##....#.#',
      '.##....###',
      '.########.',
      '..######..',
      '..........',
    ],
  }),

  // —— Easy 15×15 ——
  puzzle({
    id: 'e15-swan',
    name: 'Swan',
    difficulty: 'easy',
    estimatedMinutes: 12,
    tags: ['animal'],
    rows: [
      '.......##......',
      '......####.....',
      '......##.##....',
      '......##..##...',
      '......##...##..',
      '......##....##.',
      '.....###.....##',
      '....####.....##',
      '...##.##.....##',
      '..##..##....##.',
      '.##...#######..',
      '##....#####....',
      '#......###.....',
      '........#......',
      '.......###.....',
    ],
  }),
  puzzle({
    id: 'e15-boat',
    name: 'Sailboat',
    difficulty: 'easy',
    estimatedMinutes: 10,
    tags: ['scene'],
    rows: [
      '.......#.......',
      '......##.......',
      '.....###.......',
      '....####.......',
      '...#####.......',
      '..######.......',
      '.#######.......',
      '########.......',
      '.......#.......',
      '.......#.......',
      '.#############.',
      '..###########..',
      '...#########...',
      '...............',
      '..###########..',
    ],
  }),
  puzzle({
    id: 'e15-flower',
    name: 'Bloom',
    difficulty: 'easy',
    estimatedMinutes: 12,
    tags: ['nature'],
    rows: [
      '......###......',
      '....#######....',
      '...##.###.##...',
      '..##..###..##..',
      '.##...###...##.',
      '##....###....##',
      '###############',
      '##....###....##',
      '.##...###...##.',
      '..##..###..##..',
      '...##.###.##...',
      '....#######....',
      '......###......',
      '......###......',
      '.....#####.....',
    ],
  }),

  // —— Medium 20×20 ——
  puzzle({
    id: 'm20-castle',
    name: 'Keep',
    difficulty: 'medium',
    estimatedMinutes: 25,
    tags: ['architecture'],
    rows: [
      '##................##',
      '##................##',
      '####################',
      '##................##',
      '##..##........##..##',
      '##..##........##..##',
      '##................##',
      '####################',
      '##................##',
      '##....######......##',
      '##....##..##......##',
      '##....##..##......##',
      '##....######......##',
      '##................##',
      '####################',
      '########..##########',
      '########..##########',
      '########..##########',
      '####################',
      '####################',
    ],
  }),
  puzzle({
    id: 'm20-fish',
    name: 'Koi',
    difficulty: 'medium',
    estimatedMinutes: 22,
    tags: ['animal'],
    rows: [
      '....................',
      '..........####......',
      '........########....',
      '.......##########...',
      '......###..#######..',
      '.....###....#######.',
      '....###......#######',
      '...###...##...######',
      '..###....##....#####',
      '.####..........#####',
      '######........######',
      '.######......######.',
      '..################..',
      '...##############...',
      '....#####..#####....',
      '.....####..####.....',
      '......##....##......',
      '.......#....#.......',
      '....................',
      '....................',
    ],
  }),

  // —— Hard 25×25 ——
  puzzle({
    id: 'h25-owl',
    name: 'Night Owl',
    difficulty: 'hard',
    estimatedMinutes: 40,
    tags: ['animal'],
    rows: makeOwl25(),
  }),
  puzzle({
    id: 'h25-lotus',
    name: 'Lotus',
    difficulty: 'hard',
    estimatedMinutes: 35,
    tags: ['nature'],
    rows: makeLotus25(),
  }),

  // —— Expert ——
  puzzle({
    id: 'x30-temple',
    name: 'Temple Gate',
    difficulty: 'expert',
    estimatedMinutes: 55,
    tags: ['architecture'],
    rows: makeTemple30(),
  }),
]

function makeOwl25(): string[] {
  const g = Array.from({ length: 25 }, () => Array.from({ length: 25 }, () => '.'))
  const fill = (r: number, c: number, w: number, h: number) => {
    for (let y = r; y < r + h; y += 1) {
      for (let x = c; x < c + w; x += 1) {
        if (y >= 0 && y < 25 && x >= 0 && x < 25) g[y]![x] = '#'
      }
    }
  }
  // body
  fill(6, 6, 13, 14)
  fill(5, 8, 9, 1)
  fill(4, 10, 5, 1)
  // ears
  fill(3, 6, 3, 3)
  fill(3, 16, 3, 3)
  // eyes (hollow rings approximated)
  fill(9, 8, 4, 4)
  fill(9, 13, 4, 4)
  g[10]![9] = '.'
  g[10]![10] = '.'
  g[11]![9] = '.'
  g[11]![10] = '.'
  g[10]![14] = '.'
  g[10]![15] = '.'
  g[11]![14] = '.'
  g[11]![15] = '.'
  // beak
  fill(13, 11, 3, 2)
  // feet
  fill(20, 9, 3, 2)
  fill(20, 13, 3, 2)
  fill(22, 8, 4, 1)
  fill(22, 13, 4, 1)
  return g.map((row) => row.join(''))
}

function makeLotus25(): string[] {
  const g = Array.from({ length: 25 }, () => Array.from({ length: 25 }, () => '.'))
  const set = (r: number, c: number) => {
    if (r >= 0 && r < 25 && c >= 0 && c < 25) g[r]![c] = '#'
  }
  // petals via ellipses
  const petals = [
    { cx: 12, cy: 10, rx: 3, ry: 7 },
    { cx: 8, cy: 12, rx: 6, ry: 4 },
    { cx: 16, cy: 12, rx: 6, ry: 4 },
    { cx: 10, cy: 14, rx: 5, ry: 5 },
    { cx: 14, cy: 14, rx: 5, ry: 5 },
    { cx: 12, cy: 15, rx: 4, ry: 4 },
  ]
  for (const p of petals) {
    for (let y = 0; y < 25; y += 1) {
      for (let x = 0; x < 25; x += 1) {
        const dx = (x - p.cx) / p.rx
        const dy = (y - p.cy) / p.ry
        if (dx * dx + dy * dy <= 1) set(y, x)
      }
    }
  }
  // stem
  for (let y = 18; y < 24; y += 1) {
    set(y, 12)
    set(y, 11)
  }
  // leaf
  for (let y = 20; y < 23; y += 1) {
    for (let x = 5; x < 12; x += 1) {
      if ((x - 8) ** 2 / 16 + (y - 21) ** 2 / 4 <= 1) set(y, x)
    }
  }
  return g.map((row) => row.join(''))
}

function makeTemple30(): string[] {
  const g = Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => '.'))
  const fill = (r: number, c: number, w: number, h: number) => {
    for (let y = r; y < r + h; y += 1) {
      for (let x = c; x < c + w; x += 1) {
        if (y >= 0 && y < 30 && x >= 0 && x < 30) g[y]![x] = '#'
      }
    }
  }
  // roof tiers
  fill(4, 8, 14, 2)
  fill(6, 6, 18, 2)
  fill(8, 4, 22, 2)
  // columns
  for (const c of [5, 10, 14, 19, 24]) {
    fill(10, c, 2, 14)
  }
  // base
  fill(24, 3, 24, 3)
  fill(27, 2, 26, 2)
  // door
  fill(16, 13, 4, 8)
  g[18]![14] = '.'
  g[18]![15] = '.'
  g[19]![14] = '.'
  g[19]![15] = '.'
  return g.map((row) => row.join(''))
}
