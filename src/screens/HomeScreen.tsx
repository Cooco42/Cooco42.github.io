import { useMemo, useState, type AnimationEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  dateKeyFromDate,
  getDailyEpochDate,
  getDailyPuzzle,
  getDailyPuzzleId,
  isDailyDatePlayable,
} from '@/data/daily'
import { getLibraryPuzzles } from '@/data/puzzles'
import { startFreshProgress, useAppStore } from '@/store/appStore'

function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function HomeScreen() {
  const navigate = useNavigate()
  const progressMap = useAppStore((s) => s.progressMap)
  const upsertProgress = useAppStore((s) => s.upsertProgress)
  const stats = useAppStore((s) => s.stats)
  const dailyRecords = useAppStore((s) => s.dailyRecords)
  const todayKey = dateKeyFromDate()
  const dailyId = getDailyPuzzleId()
  const library = getLibraryPuzzles()
  const continueId = useAppStore((s) => s.continueId)
  const resumeId = useMemo(() => {
    const open = Object.values(progressMap)
      .filter((p) => !p.completedAt && p.grid.some((c) => c !== 0))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    if (continueId) {
      const hit = open.find((p) => p.puzzleId === continueId)
      if (hit) return continueId
    }
    return open[0]?.puzzleId ?? null
  }, [continueId, progressMap])

  const dailyStatus = useMemo(() => {
    if (!dailyId) return 'Soon'

    const dailyProgress = progressMap[dailyId]
    const doneToday = Boolean(
      dailyRecords[todayKey]?.completed ||
        (dailyProgress?.dailyDateKey === todayKey && dailyProgress.completedAt),
    )
    if (doneToday) return 'Done'

    const inProgressToday = Boolean(
      dailyProgress &&
        !dailyProgress.completedAt &&
        dailyProgress.grid.some((c) => c !== 0) &&
        (dailyProgress.dailyDateKey === todayKey ||
          (resumeId === dailyId && !dailyRecords[todayKey]?.completed)),
    )
    if (inProgressToday) return 'In Progress'

    return ''
  }, [dailyId, dailyRecords, progressMap, resumeId, todayKey])
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsClosing, setStatsClosing] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  const openStats = () => {
    setStatsClosing(false)
    setStatsOpen(true)
  }

  const closeStats = () => {
    if (!statsOpen || statsClosing) return
    setStatsClosing(true)
  }

  const onStatsPanelAnimEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (!statsClosing) return
    setStatsOpen(false)
    setStatsClosing(false)
  }

  const completedInLibrary = useMemo(
    () =>
      Object.values(progressMap).filter(
        (p) => p.completedAt && library.some((q) => q.id === p.puzzleId),
      ).length,
    [progressMap, library],
  )

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    })
  }, [calendarMonth])

  const openTodayDaily = async () => {
    if (!dailyId) return
    const puzzle = getDailyPuzzle()
    if (!puzzle) return
    const progress = progressMap[puzzle.id]
    const dayDone = Boolean(dailyRecords[todayKey]?.completed)
    const progressDoneForDay = Boolean(
      progress?.completedAt &&
        (progress.dailyDateKey === todayKey || !progress.dailyDateKey),
    )
    if (dayDone || progressDoneForDay) {
      await upsertProgress(startFreshProgress(puzzle.id, puzzle.size, todayKey))
    }
    navigate(`/play/${puzzle.id}`, { state: { dailyDateKey: todayKey } })
  }

  const openDailyForDate = async (date: Date) => {
    if (!isDailyDatePlayable(date)) return
    const key = dateKeyFromDate(date)
    const puzzle = getDailyPuzzle(date)
    if (!puzzle) return
    const progress = progressMap[puzzle.id]
    const dayDone = Boolean(dailyRecords[key]?.completed)
    const progressDoneForDay = Boolean(
      progress?.completedAt &&
        (progress.dailyDateKey === key ||
          (!progress.dailyDateKey && key === todayKey)),
    )
    // Keep DailyRecord highlight; reset grid so PuzzleScreen loads playable.
    if (dayDone || progressDoneForDay) {
      await upsertProgress(startFreshProgress(puzzle.id, puzzle.size, key))
    }
    setStatsOpen(false)
    setStatsClosing(false)
    navigate(`/play/${puzzle.id}`, { state: { dailyDateKey: key } })
  }

  const today = startOfDay(new Date())
  const epoch = getDailyEpochDate()

  return (
    <div className="home-screen">
      <header className="home-hero">
        <h1 className="home-hero__title">Nonogram</h1>
        <p className="home-hero__meta">Fill the grid. Mark the blanks.</p>
      </header>

      <div className="home-panel">
        <button
          type="button"
          className="home-row"
          disabled={!dailyId}
          onClick={() => void openTodayDaily()}
        >
          <span className="home-row__label">Daily</span>
          {dailyStatus ? (
            <span className="home-row__meta">{dailyStatus}</span>
          ) : null}
        </button>

        <div className="home-divider" />

        <button
          type="button"
          className="home-row"
          onClick={() => {
            if (resumeId) {
              const progress = progressMap[resumeId]
              const key = progress?.dailyDateKey
              if (key) {
                navigate(`/play/${resumeId}?d=${encodeURIComponent(key)}`, {
                  state: { dailyDateKey: key },
                })
              } else {
                navigate(`/play/${resumeId}`)
              }
            } else navigate('/library')
          }}
        >
          <span className="home-row__label">
            Play / <span className="home-row__accent">Resume</span>
          </span>
          {resumeId ? (
            <span className="home-row__meta">In Progress</span>
          ) : null}
        </button>

        <button
          type="button"
          className="home-row"
          onClick={() => navigate('/tutorial')}
        >
          <span className="home-row__label">Tutorial</span>
        </button>

        <button
          type="button"
          className="home-row"
          onClick={() => navigate('/tips')}
        >
          <span className="home-row__label">Tips &amp; Tricks</span>
        </button>

        <div className="home-footer">
          <Link to="/settings" className="home-footer__link">
            Settings
          </Link>
          <button
            type="button"
            className="home-footer__link home-footer__stats"
            onClick={openStats}
          >
            Statistics
          </button>
        </div>
      </div>

      {statsOpen ? (
        <div
          className="stats-sheet"
          role="dialog"
          aria-label="Statistics"
          data-closing={statsClosing ? 'true' : 'false'}
        >
          <button
            type="button"
            className="stats-sheet__scrim"
            aria-label="Close statistics"
            onClick={closeStats}
          />
          <div
            className="stats-sheet__panel"
            onAnimationEnd={onStatsPanelAnimEnd}
          >
            <div className="row-between">
              <h2 className="stats-sheet__title">Statistics</h2>
              <button
                type="button"
                className="stats-sheet__close"
                onClick={closeStats}
              >
                Close
              </button>
            </div>
            <ul className="stats-sheet__list">
              <li>
                <span>Puzzles completed</span>
                <strong>{stats.puzzlesCompleted}</strong>
              </li>
              <li>
                <span>In library</span>
                <strong>
                  {completedInLibrary}/{library.length || '—'}
                </strong>
              </li>
              <li>
                <span>Current streak</span>
                <strong>{stats.currentStreak}</strong>
              </li>
              <li>
                <span>Best streak</span>
                <strong>{stats.bestStreak}</strong>
              </li>
              <li>
                <span>Play time</span>
                <strong>{formatPlayTime(stats.totalPlayMs)}</strong>
              </li>
            </ul>

            <div className="stats-cal">
              <div className="stats-cal__nav">
                <button
                  type="button"
                  className="stats-cal__nav-btn"
                  aria-label="Previous month"
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                >
                  ‹
                </button>
                <h3 className="stats-cal__month">
                  {format(calendarMonth, 'MMMM yyyy')}
                </h3>
                <button
                  type="button"
                  className="stats-cal__nav-btn"
                  aria-label="Next month"
                  disabled={isSameMonth(calendarMonth, today)}
                  onClick={() =>
                    setCalendarMonth((m) => {
                      const next = addMonths(m, 1)
                      return isAfter(startOfMonth(next), startOfMonth(today))
                        ? m
                        : next
                    })
                  }
                >
                  ›
                </button>
              </div>
              <div className="stats-cal__weekdays" aria-hidden>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={`${d}-${i}`}>{d}</span>
                ))}
              </div>
              <div className="stats-cal__grid">
                {calendarDays.map((day) => {
                  const key = dateKeyFromDate(day)
                  const inMonth = isSameMonth(day, calendarMonth)
                  const future = isAfter(day, today)
                  const beforeEpoch = isBefore(day, epoch)
                  const locked = future || beforeEpoch
                  const isToday = isSameDay(day, today)
                  const record = dailyRecords[key]
                  const playable = isDailyDatePlayable(day)
                  const puzzle = playable ? getDailyPuzzle(day) : null
                  // Prefer DailyRecord so shared pool IDs don’t false-highlight other days.
                  const done = Boolean(record?.completed)
                  const disabled = !inMonth || locked || !puzzle

                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'stats-cal__day',
                        !inMonth ? 'stats-cal__day--outside' : '',
                        locked ? 'stats-cal__day--future' : '',
                        isToday ? 'stats-cal__day--today' : '',
                        done ? 'stats-cal__day--done' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={disabled}
                      data-done={done ? 'true' : 'false'}
                      aria-label={
                        beforeEpoch
                          ? `${format(day, 'MMM d')}, before daily start`
                          : future
                            ? `${format(day, 'MMM d')}, locked`
                            : done
                              ? `${format(day, 'MMM d')}, daily solved`
                              : `Play daily for ${format(day, 'MMM d')}`
                      }
                      onClick={() => openDailyForDate(day)}
                    >
                      <span>{format(day, 'd')}</span>
                    </button>
                  )
                })}
              </div>
              <p className="stats-cal__hint">
                Solved dailies are highlighted. Tap a day to play or replay. From
                Jul 22, 2026 onward.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
