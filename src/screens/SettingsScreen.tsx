import { useNavigate } from 'react-router-dom'
import { Card, Switch } from '@/components/ui'
import { useAppStore } from '@/store/appStore'

export function SettingsScreen() {
  const navigate = useNavigate()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const resetData = useAppStore((s) => s.resetData)

  return (
    <div className="gs-screen">
      <header className="gs-hero gs-hero--compact">
        <button type="button" className="gs-back" onClick={() => navigate('/')}>
          {'<<< Back'}
        </button>
        <h1 className="gs-hero__title">Settings</h1>
      </header>
      <div className="gs-panel">
        <p className="gs-rule">Options —</p>
        <Card>
          <div className="settings-row">
            <div className="settings-row__label">Sound</div>
            <Switch
              on={settings.sound}
              label="Toggle sound"
              onToggle={() => void updateSettings({ sound: !settings.sound })}
            />
          </div>
          <div className="settings-row">
            <div className="settings-row__label">Haptics</div>
            <Switch
              on={settings.haptics}
              label="Toggle haptics"
              onToggle={() => void updateSettings({ haptics: !settings.haptics })}
            />
          </div>
          <div className="settings-row">
            <div className="settings-row__label">Auto-mark</div>
            <Switch
              on={settings.autoMarkComplete}
              label="Toggle auto-mark"
              onToggle={() =>
                void updateSettings({
                  autoMarkComplete: !settings.autoMarkComplete,
                })
              }
            />
          </div>
        </Card>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: 18 }}
          onClick={() => {
            if (window.confirm('Clear all local progress on this device?')) {
              void resetData()
            }
          }}
        >
          Clear data
        </button>
      </div>
    </div>
  )
}
