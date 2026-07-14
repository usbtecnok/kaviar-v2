# KAVIAR Email Inbound Worker

Worker Cloudflare para ingestão de e-mail inbound com parser MIME real (`postal-mime`), upload binário idempotente de anexos e encaminhamento obrigatório para Gmail.

## Fluxo implementado
1. Parse MIME completo em `src/index.js` via `PostalMime` com extração de:
- `subject`, `text`, `html`, `message-id`, `in-reply-to`, `references`.
- `attachments` binários (ignorando `related=true`).
2. Criação do inbound no backend:
- `POST /api/inbound/email/cloudflare`
- O worker exige `data.id` para continuar.
3. Para cada attachment (sequencial):
- `POST /attachments/request-upload` com `filename`, `content_type`, `size_bytes`, `sha256`.
- Se `already_available=true` (ou status `AVAILABLE`), pula upload/finalize.
- Caso contrário, faz `PUT` na URL presignada com `Content-Type` e `x-amz-meta-sha256`.
- Finaliza em `POST /attachments/:attachmentId/finalize` e valida `status=AVAILABLE`.
4. Isolamento de falhas por attachment:
- Falha em um anexo não interrompe os próximos anexos.
5. Encaminhamento Gmail preservado:
- `message.forward` sempre é tentado.
- Erro de `forward` é hard failure (rethrow).

## Estrutura
- `src/index.js`: worker principal + helpers (`parseInboundEmail`, `ingestInboundMessage`, `fetchJsonOrThrow`).
- `test/index.test.js`: suíte `node:test` com cenários de parser, idempotência e falhas.
- `package.json`: package isolado do worker com dependência fixa `postal-mime@2.7.5`.

## Variáveis necessárias
- `INBOUND_WEBHOOK_URL`: `https://api.kaviar.com.br/api/inbound/email/cloudflare`
- `GMAIL_FORWARD_TO`: Gmail atual do encaminhamento
- `INBOUND_EMAIL_WEBHOOK_SECRET`: secret do endpoint backend (Cloudflare Secret)

## Desenvolvimento local
```bash
npm ci
npm test
```

## Observações
- Não envia bytes de anexo no JSON de inbound; bytes trafegam apenas por `PUT` na URL presignada.
- O worker mantém logs com motivo resumido para falhas de ingestão sem expor headers sensíveis.
