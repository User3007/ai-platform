export type StreamEvent = {
  type: string
  content?: string
  delta?: string
  tokens_used?: number
  message_id?: string
  detail?: string
  message?: string
  code?: string
  source?: string
  phase?: string
  retryable?: boolean
  results?: Record<string, unknown>[]
}

export type StreamErrorDetail = {
  message: string
  code?: string
  source?: string
  retryable?: boolean
}

function normalizeErrorPayload(payload: unknown, fallback: string): StreamErrorDetail {
  if (payload && typeof payload === 'object') {
    const detail = payload as {
      detail?: string | { message?: string; code?: string; source?: string; retryable?: boolean }
      message?: string
      code?: string
      source?: string
      retryable?: boolean
    }

    if (typeof detail.detail === 'string') {
      return { message: detail.detail }
    }

    if (detail.detail && typeof detail.detail === 'object') {
      return {
        message: detail.detail.message ?? fallback,
        code: detail.detail.code,
        source: detail.detail.source,
        retryable: detail.detail.retryable,
      }
    }

    if (typeof detail.message === 'string') {
      return {
        message: detail.message,
        code: detail.code,
        source: detail.source,
        retryable: detail.retryable,
      }
    }
  }

  return { message: fallback }
}

export function parseSseChunk(chunk: string): StreamEvent[] {
  return chunk
    .split('\n\n')
    .filter(Boolean)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s*/, ''))
    .flatMap((payload) => {
      try {
        return [JSON.parse(payload) as StreamEvent]
      } catch {
        return []
      }
    })
}

export async function consumeSseStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
) {
  if (!response.ok) {
    let detail: StreamErrorDetail = { message: 'Something went wrong while sending your message.' }

    try {
      const payload = (await response.json()) as unknown
      detail = normalizeErrorPayload(payload, detail.message)
    } catch {
      // Ignore JSON parse failures for non-JSON error bodies.
    }

    const error = new Error(detail.message) as Error & { detail?: StreamErrorDetail }
    error.detail = detail
    throw error
  }

  if (!response.body) {
    const error = new Error('Streaming response body was not available.') as Error & { detail?: StreamErrorDetail }
    error.detail = {
      message: 'Streaming response body was not available.',
      code: 'stream_body_missing',
      source: 'chat',
      retryable: true,
    }
    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      for (const event of parseSseChunk(part)) {
        onEvent(event)
      }
    }

    if (done) {
      break
    }
  }

  if (buffer.trim()) {
    for (const event of parseSseChunk(buffer)) {
      onEvent(event)
    }
  }
}
