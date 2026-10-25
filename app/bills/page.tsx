import { Suspense } from 'react'
import { BillsScreen } from '@/components/captidict/bills-screen'

export default function BillsPage() {
  return (
    <Suspense>
      <BillsScreen />
    </Suspense>
  )
}
