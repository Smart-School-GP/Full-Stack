import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/lib/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'School Ecosystem Platform',
  description: 'School management platform for administrators, teachers, parents, and students',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
