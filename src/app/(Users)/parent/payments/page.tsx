'use client'

import DashboardLayout from '@/components/ui/DashboardLayout'
import PaymentView from '@/components/payments/PaymentView'

export default function ParentPaymentsPage() {
  return (
    <DashboardLayout>
      <PaymentView isAdmin={false} />
    </DashboardLayout>
  )
}
