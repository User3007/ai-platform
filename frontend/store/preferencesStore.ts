import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AiTonePreset } from '@/types'

type ChatDensity = 'comfortable' | 'compact'

type PreferencesState = {
  selectedModelId: string | null
  defaultWebSearch: boolean
  autoSummarizeTitles: boolean
  chatDensity: ChatDensity
  aiTonePreset: AiTonePreset
  aiToneCustomInstruction: string
  setSelectedModelId: (modelId: string | null) => void
  setDefaultWebSearch: (enabled: boolean) => void
  setAutoSummarizeTitles: (enabled: boolean) => void
  setChatDensity: (density: ChatDensity) => void
  setAiTonePreset: (preset: AiTonePreset) => void
  setAiToneCustomInstruction: (instruction: string) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedModelId: null,
      defaultWebSearch: false,
      autoSummarizeTitles: true,
      chatDensity: 'comfortable',
      aiTonePreset: 'default',
      aiToneCustomInstruction: '',
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setDefaultWebSearch: (defaultWebSearch) => set({ defaultWebSearch }),
      setAutoSummarizeTitles: (autoSummarizeTitles) => set({ autoSummarizeTitles }),
      setChatDensity: (chatDensity) => set({ chatDensity }),
      setAiTonePreset: (aiTonePreset) => set({ aiTonePreset }),
      setAiToneCustomInstruction: (aiToneCustomInstruction) => set({ aiToneCustomInstruction }),
    }),
    {
      name: 'ai-platform-preferences',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        defaultWebSearch: state.defaultWebSearch,
        autoSummarizeTitles: state.autoSummarizeTitles,
        chatDensity: state.chatDensity,
        aiTonePreset: state.aiTonePreset,
        aiToneCustomInstruction: state.aiToneCustomInstruction,
      }),
    },
  ),
)
