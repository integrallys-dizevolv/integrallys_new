-- 083_unidades_endereco_estruturado.sql
-- Item 6 — Unidades: endereço estruturado.
--
-- A tabela public.unidades só possuía `endereco` (texto livre) e `cidade`, o que
-- deixava o cadastro sem Bairro/CEP/Estado e fazia a exibição do endereço variar
-- entre telas (ora o texto livre, ora só a cidade).
--
-- Esta migration adiciona as três colunas estruturadas. Todas são NULLABLE para
-- não quebrar as linhas existentes; a formatação de exibição (formatEnderecoUnidade)
-- faz fallback progressivo quando algum campo estiver ausente.
--
-- Idempotente: pode ser re-executada sem efeito colateral.

alter table public.unidades
  add column if not exists bairro text null,
  add column if not exists cep    text null,
  add column if not exists estado text null;
