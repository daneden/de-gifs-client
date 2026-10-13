import type { Metadata, Viewport } from 'next'
import { Martian_Mono } from 'next/font/google'
import './globals.css'

const mono = Martian_Mono({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'gif.daneden.me',
  description: 'The reaction gif library of Daniel Eden.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efebe2' },
    { media: '(prefers-color-scheme: dark)', color: '#11100e' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>{children}</body>
    </html>
  )
}
