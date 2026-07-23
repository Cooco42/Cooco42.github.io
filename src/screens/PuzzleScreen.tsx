import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  applyAutoMarks,
  deriveAutoMarkedSet,
  PuzzleBoard,
} from '@/components/PuzzleBoard'
import { SolutionThumb } from '@/components/SolutionThumb'
import { IconButton } from '@/components/ui'
import { dateKeyFromDate, getDailyPuzzleId, isDailyDatePlayable } from '@/data/daily'
import { getNextLibraryPuzzle, getPuzzleById } from '@/data/puzzles'
import { cloneGrid, indexOf, isPuzzleSolved } from '@/engine/grid'
import type { CellValue, ToolMode } from '@/engine/types'
import { normalizeGrid } from '@/engine/types'
import { clampBoardScale } from '@/engine/view'
import { startFreshProgress, useAppStore } from '@/store/appStore'
import { playSoftClick, triggerHaptic } from '@/utils/feedback'

const MAX_ELAPSED_MS = 24 * 60 * 60 * 1000

function gridHasMarks(grid: CellValue[]): boolean {
  return grid.some((c) => c !== 0)
}

export function PuzzleScreen() {
  const { puzzleId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dailyDateKeyFromNav =
    (location.state as { dailyDateKey?: string } | null)?.dailyDateKey ??
    new URLSearchParams(location.search).get('d')

  const puzzle = getPuzzleById(puzzleId)
  const progressMap = useAppStore((s) => s.progressMap)
  const upsertProgress = useAppStore((s) => s.upsertProgress)
  const completePuzzle = useAppStore((s) => s.completePuzzle)
  const settings = useAppStore((s) => s.settings)

  const saved = progressMap[puzzleId]

  const dailyDateKey =
    dailyDateKeyFromNav && isDailyDatePlayable(dailyDateKeyFromNav)
      ? dailyDateKeyFromNav
      : saved?.dailyDateKey && isDailyDatePlayable(saved.dailyDateKey)
        ? saved.dailyDateKey
        : getDailyPuzzleId() === puzzleId && isDailyDatePlayable(dateKeyFromDate())
          ? dateKeyFromDate()
          : null

  const [grid, setGrid] = useState<CellValue[]>(
    () =>
      (saved?.grid ? normalizeGrid(saved.grid) : null) ??
      (puzzle ? startFreshProgress(puzzle.id, puzzle.size).grid : []),
  )
  const [undoStack, setUndoStack] = useState<CellValue[][]>([])
  const [redoStack, setRedoStack] = useState<CellValue[][]>([])
  const [mode, setMode] = useState<ToolMode>('fill')
  const [scale, setScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [won, setWon] = useState(Boolean(saved?.completedAt))
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0)
  const [hintPickMode, setHintPickMode] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 360, h: 420 })
  const startedAt = useRef(saved?.startedAt ?? Date.now())
  const elapsedBaseRef = useRef(saved?.elapsedMs ?? 0)
  const sessionStartRef = useRef(Date.now())
  const strokeRef = useRef(false)
  const gridRef = useRef(grid)
  const stageRef = useRef<HTMLDivElement>(null)
  const autoMarkedRef = useRef<Set<number>>(new Set())
  const dailyDateKeyRef = useRef(dailyDateKey)

  useEffect(() => {
    dailyDateKeyRef.current = dailyDateKey
  }, [dailyDateKey])

  const currentElapsedMs = useCallback(() => {
    const raw = elapsedBaseRef.current + (Date.now() - sessionStartRef.current)
    return Math.max(0, Math.min(raw, MAX_ELAPSED_MS))
  }, [])

  const zoomBy = useCallback(
    (delta: number) => {
      if (!puzzle) return
      const prevScale = scale
      const next = clampBoardScale(prevScale + delta, puzzle.size)
      if (next === prevScale) return
      // Keep stage-center focal fixed (transform-origin is board center)
      setPanOffset((pan) => ({
        x: (pan.x * next) / prevScale,
        y: (pan.y * next) / prevScale,
      }))
      setScale(next)
    },
    [puzzle, scale],
  )

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const blockScroll = (e: TouchEvent) => {
      e.preventDefault()
    }
    stage.addEventListener('touchmove', blockScroll, { passive: false })
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width <= 0 || height <= 0) return
      window.clearTimeout((ro as unknown as { _t?: number })._t)
      ;(ro as unknown as { _t?: number })._t = window.setTimeout(() => {
        setStageSize((prev) =>
          Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2
            ? prev
            : { w: width, h: height },
        )
      }, 80)
    })
    ro.observe(stage)
    return () => {
      stage.removeEventListener('touchmove', blockScroll)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    gridRef.current = grid
  }, [grid])

  useEffect(() => {
    if (!puzzle) return
    const existing = progressMap[puzzle.id]
    if (existing) {
      const normalized = normalizeGrid(existing.grid)
      setGrid(normalized)
      gridRef.current = normalized
      autoMarkedRef.current = settings.autoMarkComplete
        ? deriveAutoMarkedSet(normalized, puzzle)
        : new Set()
      setHintsUsed(existing.hintsUsed)
      setWon(Boolean(existing.completedAt))
      startedAt.current = existing.startedAt
      elapsedBaseRef.current = existing.elapsedMs ?? 0
      sessionStartRef.current = Date.now()
      if (!existing.completedAt && gridHasMarks(normalized)) {
        void upsertProgress({
          ...existing,
          grid: normalized,
          updatedAt: Date.now(),
          dailyDateKey: existing.dailyDateKey ?? dailyDateKeyRef.current,
        })
      }
    } else {
      const fresh = startFreshProgress(puzzle.id, puzzle.size, dailyDateKeyRef.current)
      setGrid(fresh.grid)
      gridRef.current = fresh.grid
      autoMarkedRef.current = new Set()
      setHintsUsed(0)
      setWon(false)
      startedAt.current = fresh.startedAt
      elapsedBaseRef.current = 0
      sessionStartRef.current = Date.now()
      // Do not upsert empty peeks — wait for the first mark
    }
    setUndoStack([])
    setRedoStack([])
    setMode('fill')
    strokeRef.current = false
    setPanOffset({ x: 0, y: 0 })
    setScale(1)
    setHintPickMode(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId])

  const wonRef = useRef(won)
  const hintsRef = useRef(hintsUsed)
  useEffect(() => {
    wonRef.current = won
  }, [won])
  useEffect(() => {
    hintsRef.current = hintsUsed
  }, [hintsUsed])

  // Flush progress when leaving the puzzle so Resume stays available
  useEffect(() => {
    return () => {
      const p = puzzle
      if (!p || wonRef.current) return
      if (!gridHasMarks(gridRef.current)) return
      void useAppStore.getState().upsertProgress({
        puzzleId: p.id,
        grid: gridRef.current,
        startedAt: startedAt.current,
        updatedAt: Date.now(),
        completedAt: null,
        mistakes: 0,
        hintsUsed: hintsRef.current,
        elapsedMs: currentElapsedMs(),
        dailyDateKey: dailyDateKeyRef.current,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId])

  const persist = useCallback(
    async (nextGrid: CellValue[], nextHints = hintsUsed) => {
      if (!puzzle) return
      if (!gridHasMarks(nextGrid)) return
      await upsertProgress({
        puzzleId: puzzle.id,
        grid: nextGrid,
        startedAt: startedAt.current,
        updatedAt: Date.now(),
        completedAt: null,
        mistakes: 0,
        hintsUsed: nextHints,
        elapsedMs: currentElapsedMs(),
        dailyDateKey,
      })
    },
    [currentElapsedMs, dailyDateKey, hintsUsed, puzzle, upsertProgress],
  )

  const pushHistory = (prev: CellValue[]) => {
    setUndoStack((stack) => [...stack.slice(-99), cloneGrid(prev)])
    setRedoStack([])
  }

  const commitGrid = (next: CellValue[], withHistory = true, nextHints = hintsUsed) => {
    if (!puzzle) return
    if (withHistory && !strokeRef.current) {
      pushHistory(gridRef.current)
      strokeRef.current = true
    }
    let finalGrid = next
    if (settings.autoMarkComplete) {
      const result = applyAutoMarks(next, puzzle, autoMarkedRef.current)
      finalGrid = result.grid
      autoMarkedRef.current = result.autoMarked
    } else {
      autoMarkedRef.current = new Set()
    }
    gridRef.current = finalGrid
    setGrid(finalGrid)
    triggerHaptic(settings.haptics, 'light')
    playSoftClick(settings.sound)

    if (isPuzzleSolved(finalGrid, puzzle)) {
      setWon(true)
      setHintPickMode(false)
      triggerHaptic(settings.haptics, 'success')
      void completePuzzle(
        puzzle.id,
        finalGrid,
        currentElapsedMs(),
        nextHints,
        dailyDateKey,
      )
    } else {
      void persist(finalGrid, nextHints)
    }
  }

  const paintCell = (row: number, col: number, paintValue: CellValue) => {
    if (!puzzle || won) return
    const i = indexOf(row, col, puzzle.size)

    if (hintPickMode) {
      const solFilled = puzzle.solution[i] === 1
      const correct: CellValue = solFilled ? 1 : 2
      const current = gridRef.current[i]!
      const alreadyCorrect =
        (solFilled && current === 1) || (!solFilled && current === 2)
      if (alreadyCorrect) {
        setHintPickMode(false)
        return
      }
      const next = cloneGrid(gridRef.current)
      next[i] = correct
      autoMarkedRef.current.delete(i)
      const nextHints = hintsUsed + 1
      setHintsUsed(nextHints)
      setHintPickMode(false)
      strokeRef.current = false
      triggerHaptic(settings.haptics, 'medium')
      commitGrid(next, true, nextHints)
      strokeRef.current = false
      return
    }

    const current = gridRef.current
    if (current[i] === paintValue) return
    const next = cloneGrid(current)
    next[i] = paintValue
    autoMarkedRef.current.delete(i)
    commitGrid(next, true)
  }

  const undo = () => {
    const prev = undoStack[undoStack.length - 1]
    if (!prev || !puzzle) return
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, cloneGrid(grid)])
    setGrid(prev)
    gridRef.current = prev
    autoMarkedRef.current = settings.autoMarkComplete
      ? deriveAutoMarkedSet(prev, puzzle)
      : new Set()
    void persist(prev)
  }

  const redo = () => {
    const next = redoStack[redoStack.length - 1]
    if (!next || !puzzle) return
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, cloneGrid(grid)])
    setGrid(next)
    gridRef.current = next
    autoMarkedRef.current = settings.autoMarkComplete
      ? deriveAutoMarkedSet(next, puzzle)
      : new Set()
    void persist(next)
  }

  const toggleHintPick = () => {
    if (!puzzle || won) return
    setHintPickMode((v) => !v)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'f') {
        setMode('fill')
        setHintPickMode(false)
      }
      if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'x') {
        setMode('cross')
        setHintPickMode(false)
      }
      if (e.key.toLowerCase() === 'e') {
        setMode('erase')
        setHintPickMode(false)
      }
      if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'm') {
        setMode('pan')
        setHintPickMode(false)
      }
      if (e.key === '=' || e.key === '+') {
        zoomBy(0.15)
      }
      if (e.key === '-') {
        zoomBy(-0.15)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!puzzle) {
    return (
      <div className="screen">
        <p>Puzzle not found.</p>
        <Link to="/library">Back to library</Link>
      </div>
    )
  }

  return (
    <div className="screen puzzle-screen" style={{ overscrollBehavior: 'none' }}>
      <div className="puzzle-meta-bar">
        <span>Puzzle {puzzle.name}</span>
        <span>
          {puzzle.size}×{puzzle.size}
        </span>
      </div>

      <div className="puzzle-topbar">
        <IconButton label="Menu" onClick={() => navigate('/library')}>
          <MenuIcon />
        </IconButton>
        <div>
          <h1 className="puzzle-topbar__title">Nonogram</h1>
          <p className="puzzle-topbar__meta">
            {puzzle.size}×{puzzle.size}
            {hintPickMode ? ' · Tap a cell for a hint' : ''}
          </p>
        </div>
        <span className="puzzle-topbar__spacer" aria-hidden />
      </div>

      <div className="puzzle-stage" ref={stageRef}>
        <PuzzleBoard
          puzzle={puzzle}
          grid={grid}
          highlight={null}
          scale={scale}
          mode={mode}
          strikeClues={settings.strikeClues}
          panOffset={panOffset}
          stageWidth={stageSize.w}
          stageHeight={stageSize.h}
          revealPicture={won}
          hintPickMode={hintPickMode}
          onPanCommit={(x, y) => setPanOffset({ x, y })}
          onScaleCommit={(next) => {
            setScale(clampBoardScale(next, puzzle.size))
          }}
          onPaint={paintCell}
          onStrokeEnd={() => {
            strokeRef.current = false
          }}
        />
      </div>

      <div className="puzzle-toolbar">
        <div className="puzzle-toolbar__gn">
          <div className="puzzle-toolbar__gn-main" role="group" aria-label="Paint tools">
            <button
              type="button"
              className="tool-chip tool-chip--wide"
              data-active={mode === 'fill' && !hintPickMode ? 'true' : 'false'}
              onClick={() => {
                setMode('fill')
                setHintPickMode(false)
              }}
              aria-label="Fill"
            >
              <span className="tool-chip__glyph tool-chip__glyph--fill">■</span>
            </button>
            <button
              type="button"
              className="tool-chip tool-chip--wide"
              data-active={mode === 'cross' && !hintPickMode ? 'true' : 'false'}
              onClick={() => {
                setMode('cross')
                setHintPickMode(false)
              }}
              aria-label="Mark"
            >
              <span className="tool-chip__glyph tool-chip__glyph--cross">✕</span>
            </button>
            <button
              type="button"
              className="tool-chip tool-chip--wide"
              data-active={mode === 'erase' && !hintPickMode ? 'true' : 'false'}
              data-tone="danger"
              onClick={() => {
                setMode('erase')
                setHintPickMode(false)
              }}
              aria-label="Erase"
            >
              <span className="tool-chip__glyph tool-chip__glyph--erase">／</span>
            </button>
            <button
              type="button"
              className="tool-chip tool-chip--wide"
              data-active={mode === 'pan' && !hintPickMode ? 'true' : 'false'}
              onClick={() => {
                setMode('pan')
                setHintPickMode(false)
              }}
              aria-label="Pan"
            >
              <span className="tool-chip__glyph tool-chip__glyph--pan" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          </div>
          <div className="puzzle-toolbar__gn-side" role="group" aria-label="History and zoom">
            <button
              type="button"
              className="tool-chip tool-chip--history"
              onClick={undo}
              disabled={!undoStack.length}
              aria-label="Undo"
            >
              <span className="tool-chip__glyph" aria-hidden>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7.2 9.2A7 7 0 1 1 6.1 14.4"
                    stroke="currentColor"
                    strokeWidth="2.35"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.6 5.4L6.8 9.3l3.9 1.2"
                    stroke="currentColor"
                    strokeWidth="2.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              className="tool-chip tool-chip--history"
              onClick={redo}
              disabled={!redoStack.length}
              aria-label="Redo"
            >
              <span className="tool-chip__glyph" aria-hidden>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M16.8 9.2A7 7 0 1 0 17.9 14.4"
                    stroke="currentColor"
                    strokeWidth="2.35"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15.4 5.4L17.2 9.3l-3.9 1.2"
                    stroke="currentColor"
                    strokeWidth="2.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              className="tool-chip tool-chip--hint"
              data-active={hintPickMode ? 'true' : 'false'}
              onClick={toggleHintPick}
              disabled={won}
              aria-label={
                hintPickMode
                  ? 'Cancel hint'
                  : 'Hint — tap a cell to fill'
              }
            >
              <span className="tool-chip__glyph" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 18h6M10 21h4"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 3a6 6 0 0 0-3.5 10.8c.6.45 1 1.1 1.1 1.85V17h4.8v-1.35c.1-.75.5-1.4 1.1-1.85A6 6 0 0 0 12 3Z"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <div className="puzzle-toolbar__zoom-pair">
              <button
                type="button"
                className="tool-pad-btn tool-pad-btn--zoom"
                onClick={() => zoomBy(-0.25)}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="tool-pad-btn tool-pad-btn--zoom"
                onClick={() => zoomBy(0.25)}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {won && (
        <div className="win-overlay">
          <div className="card win-card">
            <span className="pill pill-success">Complete</span>
            <h2>Puzzle Complete!</h2>
            <div className="win-card__picture" aria-hidden>
              <SolutionThumb
                solution={puzzle.solution}
                size={puzzle.size}
                className="win-card__thumb"
              />
            </div>
            <p>Puzzle {puzzle.name}</p>
            <div className="row win-card__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const next = getNextLibraryPuzzle(
                    puzzle.id,
                    (id) =>
                      id === puzzle.id || Boolean(progressMap[id]?.completedAt),
                  )
                  if (next) navigate(`/play/${next.id}`)
                  else navigate('/library')
                }}
              >
                Next
              </button>
              <Link className="btn btn-secondary" to="/library">
                Library
              </Link>
              <Link className="btn btn-secondary" to="/">
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
