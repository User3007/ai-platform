import { create } from 'zustand'

import type { ChatWarning, Conversation, Message, MessageRequestContext, PendingChatRedirect } from '@/types'
import { usePreferencesStore } from '@/store/preferencesStore'

type ChatState = {
  conversations: Conversation[]
  messages: Message[]
  selectedModelId: string | null
  conversationError: string | null
  pendingChatRedirect: PendingChatRedirect | null
  setConversations: (conversations: Conversation[] | ((conversations: Conversation[]) => Conversation[])) => void
  setMessages: (messages: Message[]) => void
  clearMessages: () => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updater: (message: Message) => Message) => void
  removeMessage: (messageId: string) => void
  setConversationError: (error: string | null) => void
  setPendingChatRedirect: (pendingChatRedirect: PendingChatRedirect | null) => void
  attachWarningsToMessage: (messageId: string, warnings: ChatWarning[]) => void
  markMessageRetryContext: (messageId: string, requestContext: MessageRequestContext) => void
  setSelectedModelId: (modelId: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: [],
  selectedModelId: usePreferencesStore.getState().selectedModelId,
  conversationError: null,
  pendingChatRedirect: null,
  setConversations: (conversations) =>
    set((state) => ({
      conversations: typeof conversations === 'function' ? conversations(state.conversations) : conversations,
    })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], conversationError: null, pendingChatRedirect: null }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (messageId, updater) =>
    set((state) => ({
      messages: state.messages.map((message) => (message.id === messageId ? updater(message) : message)),
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== messageId),
    })),
  setConversationError: (conversationError) => set({ conversationError }),
  setPendingChatRedirect: (pendingChatRedirect) => set({ pendingChatRedirect }),
  attachWarningsToMessage: (messageId, warnings) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              warnings,
            }
          : message,
      ),
    })),
  markMessageRetryContext: (messageId, requestContext) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              request_context: requestContext,
            }
          : message,
      ),
    })),
  setSelectedModelId: (selectedModelId) => {
    usePreferencesStore.getState().setSelectedModelId(selectedModelId)
    set({ selectedModelId })
  },
}))
