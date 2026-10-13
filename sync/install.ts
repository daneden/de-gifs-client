// Installs (or reinstalls) the launchd agent that runs the sync whenever the
// gifs folder changes, plus once an hour in case an event was missed.
//
//   bun run sync:install              install or update
//   bun run sync:install --uninstall  remove

import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { loadConfig } from './config'

const LABEL = 'me.daneden.gif-sync'
const plistPath = join(homedir(), 'Library/LaunchAgents', `${LABEL}.plist`)
const logPath = join(homedir(), 'Library/Logs/gif-sync.log')
const repo = resolve(import.meta.dir, '..')
const domain = `gui/${process.getuid!()}`

function launchctl(...args: string[]) {
  return Bun.spawnSync(['launchctl', ...args], { stderr: 'pipe' })
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Unloading a job that isn't loaded fails harmlessly.
launchctl('bootout', `${domain}/${LABEL}`)

if (process.argv.includes('--uninstall')) {
  if (existsSync(plistPath)) unlinkSync(plistPath)
  console.log(`Removed ${LABEL}`)
  process.exit(0)
}

const { dir } = loadConfig()

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escape(process.execPath)}</string>
    <string>--no-env-file</string>
    <string>sync/sync.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escape(repo)}</string>
  <key>WatchPaths</key>
  <array>
    <string>${escape(dir)}</string>
  </array>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>ThrottleInterval</key>
  <integer>30</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>LowPriorityIO</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${escape(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escape(logPath)}</string>
</dict>
</plist>
`

writeFileSync(plistPath, plist)
const result = launchctl('bootstrap', domain, plistPath)
if (result.exitCode !== 0) {
  console.error(result.stderr.toString())
  process.exit(1)
}
console.log(`Installed ${LABEL}: watching ${dir}`)
console.log(`Logs: ${logPath}`)
