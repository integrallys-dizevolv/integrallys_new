import { redirect } from 'next/navigation'
import { NovoAgendamentoView } from '@/features/portal-paciente'
import { getServerAuthPayload } from '@/lib/server-auth'

export default async function Page() {
  const payload = await getServerAuthPayload()
  if (!payload?.sidebarItems.some((item) => item.href === '/portal/agenda')) {
    redirect('/')
  }

  return <NovoAgendamentoView />
}
