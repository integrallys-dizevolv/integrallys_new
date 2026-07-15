-- 087_usuarios_dados_pessoais.sql
-- Item 7d — dados pessoais do profissional em public.usuarios.
--
-- `cpf` JÁ existe na tabela (não recriar). Aqui entram os demais campos pessoais
-- e o endereço estruturado, espelhando o padrão do item 6 (endereco/bairro/cep/
-- estado) para nascer consistente. Todos NULLABLE.
--
-- Estes campos alimentam as variáveis #PROFISSIONAL_RG/ENDERECO/ESTADO_CIVIL# do
-- resolvedor de documentos (item 7c) e o contrato de parceria.
--
-- Idempotente: add column if not exists.

alter table public.usuarios
  add column if not exists data_nascimento date null,
  add column if not exists rg             text null,
  add column if not exists estado_civil   text null,
  add column if not exists endereco       text null,
  add column if not exists bairro         text null,
  add column if not exists cep            text null,
  add column if not exists estado         text null;
