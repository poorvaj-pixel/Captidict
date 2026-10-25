import type { Metadata } from 'next'
import { SignupForm } from '@/components/captidict/auth/signup-form'

export const metadata: Metadata = { title: 'Sign up — Captidict', description: 'Create a Captidict account to forecast your business cash.' }

export default function SignupPage() {
  return <SignupForm />
}
