import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'School Ecosystem Platform',
  description: 'School management platform for administrators, teachers, parents, and students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
