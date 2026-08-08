'use client'

import { UserTable } from '@/components/admin/UserTable'

export default function AdminUsersPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Manage access and roles for workspace users.</p>
      <UserTable />
    </main>
  )
}
