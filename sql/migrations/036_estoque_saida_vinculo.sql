-- TAREFA-075 · Vínculo na saída de estoque
--
-- Permite rastrear a quem foi destinada uma saída de estoque que NÃO é venda
-- (que já tem vínculo via prescricoes/prescricao_itens). Os campos abaixo são
-- opcionais — preenchidos apenas quando o operador escolhe um tipo de
-- vínculo no `saida-estoque-modal`.
--
--   - vinculo_tipo  = 'cliente' | 'especialista' | 'fornecedor'
--   - vinculo_id    = UUID do paciente/usuário (cliente ou especialista).
--                     Para fornecedor é null (não há tabela de fornecedores).
--   - vinculo_nome  = nome livre, principalmente para fornecedor; redundante
--                     mas evita join no relatório de movimentação.

alter table public.movimentacoes_estoque
  add column if not exists vinculo_tipo text null
    check (vinculo_tipo is null or vinculo_tipo in ('cliente', 'especialista', 'fornecedor')),
  add column if not exists vinculo_id uuid null,
  add column if not exists vinculo_nome text null;

create index if not exists movimentacoes_estoque_vinculo_idx
  on public.movimentacoes_estoque (vinculo_tipo, vinculo_id);
