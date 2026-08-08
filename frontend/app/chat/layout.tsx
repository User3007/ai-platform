import { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="grid min-h-[calc(100vh-89px)] grid-cols-1 gap-0 md:grid-cols-[300px_minmax(0,1fr)] md:py-6">
        <ConversationSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </AppShell>
  )
}
