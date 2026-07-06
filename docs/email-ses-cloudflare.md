# Email Transacional KAVIAR (Amazon SES + Cloudflare)

## Objetivo
Configurar envio transacional oficial do dominio kaviar.com.br via Amazon SES (regiao us-east-2), com DNS no Cloudflare (SPF, DKIM, DMARC), aliases oficiais e opcional de recebimento por Cloudflare Email Routing.

## Enderecos oficiais
- contato@kaviar.com.br
- no-reply@kaviar.com.br
- suporte@kaviar.com.br
- financeiro@kaviar.com.br

## Estado atual (2026-07-06)
- SES identity: verified (kaviar.com.br)
- DKIM: 3 registros existentes e validos
- SPF: already_ok, contendo include:amazonses.com
- DMARC: already_ok em _dmarc.kaviar.com.br
- Email Routing: pendente manual por erro de autenticacao/permissao
- Teste real de envio SES: sucesso (entregue no Gmail)
- MessageId de validacao: 010f019f3794fd25-ae8fa357-7ea4-4bde-9de0-c6a5038193de-000000

Nota operacional:
- Neste momento, nao tentar nova automacao de Email Routing.
- Manter Email Routing como pendencia manual ate ajuste de permissao na API da Cloudflare.

## Envio (SES)
- Provedor: Amazon SES
- Regiao padrao: us-east-2
- Remetente padrao backend: KAVIAR <no-reply@kaviar.com.br>
- Aliases permitidos para remetente no backend:
  - KAVIAR <contato@kaviar.com.br>
  - KAVIAR <suporte@kaviar.com.br>
  - KAVIAR <financeiro@kaviar.com.br>
  - KAVIAR <no-reply@kaviar.com.br>

## Variaveis de ambiente esperadas
- AWS_REGION=us-east-2
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ZONE_ID
- CLOUDFLARE_ACCOUNT_ID
- FORWARD_TO_EMAIL
- NO_REPLY_ROUTE_MODE=forward

## Script de setup automatizado
Arquivo:
- scripts/setup-kaviar-email.mjs

### O que o script faz
1. Valida variaveis obrigatorias.
2. Consulta identidade SES do dominio kaviar.com.br na regiao configurada.
3. Cria identidade do dominio se nao existir.
4. Le tokens DKIM da identidade e garante CNAMEs DKIM na Cloudflare.
5. Garante SPF sem duplicar registro:
   - se nao existir SPF, cria `v=spf1 include:amazonses.com ~all`.
   - se existir 1 SPF, mescla `include:amazonses.com` sem perder mecanismos atuais.
   - se existirem multiplos SPF, marca pendencia manual.
6. Garante DMARC inicial em monitoramento:
   - `v=DMARC1; p=none; rua=mailto:contato@kaviar.com.br; adkim=s; aspf=s`
7. Tenta configurar Cloudflare Email Routing (habilitar, destino e regras).
8. Gera relatorio em:
   - artifacts/email-ses-cloudflare-report.json

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

Variaveis backend relevantes:
- EMAIL_PROVIDER=ses
- AWS_REGION=us-east-2
- MAIL_FROM_EMAIL="KAVIAR <no-reply@kaviar.com.br>"
- SES_FROM_EMAIL="KAVIAR <no-reply@kaviar.com.br>" (compatibilidade)
- EMAIL_ALLOWED_FROM=contato@kaviar.com.br,suporte@kaviar.com.br,financeiro@kaviar.com.br,no-reply@kaviar.com.br
- EMAIL_TEST_ALLOWED_TO=contato@kaviar.com.br,aparecido.goes@gmail.com
- FORWARD_TO_EMAIL=destino-operacional@dominio.com (fallback quando EMAIL_TEST_ALLOWED_TO nao estiver definido)

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

## Como validar SES
1. Verificar identidade:
```bash
aws sesv2 get-email-identity --email-identity kaviar.com.br --region us-east-2
```
2. Confirmar no resultado:
- VerifiedForSendingStatus=true (ou pending enquanto DNS propaga)
- DkimAttributes.Status=SUCCESS (apos propagacao)

## Como pedir saida do SES Sandbox
1. Abrir console SES em us-east-2.
2. Account dashboard.
3. Request production access.
4. Informar uso transacional (reset de senha, avisos operacionais), volume esperado e processo de tratamento de bounce/complaint.

## Como testar envio
1. Garantir variaveis de email no backend.
2. Subir backend.
3. Chamar POST /api/admin/email/test com token de SUPER_ADMIN.
4. Verificar logs do backend e caixa de destino.

## Como testar recebimento (Email Routing)
Status atual: pendente manual.

1. Definir FORWARD_TO_EMAIL e NO_REPLY_ROUTE_MODE.
2. Executar script de setup.
3. Se automacao de routing falhar por permissao, seguir pendencias do relatorio.
4. Enviar email para:
   - contato@kaviar.com.br
   - suporte@kaviar.com.br
   - financeiro@kaviar.com.br
   - no-reply@kaviar.com.br (forward ou drop conforme modo)

## Cuidados SPF/DKIM/DMARC
- Nunca manter dois registros SPF `v=spf1` no mesmo host.
- DKIM deve usar CNAME (proxied=false) para os 3 seletores do SES.
- DMARC inicial em `p=none` ate estabilizar monitoramento.
- Depois de estabilizar, evoluir gradualmente para `p=quarantine` e `p=reject`.

## IAM recomendado no ECS
Usar IAM Role da task (sem chaves estaticas) com permissao minima para envio SES da identidade do dominio em us-east-2.
