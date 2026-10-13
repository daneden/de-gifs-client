import sharp from 'sharp'

export interface Dimensions {
  width: number
  height: number
  frames: number
}

export async function inspect(input: Buffer): Promise<Dimensions> {
  const meta = await sharp(input, { animated: true }).metadata()
  const frames = meta.pages ?? 1
  // `autoOrient` reflects EXIF rotation, which browsers apply to <img> too.
  const width = meta.autoOrient?.width ?? meta.width
  const height = frames > 1 ? (meta.pageHeight ?? meta.height) : (meta.autoOrient?.height ?? meta.height)
  return { width, height, frames }
}

function frameAt(frames: number, position: number) {
  return Math.min(frames - 1, Math.floor(frames * position))
}

export async function poster(input: Buffer, frames: number) {
  return sharp(input, { page: await busiestFrame(input, frames), autoOrient: true })
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer()
}

// Reaction gifs often open on a fade-in or cut to an empty frame mid-way, so
// a fixed frame makes a poor poster. Highest entropy ≈ the frame with the most
// going on.
async function busiestFrame(input: Buffer, frames: number) {
  if (frames === 1) return 0
  const candidates = [...new Set([0, 0.1, 0.3, 0.5].map((p) => frameAt(frames, p)))]
  const scored = await Promise.all(
    candidates.map(async (page) => {
      const { entropy } = await sharp(input, { page }).resize(64).stats()
      return { page, entropy }
    })
  )
  return scored.reduce((best, frame) => (frame.entropy > best.entropy ? frame : best)).page
}

const CELL = 384

/** Four frames in a 2×2 grid, so a single image request can see the motion. */
export async function contactSheet(input: Buffer, frames: number) {
  if (frames === 1) {
    return sharp(input, { autoOrient: true })
      .resize(CELL * 2, CELL * 2, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
  }
  const tiles = await Promise.all(
    [0.1, 0.35, 0.6, 0.85].map((position) =>
      sharp(input, { page: frameAt(frames, position) })
        .resize(CELL, CELL, { fit: 'contain', background: '#000' })
        .png()
        .toBuffer()
    )
  )
  return sharp({
    create: { width: CELL * 2, height: CELL * 2, channels: 3, background: '#000' },
  })
    .composite(
      tiles.map((tile, i) => ({
        input: tile,
        left: (i % 2) * CELL,
        top: Math.floor(i / 2) * CELL,
      }))
    )
    .jpeg({ quality: 80 })
    .toBuffer()
}
