import { INDEX_PATH, blobBaseUrl, type Manifest } from '@/lib/manifest'
import GifGrid, { type GridGif } from './gif-grid'

export const revalidate = 60

export default async function Page() {
  const response = await fetch(`${blobBaseUrl()}/${INDEX_PATH}`, {
    next: { revalidate: 60 },
  })
  // Throwing keeps the last good page during revalidation instead of
  // replacing it with an empty one.
  if (!response.ok) throw new Error(`${INDEX_PATH}: ${response.status}`)
  const manifest: Manifest = await response.json()

  const gifs: GridGif[] = manifest.gifs
    .map(({ hash, ...gif }) => gif)
    .sort((a, b) => b.mtime - a.mtime)

  return <GifGrid gifs={gifs} updatedAt={manifest.updatedAt} />
}
