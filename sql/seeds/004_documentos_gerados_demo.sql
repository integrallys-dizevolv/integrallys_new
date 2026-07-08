-- 004_documentos_gerados_demo.sql
-- Povoa dados demonstrativos para validar a UI de documentos emitidos.
--
-- O que faz:
--   1. Garante `clinica_config` para cada unidade (permite preview de
--      variáveis #CLINICA_NOME#, etc.)
--   2. Preenche `usuarios.conselho` para até 3 especialistas/masters que
--      ainda estão NULL (variável #PROFISSIONAL_CONSELHO#)
--   3. Insere até 3 documentos_gerados por paciente ativo, escolhendo
--      templates aleatórios da mesma unidade. Timestamps espalhados nos
--      últimos 30 dias.
--
-- Idempotência:
--   - O bloco de documentos só roda se ainda não houver nenhum registro
--     em documentos_gerados — evita inflar o volume se executado 2x.
--   - clinica_config e conselho usam ON CONFLICT / coalesce.

begin;

-- 1. clinica_config por unidade
insert into public.clinica_config
  (unidade_id, nome, cidade_uf, endereco, cep, telefone, cor_primaria, cor_secundaria)
select
  u.id,
  'Clínica Demo — ' || u.nome,
  coalesce(u.cidade, 'São Paulo') || '/SP',
  coalesce(u.endereco, 'Rua Exemplo, 100 — Centro'),
  '00000-000',
  '(11) 99999-9999',
  '#0F62FE',
  '#F4F4F4'
from public.unidades u
on conflict (unidade_id) do nothing;

-- 2. Conselho em especialistas sem preenchimento
update public.usuarios u
set conselho = 'CRTH-BR ' || lpad((1000 + (random() * 8999)::int)::text, 4, '0')
where u.perfil in ('especialista', 'master')
  and (u.conselho is null or u.conselho = '')
  and u.id in (
    select id from public.usuarios
    where perfil in ('especialista', 'master')
      and (conselho is null or conselho = '')
    limit 3
  );

-- 3. Documentos_gerados demonstrativos
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.documentos_gerados;
  if v_count > 0 then
    raise notice 'documentos_gerados já contém % registro(s) — pulando seed demonstrativo.', v_count;
    return;
  end if;

  insert into public.documentos_gerados (
    template_id, agendamento_id, paciente_id, profissional_id,
    conteudo_preenchido, gerado_por, disponivel_no_portal, gerado_em
  )
  select
    t.id,
    (
      select ag.id from public.agendamentos ag
      where ag.paciente_id = p.id
      order by ag.data_agendamento desc
      limit 1
    ),
    p.id,
    e.id,
    t.conteudo,
    e.id,
    coalesce(t.disponivel_portal_paciente, false),
    timezone('utc', now()) - (random() * interval '30 days')
  from public.pacientes p
  cross join lateral (
    select dt.id, dt.conteudo, dt.disponivel_portal_paciente
    from public.documento_templates dt
    where dt.ativo = true
      and (dt.unidade_id = p.unidade_id or p.unidade_id is null)
    order by random()
    limit 3
  ) t
  cross join lateral (
    select u.id
    from public.usuarios u
    where u.perfil in ('especialista', 'master')
      and (u.unidade_id = p.unidade_id or p.unidade_id is null)
    order by random()
    limit 1
  ) e
  where p.status = 'Ativo';
end $$;

commit;
