/**
 * Google Gemini API - Server Utility
 * =====================================
 * Multimodal AI — analyze images, documents, generate content.
 * Free tier available.
 *
 * Setup: https://ai.google.dev/
 */
import type { GeminiGenerateRequest, GeminiGenerateResponse, GeminiContent } from '~/types/external-apis.types'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.geminiApiKey) throw new Error('Google Gemini API key not configured')
  return config.geminiApiKey
}

function getModel(): string {
  const config = useRuntimeConfig()
  return config.geminiModel || 'gemini-1.5-flash'
}

/** Generate text content */
export async function geminiGenerate(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<string> {
  const apiKey = getApiKey()
  const model = options?.model || getModel()

  const request: GeminiGenerateRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  }

  const response = await $fetch<GeminiGenerateResponse>(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', body: request }
  )

  return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/** Generate with multimodal input (image + text) */
export async function geminiAnalyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: { model?: string }
): Promise<string> {
  const apiKey = getApiKey()
  const model = options?.model || getModel()

  const request: GeminiGenerateRequest = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ],
    }],
  }

  const response = await $fetch<GeminiGenerateResponse>(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', body: request }
  )

  return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/** Multi-turn conversation */
export async function geminiChat(
  messages: GeminiContent[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<string> {
  const apiKey = getApiKey()
  const model = options?.model || getModel()

  const request: GeminiGenerateRequest = {
    contents: messages,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  }

  const response = await $fetch<GeminiGenerateResponse>(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', body: request }
  )

  return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}
