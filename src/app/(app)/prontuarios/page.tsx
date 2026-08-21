import { Suspense } from 'react'
import { ProntuarioView } from '@/features/prontuarios/prontuario-view'
import { LoadingScreen } from '@/components/global/loading-screen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProntuarioView />
    </Suspense>
  )
}
