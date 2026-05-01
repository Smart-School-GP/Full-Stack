'use client'

import DashboardLayout from '@/components/ui/DashboardLayout'
import PaymentView from '@/components/payments/PaymentView'

export default function AdminPaymentsPage() {
  return (
    <DashboardLayout>
      <PaymentView isAdmin={true} />
    </DashboardLayout>
  )
}
