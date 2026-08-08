'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import type { User } from '@/types'

type UserListResponse = {
  items: Array<User & { is_active: boolean }>
}

export function UserTable() {
  const [users, setUsers] = useState<UserListResponse['items']>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
    }

    return fallback
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<UserListResponse>('/admin/users/')
      setUsers(data.items)
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load users.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await api.post('/admin/users/', {
        email,
        password,
        role,
        is_active: isActive,
      })
      setEmail('')
      setPassword('')
      setRole('user')
      setIsActive(true)
      await loadUsers()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to create user.'))
    }
  }

  const toggleActive = async (user: User & { is_active: boolean }) => {
    setError(null)
    try {
      await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active })
      await loadUsers()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to update user.'))
    }
  }

  const removeUser = async (userId: string) => {
    setError(null)
    try {
      await api.delete(`/admin/users/${userId}`)
      await loadUsers()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to delete user.'))
    }
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717] md:p-5">
      <form className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111111]" onSubmit={handleCreate}>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add a user</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create workspace accounts and control whether they can sign in immediately.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-100 dark:focus:border-slate-500"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Password</span>
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-100 dark:focus:border-slate-500"
              placeholder="Create a temporary password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Role</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-100 dark:focus:border-slate-500"
              value={role}
              onChange={(event) => setRole(event.target.value as 'admin' | 'user')}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-slate-600 dark:bg-[#111111] dark:text-slate-100"
            />
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-200">Active account</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Inactive users remain in the system but cannot sign in.</span>
            </span>
          </label>
        </div>
        <button className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white" type="submit">
          Create user
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
      <div className="grid gap-3">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading users...</p> : null}
        {users.map((user) => (
          <div key={user.id} className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-[#111111] md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
              <div className="text-slate-500 dark:text-slate-400">{user.role} · {user.is_active ? 'active' : 'inactive'}</div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]" onClick={() => void toggleActive(user)} type="button">
                {user.is_active ? 'Disable' : 'Enable'}
              </button>
              <button className="rounded-full border border-red-200 px-3 py-1 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" onClick={() => void removeUser(user.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-400">No users yet. Create the first user above.</p> : null}
      </div>
    </div>
  )
}
