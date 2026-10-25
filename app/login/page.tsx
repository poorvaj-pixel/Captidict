import type { Metadata } from 'next'
import { LoginForm } from '@/components/captidict/auth/login-form'

export const metadata: Metadata = { title: 'Log in — Captidict', description: 'Log in to your Captidict cash forecast.' }

export default function LoginPage() {
  return <LoginForm />
}
