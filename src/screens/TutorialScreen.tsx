import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyAutoMarks, PuzzleBoard } from '@/components/PuzzleBoard'
import { TUTORIAL_PUZZLE, TUTORIAL_STEPS } from '@/data/tutorialPuzzle'
import { cloneGrid, indexOf, isPuzzleSolved } from '@/engine/grid'
import type { CellValue, ToolMode } from '@/engine/types'
import { playSoftClick, triggerHaptic } from '@/utils/feedback'
import { useAppStore } from '@/store/appStore'

export function TutorialScreen() {
  const navigate = useNavigate()
  const settings = useAppStore((s) => s.settings)
  const [stepIndex, setStepIndex] = useState(0)
  const [grid, setGrid] = useState<CellValue[]>(() =>
    Array.from({ length: TUTORIAL_PUZZLE.size * TUTORIAL_PUZZLE.size }, () => 0),
  )
  const [mode, setMode] = useState<ToolMode>('fill')
  const [autoMarked, setAutoMarked] = useState<Set<number>>(() => new Set())
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [status, setStatus] = useState<string | null>(null)

  const step = TUTORIAL_STEPS[stepIndex]!
  const puzzle = TUTORIAL_PUZZLE
  const complete = isPuzzleSolved(grid, puzzle)
  const tipOnly =
    step.hideBoard ||
    step.id === 'welcome' ||
    step.id === 'tip-boxes' ||
    step.id === 'tip-crosses'

  const stepDone = useMemo(() => {
    if (tipOnly) return true
    if (step.targetCells) {
      const targetsOk = step.targetCells.every(
        (t) => grid[indexOf(t.row, t.col, puzzle.size)] === t.value,
      )
      if (!targetsOk) return false
    }
    if (step.requireComplete && !complete) return false
    if (step.id === 'clues') return true
    if (step.targetCells && !step.requireComplete) return true
    if (step.requireComplete) return complete
    return true
  }, [step, tipOnly, grid, puzzle.size, complete])

  const paintCell = (row: number, col: number, paintValue: CellValue) => {
    if (tipOnly) return
    if (step.mode && mode !== step.mode) {
      setStatus(`Use the ${step.mode === 'fill' ? 'Fill' : '✕'} tool for this step.`)
      return
    }
    if (step.targetCells) {
      const allowed = step.targetCells.some((t) => t.row === row && t.col === col)
      if (!allowed) {
        setStatus('Paint the highlighted cells for this step.')
        return
      }
    }
    const i = indexOf(row, col, puzzle.size)
    let next = cloneGrid(grid)
    next[i] = paintValue
    const nextAuto = new Set(autoMarked)
    nextAuto.delete(i)
    if (settings.autoMarkComplete) {
      const result = applyAutoMarks(next, puzzle, nextAuto)
      next = result.grid
      setAutoMarked(result.autoMarked)
    } else {
      setAutoMarked(nextAuto)
    }
    setGrid(next)
    setStatus(null)
    triggerHaptic(settings.haptics, 'light')
    playSoftClick(settings.sound)
  }

  const highlight = step.targetCells?.length ? step.targetCells : null

  const goNext = () => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      navigate('/library')
      return
    }
    const nextStep = TUTORIAL_STEPS[stepIndex + 1]!
    if (nextStep.mode) setMode(nextStep.mode)
    setStepIndex((i) => i + 1)
    setStatus(null)
  }

  return (
    <div className="tutorial-play">
      <header className="tutorial-play__bar">
        <button type="button" className="gs-back" onClick={() => navigate('/')}>
          {'<<< Back'}
        </button>
        <div className="tutorial-play__progress" aria-hidden>
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              data-active={i === stepIndex ? 'true' : 'false'}
              data-done={i < stepIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      </header>

      <div className="tutorial-play__coach" key={step.id}>
        <p className="tutorial-play__eyebrow">
          Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
        </p>
        <h1>{step.title}</h1>
        <p>{step.body}</p>
        {status && <p className="tutorial-play__status">{status}</p>}
      </div>

      {!step.hideBoard ? (
        <div className="tutorial-play__stage">
          <PuzzleBoard
            puzzle={puzzle}
            grid={grid}
            highlight={highlight}
            scale={scale}
            mode={mode}
            strikeClues
            panOffset={panOffset}
            stageWidth={340}
            stageHeight={340}
            onPanCommit={(x, y) => setPanOffset({ x, y })}
            onScaleCommit={setScale}
            onPaint={paintCell}
          />
        </div>
      ) : null}

      <div className="tutorial-play__tools">
        {!tipOnly ? (
          <>
            <button
              type="button"
              className="tool-chip"
              data-active={mode === 'fill' ? 'true' : 'false'}
              onClick={() => setMode('fill')}
            >
              Fill
            </button>
            <button
              type="button"
              className="tool-chip"
              data-active={mode === 'cross' ? 'true' : 'false'}
              onClick={() => setMode('cross')}
            >
              ✕
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-primary tutorial-play__next"
          disabled={!stepDone}
          onClick={goNext}
        >
          {stepIndex >= TUTORIAL_STEPS.length - 1 ? 'Play puzzles' : 'Next'}
        </button>
      </div>
    </div>
  )
}
