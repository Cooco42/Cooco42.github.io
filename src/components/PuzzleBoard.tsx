import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { SolutionThumb } from '@/components/SolutionThumb'
import {
  autoMarkCompletedLine,
  struckClueFlags,
} from '@/engine/assist'
import {
  deriveClues,
  getCol,
  getRow,
  indexOf,
  isLineComplete,
  setCol,
  setRow,
} from '@/engine/grid'
import type { CellValue, PuzzleDefinition, ToolMode } from '@/engine/types'
import { clampBoardScale } from '@/engine/view'

export function PuzzleBoard({
  puzzle,
  grid,
  highlight,
  onPaint,
  onStrokeEnd,
  scale,
  mode,
  lockedCells,
  strikeClues,
  panOffset,
  onPanCommit,
  onScaleCommit,
  stageWidth = 360,
  stageHeight = 420,
  revealPicture = false,
  showPreview = true,
  hintPickMode = false,
}: {
  puzzle: PuzzleDefinition
  grid: CellValue[]
  highlight: ReadonlyArray<{ row: number; col: number }> | null
  onPaint: (row: number, col: number, paintValue: CellValue) => void
  onStrokeEnd?: () => void
  scale: number
  mode: ToolMode
  lockedCells?: boolean[]
  strikeClues: boolean
  panOffset: { x: number; y: number }
  onPanCommit: (x: number, y: number) => void
  onScaleCommit: (scale: number) => void
  stageWidth?: number
  stageHeight?: number
  /** Full solution picture over the playable grid (after Puzzle Complete!). */
  revealPicture?: boolean
  /** Mini live-drawing silhouette in the clue corner. */
  showPreview?: boolean
  /** Hint-pick: next cell tap places the correct solution value. */
  hintPickMode?: boolean
}) {
  const livePreview = useMemo(
    () => grid.map((c) => (c === 1 ? 1 : 0)),
    [grid],
  )
  const { size } = puzzle
  const frameRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const clues = useMemo(
    () => deriveClues(puzzle.solution, size),
    [puzzle.solution, size],
  )

  const cellPx = useMemo(
    () => fitCellPx(size, stageWidth, stageHeight, clues),
    [size, stageWidth, stageHeight, clues],
  )
  const maxColDepth = useMemo(
    () => Math.max(1, ...clues.cols.map((c) => c.length)),
    [clues.cols],
  )
  const maxRowLen = useMemo(
    () => Math.max(1, ...clues.rows.map((r) => r.length)),
    [clues.rows],
  )
  // Clues share cell width — font must fit 2-digit numbers without wrapping
  const clueFontPx = Math.max(8, Math.min(cellPx * 0.58, 17))
  const showMajors = size >= 10
  const colClueBlockH = maxColDepth * cellPx
  const rowClueBlockW = maxRowLen * cellPx
  const majorAfterCol = (c: number) =>
    showMajors && (c + 1) % 5 === 0 && c !== size - 1
  const majorAfterRow = (r: number) =>
    showMajors && (r + 1) % 5 === 0 && r !== size - 1
  const MINOR_LINE = '1px solid var(--line-strong)'
  const MAJOR_LINE = '2px solid #111'
  const cellBorders = (opts: {
    right?: boolean
    bottom?: boolean
    majorRight?: boolean
    majorBottom?: boolean
  }) => ({
    borderRight: opts.right
      ? opts.majorRight
        ? MAJOR_LINE
        : MINOR_LINE
      : 'none',
    borderBottom: opts.bottom
      ? opts.majorBottom
        ? MAJOR_LINE
        : MINOR_LINE
      : 'none',
  })
  const highlightKeys = useMemo(() => {
    const set = new Set<string>()
    if (!highlight) return set
    for (const cell of highlight) set.add(`${cell.row}:${cell.col}`)
    return set
  }, [highlight])

  const painting = useRef<{
    value: CellValue
    lastKey: string | null
  } | null>(null)
  const panLive = useRef({ x: panOffset.x, y: panOffset.y })
  /** Absolute CSS zoom — layout `cellPx` stays fixed so zoom never reflows/jumps. */
  const liveScale = useRef(scale)
  const panStart = useRef<{
    pointerX: number
    pointerY: number
    originX: number
    originY: number
  } | null>(null)
  const pinchStart = useRef<{
    distance: number
    scale: number
    midX: number
    midY: number
    panX: number
    panY: number
  } | null>(null)
  const velocity = useRef({ x: 0, y: 0 })
  const lastSample = useRef({ t: 0, x: 0, y: 0 })
  const inertiaRaf = useRef<number | null>(null)
  const wheelCommit = useRef<number | null>(null)
  const panning = useRef(false)
  const gesturing = useRef(false)

  const applyTransform = () => {
    const el = boardRef.current
    if (!el) return
    el.style.transform = `translate3d(${panLive.current.x}px, ${panLive.current.y}px, 0) scale(${liveScale.current})`
  }

  const shellCenter = () => {
    const shell = boardRef.current?.parentElement
    if (!shell) return { x: 0, y: 0 }
    const rect = shell.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  /** Zoom toward a screen point (client coords) — focal pixel stays put. */
  const zoomAt = (nextScale: number, clientX: number, clientY: number) => {
    const next = clampBoardScale(nextScale, size)
    const prev = liveScale.current
    if (next === prev) return
    const center = shellCenter()
    const mx = clientX - center.x
    const my = clientY - center.y
    const bx = (mx - panLive.current.x) / prev
    const by = (my - panLive.current.y) / prev
    liveScale.current = next
    panLive.current = {
      x: mx - bx * next,
      y: my - by * next,
    }
    applyTransform()
  }

  const stopInertia = () => {
    if (inertiaRaf.current != null) {
      window.cancelAnimationFrame(inertiaRaf.current)
      inertiaRaf.current = null
    }
  }

  const commitView = () => {
    gesturing.current = false
    onScaleCommit(liveScale.current)
    onPanCommit(panLive.current.x, panLive.current.y)
  }

  const startInertia = () => {
    stopInertia()
    let vx = velocity.current.x
    let vy = velocity.current.y
    const speed = Math.hypot(vx, vy)
    if (speed < 0.35) {
      commitView()
      return
    }
    const tick = () => {
      vx *= 0.92
      vy *= 0.92
      panLive.current = {
        x: panLive.current.x + vx,
        y: panLive.current.y + vy,
      }
      applyTransform()
      if (Math.hypot(vx, vy) < 0.18) {
        inertiaRaf.current = null
        commitView()
        return
      }
      inertiaRaf.current = window.requestAnimationFrame(tick)
    }
    inertiaRaf.current = window.requestAnimationFrame(tick)
  }

  useLayoutEffect(() => {
    if (panning.current || gesturing.current || inertiaRaf.current != null || pinchStart.current) {
      return
    }
    panLive.current = { x: panOffset.x, y: panOffset.y }
    liveScale.current = scale
    applyTransform()
  }, [panOffset.x, panOffset.y, scale])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Navigation (incl. wheel zoom) only in Pan mode
      if (mode !== 'pan' || hintPickMode || revealPicture) return
      e.preventDefault()
      stopInertia()
      gesturing.current = true
      const step = e.deltaY > 0 ? -0.12 : 0.12
      zoomAt(liveScale.current + step, e.clientX, e.clientY)
      if (wheelCommit.current != null) window.clearTimeout(wheelCommit.current)
      wheelCommit.current = window.setTimeout(() => {
        commitView()
        wheelCommit.current = null
      }, 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (wheelCommit.current != null) window.clearTimeout(wheelCommit.current)
      stopInertia()
    }
  }, [mode, hintPickMode, revealPicture, onPanCommit, onScaleCommit, size])

  const completeRows = useMemo(() => {
    const set = new Set<number>()
    for (let r = 0; r < size; r += 1) {
      if (isLineComplete(getRow(grid, r, size), clues.rows[r]!)) set.add(r)
    }
    return set
  }, [grid, size, clues.rows])

  const completeCols = useMemo(() => {
    const set = new Set<number>()
    for (let c = 0; c < size; c += 1) {
      if (isLineComplete(getCol(grid, c, size), clues.cols[c]!)) set.add(c)
    }
    return set
  }, [grid, size, clues.cols])

  const rowStrikes = useMemo(
    () =>
      clues.rows.map((clue, r) =>
        strikeClues ? struckClueFlags(clue, getRow(grid, r, size)) : clue.map(() => false),
      ),
    [clues.rows, grid, size, strikeClues],
  )

  const colStrikes = useMemo(
    () =>
      clues.cols.map((clue, c) =>
        strikeClues ? struckClueFlags(clue, getCol(grid, c, size)) : clue.map(() => false),
      ),
    [clues.cols, grid, size, strikeClues],
  )

  const cellFromPoint = (clientX: number, clientY: number) => {
    const frame = frameRef.current
    if (!frame) return null
    const rect = frame.getBoundingClientRect()
    // rect already includes CSS gesture scale — map proportionally
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null
    return {
      row: Math.min(size - 1, Math.floor((y / rect.height) * size)),
      col: Math.min(size - 1, Math.floor((x / rect.width) * size)),
    }
  }

  const resolvePaintValue = (
    current: CellValue,
    button: number,
    shiftKey: boolean,
  ): CellValue => {
    if (mode === 'erase' || button === 1) return 0
    if (mode === 'cross' || button === 2 || shiftKey) {
      return current === 2 ? 0 : 2
    }
    return current === 1 ? 0 : 1
  }

  const beginPaint = (
    row: number,
    col: number,
    button: number,
    shiftKey: boolean,
  ) => {
    if (lockedCells?.[indexOf(row, col, size)]) return
    const current = grid[indexOf(row, col, size)]!
    const paintValue = hintPickMode
      ? 0
      : resolvePaintValue(current, button, shiftKey)
    painting.current = { value: paintValue, lastKey: `${row}:${col}` }
    onPaint(row, col, paintValue)
  }

  const continuePaint = (row: number, col: number) => {
    if (!painting.current || hintPickMode) return
    if (lockedCells?.[indexOf(row, col, size)]) return
    const key = `${row}:${col}`
    if (painting.current.lastKey === key) return
    painting.current.lastKey = key
    onPaint(row, col, painting.current.value)
  }

  const endStroke = () => {
    const wasPanning = Boolean(panStart.current)
    painting.current = null
    panStart.current = null
    panning.current = false
    if (pinchStart.current) {
      pinchStart.current = null
      commitView()
    } else if (wasPanning) {
      startInertia()
    }
    onStrokeEnd?.()
  }

  const canNavigate = mode === 'pan' && !hintPickMode && !revealPicture

  return (
    <div className="puzzle-board-shell">
      <div
        ref={boardRef}
        className="puzzle-board"
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={(e) => {
          if (!canNavigate) return
          if (e.touches.length === 2) {
            stopInertia()
            painting.current = null
            panStart.current = null
            panning.current = false
            gesturing.current = true
            const [a, b] = [e.touches[0]!, e.touches[1]!]
            const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
            pinchStart.current = {
              distance,
              scale: liveScale.current,
              midX: (a.clientX + b.clientX) / 2,
              midY: (a.clientY + b.clientY) / 2,
              panX: panLive.current.x,
              panY: panLive.current.y,
            }
          }
        }}
        onTouchMove={(e) => {
          if (!canNavigate) return
          if (e.touches.length === 2 && pinchStart.current) {
            e.preventDefault()
            const [a, b] = [e.touches[0]!, e.touches[1]!]
            const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
            const midX = (a.clientX + b.clientX) / 2
            const midY = (a.clientY + b.clientY) / 2
            const next = clampBoardScale(
              (pinchStart.current.scale * distance) / pinchStart.current.distance,
              size,
            )
            const center = shellCenter()
            const startMx = pinchStart.current.midX - center.x
            const startMy = pinchStart.current.midY - center.y
            const localX =
              (startMx - pinchStart.current.panX) / pinchStart.current.scale
            const localY =
              (startMy - pinchStart.current.panY) / pinchStart.current.scale
            const mx = midX - center.x
            const my = midY - center.y
            liveScale.current = next
            panLive.current = {
              x: mx - localX * next,
              y: my - localY * next,
            }
            applyTransform()
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2 && pinchStart.current) {
            pinchStart.current = null
            commitView()
          }
        }}
      >
      <div
        className="board-corner"
        aria-hidden
        style={{ width: rowClueBlockW, height: colClueBlockH }}
      >
        {showPreview ? (
          <div className="board-corner__preview">
            <SolutionThumb solution={livePreview} size={size} stretch />
          </div>
        ) : null}
      </div>
      <div
        className="col-clues"
        aria-hidden
        style={{
          gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${maxColDepth}, ${cellPx}px)`,
          gap: 0,
          height: colClueBlockH,
          fontSize: clueFontPx,
        }}
      >
        {Array.from({ length: maxColDepth }, (_, d) =>
          clues.cols.map((colClue, c) => {
            const pad = maxColDepth - colClue.length
            const clueIndex = d - pad
            const n = clueIndex >= 0 ? colClue[clueIndex]! : null
            const struck = clueIndex >= 0 && Boolean(colStrikes[c]?.[clueIndex])
            return (
              <div
                key={`c-${c}-${d}`}
                className={`clue-cell${n == null ? ' clue-cell--empty' : ''}${struck ? ' clue-struck' : ''}`}
                style={{
                  width: cellPx,
                  height: cellPx,
                  ...cellBorders({
                    right: c !== size - 1,
                    bottom: d !== maxColDepth - 1,
                    majorRight: majorAfterCol(c),
                  }),
                }}
              >
                {n}
              </div>
            )
          }),
        )}
      </div>

      <div
        className="row-clues"
        aria-hidden
        style={{
          gridTemplateColumns: `repeat(${maxRowLen}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
          gap: 0,
          width: rowClueBlockW,
          fontSize: clueFontPx,
        }}
      >
        {clues.rows.map((rowClue, r) => {
          const pad = maxRowLen - rowClue.length
          return Array.from({ length: maxRowLen }, (_, d) => {
            const clueIndex = d - pad
            const n = clueIndex >= 0 ? rowClue[clueIndex]! : null
            const struck = clueIndex >= 0 && Boolean(rowStrikes[r]?.[clueIndex])
            return (
              <div
                key={`r-${r}-${d}`}
                className={`clue-cell${n == null ? ' clue-cell--empty' : ''}${struck ? ' clue-struck' : ''}`}
                style={{
                  width: cellPx,
                  height: cellPx,
                  ...cellBorders({
                    right: d !== maxRowLen - 1,
                    bottom: r !== size - 1,
                    majorBottom: majorAfterRow(r),
                  }),
                }}
              >
                {n}
              </div>
            )
          })
        })}
      </div>

      <div
        ref={frameRef}
        className="grid-frame"
        data-revealed={revealPicture ? 'true' : 'false'}
        style={{
          gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
          gap: 0,
          cursor: hintPickMode
            ? 'cell'
            : mode === 'pan'
              ? panning.current
                ? 'grabbing'
                : 'grab'
              : 'crosshair',
          position: 'relative',
        }}
        role="grid"
        aria-label={`${size} by ${size} nonogram grid`}
        onPointerDown={(e) => {
          if (revealPicture) return
          if (pinchStart.current) return

          if (hintPickMode) {
            const cell = cellFromPoint(e.clientX, e.clientY)
            if (!cell) return
            e.currentTarget.setPointerCapture(e.pointerId)
            beginPaint(cell.row, cell.col, e.button, e.shiftKey)
            return
          }

          if (mode === 'pan') {
            stopInertia()
            panning.current = true
            panStart.current = {
              pointerX: e.clientX,
              pointerY: e.clientY,
              originX: panLive.current.x,
              originY: panLive.current.y,
            }
            lastSample.current = { t: performance.now(), x: e.clientX, y: e.clientY }
            velocity.current = { x: 0, y: 0 }
            e.currentTarget.setPointerCapture(e.pointerId)
            return
          }

          const cell = cellFromPoint(e.clientX, e.clientY)
          if (!cell) return
          e.currentTarget.setPointerCapture(e.pointerId)
          beginPaint(cell.row, cell.col, e.button, e.shiftKey)
        }}
        onPointerMove={(e) => {
          if (revealPicture) return
          if (mode === 'pan' && panStart.current && !hintPickMode) {
            const now = performance.now()
            const dt = Math.max(1, now - lastSample.current.t)
            const dx = e.clientX - lastSample.current.x
            const dy = e.clientY - lastSample.current.y
            velocity.current = { x: dx / (dt / 16.67), y: dy / (dt / 16.67) }
            lastSample.current = { t: now, x: e.clientX, y: e.clientY }
            panLive.current = {
              x: panStart.current.originX + (e.clientX - panStart.current.pointerX),
              y: panStart.current.originY + (e.clientY - panStart.current.pointerY),
            }
            applyTransform()
            return
          }
          if (!painting.current) return
          const cell = cellFromPoint(e.clientX, e.clientY)
          if (cell) continuePaint(cell.row, cell.col)
        }}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const row = Math.floor(i / size)
          const col = i % size
          const value = grid[i]!
          return (
            <div
              key={i}
              className="cell"
              role="gridcell"
              aria-label={`Row ${row + 1} column ${col + 1}`}
              aria-pressed={value === 1}
              aria-colindex={col + 1}
              data-value={value}
              data-alt={(row + col) % 2 === 1 ? 'true' : 'false'}
              data-locked={lockedCells?.[i] ? 'true' : 'false'}
              data-highlight={
                highlightKeys.has(`${row}:${col}`) ? 'true' : 'false'
              }
              data-complete-line={
                completeRows.has(row) || completeCols.has(col)
                  ? 'true'
                  : 'false'
              }
              style={{
                width: cellPx,
                height: cellPx,
                boxSizing: 'border-box',
                ...cellBorders({
                  right: col !== size - 1,
                  bottom: row !== size - 1,
                  majorRight: majorAfterCol(col),
                  majorBottom: majorAfterRow(row),
                }),
              }}
            />
          )
        })}
        {revealPicture ? (
          <div className="grid-frame__reveal" aria-hidden>
            <SolutionThumb solution={puzzle.solution} size={size} />
          </div>
        ) : null}
      </div>
      </div>
    </div>
  )
}

export function fitCellPx(
  size: number,
  stageWidth: number,
  stageHeight: number,
  clues?: { rows: number[][]; cols: number[][] },
): number {
  // Borders live inside cellPx (border-box); no CSS gap between cells.
  const gutter = 0
  const border = 14
  const pad = 8
  const maxRowLen = clues
    ? Math.max(1, ...clues.rows.map((r) => r.length))
    : Math.ceil(size / 4)
  const maxColDepth = clues
    ? Math.max(1, ...clues.cols.map((c) => c.length))
    : Math.ceil(size / 4)
  // Readable floor; large boards may overflow stage (pan / zoom out)
  const minCell = size >= 30 ? 15 : size >= 25 ? 16 : size >= 20 ? 17 : size >= 15 ? 18 : 15
  const clueW = maxRowLen * minCell + Math.max(0, maxRowLen - 1) * gutter
  const clueH = maxColDepth * minCell + Math.max(0, maxColDepth - 1) * gutter
  const byW = (stageWidth - clueW - pad * 2 - border) / size - gutter
  const byH = (stageHeight - clueH - pad * 2 - border) / size - gutter
  const fitted = Math.floor(Math.min(byW, byH))
  return Math.max(minCell, Math.min(44, fitted))
}

export function applyAutoMarks(
  grid: CellValue[],
  puzzle: PuzzleDefinition,
  previousAutoMarked: ReadonlySet<number> = new Set(),
): { grid: CellValue[]; autoMarked: Set<number> } {
  const { size } = puzzle
  const { rows, cols } = deriveClues(puzzle.solution, size)
  let next = grid.slice() as CellValue[]

  // Drop crosses that Auto placed last time so they can be re-derived
  for (const i of previousAutoMarked) {
    if (next[i] === 2) next[i] = 0
  }

  const autoMarked = new Set<number>()
  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < size; r += 1) {
      const line = getRow(next, r, size)
      const marked = autoMarkCompletedLine(line, rows[r]!)
      if (marked) {
        for (let c = 0; c < size; c += 1) {
          if (line[c] === 0 && marked[c] === 2) {
            autoMarked.add(indexOf(r, c, size))
          }
        }
        next = setRow(next, r, size, marked)
        changed = true
      }
    }
    for (let c = 0; c < size; c += 1) {
      const line = getCol(next, c, size)
      const marked = autoMarkCompletedLine(line, cols[c]!)
      if (marked) {
        for (let r = 0; r < size; r += 1) {
          if (line[r] === 0 && marked[r] === 2) {
            autoMarked.add(indexOf(r, c, size))
          }
        }
        next = setCol(next, c, size, marked)
        changed = true
      }
    }
  }
  return { grid: next, autoMarked }
}

/** Rebuild which crosses belong to Auto after undo/redo/load. */
export function deriveAutoMarkedSet(
  grid: CellValue[],
  puzzle: PuzzleDefinition,
): Set<number> {
  const fillsOnly = grid.map((c) => (c === 1 ? 1 : 0)) as CellValue[]
  const { autoMarked } = applyAutoMarks(fillsOnly, puzzle)
  const owned = new Set<number>()
  for (const i of autoMarked) {
    if (grid[i] === 2) owned.add(i)
  }
  return owned
}
