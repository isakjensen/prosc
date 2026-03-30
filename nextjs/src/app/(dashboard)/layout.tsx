import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageTransition } from '@/components/ui/page-transition'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <DashboardLayout>
      <PageTransition>{children}</PageTransition>
    </DashboardLayout>
  )
}
