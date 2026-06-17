export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set.')

  const url = 'https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType,
    },
    body: audioBuffer as unknown as BodyInit,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Deepgram ${response.status}: ${body}`)
  }

  const data = await response.json()
  const transcript: string | undefined =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript

  if (!transcript) throw new Error('Deepgram returned no transcript.')
  return transcript
}
