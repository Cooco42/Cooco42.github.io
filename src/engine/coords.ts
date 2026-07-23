import type { CellValue } from '@/engine/types'

/** Excel-style column labels: 0→A, 25→Z, 26→AA */
export function colLabel(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/** Row labels: 1 at the top (A1 = top-left). */
export function rowLabel(index: number): string {
  return String(index + 1)
}

export function cellRef(row: number, col: number): string {
  return `${colLabel(col)}${rowLabel(row)}`
}

/** Parse "E5", "e5", "AA12" → {row,col} (0-based). */
export function parseCellRef(
  raw: string,
  size: number,
): { row: number; col: number } | null {
  const m = raw.trim().match(/^([A-Za-z]+)(\d+)$/)
  if (!m) return null
  const letters = m[1]!.toUpperCase()
  const rowNum = Number(m[2])
  let col = 0
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  col -= 1
  const row = rowNum - 1
  if (row < 0 || col < 0 || row >= size || col >= size) return null
  return { row, col }
}

export function parseColLetters(raw: string, size: number): number | null {
  const letters = raw.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(letters)) return null
  let col = 0
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0 || col >= size) return null
  return col
}

export interface HighlightCell {
  row: number
  col: number
}

/** Yellow outline region the coach draws — never paints the board. */
export interface CoachHighlight {
  cells: HighlightCell[]
  label: string
}

function uniqueCells(cells: HighlightCell[]): HighlightCell[] {
  const seen = new Set<string>()
  const out: HighlightCell[] = []
  for (const c of cells) {
    const key = `${c.row}:${c.col}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function highlightFromRow(row: number, size: number): CoachHighlight | null {
  if (row < 0 || row >= size) return null
  return {
    label: `row ${rowLabel(row)}`,
    cells: Array.from({ length: size }, (_, col) => ({ row, col })),
  }
}

export function highlightFromCol(col: number, size: number): CoachHighlight | null {
  if (col < 0 || col >= size) return null
  return {
    label: `column ${colLabel(col)}`,
    cells: Array.from({ length: size }, (_, row) => ({ row, col })),
  }
}

export function highlightFromCell(row: number, col: number): CoachHighlight {
  return {
    label: cellRef(row, col),
    cells: [{ row, col }],
  }
}

/**
 * Parse coach highlight tags. Never fills cells — outline only.
 *   [[HIGHLIGHT:E5]]
 *   [[HIGHLIGHT:E5,F5,G5]]
 *   [[HIGHLIGHT:row:5]]
 *   [[HIGHLIGHT:col:E]]
 *   [[HIGHLIGHT:E5-G5]]  (same-row or same-col range)
 */
export function parseHighlightTags(text: string, size: number): CoachHighlight | null {
  const cells: HighlightCell[] = []
  const labels: string[] = []

  for (const m of text.matchAll(/\[\[\s*HIGHLIGHT\s*:\s*([^\]]+)\]\]/gi)) {
    const body = m[1]!.trim()

    const rowM = body.match(/^row\s*[:=]?\s*(\d+)$/i)
    if (rowM) {
      const h = highlightFromRow(Number(rowM[1]) - 1, size)
      if (h) {
        cells.push(...h.cells)
        labels.push(h.label)
      }
      continue
    }

    const colM = body.match(/^col(?:umn)?\s*[:=]?\s*([A-Za-z]+)$/i)
    if (colM) {
      const col = parseColLetters(colM[1]!, size)
      if (col !== null) {
        const h = highlightFromCol(col, size)
        if (h) {
          cells.push(...h.cells)
          labels.push(h.label)
        }
      }
      continue
    }

    for (const part of body.split(/[,;\s]+/).filter(Boolean)) {
      const range = part.match(/^([A-Za-z]+\d+)\s*[-–]\s*([A-Za-z]+\d+)$/)
      if (range) {
        const a = parseCellRef(range[1]!, size)
        const b = parseCellRef(range[2]!, size)
        if (!a || !b) continue
        if (a.row === b.row) {
          const lo = Math.min(a.col, b.col)
          const hi = Math.max(a.col, b.col)
          for (let col = lo; col <= hi; col += 1) cells.push({ row: a.row, col })
          labels.push(`${cellRef(a.row, lo)}–${cellRef(a.row, hi)}`)
        } else if (a.col === b.col) {
          const lo = Math.min(a.row, b.row)
          const hi = Math.max(a.row, b.row)
          for (let row = lo; row <= hi; row += 1) cells.push({ row, col: a.col })
          labels.push(`${cellRef(lo, a.col)}–${cellRef(hi, a.col)}`)
        }
        continue
      }

      const parsed = parseCellRef(part, size)
      if (parsed) {
        cells.push(parsed)
        labels.push(cellRef(parsed.row, parsed.col))
      }
    }
  }

  const uniq = uniqueCells(cells)
  if (!uniq.length) return null
  return {
    cells: uniq,
    label: labels[0] ?? cellRef(uniq[0]!.row, uniq[0]!.col),
  }
}

/** Strip machine tags from assistant text shown to the user. */
export function stripCoachTags(text: string): string {
  return text
    .replace(/\[\[\s*HIGHLIGHT\s*:[^\]]+\]\]/gi, '')
    .replace(/\[\[\s*PLACE\s*:[^\]]+\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** @deprecated place actions are no longer applied to the board */
export type PlaceValue = 'fill' | 'cross' | 'erase'

export interface PlaceAction {
  row: number
  col: number
  value: CellValue
  ref: string
}
