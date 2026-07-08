import { redirect } from 'next/navigation'
import { AgendaView } from '@/features/agenda'
import { getServerAuthPayload } from '@/lib/server-auth'

export default async function Page() {
  const payload = await getServerAuthPayload()
  if (payload?.sidebarItems.some((item) => item.href === '/portal/agenda')) {
    redirect('/portal/agenda')
  }

  return <AgendaView />
}
