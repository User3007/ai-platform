'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'

type AppShellProps = {
  children: ReactNode
}

const baseLinks = [
  { href: '/chat', label: 'AI Chat' },
  { href: '/settings', label: 'Settings' },
]

const adminLinks = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/models', label: 'Models' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/usage-logs', label: 'Usage' },
]

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [cookieRole, setCookieRole] = useState<string | null>(null)

  useEffect(() => {
    const roleCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('user_role='))
      ?.split('=')[1]

    setCookieRole(roleCookie ?? null)
  }, [user?.role])

  const effectiveRole = user?.role ?? cookieRole
  const links = effectiveRole === 'admin' ? [...baseLinks, ...adminLinks] : baseLinks

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 transition-colors duration-200 dark:bg-black dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div className="space-y-1">
            <Link href="/chat" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              AI Platform
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email ?? 'Authenticated user'}</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={async () => {
                await logout()
                router.push('/login')
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-0 md:px-6 lg:px-8">{children}</div>
    </div>
  )
}