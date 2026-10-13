'use client'

import Fuse from 'fuse.js'
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { encodePath, posterPath, type Gif } from '@/lib/manifest'

export type GridGif = Omit<Gif, 'hash'>

const numberFormat = new Intl.NumberFormat('en')
const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function ago(iso: string, now: number) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return relativeTime.format(hours, 'hour')
  return relativeTime.format(Math.round(hours / 24), 'day')
}

function megabytes(bytes: number) {
  return bytes < 1_000_000
    ? `${Math.round(bytes / 1000)}KB`
    : `${(bytes / 1_000_000).toFixed(1)}MB`
}

function hasTag(gif: GridGif, tag: string) {
  return gif.tags.some((t) => t.toLowerCase() === tag) || !!gif.ai?.tags.includes(tag)
}

export default function GifGrid({
  gifs,
  updatedAt,
}: {
  gifs: GridGif[]
  updatedAt: string
}) {
  const [query, setQuery] = useState('')
  const [related, setRelated] = useState<{ query: string; names: string[] }>()
  const [active, setActive] = useState<string | null>(null)
  const [copied, setCopied] = useState<{ url: string; at: number }>()
  const [now, setNow] = useState<number>()
  const input = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(query)
  const q = deferredQuery.trim().toLowerCase()

  const fuse = useMemo(
    () =>
      new Fuse(gifs, {
        keys: [
          { name: 'name', weight: 3 },
          { name: 'tags', weight: 2 },
          { name: 'ai.tags', weight: 1.5 },
          { name: 'ai.usage', weight: 1 },
          { name: 'ai.caption', weight: 1 },
          { name: 'ai.text', weight: 1 },
        ],
        threshold: 0.25,
        ignoreLocation: true,
      }),
    [gifs]
  )
  const byName = useMemo(() => new Map(gifs.map((gif) => [gif.name, gif])), [gifs])

  const tagChips = useMemo(() => {
    const finder = new Set(gifs.flatMap((gif) => gif.tags.map((t) => t.toLowerCase())))
    const counts = new Map<string, number>()
    for (const gif of gifs) {
      for (const tag of gif.ai?.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    const common = [...counts]
      .filter(([tag]) => !finder.has(tag))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([tag]) => tag)
    return [...finder, ...common]
  }, [gifs])

  const matches = useMemo(() => {
    if (!q) return gifs
    if (q.startsWith('#')) return gifs.filter((gif) => hasTag(gif, q.slice(1)))
    return fuse.search(q).map((result) => result.item)
  }, [q, gifs, fuse])

  const relatedGifs = useMemo(() => {
    if (!related || related.query !== q) return []
    const matched = new Set(matches.map((gif) => gif.name))
    return related.names.flatMap((name) => {
      const gif = byName.get(name)
      return gif && !matched.has(name) ? [gif] : []
    })
  }, [related, q, matches, byName])

  useEffect(() => {
    if (q.length < 3 || q.startsWith('#')) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const { results } = (await response.json()) as { results: { name: string }[] }
        setRelated({ query: q, names: results.map((result) => result.name) })
      } catch {
        // Fuzzy results still stand on their own.
        if (!controller.signal.aborted) setRelated({ query: q, names: [] })
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && document.activeElement !== input.current) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(undefined), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => setCopied({ url, at: Date.now() }))
  }, [])

  const searching = q.length > 0
  const relatedPending = searching && !q.startsWith('#') && q.length >= 3 && related?.query !== q

  return (
    <>
      <header className="masthead">
        <div className="masthead-row">
          <h1 className="wordmark">
            gif<span>.daneden.me</span>
          </h1>
          <p className="meta">
            {numberFormat.format(gifs.length)} gifs
            {now && updatedAt ? <> · synced {ago(updatedAt, now)}</> : null}
          </p>
        </div>
        <input
          ref={input}
          className="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('')
          }}
          placeholder="search, or describe a feeling…"
          aria-label="Search gifs"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {tagChips.length > 0 && (
          <nav className="tags" aria-label="Tags">
            {tagChips.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag"
                aria-pressed={q === `#${tag}`}
                onClick={() => setQuery(q === `#${tag}` ? '' : `#${tag}`)}
              >
                #{tag}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main>
        {searching && matches.length === 0 && !relatedGifs.length && (
          <p className="empty">
            {relatedPending ? 'Nothing by name. Looking for related…' : `Nothing for “${deferredQuery.trim()}”.`}
          </p>
        )}
        <Sheet gifs={matches} active={active} onActivate={setActive} onCopy={copy} />
        {relatedGifs.length > 0 && (
          <>
            <h2 className="divider">
              <span>Related</span>
            </h2>
            <Sheet gifs={relatedGifs} active={active} onActivate={setActive} onCopy={copy} />
          </>
        )}
      </main>

      <p className="toast" role="status" data-visible={!!copied} key={copied?.at}>
        {copied && (
          <>
            <b>Copied</b> {copied.url.replace(/^https?:\/\//, '')}
          </>
        )}
      </p>
    </>
  )
}

interface SheetProps {
  gifs: GridGif[]
  active: string | null
  onActivate: (name: string | null) => void
  onCopy: (url: string) => void
}

function Sheet({ gifs, active, onActivate, onCopy }: SheetProps) {
  if (!gifs.length) return null
  return (
    <ul className="sheet">
      {gifs.map((gif) => (
        <Frame
          key={gif.name}
          gif={gif}
          playing={active === gif.name}
          onActivate={onActivate}
          onCopy={onCopy}
        />
      ))}
    </ul>
  )
}

const Frame = memo(function Frame({
  gif,
  playing,
  onActivate,
  onCopy,
}: {
  gif: GridGif
  playing: boolean
  onActivate: (name: string | null) => void
  onCopy: (url: string) => void
}) {
  const href = `/${encodePath(gif.name)}`
  const ratio = Math.min(2.4, Math.max(0.55, gif.width / gif.height))
  const animated = gif.frames > 1
  const [loaded, setLoaded] = useState(false)

  return (
    <li className="frame" style={{ '--ar': ratio } as CSSProperties}>
      <a
        href={href}
        title={gif.ai?.caption}
        onMouseEnter={() => onActivate(gif.name)}
        onMouseLeave={() => onActivate(null)}
        onFocus={() => onActivate(gif.name)}
        onBlur={() => onActivate(null)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onCopy(new URL(href, location.href).href)
        }}
        onDragStart={(event) => {
          const url = new URL(href, location.href).href
          const type = gif.name.toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/*'
          // Chrome turns this into a real file when dropped on the desktop.
          event.dataTransfer.setData('DownloadURL', `${type}:${gif.name}:${url}`)
          event.dataTransfer.setData('text/uri-list', url)
          event.dataTransfer.setData('text/plain', url)
        }}
      >
        <img
          className="poster"
          src={`/${encodePath(posterPath(gif.name))}`}
          alt={gif.ai?.caption ?? gif.name}
          width={gif.width}
          height={gif.height}
          loading="lazy"
          decoding="async"
          data-loaded={loaded}
          onLoad={() => setLoaded(true)}
          ref={(img) => {
            if (img?.complete && img.naturalWidth) setLoaded(true)
          }}
        />
        {playing && animated && <img className="motion" src={href} alt="" />}
        <span className="overlay">
          {playing && <Marquee words={[...new Set([...gif.tags, ...(gif.ai?.tags ?? [])])]} />}
          <span className="label">
            <span className="label-name">{gif.name}</span>
            <span className="label-meta">{megabytes(gif.size)}</span>
          </span>
        </span>
      </a>
    </li>
  )
})

// Two copies side by side, scrolled by exactly one copy's width, loop
// seamlessly. Mounted only on the active frame, so 1,000 idle frames carry no
// animation.
function Marquee({ words }: { words: string[] }) {
  if (!words.length) return null
  const text = `${words.join(' · ')} · `
  return (
    <span className="marquee" aria-hidden="true" style={{ '--chars': text.length } as CSSProperties}>
      <span className="marquee-track">
        <span>{text}</span>
        <span>{text}</span>
      </span>
    </span>
  )
}
