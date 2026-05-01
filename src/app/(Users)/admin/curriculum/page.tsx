'use client'

import DashboardLayout from '@/components/ui/DashboardLayout'
import CurriculumView from '@/components/curriculum/CurriculumView'

export default function AdminCurriculumPage() {
  return (
    <DashboardLayout>
      <CurriculumView isAdmin={true} />
    </DashboardLayout>
  )
}
