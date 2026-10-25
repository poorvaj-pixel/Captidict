import type { Metadata } from 'next'
import { WarningsScreen } from '@/components/captidict/warnings-screen'

export const metadata: Metadata = { title: 'Cash-flow warnings · Captidict' }

export default function WarningsPage() {
  return <WarningsScreen />
}
