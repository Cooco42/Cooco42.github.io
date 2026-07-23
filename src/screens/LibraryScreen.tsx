import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SolutionThumb } from '@/components/SolutionThumb'
import { SudokuGlyph } from '@/components/SudokuGlyph'
import {
  getFolderById,
  getLibraryPuzzles,
  getPuzzlesInFolder,
  getSizeFolders,
} from '@/data/puzzles'
import { useAppStore } from '@/store/appStore'

const PAGE_SIZE = 5

function rangeLabel(start: number, end: number) {
  return `${start}-${end}`
}

export function LibraryScreen() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const progressMap = useAppStore((s) => s.progressMap)
  const library = getLibraryPuzzles()
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [folderId])

  if (folderId) {
    const folder = getFolderById(folderId)
    const puzzles = getPuzzlesInFolder(folderId)
    if (!folder) {
      return (
        <div className="screen">
          <p>Folder not found.</p>
          <Link to="/library">Back</Link>
        </div>
      )
    }

    const done = puzzles.filter((p) => progressMap[p.id]?.completedAt).length
    const totalPages = Math.max(1, Math.ceil(puzzles.length / PAGE_SIZE))
    const safePage = Math.min(Math.max(0, page), totalPages - 1)
    const pagePuzzles = puzzles.slice(
      safePage * PAGE_SIZE,
      (safePage + 1) * PAGE_SIZE,
    )
    const hasPrev = safePage > 0
    const hasNext = safePage < totalPages - 1
    const prevStart = (safePage - 1) * PAGE_SIZE + 1
    const prevEnd = safePage * PAGE_SIZE
    const nextStart = (safePage + 1) * PAGE_SIZE + 1
    const nextEnd = Math.min((safePage + 2) * PAGE_SIZE, puzzles.length)

    return (
      <div className="gs-screen">
        <header className="gs-hero">
          <button
            type="button"
            className="gs-back"
            onClick={() => navigate('/library')}
          >
            {'<<< Back'}
          </button>
          <h1 className="gs-hero__title">{folder.name}</h1>
          <p className="gs-hero__meta">
            {done}/{puzzles.length} done
          </p>
        </header>
        <div className="gs-panel">
          <p className="gs-rule">Play —</p>
          <div className="gs-list" key={safePage}>
            {pagePuzzles.map((puzzle) => {
              const progress = progressMap[puzzle.id]
              const solved = Boolean(progress?.completedAt)
              const hasMarks = progress?.grid?.some((c) => c !== 0) ?? false
              const started = hasMarks && !solved
              const status = solved ? 'Done' : hasMarks ? 'Open' : ''
              const liveThumb =
                progress?.grid?.map((c) => (c === 1 ? 1 : 0)) ?? []
              return (
                <Link
                  key={puzzle.id}
                  to={`/play/${puzzle.id}`}
                  className="gs-list-item"
                >
                  <span className="gs-list-icon" aria-hidden>
                    {solved ? (
                      <SolutionThumb
                        solution={puzzle.solution}
                        size={puzzle.size}
                        className="gs-list-icon__svg"
                      />
                    ) : started ? (
                      <SolutionThumb
                        solution={liveThumb}
                        size={puzzle.size}
                        className="gs-list-icon__svg"
                        paper="#fdd044"
                      />
                    ) : (
                      <SudokuGlyph className="gs-list-icon__svg" />
                    )}
                  </span>
                  <span className="gs-list-name">Puzzle {puzzle.name}</span>
                  <span className="gs-list-status">{status}</span>
                </Link>
              )
            })}
          </div>
          {totalPages > 1 ? (
            <nav className="gs-page-nav" aria-label="Puzzle pages">
              <div className="gs-page-nav__row">
                {hasPrev ? (
                  <button
                    type="button"
                    className="gs-page-nav__btn"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    {`← ${rangeLabel(prevStart, prevEnd)}`}
                  </button>
                ) : (
                  <span className="gs-page-nav__spacer" />
                )}
                {hasNext ? (
                  <button
                    type="button"
                    className="gs-page-nav__btn"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                  >
                    {`${rangeLabel(nextStart, nextEnd)} →`}
                  </button>
                ) : (
                  <span className="gs-page-nav__spacer" />
                )}
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    )
  }

  const totalDone = Object.values(progressMap).filter(
    (p) => p.completedAt && library.some((q) => q.id === p.puzzleId),
  ).length
  const folders = getSizeFolders()

  return (
    <div className="gs-screen">
      <header className="gs-hero">
        <button type="button" className="gs-back" onClick={() => navigate('/')}>
          {'<<< Back'}
        </button>
        <h1 className="gs-hero__title">Play</h1>
        <p className="gs-hero__meta">
          {library.length === 0
            ? 'Loading…'
            : `${totalDone} of ${library.length} completed`}
        </p>
      </header>
      <div className="gs-panel">
        <p className="gs-rule">Play —</p>
        {library.length === 0 ? (
          <p className="gs-empty">Puzzle pack still loading.</p>
        ) : (
          <div className="gs-list">
            {folders.map((folder) => {
              const puzzles = getPuzzlesInFolder(folder.id)
              const done = puzzles.filter(
                (p) => progressMap[p.id]?.completedAt,
              ).length
              return (
                <Link
                  key={folder.id}
                  to={`/library/${folder.id}`}
                  className="gs-list-item"
                >
                  <span className="gs-list-icon" aria-hidden>
                    <SudokuGlyph className="gs-list-icon__svg" />
                  </span>
                  <span className="gs-list-name">{folder.name}</span>
                  <span className="gs-list-status">
                    {done}/{puzzles.length}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
