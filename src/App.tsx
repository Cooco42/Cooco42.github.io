import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { HomeScreen } from '@/screens/HomeScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { PuzzleScreen } from '@/screens/PuzzleScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { TutorialScreen } from '@/screens/TutorialScreen'
import { TipsScreen } from '@/screens/TipsScreen'
import { applyTheme, useAppStore } from '@/store/appStore'

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const ready = useAppStore((s) => s.ready)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    applyTheme('light')
  }, [])

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-sans)',
          color: 'var(--ink-soft)',
          background: '#222',
        }}
      >
        Loading…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="library" element={<LibraryScreen />} />
          <Route path="library/:folderId" element={<LibraryScreen />} />
          <Route path="tutorial" element={<TutorialScreen />} />
          <Route path="tips" element={<TipsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="play/:puzzleId" element={<PuzzleScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
