/**
 * AssemblyAI API - Server Utility
 * ==================================
 * Speech-to-text transcription for interviews, meeting recordings.
 * Free tier available.
 *
 * Setup: https://www.assemblyai.com/dashboard/signup
 */
import type { AssemblyAITranscript } from '~/types/external-apis.types'

const BASE_URL = 'https://api.assemblyai.com/v2'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.assemblyaiApiKey) throw new Error('AssemblyAI API key not configured')
  return config.assemblyaiApiKey
}

async function assemblyaiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      authorization: getApiKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Upload a local audio file and get a URL for transcription */
export async function uploadAudioFile(audioBuffer: Buffer): Promise<string> {
  const result = await $fetch<{ upload_url: string }>(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      authorization: getApiKey(),
      'Content-Type': 'application/octet-stream',
    },
    body: audioBuffer,
  })
  return result.upload_url
}

/** Start a transcription job */
export async function startTranscription(
  audioUrl: string,
  options?: {
    speakerLabels?: boolean
    languageCode?: string
    punctuate?: boolean
    formatText?: boolean
  }
): Promise<AssemblyAITranscript> {
  return assemblyaiFetch<AssemblyAITranscript>('/transcript', {
    method: 'POST',
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: options?.speakerLabels ?? true,
      language_code: options?.languageCode ?? 'en',
      punctuate: options?.punctuate ?? true,
      format_text: options?.formatText ?? true,
    }),
  })
}

/** Check transcription status / get result */
export async function getTranscription(transcriptId: string): Promise<AssemblyAITranscript> {
  return assemblyaiFetch<AssemblyAITranscript>(`/transcript/${transcriptId}`)
}

/** Poll until transcription is complete */
export async function waitForTranscription(
  transcriptId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<AssemblyAITranscript> {
  for (let i = 0; i < maxAttempts; i++) {
    const transcript = await getTranscription(transcriptId)
    if (transcript.status === 'completed' || transcript.status === 'error') {
      return transcript
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Transcription ${transcriptId} timed out after ${maxAttempts} attempts`)
}

/** Convenience: Upload audio and transcribe in one call */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options?: { speakerLabels?: boolean }
): Promise<AssemblyAITranscript> {
  const uploadUrl = await uploadAudioFile(audioBuffer)
  const job = await startTranscription(uploadUrl, options)
  return waitForTranscription(job.id)
}

/** Delete a transcription */
export async function deleteTranscription(transcriptId: string): Promise<void> {
  await assemblyaiFetch(`/transcript/${transcriptId}`, { method: 'DELETE' })
}
