import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ChatDensity = 'comfortable' | 'compact'

type PreferencesState = {
  selectedModelId: string | null
  defaultWebSearch: boolean
  autoSummarizeTitles: boolean
  chatDensity: ChatDensity
  setSelectedModelId: (modelId: string | null) => void
  setDefaultWebSearch: (enabled: boolean) => void
  setAutoSummarizeTitles: (enabled: boolean) => void
  setChatDensity: (density: ChatDensity) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedModelId: null,
      defaultWebSearch: false,
      autoSummarizeTitles: true,
      chatDensity: 'comfortable',
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setDefaultWebSearch: (defaultWebSearch) => set({ defaultWebSearch }),
      setAutoSummarizeTitles: (autoSummarizeTitles) => set({ autoSummarizeTitles }),
      setChatDensity: (chatDensity) => set({ chatDensity }),
    }),
    {
      name: 'ai-platform-preferences',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        defaultWebSearch: state.defaultWebSearch,
        autoSummarizeTitles: state.autoSummarizeTitles,
        chatDensity: state.chatDensity,
      }),
    },
  ),
)
