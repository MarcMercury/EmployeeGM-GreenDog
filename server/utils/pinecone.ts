/**
 * Pinecone API - Server Utility
 * ================================
 * Vector database for semantic search across knowledge base, SOPs, wiki.
 *
 * Setup: https://app.pinecone.io/
 */
import type { PineconeVector, PineconeQueryRequest, PineconeQueryResponse } from '~/types/external-apis.types'

function getConfig(): { apiKey: string; environment: string; indexName: string } {
  const config = useRuntimeConfig()
  if (!config.pineconeApiKey) throw new Error('Pinecone API key not configured')
  return {
    apiKey: config.pineconeApiKey,
    environment: config.pineconeEnvironment || 'us-east-1-aws',
    indexName: config.pineconeIndexName || 'employee-gm-knowledge',
  }
}

function getIndexUrl(): string {
  const { indexName, environment } = getConfig()
  return `https://${indexName}-${environment}.svc.pinecone.io`
}

async function pineconeFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey } = getConfig()
  return $fetch<T>(`${getIndexUrl()}${path}`, {
    ...options,
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Upsert vectors (e.g., embedding SOP documents) */
export async function pineconeUpsert(vectors: PineconeVector[], namespace?: string): Promise<{ upsertedCount: number }> {
  return pineconeFetch<{ upsertedCount: number }>('/vectors/upsert', {
    method: 'POST',
    body: JSON.stringify({ vectors, namespace }),
  })
}

/** Query for similar vectors (semantic search) */
export async function pineconeQuery(request: PineconeQueryRequest): Promise<PineconeQueryResponse> {
  return pineconeFetch<PineconeQueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Delete vectors by ID */
export async function pineconeDelete(ids: string[], namespace?: string): Promise<void> {
  await pineconeFetch('/vectors/delete', {
    method: 'POST',
    body: JSON.stringify({ ids, namespace }),
  })
}

/** Describe index stats */
export async function pineconeDescribeStats(): Promise<{
  namespaces: Record<string, { vectorCount: number }>
  dimension: number
  totalVectorCount: number
}> {
  return pineconeFetch('/describe_index_stats', { method: 'POST', body: '{}' })
}

/**
 * Helper: Embed text using OpenAI and upsert to Pinecone.
 * Requires OpenAI API key for embeddings.
 */
export async function embedAndUpsert(
  documents: { id: string; text: string; metadata?: Record<string, any> }[],
  namespace?: string
): Promise<{ upsertedCount: number }> {
  const config = useRuntimeConfig()
  if (!config.openaiApiKey) throw new Error('OpenAI API key needed for embeddings')

  // Get embeddings from OpenAI
  const embeddingResponse = await $fetch<{
    data: { embedding: number[]; index: number }[]
  }>(`${config.openaiBaseUrl || 'https://api.openai.com/v1'}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: documents.map(d => d.text),
      model: 'text-embedding-3-small',
    }),
  })

  const vectors: PineconeVector[] = embeddingResponse.data.map((emb, i) => ({
    id: documents[i].id,
    values: emb.embedding,
    metadata: { text: documents[i].text, ...documents[i].metadata },
  }))

  return pineconeUpsert(vectors, namespace)
}
