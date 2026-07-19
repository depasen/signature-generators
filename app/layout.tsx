import type { Metadata, Viewport } from 'next'
import { Newsreader, Figtree } from 'next/font/google'
import './globals.css'

// Fonts must match the original PIP design site so the generator UIs render
// pixel-identically: globals.css maps --font-serif -> Newsreader and
// --font-sans -> Figtree via these CSS variables.
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PIP & IB Email Signature Generators',
  description:
    'Internal tools to generate branded email signatures for Pacific Integrative Psychiatry and IntraBalance.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#12495a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${figtree.variable} bg-[#f6efe4]`}
    >
      <body className="antialiased">{children}</body>
    </html>
  )
}
