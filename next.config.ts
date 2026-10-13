import type { NextConfig } from 'next'
import { blobBaseUrl } from './lib/manifest'

const config: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Anything that isn't a page or a public file is a gif in the blob store,
      // served at its exact filename: gif.daneden.me/{name}.{ext}
      fallback: [{ source: '/:path*', destination: `${blobBaseUrl()}/:path*` }],
    }
  },
}

export default config
