# Checklist go-live — segurança e integrações

## Obrigatório antes do aceite / produção

- [ ] Aplicar migrations `095_centros_custo`, `096_anamnese_campos_personalizados`, `097_prontuarios_auditoria_edicao`, `098_prontuario_live_drafts`
- [ ] Configurar `chatbot.webhook_token` em Configurações → Sistema (endpoint WhatsApp fica fail-closed sem token)
- [ ] Cadastrar URL Evolution apontando para `/api/whatsapp/webhook` **com** token (preferir header `x-webhook-token`)
- [ ] Sicredi Pix produção: proxy mTLS na frente de `/api/pagamentos/webhook/sicredi` (ver `AGENTS.md` / `sicredi.service.ts`)
- [ ] Validar webhooks Cielo e Sicredi em staging (status só após reconsulta ao gateway)
- [ ] Confirmar que especialista não vê preços no atendimento (histórico), estoque e relatório de prescricões
- [ ] Homologar DRE semanal + filtro centro de custo
- [ ] Homologar Ranking e Comparativo em Relatórios
- [ ] Homologar aba CRM Inadimplência e campos personalizados de anamnese
- [ ] Homologar edição pós-finalização do prontuário + tela grande (`?hardware=1`)

## Ops

- Rotacionar `chatbot.webhook_token` se já tiver sido exposto em logs/GET antigo
- Revisar permissões `especialista` para `estoque:read` / `configuracoes:read` após mascaramento
