# KAVIAR Email Inbound Worker (skeleton)

Worker Cloudflare para receber e-mails inbound, enviar metadados/corpo ao backend KAVIAR e manter encaminhamento para Gmail.

## Objetivo desta v1
- Receber e-mail no handler `email`.
- Fazer POST para `/api/inbound/email/cloudflare` com header secreto.
- Encaminhar para Gmail mesmo se o POST falhar.
- Sem deploy nesta etapa.

## Arquivos
- `src/index.js`: lógica principal.
- `wrangler.toml.example`: exemplo de configuração.

## Variáveis necessárias
- `INBOUND_WEBHOOK_URL`: `https://api.kaviar.com.br/api/inbound/email/cloudflare`
- `GMAIL_FORWARD_TO`: Gmail atual do encaminhamento
- `INBOUND_EMAIL_WEBHOOK_SECRET`: secret do endpoint backend (Cloudflare Secret)

## Publicação futura (quando aprovado)
1. Criar Worker no Cloudflare e apontar para este código.
2. Configurar secrets/vars.
3. Vincular o Worker às regras de Email Routing dos aliases oficiais.
4. Validar fluxo ponta a ponta: Worker -> Backend -> Gmail.

## Observações
- O parser MIME desta v1 é best-effort para `text/plain` e `text/html` simples.
- Metadados de anexos estão preparados no contrato, mas não há persistência binária.
- Em caso de falha no POST de ingestão, o encaminhamento para Gmail segue ativo para não perder resposta.
