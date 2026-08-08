'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'
import { useChatStore } from '@/store/chatStore'
import type { ModelConfig } from '@/types'

type ModelListResponse = {
  items: ModelConfig[]
}

export function ModelSelector() {
  const { selectedModelId, setSelectedModelId } = useChatStore()
  const [models, setModels] = useState<ModelConfig[]>([])

  useEffect(() => {
    void api.get<ModelListResponse>('/models').then(({ data }) => {
      setModels(data.items)
      if (!data.items.length) {
        if (selectedModelId) {
          setSelectedModelId(null)
        }
        return
      }

      const hasSelectedModel = data.items.some((model) => model.id === selectedModelId)
      if (!hasSelectedModel) {
        setSelectedModelId(data.items[0].id)
      }
    })
  }, [selectedModelId, setSelectedModelId])

  return (
    <label className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
      <span className="font-medium text-slate-600 dark:text-slate-300">Model</span>
      <select
        value={selectedModelId ?? ''}
        onChange={(event) => setSelectedModelId(event.target.value || null)}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:focus:border-slate-500"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.display_name}
          </option>
        ))}
      </select>
    </label>
  )
}
