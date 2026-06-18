interface DiarizedWord {
  word:       string
  start:      number
  end:        number
  speaker:    number
  punctuated_word?: string
}

function buildDiarizedTranscript(words: DiarizedWord[]): string {
  if (!words.length) return ''

  const lines: string[] = []
  let currentSpeaker = words[0].speaker
  let currentWords: string[] = []

  for (const w of words) {
    if (w.speaker !== currentSpeaker) {
      if (currentWords.length) {
        lines.push(`Speaker ${currentSpeaker}: ${currentWords.join(' ')}`)
      }
      currentSpeaker = w.speaker
      currentWords = []
    }
    currentWords.push(w.punctuated_word ?? w.word)
  }

  if (currentWords.length) {
    lines.push(`Speaker ${currentSpeaker}: ${currentWords.join(' ')}`)
  }

  return lines.join('\n')
}

async function relabelWithClaude(transcript: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return transcript

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:     'You relabel speaker labels in funeral arrangement conference transcripts. Return only the relabeled transcript with no other text, preamble, or explanation.',
      messages:   [{
        role:    'user',
        content: `The following is a transcript from a funeral arrangement conference with speaker labels. The funeral director asks questions and guides the conversation. Family members answer and make decisions about the service. Based on the conversation patterns, relabel each speaker as either "Funeral Director" or "Family Member" (if there are multiple family members use "Family Member 1", "Family Member 2" etc). Return only the relabeled transcript with no other text.\n\nTRANSCRIPT:\n${transcript}`,
      }],
    }),
  })

  if (!response.ok) return transcript

  const data = await response.json()
  const relabeled: string = data.content?.[0]?.text?.trim() ?? ''

  // Sanity check: result must still contain speaker-like labels
  if (!relabeled || !/Funeral Director:|Family Member/i.test(relabeled)) return transcript

  return relabeled
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set.')

  const url = 'https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&diarize=true'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Token ${apiKey}`,
      'Content-Type': mimeType,
    },
    body: audioBuffer as unknown as BodyInit,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Deepgram ${response.status}: ${body}`)
  }

  const data  = await response.json()
  const words: DiarizedWord[] | undefined =
    data?.results?.channels?.[0]?.alternatives?.[0]?.words

  // If diarization returned word-level data, build a labelled transcript
  if (words && words.length > 0 && words[0].speaker !== undefined) {
    const diarized = buildDiarizedTranscript(words)
    return relabelWithClaude(diarized)
  }

  // Fallback: return the plain transcript if no speaker data
  const transcript: string | undefined =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript
  if (!transcript) throw new Error('Deepgram returned no transcript.')
  return transcript
}
