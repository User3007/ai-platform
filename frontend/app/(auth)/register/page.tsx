'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading } = useAuth()
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('user12345')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await register({ email, password })
      router.push('/chat')
    } catch {
      setError('Registration failed. Check backend status.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fcfcfc] px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
        <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">Create account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Create an account for local access and testing.</p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Registration should be disabled in production by default.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100 dark:focus:border-slate-500"
            placeholder="Email"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100 dark:focus:border-slate-500"
            placeholder="Password"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-slate-700 underline-offset-4 hover:underline dark:text-slate-200">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
