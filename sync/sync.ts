// Mirrors the gifs folder into the Vercel Blob store and keeps `_/index.json`
// and `_/embeddings.json` up to date. Safe to run any time: the remote index
// is the only state, so an interrupted run picks up where it stopped.
//
//   bun run sync              upload, delete, caption, embed
//   bun run sync --dry-run    print what would change
//   bun run sync --no-ai      skip captions and embeddings
//   bun run sync --backfill   caption without the per-run time limit
//   bun run sync --allow-deletes   permit removing more than MAX_DELETES files

import { del, get, put } from '@vercel/blob'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import {
  EMBEDDINGS_PATH,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  INDEX_PATH,
  embeddingText,
  encodeVector,
  posterPath,
  type Embeddings,
  type Gif,
  type Manifest,
} from '../lib/manifest'
import { CONFIG_PATH, loadConfig } from './config'
import { createEnricher } from './enrich'
import { readFinderTags } from './finder-tags'
import { contactSheet, inspect, poster } from './media'

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}
const CONCURRENCY = 4
const CHECKPOINT_EVERY = 25
// Bounds a run so a long caption backlog never holds up the next new file:
// launchd won't start another run until this one exits.
const CAPTION_MINUTES = 10
const MAX_DELETES = 25

const config = loadConfig()
const flags = new Set(process.argv.slice(2))
const dryRun = flags.has('--dry-run')
const enricher =
  !flags.has('--no-ai') && config.gatewayKey
    ? createEnricher(config.gatewayKey, config.captionModel, config.captionsPerMinute)
    : null

const log = (message: string) =>
  console.log(`${new Date().toISOString()} ${message}`)

interface LocalFile {
  size: number
  mtime: number
}

async function scan(): Promise<Map<string, LocalFile>> {
  const names = (await readdir(config.dir)).filter(
    (name) => !name.startsWith('.') && extname(name).toLowerCase() in CONTENT_TYPES
  )
  const files = new Map<string, LocalFile>()
  for (const name of names) {
    // stat only: reading an online-only file would force a download.
    const info = await stat(join(config.dir, name))
    if (info.isFile()) {
      files.set(name, { size: info.size, mtime: Math.round(info.mtimeMs) })
    }
  }
  return files
}

async function readJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, {
    access: 'public',
    useCache: false,
    token: config.blobToken,
  })
  if (!result || result.statusCode !== 200) return null
  return (await new Response(result.stream).json()) as T
}

function upload(
  pathname: string,
  body: Buffer | string,
  contentType: string,
  cacheControlMaxAge: number
) {
  return put(pathname, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge,
    contentType,
    token: config.blobToken,
  })
}

function hashOf(buffer: Buffer) {
  return new Bun.CryptoHasher('sha256').update(buffer).digest('hex').slice(0, 16)
}

async function eachLimit<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  concurrency = CONCURRENCY
) {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        await fn(items[index], index)
      }
    })
  )
}

async function sync() {
  let local = await scan()
  const newest = Math.max(0, ...[...local.values()].map((file) => file.mtime))
  if (Date.now() - newest < 10_000) {
    // A file is probably still being written by Finder or the sync client.
    await Bun.sleep(10_000)
    local = await scan()
  }

  const [manifest, embeddings, finderTags] = await Promise.all([
    readJson<Manifest>(INDEX_PATH),
    readJson<Embeddings>(EMBEDDINGS_PATH),
    readFinderTags(config.dir),
  ])
  const gifs = new Map((manifest?.gifs ?? []).map((gif) => [gif.name, gif]))
  const vectors: Embeddings = embeddings?.model === EMBEDDING_MODEL &&
    embeddings.dimensions === EMBEDDING_DIMENSIONS
    ? embeddings
    : { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, entries: {} }

  const changed = [...local].filter(([name, file]) => {
    const gif = gifs.get(name)
    return !gif || gif.size !== file.size || gif.mtime !== file.mtime
  })
  const removed = [...gifs.keys()].filter((name) => !local.has(name))
  const uncaptioned = () =>
    enricher ? [...gifs.values()].filter((gif) => !gif.ai) : []

  log(
    `${local.size} local, ${gifs.size} remote: ${changed.length} to upload, ${removed.length} to delete`
  )
  if (dryRun) {
    for (const [name] of changed) log(`  + ${name}`)
    for (const name of removed) log(`  - ${name}`)
    log(`${uncaptioned().length} without captions${enricher ? '' : ' (AI off)'}`)
    return
  }

  // A folder mid-move, or a cloud client that briefly shows it empty, looks
  // exactly like a mass delete, and would take the URLs down with it.
  if (removed.length > MAX_DELETES && !flags.has('--allow-deletes')) {
    throw new Error(
      `Refusing to delete ${removed.length} of ${gifs.size} gifs in one run. ` +
        `Check that ${config.dir} is complete, then run: bun run sync --allow-deletes`
    )
  }

  let dirty = false
  let pending = Promise.resolve()
  const save = () => {
    // Serialised so concurrent workers never race two writes of the index.
    pending = pending.then(async () => {
      const sorted = [...gifs.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { numeric: true })
      )
      const next: Manifest = { updatedAt: new Date().toISOString(), gifs: sorted }
      await upload(INDEX_PATH, JSON.stringify(next), 'application/json', 60)
    })
    return pending
  }

  // Captions are keyed by content, so a renamed file keeps its caption.
  const captionsByHash = new Map(
    removed.flatMap((name) => {
      const gif = gifs.get(name)!
      return gif.hash && gif.ai ? [[gif.hash, gif.ai] as const] : []
    })
  )

  if (removed.length) {
    await del([...removed, ...removed.map(posterPath)], { token: config.blobToken })
    for (const name of removed) {
      gifs.delete(name)
      log(`deleted ${name}`)
    }
    dirty = true
  }

  let done = 0
  await eachLimit(changed, async ([name, file]) => {
    try {
      const buffer = await readFile(join(config.dir, name))
      const hash = hashOf(buffer)
      const existing = gifs.get(name)
      if (existing?.hash === hash) {
        // Touched but not changed, e.g. after moving the folder.
        gifs.set(name, { ...existing, size: file.size, mtime: file.mtime })
      } else {
        const dimensions = await inspect(buffer)
        await Promise.all([
          upload(name, buffer, CONTENT_TYPES[extname(name).toLowerCase()], 86_400),
          upload(posterPath(name), await poster(buffer, dimensions.frames), 'image/webp', 86_400),
        ])
        gifs.set(name, {
          name,
          ...file,
          ...dimensions,
          hash,
          tags: [],
          ai: captionsByHash.get(hash),
        })
      }
      dirty = true
      log(`[${++done}/${changed.length}] uploaded ${name}`)
    } catch (error) {
      log(`[${++done}/${changed.length}] FAILED ${name}: ${error}`)
    }
    if (done % CHECKPOINT_EVERY === 0) await save()
  })

  for (const gif of gifs.values()) {
    const tags = finderTags[gif.name] ?? []
    if (tags.join('\n') !== gif.tags.join('\n')) {
      gif.tags = tags
      dirty = true
    }
  }

  if (enricher) {
    const todo = uncaptioned()
    const deadline = flags.has('--backfill')
      ? Infinity
      : Date.now() + CAPTION_MINUTES * 60_000
    let captioned = 0
    await eachLimit(todo, async (gif) => {
      if (Date.now() > deadline) return
      try {
        const buffer = await readFile(join(config.dir, gif.name))
        gif.ai = await enricher.caption(
          gif.name,
          await contactSheet(buffer, gif.frames),
          gif.frames
        )
        dirty = true
        log(`[${++captioned}/${todo.length}] captioned ${gif.name}: ${gif.ai.caption}`)
      } catch (error) {
        log(`[${++captioned}/${todo.length}] caption FAILED ${gif.name}: ${error}`)
      }
      if (captioned % CHECKPOINT_EVERY === 0) await save()
    }, 2)
    if (captioned < todo.length) {
      log(`${todo.length - captioned} captions left for the next run`)
    }

    // Uncaptioned files are left to fuzzy search: a bare filename embeds as a
    // short text that scores deceptively high against short queries.
    const stale = [...gifs.values()].flatMap((gif) => {
      if (!gif.ai) return []
      const text = embeddingText(gif)
      const key = Bun.hash(text).toString(36)
      return vectors.entries[gif.name]?.key === key ? [] : [{ gif, text, key }]
    })
    for (let i = 0; i < stale.length; i += 100) {
      const batch = stale.slice(i, i + 100)
      const result = await enricher.embed(batch.map((item) => item.text))
      batch.forEach(({ gif, key }, j) => {
        vectors.entries[gif.name] = { key, vector: encodeVector(result[j]) }
      })
      log(`embedded ${Math.min(i + 100, stale.length)}/${stale.length}`)
    }
    const orphans = Object.keys(vectors.entries).filter((name) => !gifs.get(name)?.ai)
    for (const name of orphans) delete vectors.entries[name]
    if (stale.length || orphans.length) {
      await upload(EMBEDDINGS_PATH, JSON.stringify(vectors), 'application/json', 60)
    }
  }

  if (dirty) await save()
  await pending
  log('done')
}

const LOCK_PATH = join(dirname(CONFIG_PATH), 'sync.lock')

function acquireLock() {
  try {
    writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    const pid = Number(readFileSync(LOCK_PATH, 'utf8'))
    try {
      process.kill(pid, 0)
      return false
    } catch {
      writeFileSync(LOCK_PATH, String(process.pid))
      return true
    }
  }
}

if (!acquireLock()) {
  log('another sync is running')
  process.exit(0)
}
try {
  await sync()
} finally {
  unlinkSync(LOCK_PATH)
}
