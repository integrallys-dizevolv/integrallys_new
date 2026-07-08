import { NextResponse } from 'next/server'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { getServiceSupabase } from '@/lib/auth-payload'

export function serverErrorResponse(message = 'Erro interno do servidor', code = 'INTERNAL_ERROR', status = 500) {
  return NextResponse.json({ error: message, code }, { status })
}

export function supabaseErrorResponse(error: PostgrestError, fallbackMessage = 'Falha ao consultar dados') {
  console.error('[supabase]', error)
  return serverErrorResponse(fallbackMessage, 'SUPABASE_QUERY_FAILED', 500)
}

export function getAppSupabase(): SupabaseClient {
  return getServiceSupabase()
}

export async function getPacienteIdByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', userId)
    .maybeSingle()

  if (error) {
    return { pacienteId: null, error }
  }

  return { pacienteId: data?.id ?? null, error: null }
}

export async function getEntityNameMap(
  supabase: SupabaseClient,
  table: 'pacientes' | 'usuarios' | 'unidades',
  ids: string[],
) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) {
    return { map: {} as Record<string, string>, error: null as PostgrestError | null }
  }

  const { data, error } = await supabase.from(table).select('id,nome').in('id', uniqueIds)
  if (error) {
    return { map: {} as Record<string, string>, error }
  }

  const map = (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[String(row.id)] = String(row.nome ?? '')
    return acc
  }, {})

  return { map, error: null }
}
