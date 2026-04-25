'use client'

/**
 * DashboardLayout now serves as a simple content wrapper.
 * The main layout structure (Sidebar, Navigation, Auth) is 
 * handled globally by src/app/(Users)/layout.tsx
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {children}
    </div>
  )
}
