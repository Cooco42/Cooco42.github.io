import type { Difficulty, PuzzleDefinition } from '@/engine/types'

function pack(rows: string[]): number[] {
  return rows.flatMap((row) =>
    row.split('').map((ch) => (ch === '#' || ch === '1' ? 1 : 0)),
  )
}

function puzzle(
  partial: Omit<PuzzleDefinition, 'solution' | 'size'> & { rows: string[] },
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

function blank(n: number): string[] {
  return Array.from({ length: n }, () => '.'.repeat(n))
}

function paint(
  rows: string[],
  fn: (set: (r: number, c: number) => void, n: number) => void,
): string[] {
  const n = rows.length
  const g = rows.map((r) => r.split(''))
  const set = (r: number, c: number) => {
    if (r >= 0 && r < n && c >= 0 && c < n) g[r]![c] = '#'
  }
  fn(set, n)
  return g.map((r) => r.join(''))
}

/** Additional original B&W puzzles — sizes aligned with Katana’s range, not their content. */
export const EXTRA_PUZZLES: PuzzleDefinition[] = [
  puzzle({
    id: 'b5-corner',
    name: 'Corner',
    difficulty: 'beginner',
    estimatedMinutes: 1,
    rows: ['##...', '#....', '.....', '....#', '...##'],
  }),
  puzzle({
    id: 'b5-steps',
    name: 'Steps',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    rows: ['#....', '##...', '###..', '####.', '#####'],
  }),
  puzzle({
    id: 'b5-ring',
    name: 'Ring',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    rows: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  }),
  puzzle({
    id: 'b5-letter-t',
    name: 'Letter T',
    difficulty: 'beginner',
    estimatedMinutes: 1,
    rows: ['#####', '..#..', '..#..', '..#..', '..#..'],
  }),
  puzzle({
    id: 'b5-letter-l',
    name: 'Letter L',
    difficulty: 'beginner',
    estimatedMinutes: 1,
    rows: ['#....', '#....', '#....', '#....', '#####'],
  }),
  puzzle({
    id: 'b5-check',
    name: 'Check',
    difficulty: 'beginner',
    estimatedMinutes: 2,
    rows: ['....#', '...##', '#.#.#', '.##..', '.#...'],
  }),
  puzzle({
    id: 'b10-moon',
    name: 'Crescent',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    rows: [
      '...####...',
      '..##..##..',
      '.##....##.',
      '##......##',
      '##.......#',
      '##.......#',
      '##......##',
      '.##....##.',
      '..##..##..',
      '...####...',
    ],
  }),
  puzzle({
    id: 'b10-key',
    name: 'Key',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    rows: [
      '..####....',
      '.##..##...',
      '.##..##...',
      '..####....',
      '...##.....',
      '...##.....',
      '...####...',
      '...##.##..',
      '...##.....',
      '...##.....',
    ],
  }),
  puzzle({
    id: 'b10-anchor',
    name: 'Anchor',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    rows: [
      '....##....',
      '...####...',
      '....##....',
      '....##....',
      '....##....',
      '#...##...#',
      '##..##..##',
      '.########.',
      '..##..##..',
      '...####...',
    ],
  }),
  puzzle({
    id: 'b10-star',
    name: 'Starlet',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    rows: [
      '....##....',
      '....##....',
      '##..##..##',
      '.########.',
      '..######..',
      '.########.',
      '##..##..##',
      '....##....',
      '...#..#...',
      '..#....#..',
    ],
  }),
  puzzle({
    id: 'e15-teapot',
    name: 'Teapot',
    difficulty: 'easy',
    estimatedMinutes: 12,
    rows: [
      '......###......',
      '.....##.##.....',
      '....##...##....',
      '...##.....##...',
      '..##########...',
      '.##........####',
      '##..........#.#',
      '##..........#.#',
      '##..........###',
      '.##............',
      '..############.',
      '...##########..',
      '....########...',
      '.....######....',
      '......####.....',
    ],
  }),
  puzzle({
    id: 'e15-umbrella',
    name: 'Umbrella',
    difficulty: 'easy',
    estimatedMinutes: 10,
    rows: [
      '......###......',
      '....#######....',
      '...#########...',
      '..###########..',
      '.#############.',
      '###############',
      '.......#.......',
      '.......#.......',
      '.......#.......',
      '.......#.......',
      '.......#....#..',
      '.......#...##..',
      '.......#..##...',
      '........###....',
      '.........#.....',
    ],
  }),
  puzzle({
    id: 'e15-bird',
    name: 'Songbird',
    difficulty: 'easy',
    estimatedMinutes: 12,
    rows: [
      '........##.....',
      '.......####....',
      '......##..##...',
      '.....##....##..',
      '....##......##.',
      '...##...##...##',
      '..##....##....#',
      '.##############',
      '##....####.....',
      '#....######....',
      '....########...',
      '...##..##..##..',
      '..##........##.',
      '.##..........##',
      '##............#',
    ],
  }),
  puzzle({
    id: 'e15-camera',
    name: 'Camera',
    difficulty: 'easy',
    estimatedMinutes: 11,
    rows: [
      '....####.......',
      '...######......',
      '..############.',
      '.##############',
      '##...####...###',
      '##..##..##..###',
      '##..##..##..###',
      '##...####...###',
      '###############',
      '##...........##',
      '##...........##',
      '###############',
      '.#############.',
      '..###########..',
      '...............',
    ],
  }),
  puzzle({
    id: 'm20-bike',
    name: 'Bicycle',
    difficulty: 'medium',
    estimatedMinutes: 22,
    rows: paint(blank(20), (set) => {
      // wheels
      for (let a = 0; a < 360; a += 8) {
        const rad = (a * Math.PI) / 180
        set(15 + Math.round(Math.sin(rad) * 3), 5 + Math.round(Math.cos(rad) * 3))
        set(15 + Math.round(Math.sin(rad) * 3), 14 + Math.round(Math.cos(rad) * 3))
      }
      // frame
      for (let i = 0; i < 6; i += 1) set(12 - i, 7 + i)
      for (let i = 0; i < 5; i += 1) set(12, 8 + i)
      for (let i = 0; i < 4; i += 1) set(11 - i, 13)
      set(8, 13); set(8, 14); set(7, 14)
      for (let i = 0; i < 4; i += 1) set(12 + i, 7)
      for (let i = 0; i < 4; i += 1) set(12 + i, 13)
    }),
  }),
  puzzle({
    id: 'm20-lighthouse',
    name: 'Lighthouse',
    difficulty: 'medium',
    estimatedMinutes: 20,
    rows: paint(blank(20), (set) => {
      for (let y = 4; y < 17; y += 1) {
        set(y, 8); set(y, 9); set(y, 10); set(y, 11)
      }
      for (let x = 6; x < 14; x += 1) set(3, x)
      for (let x = 7; x < 13; x += 1) set(2, x)
      set(1, 9); set(1, 10)
      for (let x = 4; x < 16; x += 1) set(17, x)
      for (let x = 3; x < 17; x += 1) set(18, x)
      set(6, 8); set(6, 9); set(6, 10); set(6, 11)
      set(10, 8); set(10, 9); set(10, 10); set(10, 11)
      set(14, 8); set(14, 9); set(14, 10); set(14, 11)
      set(8, 9); set(8, 10)
    }),
  }),
  puzzle({
    id: 'm20-fox',
    name: 'Fox',
    difficulty: 'medium',
    estimatedMinutes: 24,
    rows: paint(blank(20), (set) => {
      // ears
      for (let i = 0; i < 4; i += 1) for (let j = 0; j <= i; j += 1) {
        set(2 + i, 5 + j); set(2 + i, 14 - j)
      }
      // head
      for (let y = 5; y < 12; y += 1) for (let x = 5; x < 15; x += 1) set(y, x)
      // snout
      for (let y = 12; y < 15; y += 1) for (let x = 8; x < 12; x += 1) set(y, x)
      set(14, 9); set(14, 10)
      // eyes hollow
      // punch holes by not setting - carve after
    }).map((row, ri) => {
      const cells = row.split('')
      if (ri === 8) {
        cells[7] = '.'; cells[8] = '.'; cells[11] = '.'; cells[12] = '.'
      }
      return cells.join('')
    }),
  }),
  puzzle({
    id: 'h25-dragonfly',
    name: 'Dragonfly',
    difficulty: 'hard',
    estimatedMinutes: 35,
    rows: paint(blank(25), (set) => {
      for (let y = 5; y < 20; y += 1) {
        set(y, 12); set(y, 11)
      }
      // wings
      for (let x = 2; x < 11; x += 1) {
        set(8, x); set(9, x); set(15, x); set(16, x)
      }
      for (let x = 14; x < 23; x += 1) {
        set(8, x); set(9, x); set(15, x); set(16, x)
      }
      set(4, 11); set(4, 12); set(3, 11); set(3, 12)
      set(20, 10); set(20, 13); set(21, 9); set(21, 14)
    }),
  }),
  puzzle({
    id: 'h25-pagoda',
    name: 'Pagoda Roof',
    difficulty: 'hard',
    estimatedMinutes: 38,
    rows: paint(blank(25), (set) => {
      const roofs = [
        { y: 3, w: 6 },
        { y: 7, w: 10 },
        { y: 11, w: 14 },
        { y: 15, w: 18 },
      ]
      for (const roof of roofs) {
        for (let x = 12 - roof.w / 2; x < 12 + roof.w / 2; x += 1) {
          set(roof.y, x)
          set(roof.y + 1, x)
        }
        for (let x = 10; x < 15; x += 1) {
          set(roof.y + 2, x)
          set(roof.y + 3, x)
        }
      }
      for (let y = 19; y < 24; y += 1) for (let x = 9; x < 16; x += 1) set(y, x)
    }),
  }),
  puzzle({
    id: 'x30-compass',
    name: 'Compass Rose',
    difficulty: 'expert',
    estimatedMinutes: 50,
    rows: paint(blank(30), (set, n) => {
      const cx = 15
      const cy = 15
      for (let a = 0; a < 360; a += 2) {
        const rad = (a * Math.PI) / 180
        const len = a % 90 < 12 || a % 90 > 78 ? 12 : a % 45 < 6 ? 9 : 6
        for (let d = 3; d < len; d += 1) {
          set(cy + Math.round(Math.sin(rad) * d), cx + Math.round(Math.cos(rad) * d))
        }
      }
      for (let y = cy - 2; y <= cy + 2; y += 1)
        for (let x = cx - 2; x <= cx + 2; x += 1) set(y, x)
      void n
    }),
  }),
  puzzle({
    id: 'x35-wave',
    name: 'Great Wave',
    difficulty: 'expert',
    estimatedMinutes: 60,
    rows: paint(blank(35), (set, n) => {
      for (let x = 0; x < n; x += 1) {
        const y1 = 20 + Math.round(Math.sin(x / 4) * 4)
        const y2 = 18 + Math.round(Math.sin(x / 3 + 1) * 6)
        for (let y = y2; y <= y1 + 2; y += 1) set(y, x)
        if (x > 8 && x < 22) {
          const crest = 10 + Math.round(Math.sin((x - 8) / 2) * 3)
          for (let y = crest; y < y2; y += 1) {
            if ((x + y) % 3 !== 0) set(y, x)
          }
        }
      }
      for (let x = 24; x < 34; x += 1) for (let y = 26; y < 34; y += 1) {
        if ((x - 29) ** 2 + (y - 30) ** 2 < 16) set(y, x)
      }
    }),
  }),
  puzzle({
    id: 'x40-city',
    name: 'Skyline',
    difficulty: 'expert',
    estimatedMinutes: 70,
    rows: paint(blank(40), (set) => {
      const buildings = [
        [2, 28, 6],
        [8, 22, 5],
        [14, 18, 8],
        [20, 10, 6],
        [26, 25, 7],
        [33, 30, 5],
      ] as const
      for (const [x0, top, w] of buildings) {
        for (let x = x0; x < x0 + w; x += 1) {
          for (let y = top; y < 38; y += 1) set(y, x)
        }
        for (let y = top + 2; y < 36; y += 3) {
          for (let x = x0 + 1; x < x0 + w - 1; x += 2) {
            // window carve later
          }
        }
      }
      for (let x = 0; x < 40; x += 1) set(38, x)
      for (let x = 0; x < 40; x += 1) set(39, x)
    }).map((row, ri) => {
      if (ri < 12 || ri > 36) return row
      const cells = row.split('')
      for (let x = 0; x < 40; x += 1) {
        if (cells[x] === '#' && (ri % 3 === 0) && (x % 2 === 1)) cells[x] = '.'
      }
      return cells.join('')
    }),
  }),
  puzzle({
    id: 'x50-maze',
    name: 'Quiet Maze',
    difficulty: 'expert',
    estimatedMinutes: 90,
    rows: paint(blank(50), (set, n) => {
      for (let i = 0; i < n; i += 1) {
        set(0, i); set(n - 1, i); set(i, 0); set(i, n - 1)
      }
      for (let y = 2; y < n - 2; y += 2) {
        for (let x = 2; x < n - 2; x += 1) set(y, x)
        // openings
        const gap = ((y * 7) % (n - 8)) + 3
        for (let k = 0; k < 3; k += 1) {
          // carve gap
        }
        const cellsGap = gap
        // reopen by not painting - clear after
        void cellsGap
      }
      for (let x = 2; x < n - 2; x += 2) {
        for (let y = 2; y < n - 2; y += 1) set(y, x)
      }
    }).map((row, ri) => {
      const cells = row.split('')
      if (ri >= 2 && ri < 48 && ri % 2 === 0) {
        const gap = ((ri * 7) % 40) + 4
        cells[gap] = '.'; cells[gap + 1] = '.'; cells[gap + 2] = '.'
      }
      if (ri === 1) cells[2] = '.'
      if (ri === 48) cells[47] = '.'
      return cells.join('')
    }),
  }),
]

export function catalogMeta(difficulty: Difficulty): string {
  const map: Record<Difficulty, string> = {
    beginner: '5×5 · 10×10',
    easy: '15×15',
    medium: '20×20',
    hard: '25×25',
    expert: '30×30 · 50×50',
  }
  return map[difficulty]
}
