# Caixa de Entrada Institucional KAVIAR (v1)

## Escopo desta versão
- Inbox institucional no Admin KAVIAR.
- Ingestao de e-mails inbound via Cloudflare Email Worker.
- Encaminhamento para Gmail preservado.
- Sem Gmail API.
- Resposta de e-mail pelo frontend administrativo.
- Persistencia real de anexos inbound com metadata no PostgreSQL e arquivo em S3 privado.

## Arquitetura
1. Um e-mail chega em alias institucional (ex.: `suporte@kaviar.com.br`).
2. Cloudflare Email Worker recebe a mensagem e faz parse MIME com `postal-mime`.
3. Worker envia `POST` para backend KAVIAR em `/api/inbound/email/cloudflare` com header secreto e metadata da mensagem.
4. Backend valida segredo + payload e grava em `inbound_email_messages`.
5. Para cada anexo, o Worker reserva upload no backend, faz `PUT` em URL presignada do S3 e finaliza o attachment.
6. Backend persiste metadata em `inbound_email_attachments` e marca o attachment como `AVAILABLE` apos validar tamanho + sha256.
7. Worker continua fluxo e encaminha a mensagem para o Gmail atual.
8. Admin consulta inbox em `/admin/inbox` via endpoints protegidos de Admin e obtém download seguro por URL assinada curta.

## Endpoints backend
- Publico protegido por segredo:
  - `POST /api/inbound/email/cloudflare`
  - `POST /api/inbound/email/cloudflare/attachments/request-upload`
  - `POST /api/inbound/email/cloudflare/attachments/:attachmentId/finalize`
  - Header obrigatorio: `X-KAVIAR-INBOUND-EMAIL-SECRET`
  - Valida com `INBOUND_EMAIL_WEBHOOK_SECRET`

- Admin protegido (`authenticateAdmin + requireSuperAdmin`):
  - `GET /api/admin/inbound-emails`
  - `GET /api/admin/inbound-emails/:id`
  - `GET /api/admin/inbound-emails/:id/attachments/:attachmentId/download`
  - `PATCH /api/admin/inbound-emails/:id`

## Model Prisma
Tabela: `inbound_email_messages`

Campos principais:
- `id`
- `received_at`
- `from_email`
- `from_name`
- `to_email`
- `subject`
- `text_body`
- `html_body`
- `normalized_body`
- `message_id`
- `in_reply_to`
- `references_header`
- `provider` (`CLOUDFLARE_EMAIL_WORKER`)
- `status` (`NEW`, `READ`, `ARCHIVED`)
- `has_attachments`
- `attachment_count`
- `attachments_metadata` (JSON)
- `raw_headers` (JSON)
- `created_at`, `updated_at`

Tabela: `inbound_email_attachments`

Campos principais:
- `id`
- `inbound_email_id`
- `filename`
- `content_type`
- `size_bytes`
- `storage_key`
- `sha256`
- `status` (`PENDING`, `AVAILABLE`)
- `created_at`, `updated_at`

## Variaveis de ambiente
Backend:
- `INBOUND_EMAIL_WEBHOOK_SECRET`: segredo do webhook inbound.

Worker (Cloudflare):
- `INBOUND_WEBHOOK_URL`: URL do backend (`https://api.kaviar.com.br/api/inbound/email/cloudflare`).
- `INBOUND_EMAIL_WEBHOOK_SECRET`: mesmo segredo do backend.
- `GMAIL_FORWARD_TO`: Gmail atual para encaminhamento.

## Como testar localmente
### Backend
1. Configurar `DATABASE_URL` e `INBOUND_EMAIL_WEBHOOK_SECRET` no ambiente local.
2. Gerar Prisma Client:
   - `cd /home/goes/kaviar/backend`
   - `npm run db:generate`
3. Build:
   - `npm run build`

### Teste manual do webhook inbound
Exemplo de curl local:

```bash
curl -X POST http://localhost:3000/api/inbound/email/cloudflare \
  -H "Content-Type: application/json" \
  -H "X-KAVIAR-INBOUND-EMAIL-SECRET: SEU_SEGREDO" \
  -d '{
    "from_email": "cliente@example.com",
    "from_name": "Cliente Exemplo",
    "to_email": "suporte@kaviar.com.br",
    "subject": "Resposta de teste",
    "text_body": "Mensagem de teste inbound",
    "message_id": "<msg-test-001@example.com>",
    "has_attachments": false,
    "attachment_count": 0,
    "attachments_metadata": [],
    "raw_headers": {"subject": "Resposta de teste"}
  }'
```

### Frontend
1. `cd /home/goes/kaviar/frontend-app`
2. `npm run typecheck`
3. `npm run build`
4. Abrir rota Admin: `/admin/inbox`

## Migrations relevantes
- `backend/prisma/migrations/20260711153000_add_inbound_email_messages/migration.sql`
- `backend/prisma/migrations/20260714001500_add_inbound_email_attachments/migration.sql`
- `backend/prisma/migrations/20260714030000_add_inbound_attachment_idempotency_unique/migration.sql`

Publicacao por etapas:
1. Aplicar migrations pendentes em producao, quando houver.
2. Publicar backend.
3. Publicar frontend.
4. Publicar Worker Cloudflare e regras de Email Routing.

## Configuracao futura do Worker no Cloudflare
1. Criar Worker com o codigo de `cloudflare/email-inbound-worker`.
2. Definir vars/secrets:
   - `INBOUND_WEBHOOK_URL`
   - `GMAIL_FORWARD_TO`
   - `INBOUND_EMAIL_WEBHOOK_SECRET` (secret)
3. Associar Worker aos aliases institucionais no Email Routing.
4. Validar:
   - ingestao no endpoint backend
   - visualizacao em `/admin/inbox`
   - encaminhamento para Gmail

## Riscos e rollback
Riscos:
- Parser MIME do Worker e best-effort nesta v1.
- Se migration nao estiver aplicada, endpoints da inbox retornam indisponibilidade controlada.
- Segredo invalido bloqueia ingestao (401).

Rollback seguro:
1. Desabilitar rota/uso de inbox no frontend (feature flag ou remoção de link) sem afetar envio oficial.
2. Despublicar/pausar Worker (quando estiver em producao) mantendo Email Routing para Gmail.
3. Backend pode permanecer publicado; sem chamadas validas o impacto operacional e baixo.
