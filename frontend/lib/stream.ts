export type StreamEvent = {
  type: string
  content?: string
  tokens_used?: number
  message_id?: string
  detail?: string
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
