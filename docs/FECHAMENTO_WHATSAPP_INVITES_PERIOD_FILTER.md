# Fechamento - Central WhatsApp: filtro de periodo dos convites oficiais

## Frente concluida

Correcao do relatorio de convites oficiais na Central de Atendimento WhatsApp em `/admin/whatsapp`.

## Contexto

Os cards "Hoje", "Ultimos 7 dias" e "Ultimos 30 dias" pareciam filtros, mas eram apenas metricas informativas. Isso confundia a operacao, porque a tabela sempre exibia os ultimos 50 registros sem considerar o periodo selecionado.

## Correcao implementada

- `GET /api/admin/whatsapp-invites/logs` agora aceita `period=today|7d|30d`.
- Periodo invalido usa fallback seguro para `30d`.
- O filtro por periodo e aplicado junto com o escopo territorial existente.
- `SUPER_ADMIN` continua com visao global.
- `TERRITORIAL_MANAGER` e `TERRITORIAL_OPERATOR` continuam filtrados por territorio.
- Cards agora sao clicaveis, acessiveis via teclado e destacam o periodo ativo.
- A tabela mostra o periodo selecionado:
  - "Exibindo ultimos 50 registros: Hoje"
  - "Exibindo ultimos 50 registros: Ultimos 7 dias"
  - "Exibindo ultimos 50 registros: Ultimos 30 dias"
- Os numeros dos cards continuam vindo de `/stats`.

## Escopo preservado

Nao houve alteracao em:

- envio de convite;
- Twilio;
- templates;
- conversas;
- wallet;
- rides;
- pricing;
- dispatch;
- emergency;
- settlement;
- Cockpit.

## Commit em producao

- Hash: `cc7642a21f69d19c6fc77d92d5e61e57c9d1c05b`
- Mensagem: `fix(admin-whatsapp): filter invite logs by period`

## Arquivos alterados na correcao

- `backend/src/routes/admin-whatsapp-invites.ts`
- `backend/tests/admin-whatsapp-invites-report.test.ts`
- `frontend-app/src/pages/admin/WhatsAppCentral.jsx`

## Validacoes

- Deploy Backend: success.
- Deploy Frontend/Admin: success.
- Backend health `/api/health`: 200.
- `/admin/whatsapp`: 200.
- Endpoints protegidos sem token retornam 401.
- CloudWatch `/ecs/kaviar-backend`: sem eventos `ERROR`.
- Git final: limpo.

## Validacao visual

- Card "Hoje" selecionado aparece destacado.
- Tabela exibe "Exibindo ultimos 50 registros: Hoje".
- Tabela mostra somente o registro de hoje.
- "Visao global confirmada pelo backend" aparece para `SUPER_ADMIN`.

## Status

Fechado e validado em producao.
