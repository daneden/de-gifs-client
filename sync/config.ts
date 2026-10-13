import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Kept outside the repo and outside `.env.local`: `vercel env pull` writes a
// 12-hour VERCEL_OIDC_TOKEN there, which the Blob SDK would prefer over the
// long-lived token and the launchd agent would start failing overnight.
export const CONFIG_PATH = join(homedir(), '.config/gif-sync/env')

export interface Config {
  dir: string
  blobToken: string
  blobBaseUrl: string
  gatewayKey?: string
  captionModel: string
  captionsPerMinute: number
}

export function loadConfig(): Config {
  let raw: string
  try {
    raw = readFileSync(CONFIG_PATH, 'utf8')
  } catch {
    throw new Error(`Missing ${CONFIG_PATH}. See README.md → Setup.`)
  }
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  const required = ['GIFS_DIR', 'BLOB_READ_WRITE_TOKEN', 'GIF_BLOB_BASE_URL']
  const missing = required.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(`${CONFIG_PATH} is missing ${missing.join(', ')}`)
  }
  return {
    dir: env.GIFS_DIR.replace(/^~(?=\/)/, homedir()),
    blobToken: env.BLOB_READ_WRITE_TOKEN,
    blobBaseUrl: env.GIF_BLOB_BASE_URL.replace(/\/$/, ''),
    gatewayKey: env.AI_GATEWAY_API_KEY || undefined,
    captionModel: env.CAPTION_MODEL || 'google/gemini-2.5-flash-lite',
    captionsPerMinute: Number(env.CAPTIONS_PER_MINUTE) || 4,
  }
}
