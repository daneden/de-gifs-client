import { join } from 'node:path'

export async function readFinderTags(
  dir: string
): Promise<Record<string, string[]>> {
  const proc = Bun.spawn(
    ['osascript', '-l', 'JavaScript', join(import.meta.dir, 'finder-tags.jxa.js'), dir],
    { stdout: 'pipe', stderr: 'pipe' }
  )
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(`Reading Finder tags failed: ${err.trim()}`)
  return JSON.parse(out)
}
