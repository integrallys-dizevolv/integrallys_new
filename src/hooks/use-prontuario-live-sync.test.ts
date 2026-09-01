import { describe, expect, it } from 'vitest'
import {
  PRONTUARIO_LIVE_MAX_SYNC_MS,
  PRONTUARIO_LIVE_PUBLISH_THROTTLE_MS,
  PRONTUARIO_LIVE_SUBSCRIBE_POLL_MS,
  shouldApplyProntuarioLiveUpdate,
} from '@/hooks/use-prontuario-live-sync'

describe('prontuario-live-sync (QA-1.5)', () => {
  it('usa throttle 350 ms e poll 500 ms (meta ≤ ~1 s antes de RTT)', () => {
    expect(PRONTUARIO_LIVE_PUBLISH_THROTTLE_MS).toBe(350)
    expect(PRONTUARIO_LIVE_SUBSCRIBE_POLL_MS).toBe(500)
    expect(PRONTUARIO_LIVE_MAX_SYNC_MS).toBe(850)
  })

  it('aplica update quando não há timestamp anterior', () => {
    expect(shouldApplyProntuarioLiveUpdate(null, '2026-08-21T12:00:00.000Z')).toBe(true)
  })

  it('rejeita update sem timestamp', () => {
    expect(shouldApplyProntuarioLiveUpdate('2026-08-21T12:00:00.000Z', null)).toBe(false)
  })

  it('descarta mensagens mais antigas que a última aplicada', () => {
    const newest = '2026-08-21T12:00:01.000Z'
    expect(shouldApplyProntuarioLiveUpdate(newest, '2026-08-21T12:00:00.500Z')).toBe(false)
    expect(shouldApplyProntuarioLiveUpdate(newest, '2026-08-21T12:00:01.500Z')).toBe(true)
  })
})
