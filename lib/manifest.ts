// Shared between the Next.js site and the local sync script (sync/sync.ts).
// The blob store is the only shared state: originals live at their exact
// filename, everything generated lives under `_/`.

export const INDEX_PATH = '_/index.json'
export const EMBEDDINGS_PATH = '_/embeddings.json'
export const POSTER_PREFIX = '_/thumbs/'

export const EMBEDDING_MODEL = 'voyage/voyage-4-lite'
export const EMBEDDING_DIMENSIONS = 512

export interface Caption {
  caption: string
  tags: string[]
  text: string
  usage: string
}

export interface Gif {
  /** Exact filename, extension and case included. Also the URL path. */
  name: string
  size: number
  mtime: number
  width: number
  height: number
  frames: number
  /** Content hash, so a touched-but-unchanged or renamed file isn't redone. */
  hash?: string
  /** Finder tags, read from the file on every sync. */
  tags: string[]
  ai?: Caption
}

export interface Manifest {
  updatedAt: string
  gifs: Gif[]
}

export interface Embeddings {
  model: string
  dimensions: number
  /**
   * `key` hashes the text that was embedded, so a changed caption or Finder
   * tag triggers a re-embed. `vector` is a base64 Float32Array.
   */
  entries: Record<string, { key: string; vector: string }>
}

export function posterPath(name: string) {
  return `${POSTER_PREFIX}${name}.webp`
}

export function embeddingText(gif: Gif) {
  const words = gif.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return [
    words,
    gif.ai?.caption,
    gif.ai?.usage,
    gif.ai?.text,
    [...gif.tags, ...(gif.ai?.tags ?? [])].join(', '),
  ]
    .filter(Boolean)
    .join('\n')
}

export function blobBaseUrl() {
  const url = process.env.GIF_BLOB_BASE_URL
  if (!url) throw new Error('GIF_BLOB_BASE_URL is not set')
  return url.replace(/\/$/, '')
}

export function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function encodeVector(vector: number[]) {
  return Buffer.from(new Float32Array(vector).buffer).toString('base64')
}

export function decodeVector(base64: string) {
  const bytes = Buffer.from(base64, 'base64')
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}
