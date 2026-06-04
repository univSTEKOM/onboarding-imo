import React from 'react'
import { Divider, Switch } from '@heroui/react'
import { CheckCircle2 } from 'lucide-react'
import { SettingRow, SettingsCard } from './settings-primitives'
import type { BackgroundStyle } from '@/hooks/use-background'
import { useTheme } from '@/hooks/use-theme'
import { useBackground } from '@/hooks/use-background'

const GRADIENT_PREVIEW = 'linear-gradient(to bottom right, rgba(121, 58, 255, 0.35), rgba(45, 212, 191, 0.25), rgba(28, 139, 242, 0.3))'

const backgroundOptions: Array<{
  value: BackgroundStyle
  label: string
  description: string
  preview: React.CSSProperties
}> = [
  {
    value: 'gradient',
    label: 'Gradient',
    description: 'Soft colorful ambient',
    preview: { background: GRADIENT_PREVIEW },
  },
  {
    value: 'gray',
    label: 'Gray',
    description: 'Soft warm gray',
    preview: { background: '#f5f5f7' },
  },
  {
    value: 'neutral',
    label: 'Neutral',
    description: 'Pure white',
    preview: { background: '#ffffff' },
  },
]

export function AppearanceSection() {
  const { isDark, setTheme } = useTheme()
  const { style, setBackground } = useBackground()

  return (
    <SettingsCard title="Appearance">
      <SettingRow
        label="Dark Mode"
        description="Switch between light and dark interface"
        action={
          <Switch isSelected={isDark} onValueChange={setTheme} size="sm" color="primary" />
        }
      />

      {!isDark && (
        <>
          <Divider />
          <SettingRow
            label="Background"
            description="Choose the app background style"
          >
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3">
              {backgroundOptions.map((option) => {
                const selected = style === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBackground(option.value)}
                    className={`
                      flex flex-col gap-2 p-3 rounded-2xl border-2 text-left
                      transition-all duration-150 cursor-pointer
                      ${selected
                        ? 'border-primary bg-primary/5'
                        : 'border-default-200 hover:border-default-400 bg-content1'
                      }
                    `}
                  >
                    <div
                      className="h-16 w-full rounded-xl bg-default-100 border border-default-100"
                      style={option.preview}
                    />
                    <div className="flex items-start justify-between gap-1 px-0.5">
                      <div>
                        <p className={`text-xs font-semibold ${selected ? 'text-primary' : 'text-default-700'}`}>
                          {option.label}
                        </p>
                        <p className="text-[10px] text-default-400 mt-0.5 leading-tight">
                          {option.description}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </SettingRow>
        </>
      )}
    </SettingsCard>
  )
}
