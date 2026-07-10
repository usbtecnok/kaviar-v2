# Migracao de envio de email para Cloudflare SMTP (KAVIAR)

## Objetivo

Trocar o envio transacional do backend de Amazon SES para Cloudflare Email Sending via SMTP, mantendo o recebimento do dominio em Cloudflare Email Routing.

## Escopo

- Envio outbound: Cloudflare SMTP.
- Recebimento inbound: Cloudflare Email Routing (sem remocao de DNS de routing).
- SES: apenas legado opcional, nao padrao.

## Arquivos de codigo envolvidos

- backend/src/services/email/email.service.ts
- backend/src/services/email/providers/cloudflare-smtp.provider.ts
- backend/src/services/email/providers/ses.provider.ts (legado)
- backend/src/routes/admin-email.ts
- backend/src/services/email/templates/kaviar-defaults.ts
- backend/.env.example

## Variaveis de ambiente (producao)

### Obrigatorias para Cloudflare SMTP

- EMAIL_PROVIDER=cloudflare
- EMAIL_FROM_DEFAULT=KAVIAR <no-reply@kaviar.com.br>
- EMAIL_REPLY_TO=contato@kaviar.com.br
- CLOUDFLARE_SMTP_HOST=smtp.mx.cloudflare.net
- CLOUDFLARE_SMTP_PORT=465
- CLOUDFLARE_SMTP_SECURE=true
- CLOUDFLARE_SMTP_USER=api_token
- CLOUDFLARE_SMTP_TOKEN=<definir via secret, nao em plaintext>

### Mantidas por seguranca operacional

- EMAIL_ALLOWED_FROM=contato@kaviar.com.br,suporte@kaviar.com.br,financeiro@kaviar.com.br,no-reply@kaviar.com.br
- EMAIL_TEST_ALLOWED_TO=<lista permitida para teste administrativo>

### Remover como padrao

- EMAIL_PROVIDER=ses
- Dependencia de SES_FROM_EMAIL no fluxo principal

### Podem ser removidas/ignoradas (apenas para envio de email)

- SES_FROM_EMAIL
- SES_REGION
- AWS_SES_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

Observacao:

- AWS_REGION pode continuar necessario para outros componentes (ex.: S3/SNS).

## Onde configurar no AWS/ECS

As variaveis do backend ficam na task definition do servico ECS, no container kaviar-backend.

Fluxo operacional:

1. Ler task atual:

```bash
aws ecs describe-task-definition --task-definition kaviar-backend --region us-east-2
```

2. Atualizar environment/secrets do container kaviar-backend com as variaveis Cloudflare.

3. Registrar nova revisao:

```bash
aws ecs register-task-definition --cli-input-json file://task-def-updated.json --region us-east-2
```

4. Atualizar servico com force deployment:

```bash
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --task-definition kaviar-backend:<nova-revisao> --force-new-deployment --region us-east-2
```

Observacao:

- Armazenar CLOUDFLARE_SMTP_TOKEN em SSM Parameter Store ou Secrets Manager.
- Nao expor token em logs, docs publicas ou git.

## Regras de remetente

Remetentes permitidos:

- no-reply@kaviar.com.br
- suporte@kaviar.com.br
- financeiro@kaviar.com.br
- contato@kaviar.com.br

Uso recomendado:

- Automaticos: no-reply@kaviar.com.br
- Suporte: suporte@kaviar.com.br
- Financeiro: financeiro@kaviar.com.br
- Geral: contato@kaviar.com.br

## Endpoint administrativo de teste

- Rota: POST /api/admin/email/test
- Protecao: authenticateAdmin + requireSuperAdmin
- Resposta: inclui provider usado e from efetivo.
- Erro: retorna falha util sem expor credenciais.

Payload exemplo:

```json
{
  "to": "contato@kaviar.com.br",
  "template": "test",
  "from": "KAVIAR <no-reply@kaviar.com.br>"
}
```

## Checklist de validacao

1. EMAIL_PROVIDER em producao definido como cloudflare.
2. Envio de teste via /api/admin/email/test retorna provider=cloudflare.
3. Logs mostram provider, destinatario mascarado e assunto.
4. Logs nao mostram CLOUDFLARE_SMTP_TOKEN.
5. Cloudflare Email Routing continua ativo para recebimento no dominio.
