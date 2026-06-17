export async function streamSSE(url, body, onEvent) {
  const isForm = body instanceof FormData
  const res = await fetch(url, {
    method: 'POST',
    ...(isForm ? {} : { headers: { 'Content-Type': 'application/json' } }),
    body: isForm ? body : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))
        onEvent(event)
        if (event.type === 'error') throw new Error(event.message)
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e
      }
    }
  }
}
