import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Kannada } from 'next/font/google'
import { AppShell } from '@/components/captidict/app-shell'
import { THEME_INIT_SCRIPT } from '@/lib/theme-script'
import './globals.css'

const notoSans = Noto_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-noto-sans', display: 'swap', adjustFontFallback: false })
const notoKannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  weight: ['400', '600'],
  variable: '--font-noto-kannada',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
})
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
})

export const metadata: Metadata = {
  title: 'Captidict — Cash forecast for Indian businesses',
  description:
    'See your cash before it moves. Captidict forecasts your balance, bills and customer payments for the next 30 days — in English, ಕನ್ನಡ and हिन्दी.',
  generator: 'v0.app',
  applicationName: 'Captidict',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f4ea' },
    { media: '(prefers-color-scheme: dark)', color: '#141a15' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoKannada.variable} ${notoDevanagari.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved (or device) theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
