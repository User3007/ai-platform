import { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-89px)] rounded-[28px] border border-slate-200 bg-[#fcfcfc] p-5 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] dark:text-slate-100 md:my-6 md:p-6">{children}</div>
    </AppShell>
  )
}
