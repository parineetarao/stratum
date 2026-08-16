import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import DemoToastHost from '@/components/demo/DemoToastHost'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stratum — Analytics Engineering Platform',
  description: 'Stratum connects your data, models your business, and delivers actionable insights through automated analytics and intelligent workflows.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#020817', margin: 0, padding: 0 }}>
        {children}
        <DemoToastHost />
      </body>
    </html>
  )
}
