# src/hooks/

Esta pasta contém apenas hooks de **infraestrutura** e hooks **compartilhados entre múltiplas features**.

## O que fica aqui

### Infraestrutura
- `use-api.ts` — cliente HTTP base
- `use-auth.ts` — estado de autenticação global (Zustand)
- `use-dark-mode.ts` — tema da aplicação

### Compartilhados (usados por 2+ features)
- `use-caixa.ts` — caixa/ e financeiro/
- `use-financeiro.ts` — agenda/ e financeiro/
- `use-lista-espera.ts` — agenda/ e lista-espera/
- `use-pacientes.ts` — múltiplas features
- `use-alerta-portal.ts` — portal-paciente/ e configuracoes/
- `use-permissoes.ts` — permissoes/ e usuarios/
- `use-tarefas.ts` — agenda/ e tarefas/
- `use-unidades.ts` — permissoes/ e unidades/
- `use-usuarios.ts` — permissoes/ e usuarios/

## O que NÃO fica aqui

Hooks usados por apenas uma feature devem viver dentro da feature:

```text
src/features/minha-feature/
└── hooks/
    └── use-minha-feature.ts
```

Hooks usados apenas por componentes globais devem viver em:

```text
src/components/global/hooks/
```
