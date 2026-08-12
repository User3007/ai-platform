export type User = {
  id: string
  email: string
  role: 'admin' | 'user'
  is_active?: boolean
}

export type AuthResponse = {
  access_token: string
  token_type: 'bearer'
  user: User & { is_active: boolean }
}

export type Conversation = {
  id: string
  title: string
  model_id: string | null
  created_at?: string
  updated_at?: string
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  search_results?: SearchResult[] | null
  rag_results?: RagCitation[] | null
  tokens_used?: number | null
  is_error?: boolean
  is_pending?: boolean
  error_code?: string | null
  error_source?: string | null
  retryable?: boolean
  retry_of_message_id?: string | null
  request_context?: MessageRequestContext | null
  warnings?: ChatWarning[] | null
  created_at?: string
}

export type MessageRequestContext = {
  conversation_id: string
  content: string
  use_search: boolean
  use_rag: boolean
  user_message_id?: string | null
}

export type ChatWarning = {
  message: string
  code?: string
  source?: string
  retryable?: boolean
}

export type PendingChatRedirect = {
  title: string
  content: string
  use_search: boolean
  use_rag: boolean
}

export type SearchResult = {
  title: string
  snippet: string
  url: string
}

export type RagCitation = {
  document_id: string
  document_name: string
  chunk_index: number
  content: string
  score?: number | null
}

export type RagDocument = {
  id: string
  filename: string
  original_filename: string
  content_type: string
  size_bytes: number
  status: string
  error_message?: string | null
  page_count?: number | null
  chunk_count: number
  uploaded_by_email?: string | null
  created_at: string
  updated_at: string
}

export type ModelConfig = {
  id: string
  display_name: string
  model_id: string
  provider_name: string
  base_url: string
  context_length: number
  is_active: boolean
}

export type AiTonePreset = 'default' | 'professional' | 'friendly' | 'concise'

export type AiToneSettings = {
  preset: AiTonePreset
  custom_instruction: string
}

export type SendMessagePayload = {
  content: string
  use_search: boolean
  use_rag: boolean
  ai_tone_preset?: AiTonePreset
  ai_tone_custom_instruction?: string
}

export type AdminModelCreatePayload = {
  display_name: string
  model_id: string
  provider_name: string
  base_url: string
  api_key: string
  context_length: number
}

export type AdminModelUpdatePayload = {
  display_name?: string
  model_id?: string
  provider_name?: string
  base_url?: string
  api_key?: string
  context_length?: number
  is_active?: boolean
}

export type SystemPromptSettings = {
  system_prompt: string
}

export type UsageLog = {
  id: string
  conversation_id: string
  user_id: string
  user_email: string
  conversation_title: string
  model_id: string | null
  model_name: string | null
  provider_name: string | null
  tokens_used: number
  created_at: string | null
  preview: string
  current_user_ask: string | null
  context_analysis: {
    message_count: number
    turn_count: number
    user_message_count: number
    assistant_message_count: number
    system_message_count: number
    search_message_count: number
    input_characters: number
    estimated_input_tokens: number
    context_window: number | null
    effective_context_limit: number | null
    context_utilization_percent: number | null
    trimmed_messages: Array<{
      role: string | null
      content: string
      estimated_tokens: number
    }>
  }
}
