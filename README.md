# gif.daneden.me

A personal reaction-gif library. A folder on my Mac is the only source of truth; every file in it is served at `gif.daneden.me/{exact filename}`, and the site at `gif.daneden.me` is a searchable contact sheet of all of them.

```
gifs folder (Dropbox / iCloud)
   │  launchd: runs on any change in the folder, and hourly
   ▼
sync/sync.ts ──► Vercel Blob (public store)
                   {name}.{ext}                originals, exact filenames
                   _/thumbs/{name}.{ext}.webp  posters for the grid
                   _/index.json                manifest: sizes, Finder tags, captions
                   _/embeddings.json           vectors for semantic search
   ▼
Next.js on Vercel
   /              contact sheet + search (reads _/index.json every 60 s)
   /api/search    semantic search over captions
   /anything.gif  fallback rewrite to the blob store
```

- **Add, replace, rename or delete** a file in the folder → the site and URL follow within a minute or two. Deleted or renamed files' old URLs stop working (up to a day of CDN cache).
- **Tags** are Finder tags. Tag a file in Finder and it shows up as a chip on the site.
- **Captions** are generated once per file from four frames of the animation, and power both fuzzy and semantic search ("describe a feeling").
- On the site: hover plays a gif, click copies its URL, drag drops the file.

## Setup

One-time, on the Mac that holds the folder.

1. `bun install`
2. Create `~/.config/gif-sync/env` (`chmod 600`):

   ```sh
   GIFS_DIR=~/Library/CloudStorage/Dropbox/Photos/gifs
   GIF_BLOB_BASE_URL=https://<store-id>.public.blob.vercel-storage.com
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…
   AI_GATEWAY_API_KEY=…          # optional; without it, no captions or semantic search
   # CAPTION_MODEL=anthropic/claude-haiku-5.5   # default: google/gemini-2.5-flash-lite
   # CAPTIONS_PER_MINUTE=30                     # default 4, for the free Gateway tier
   ```

   This deliberately isn't `.env.local`: `vercel env pull` writes a 12-hour OIDC token there that the Blob SDK would prefer, and the background sync would start failing overnight.

3. `bun run sync --backfill` — the first run downloads and uploads everything, then captions every file. On the free Gateway tier that is about four files a minute, so leave it running.
4. `bun run sync:install` — installs the launchd agent. Logs go to `~/Library/Logs/gif-sync.log`.

The Vercel project needs `GIF_BLOB_BASE_URL` set too, and a deploy only builds once `_/index.json` exists (step 3).

## Commands

| | |
| --- | --- |
| `bun run sync` | Sync now |
| `bun run sync --dry-run` | Show what would change |
| `bun run sync --no-ai` | Sync files and tags, skip captions and embeddings |
| `bun run sync --backfill` | Caption without the usual 10-minute limit per run |
| `bun run sync --allow-deletes` | Permit deleting more than 25 files in one run |
| `bun run sync:install` | Install or update the launchd agent |
| `bun run sync:install --uninstall` | Remove it |
| `bun dev` | Run the site locally (needs `GIF_BLOB_BASE_URL` in `.env.local`) |

## Moving the folder (e.g. to iCloud Drive)

1. `bun run sync:install --uninstall`, so no sync sees the folder half-moved.
2. Move the folder, e.g. to `iCloud Drive/gifs`.
3. Point `GIFS_DIR` at it: `GIFS_DIR=~/Library/Mobile Documents/com~apple~CloudDocs/gifs`
4. `bun run sync:install`, then re-pin the folder in the Dock.

URLs don't change, and nothing is re-uploaded or re-captioned: files are matched by content hash. If the move changed modification times, each file is read once to check its hash, which downloads any that are online-only.

As a backstop, a sync refuses to delete more than 25 files at once, since an empty or half-moved folder looks the same as a mass delete. If you really did remove that many, run `bun run sync --allow-deletes`.

## Troubleshooting

- **Nothing syncs in the background, but `bun run sync` works:** macOS may be blocking the agent from reading a cloud folder. Check the log for `Operation not permitted`, then allow `~/.bun/bin/bun` under System Settings → Privacy & Security → Full Disk Access (or the "Files and Folders" entry, if macOS prompted).
- **Blank previews or slow drags from the Dock stack:** the folder's files are online-only. Mark the folder as available offline in Dropbox (or turn off "Optimize Mac Storage" for iCloud Drive).
- **Captions are slow or missing:** the free AI Gateway tier allows 5 requests a minute per model, so the sync paces captions at 4 a minute and stops captioning after 10 minutes per run. Anything left over, or anything that failed, is picked up by the next run. With paid Gateway credits, raise `CAPTIONS_PER_MINUTE`.
