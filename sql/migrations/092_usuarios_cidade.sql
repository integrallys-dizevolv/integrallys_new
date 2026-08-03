-- 092_usuarios_cidade.sql
-- Item 12 — campo "Cidade" no cadastro de profissional.
--
-- `usuarios` recebeu endereço estruturado na migration 087 (endereco/bairro/cep/
-- estado) espelhando `unidades`/`pacientes`, mas `cidade` ficou de fora — enquanto
-- `unidades` e `pacientes` já têm a coluna. Aqui alinhamos o padrão.
--
-- NULLABLE, idempotente: add column if not exists.

alter table public.usuarios
  add column if not exists cidade text null;
