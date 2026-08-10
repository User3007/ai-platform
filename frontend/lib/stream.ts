export type StreamEvent = {
  type: string
  content?: string
  delta?: string
  tokens_used?: number
  message_id?: string
  detail?: string
  source?: string
  phase?: string
  results?: Record<string, unknown>[]
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
    let detail = 'Something went wrong while sending your message.'

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload?.detail) {
        detail = payload.detail
      }
    } catch {
      // Ignore JSON parse failures for non-JSON error bodies.
    }

    throw new Error(detail)
  }

  if (!response.body) {
    throw new Error('Streaming response body was not available.')
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
