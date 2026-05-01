'use client'

import DashboardLayout from '@/components/ui/DashboardLayout'
import CurriculumView from '@/components/curriculum/CurriculumView'
import { useAuth } from '@/lib/AuthContext'

export default function GeneralCurriculumPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <DashboardLayout>
      <CurriculumView isAdmin={isAdmin} />
    </DashboardLayout>
  )
}
