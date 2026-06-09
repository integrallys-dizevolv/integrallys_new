import { redirect } from 'next/navigation'
import { CartoesEmpresariaisView } from '@/features/cartoes-empresariais'
import { CartoesView } from '@/features/portal-paciente'
import { getServerAuthPayload } from '@/lib/server-auth'

export default async function Page() {
  const payload = await getServerAuthPayload()

  if (payload?.user.role === 'paciente') {
    if (!payload.sidebarItems.some((item) => item.href === '/portal/cartoes')) {
      redirect('/')
    }
    return <CartoesView />
  }

  const hasAccess = payload?.sidebarItems.some((item) => item.href === '/cartoes')
  if (!hasAccess) {
    redirect('/')
  }

  return <CartoesEmpresariaisView />
}
