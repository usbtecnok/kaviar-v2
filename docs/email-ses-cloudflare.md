# Email Transacional KAVIAR (Cloudflare SMTP + Cloudflare Email Routing)

## Objetivo
Configurar envio transacional oficial do dominio kaviar.com.br via Cloudflare Email Sending (SMTP) e manter recebimento via Cloudflare Email Routing, sem dependencia operacional de Amazon SES no caminho padrao.

## Enderecos oficiais
- contato@kaviar.com.br
- no-reply@kaviar.com.br
- suporte@kaviar.com.br
- financeiro@kaviar.com.br

## Estado atual
- Provider padrao de envio no backend: Cloudflare SMTP.
- Email Routing do dominio: mantido no Cloudflare (nao remover DNS de roteamento).
- SES: legado opcional, nao deve ser caminho padrao de producao.

Nota operacional:
- Neste momento, nao tentar nova automacao de Email Routing.
- Manter Email Routing como pendencia manual ate ajuste de permissao na API da Cloudflare.

## Envio (Cloudflare SMTP)
- Provedor: Cloudflare Email Sending via SMTP
- Host: smtp.mx.cloudflare.net
- Porta: 465
- Secure: true
- Auth user: api_token
- Auth pass: CLOUDFLARE_SMTP_TOKEN
- Remetente padrao backend: KAVIAR <no-reply@kaviar.com.br>
- Aliases permitidos para remetente no backend:
  - KAVIAR <contato@kaviar.com.br>
  - KAVIAR <suporte@kaviar.com.br>
  - KAVIAR <financeiro@kaviar.com.br>
  - KAVIAR <no-reply@kaviar.com.br>

## Variaveis de ambiente esperadas (backend)
- EMAIL_PROVIDER=cloudflare
- EMAIL_FROM_DEFAULT="KAVIAR <no-reply@kaviar.com.br>"
- EMAIL_REPLY_TO=contato@kaviar.com.br
- CLOUDFLARE_SMTP_HOST=smtp.mx.cloudflare.net
- CLOUDFLARE_SMTP_PORT=465
- CLOUDFLARE_SMTP_SECURE=true
- CLOUDFLARE_SMTP_USER=api_token
- CLOUDFLARE_SMTP_TOKEN=<token_cloudflare_email_sending>
- EMAIL_ALLOWED_FROM=contato@kaviar.com.br,suporte@kaviar.com.br,financeiro@kaviar.com.br,no-reply@kaviar.com.br
- EMAIL_TEST_ALLOWED_TO=contato@kaviar.com.br

## DNS e Email Routing
- Nao remover regras de Cloudflare Email Routing.
- Recebimento continua no Cloudflare independentemente do provider SMTP de envio.

### Execucao
```bash
cd /home/goes/kaviar
node scripts/setup-kaviar-email.mjs
```

Modo simulacao (sem gravar alteracoes):
```bash
cd /home/goes/kaviar
node scripts/setup-kaviar-email.mjs --dry-run
```

## Configuracao backend
Arquivo principal:
- backend/src/services/email/email.service.ts

Comportamento:
- Quando EMAIL_PROVIDER=cloudflare, usa Cloudflare SMTP.
- Quando EMAIL_PROVIDER nao estiver definido, default = cloudflare.
- SES pode permanecer como legado isolado (EMAIL_PROVIDER=ses), mas nao como padrao de producao.

## Endpoint protegido para teste de envio
Rota:
- POST /api/admin/email/test

Protecao:
- authenticateAdmin
- requireSuperAdmin

Restricao de destinatario (seguranca):
- O endpoint valida formato de email e tambem aplica allowlist por variavel de ambiente.
- Prioridade 1: EMAIL_TEST_ALLOWED_TO (lista separada por virgula).
- Prioridade 2 (fallback): FORWARD_TO_EMAIL, quando EMAIL_TEST_ALLOWED_TO estiver ausente.
- Se o destinatario nao estiver permitido, retorna 403 com mensagem segura, sem expor a lista completa.

Payload exemplo:
```json
{
  "to": "seu-email@dominio.com",
  "template": "test",
  "from": "KAVIAR <no-reply@kaviar.com.br>"
}
```

Template operacional:
```json
{
  "to": "seu-email@dominio.com",
  "template": "operational",
  "from": "KAVIAR <suporte@kaviar.com.br>",
  "title": "Aviso Operacional",
  "message": "Mensagem de teste operacional"
}
```

## Como validar Cloudflare SMTP
1. Garantir variaveis SMTP configuradas no backend.
2. Subir backend.
3. Chamar POST /api/admin/email/test com token SUPER_ADMIN e destinatario permitido.
4. Confirmar retorno com provider=cloudflare e from efetivo.
5. Conferir logs sem exposicao de token.

## Observacao de seguranca
- Nunca registrar CLOUDFLARE_SMTP_TOKEN em logs.
- Nunca commitar token em arquivos versionados.

## Caminho de configuracao em producao (AWS ECS)
- As variaveis do backend ficam na task definition do servico ECS (container kaviar-backend).
- Fluxo operacional: describe-task-definition -> editar environment/secrets -> register-task-definition -> update-service --force-new-deployment.
- Referencia de script de atualizacao de env na task definition: scripts/deploy/deploy-asaas-production.sh (mesmo padrao de atualizacao via jq).

## Variaveis para adicionar/remover no ECS (env do backend)
Adicionar/garantir:
- EMAIL_PROVIDER=cloudflare
- EMAIL_FROM_DEFAULT=KAVIAR <no-reply@kaviar.com.br>
- EMAIL_REPLY_TO=contato@kaviar.com.br
- CLOUDFLARE_SMTP_HOST=smtp.mx.cloudflare.net
- CLOUDFLARE_SMTP_PORT=465
- CLOUDFLARE_SMTP_SECURE=true
- CLOUDFLARE_SMTP_USER=api_token
- CLOUDFLARE_SMTP_TOKEN=<secret em SSM/Secrets Manager>

Remover como padrao operacional:
- EMAIL_PROVIDER=ses
- Dependencia de SES_FROM_EMAIL para fluxo principal

Podem ser removidas/ignoradas para o fluxo de envio de email (se nao usadas por outro servico):
- SES_FROM_EMAIL
- SES_REGION
- AWS_SES_REGION
- AWS_ACCESS_KEY_ID (somente para email)
- AWS_SECRET_ACCESS_KEY (somente para email)

Observacao:
- AWS_REGION pode continuar necessario para S3/SNS e outros servicos AWS do backend.
