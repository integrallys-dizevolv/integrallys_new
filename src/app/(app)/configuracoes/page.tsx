import { redirect } from 'next/navigation'
import { ConfiguracoesView } from '@/features/configuracoes'
import { getServerAuthPayload } from '@/lib/server-auth'

export default async function Page() {
  const payload = await getServerAuthPayload()
  if (payload?.sidebarItems.some((item) => item.href === '/portal/configuracoes')) {
    redirect('/portal/configuracoes')
  }

  return <ConfiguracoesView />
}
