'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import type { AdminModelCreatePayload, AdminModelUpdatePayload, ModelConfig } from '@/types'

type ModelListResponse = {
  items: ModelConfig[]
}

type ModelCreateResponse = ModelConfig | { id: string }

export function ModelTable() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [form, setForm] = useState<AdminModelCreatePayload>({
    display_name: '',
    model_id: '',
    provider_name: '',
    base_url: '',
    api_key: '',
    context_length: 4096,
  })
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AdminModelCreatePayload>({
    display_name: '',
    model_id: '',
    provider_name: '',
    base_url: '',
    api_key: '',
    context_length: 4096,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }

      if (error.response?.data && typeof error.response.data === 'object') {
        const serialized = JSON.stringify(error.response.data)
        if (serialized && serialized !== '{}') {
          return serialized
        }
      }

      if (error.message?.trim()) {
        return error.message
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message
    }

    return fallback
  }

  const loadModels = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ModelListResponse>('/admin/models')
      setModels(data.items)
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load models.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.api_key.trim()) {
      setError('API key is required.')
      return
    }

    try {
      const { data } = await api.post<ModelCreateResponse>('/admin/models', form)

      if ('id' in data && !('display_name' in data)) {
        throw new Error('Model was created but the server returned an outdated response shape. Refresh the backend and try again.')
      }

      setForm({
        display_name: '',
        model_id: '',
        provider_name: '',
        base_url: '',
        api_key: '',
        context_length: 4096,
      })
      await loadModels()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to create model.'))
    }
  }

  const startEditing = (model: ModelConfig) => {
    setError(null)
    setEditingModelId(model.id)
    setEditForm({
      display_name: model.display_name,
      model_id: model.model_id,
      provider_name: model.provider_name,
      base_url: model.base_url,
      api_key: '',
      context_length: model.context_length,
    })
  }

  const cancelEditing = () => {
    setEditingModelId(null)
    setEditForm({
      display_name: '',
      model_id: '',
      provider_name: '',
      base_url: '',
      api_key: '',
      context_length: 4096,
    })
  }

  const handleEdit = async (event: FormEvent<HTMLFormElement>, model: ModelConfig) => {
    event.preventDefault()
    setError(null)

    const payload: AdminModelUpdatePayload = {
      display_name: editForm.display_name,
      model_id: editForm.model_id,
      provider_name: editForm.provider_name,
      base_url: editForm.base_url,
      context_length: editForm.context_length,
    }

    if (editForm.api_key.trim()) {
      payload.api_key = editForm.api_key.trim()
    }

    try {
      await api.patch(`/admin/models/${model.id}`, payload)
      cancelEditing()
      await loadModels()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to update model.'))
    }
  }

  const toggleActive = async (model: ModelConfig) => {
    setError(null)
    try {
      await api.patch(`/admin/models/${model.id}`, { is_active: !model.is_active })
      await loadModels()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to update model.'))
    }
  }

  const removeModel = async (modelId: string) => {
    setError(null)
    try {
      await api.delete(`/admin/models/${modelId}`)
      await loadModels()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to delete model.'))
    }
  }

  const fieldClassName =
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-100 dark:focus:border-slate-500'

  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717] md:p-5">
      <form className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111111]" onSubmit={handleCreate}>
        <div className="space-y-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add a model</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a model entry that chat users can select. Each model stores its own provider API key entered by an admin.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#171717] dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-white">Example</p>
            <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Display name:</span> GPT-5.4 Mini</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Model ID:</span> gpt-5.4-mini</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Provider:</span> azure-openai</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">API key:</span> your-provider-key</p>
              <p className="sm:col-span-2"><span className="font-medium text-slate-700 dark:text-slate-200">Base URL:</span> https://your-resource.openai.azure.com/</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Context length:</span> 128000</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Display name</span>
            <input className={fieldClassName} placeholder="GPT-5.4 Mini" value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Shown in the model picker for chat users.</span>
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Model ID</span>
            <input className={fieldClassName} placeholder="gpt-5.4-mini" value={form.model_id} onChange={(event) => setForm((current) => ({ ...current, model_id: event.target.value }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Use the exact deployment or model identifier expected by the provider.</span>
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Provider name</span>
            <input className={fieldClassName} placeholder="azure-openai" value={form.provider_name} onChange={(event) => setForm((current) => ({ ...current, provider_name: event.target.value }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Use a supported backend provider type such as <code>azure-openai</code> or <code>openai</code>.</span>
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Base URL</span>
            <input className={fieldClassName} placeholder="https://your-resource.openai.azure.com/" value={form.base_url} onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Use the provider endpoint root, not a chat completions path.</span>
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">API key</span>
            <input className={fieldClassName} placeholder="Paste provider API key" type="password" value={form.api_key} onChange={(event) => setForm((current) => ({ ...current, api_key: event.target.value }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Required for new models. The backend stores it in `backend/config/api_keys.yaml` under an internal model-owned entry.</span>
          </label>
          <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Context length</span>
            <input className={fieldClassName} placeholder="128000" type="number" value={form.context_length} onChange={(event) => setForm((current) => ({ ...current, context_length: Number(event.target.value) }))} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Set the model context window in tokens, for example 4096 or 128000.</span>
          </label>
        </div>
        <button className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white" type="submit">
          Create model
        </button>
      </form>
      <div className="grid gap-3">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading models...</p> : null}
        {models.map((model) => (
          <div key={model.id} className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-[#111111] md:flex-row md:items-center md:justify-between">
            {editingModelId === model.id ? (
              <form className="grid flex-1 gap-3" onSubmit={(event) => void handleEdit(event, model)}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={fieldClassName} value={editForm.display_name} onChange={(event) => setEditForm((current) => ({ ...current, display_name: event.target.value }))} />
                  <input className={fieldClassName} value={editForm.model_id} onChange={(event) => setEditForm((current) => ({ ...current, model_id: event.target.value }))} />
                  <input className={fieldClassName} value={editForm.provider_name} onChange={(event) => setEditForm((current) => ({ ...current, provider_name: event.target.value }))} />
                  <input className={fieldClassName} value={editForm.base_url} onChange={(event) => setEditForm((current) => ({ ...current, base_url: event.target.value }))} />
                  <input className={fieldClassName} placeholder="Leave blank to keep current API key" type="password" value={editForm.api_key} onChange={(event) => setEditForm((current) => ({ ...current, api_key: event.target.value }))} />
                  <input className={fieldClassName} type="number" value={editForm.context_length} onChange={(event) => setEditForm((current) => ({ ...current, context_length: Number(event.target.value) }))} />
                </div>
                <div className="flex gap-2">
                  <button className="rounded-full bg-slate-900 px-3 py-1 text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white" type="submit">
                    Save
                  </button>
                  <button className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]" onClick={cancelEditing} type="button">
                    Cancel
                  </button>
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
              </form>
            ) : (
              <>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{model.display_name}</div>
                  <div className="text-slate-500 dark:text-slate-400">{model.provider_name} · {model.model_id} · {model.is_active ? 'active' : 'inactive'}</div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]" onClick={() => startEditing(model)} type="button">
                    Edit
                  </button>
                  <button className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]" onClick={() => void toggleActive(model)} type="button">
                    {model.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="rounded-full border border-red-200 px-3 py-1 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" onClick={() => void removeModel(model.id)} type="button">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {!loading && models.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-400">No models yet. Add a model to make chat available.</p> : null}
      </div>
    </div>
  )
}
