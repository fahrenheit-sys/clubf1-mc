import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Mission Control — The Grandstand',
  description: 'GM command centre — domain insights, triage, dispatch, and AI advisory.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
