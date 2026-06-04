import React from 'react'

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-content1 rounded-2xl border border-default-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-default-100">
        <h2 className="text-xs font-bold text-default-400 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-6 flex flex-col gap-5">{children}</div>
    </div>
  )
}

export function SettingRow({
  label,
  description,
  action,
  children,
}: {
  label: string
  description: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-default-700">{label}</p>
          <p className="text-xs text-default-400 mt-0.5">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
