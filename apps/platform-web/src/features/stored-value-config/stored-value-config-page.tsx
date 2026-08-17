import { toast } from 'sonner'

import { StoredValuePresetsCard } from './stored-value-presets-card'
import {
  createStoredValuePreset,
  deleteStoredValuePreset,
  moveStoredValuePreset,
  toggleStoredValuePreset,
  updateStoredValueSettings,
  useStoredValueConfig,
} from './stored-value-config-store'
import { StoredValueSettingsCard } from './stored-value-settings-card'

export function StoredValueConfigPage() {
  const { settings, presets } = useStoredValueConfig()

  function createPreset(input: Parameters<typeof createStoredValuePreset>[0]) {
    createStoredValuePreset(input)
    toast.success('储值档位已新增')
  }

  function togglePreset(id: string) {
    toggleStoredValuePreset(id)
    toast.success('储值档位状态已更新')
  }

  function deletePreset(id: string) {
    deleteStoredValuePreset(id)
    toast.success('储值档位已删除')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">储值配置</h1>
        <p className="text-sm text-muted-foreground">
          配置小程序储值入口、充值金额和余额使用规则。
        </p>
      </header>

      <StoredValueSettingsCard settings={settings} onSave={updateStoredValueSettings} />
      <StoredValuePresetsCard
        presets={presets}
        onCreate={createPreset}
        onToggle={togglePreset}
        onMove={moveStoredValuePreset}
        onDelete={deletePreset}
      />
    </section>
  )
}
