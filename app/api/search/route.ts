import { embed } from 'ai'
import {
  EMBEDDINGS_PATH,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  blobBaseUrl,
  decodeVector,
  type Embeddings,
} from '@/lib/manifest'

const LIMIT = 60
// Voyage scores unrelated captions around 0.2–0.35 and good matches only a
// little higher, so a fixed cutoff either floods or starves. Keep what is
// close to the best match instead.
const FLOOR = 0.35
const MARGIN = 0.12
const TTL = 5 * 60 * 1000

let cache: { loadedAt: number; vectors: [string, Float32Array][] } | undefined

async function vectors() {
  if (cache && Date.now() - cache.loadedAt < TTL) return cache.vectors
  // ~3 MB, over the Data Cache item limit, so it's held in module scope and
  // shared across requests by the warm instance instead.
  const response = await fetch(`${blobBaseUrl()}/${EMBEDDINGS_PATH}`, {
    cache: 'no-store',
  })
  if (!response.ok) return cache?.vectors ?? []
  const data: Embeddings = await response.json()
  cache = {
    loadedAt: Date.now(),
    vectors: Object.entries(data.entries).map(([name, { vector }]) => [
      name,
      decodeVector(vector),
    ]),
  }
  return cache.vectors
}

function cosine(a: ArrayLike<number>, b: ArrayLike<number>) {
  let dot = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    aa += a[i] * a[i]
    bb += b[i] * b[i]
  }
  return dot / Math.sqrt(aa * bb)
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 200)
  if (!query) return Response.json({ results: [] })

  let embedding: number[]
  let all: [string, Float32Array][]
  try {
    ;[{ embedding }, all] = await Promise.all([
      // No retries: a slow answer is worse than none, fuzzy results already show.
      embed({
        model: EMBEDDING_MODEL,
        value: query,
        dimensions: EMBEDDING_DIMENSIONS,
        maxRetries: 0,
      }),
      vectors(),
    ])
  } catch (error) {
    console.error(error)
    return Response.json({ results: [] }, { status: 502 })
  }
  const scored = all
    .map(([name, vector]) => ({ name, score: cosine(embedding, vector) }))
    .sort((a, b) => b.score - a.score)
  const cutoff = Math.max(FLOOR, (scored[0]?.score ?? 0) - MARGIN)
  const results = scored.filter((result) => result.score >= cutoff).slice(0, LIMIT)

  return Response.json(
    { results },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  )
}
