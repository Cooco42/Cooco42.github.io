import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { isStandaloneDisplay } from '@/utils/displayMode'

/** Good Sudoku–style: no bottom tab bar — navigate from Home. */
const hideChromeOn = ['/play']

export function AppShell() {
  const location = useLocation()
  const puzzleMode = hideChromeOn.some((p) => location.pathname.startsWith(p))
  const [standalone, setStandalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    const sync = () => {
      const next = isStandaloneDisplay()
      setStandalone(next)
      document.documentElement.classList.toggle('is-standalone', next)
      document.documentElement.classList.toggle('is-browser', !next)
    }
    sync()
    const mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <div
      className={`app-shell${standalone ? ' app-shell--standalone' : ' app-shell--browser'}`}
    >
      <main className={`app-main${puzzleMode ? ' puzzle-mode' : ' app-main--flush'}`}>
        <Outlet />
      </main>
    </div>
  )
}
