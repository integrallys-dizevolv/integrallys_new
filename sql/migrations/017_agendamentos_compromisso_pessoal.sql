-- =============================================================================
-- Migration 017: Agendamentos — suporte a compromisso pessoal
-- =============================================================================
-- Permite que a tabela `agendamentos` armazene também compromissos pessoais
-- (reuniões, tarefas, lembretes) sem paciente vinculado.
--
-- Antes desta migration: `paciente_id` era NOT NULL; todo registro exigia
-- paciente. Com isso, a aba "Agenda pessoal" do frontend não tinha como exibir
-- reuniões internas, tarefas ou lembretes.
--
-- Após esta migration:
--   - `paciente_id` passa a ser NULLABLE.
--   - Registro com `paciente_id IS NULL` é interpretado pelo frontend como
--     "compromisso pessoal" (agenda-view.tsx separa via filtro `item.paciente`).
--   - Novas colunas opcionais: `titulo`, `local`, `participantes` para
--     suportar reuniões/tarefas sem paciente.
--   - O campo `tipo` (já existente) continua sendo usado para Reunião/Tarefa/
--     Lembrete/Evento/Aprovação nos compromissos pessoais.
-- =============================================================================

ALTER TABLE agendamentos
    ALTER COLUMN paciente_id DROP NOT NULL;

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS titulo TEXT,
    ADD COLUMN IF NOT EXISTS local TEXT,
    ADD COLUMN IF NOT EXISTS participantes TEXT;

-- Índice parcial para compromissos pessoais (sem paciente) por profissional —
-- acelera a query da aba "Agenda pessoal" quando filtramos por profissional_id.
CREATE INDEX IF NOT EXISTS idx_agendamentos_compromisso_pessoal
    ON agendamentos (profissional_id, data_agendamento)
    WHERE paciente_id IS NULL;

COMMENT ON COLUMN agendamentos.paciente_id IS
    'Paciente vinculado ao agendamento. NULL indica compromisso pessoal (reunião, tarefa, lembrete).';
COMMENT ON COLUMN agendamentos.titulo IS
    'Título do compromisso pessoal (ex: "Reunião de planejamento"). Opcional para atendimentos com paciente.';
COMMENT ON COLUMN agendamentos.local IS
    'Local do compromisso pessoal (ex: "Sala de Reuniões 2"). Opcional para atendimentos.';
COMMENT ON COLUMN agendamentos.participantes IS
    'Participantes do compromisso pessoal (texto livre). Opcional para atendimentos.';
