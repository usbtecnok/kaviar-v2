# Integração Amazon SES - Email Service

## Status
✅ Implementado com feature flag  
⏳ Aguardando verificação DKIM no SES

## Configuração

### Variáveis de Ambiente

```bash
# Email Provider (default: disabled)
EMAIL_PROVIDER=disabled  # ou 'ses' quando SES estiver verificado

# AWS SES Config (quando EMAIL_PROVIDER=ses)
AWS_REGION=us-east-1
SES_FROM_EMAIL=no-reply@kaviar.com.br

# Frontend URL (para links de reset)
FRONTEND_URL=https://app.kaviar.com.br
```

### Comportamento por Modo

**EMAIL_PROVIDER=disabled (padrão)**
- Endpoints continuam respondendo 200 neutro
- Log: `[EMAIL_DISABLED] to=m***d@domain.com subject="..."`
- Não envia email real
- Não quebra fluxo

**EMAIL_PROVIDER=ses**
- Tenta enviar via Amazon SES
- Se sucesso: `[EMAIL_SENT] provider=ses to=m***d@domain.com`
- Se falha: `[EMAIL_SEND_FAILED] provider=ses error=...`
- Mesmo com falha, retorna 200 (não quebra fluxo)

## Arquitetura

### Módulos Criados

```
backend/src/services/email/
├── email.service.ts          # Serviço principal com feature flag
└── providers/
    └── ses.provider.ts       # Provider AWS SES
```

### Integrações

**Forgot Password** (`/api/admin/auth/forgot-password`)
- Envia email com link de reset
- Expira em 15 minutos
- Template HTML + texto plano

**Investor Invite** (`/api/admin/investors/invite`)
- Envia email de convite
- Link para definir senha
- Expira em 15 minutos

## Segurança

### Logs Seguros
- ✅ Email mascarado: `j***o@exemplo.com`
- ✅ Nunca loga token completo
- ✅ Nunca loga link completo
- ✅ Apenas status e erro genérico

### Resposta Neutra
- Sempre retorna 200 com mensagem genérica
- Não revela se email existe
- Não revela se envio falhou

## Testes de Validação

### Teste 1: Forgot Password (EMAIL_PROVIDER=disabled)

```bash
curl -i -X POST "https://api.kaviar.com.br/api/admin/auth/forgot-password" \
  -H "Origin: https://app.kaviar.com.br" \
  -H "Content-Type: application/json" \
  -d '{"email":"angel1@kaviar.com","userType":"admin"}'
```

**Esperado:**
- HTTP 200
- `{"success":true,"message":"Se o email existir..."}`
- Log backend: `[EMAIL_DISABLED] to=a***1@kaviar.com subject="KAVIAR - Redefinição de Senha"`

### Teste 2: Investor Invite (EMAIL_PROVIDER=disabled)

```bash
# Obter token SUPER_ADMIN
TOKEN=$(curl -sS -X POST "https://api.kaviar.com.br/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"SUA_SENHA"}' \
  | jq -r '.token')

# Enviar convite
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"investidor@exemplo.com","role":"INVESTOR_VIEW"}'
```

**Esperado:**
- HTTP 200
- `{"success":true,"message":"Convite enviado..."}`
- Log backend: `[EMAIL_DISABLED] to=i***r@exemplo.com subject="KAVIAR - Convite para Acesso"`

### Teste 3: Com SES Habilitado (após verificação)

```bash
# Configurar env vars no ECS Task Definition
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
SES_FROM_EMAIL=no-reply@kaviar.com.br

# Executar mesmo teste 1 ou 2
```

**Esperado:**
- HTTP 200 (mesmo comportamento)
- Log backend: `[EMAIL_SENT] provider=ses to=...` (se sucesso)
- Ou: `[EMAIL_SEND_FAILED] provider=ses error=...` (se falha, mas não quebra)
- Email real entregue na caixa de entrada

## Verificação SES

### Status Atual
- Domínio: `kaviar.com.br`
- DKIM CNAMEs: ✅ Configurados e resolvendo via DNS
- Status SES: ⏳ Pendente verificação pela AWS

### Quando Verificado
1. Atualizar Task Definition do ECS:
   ```json
   {
     "name": "EMAIL_PROVIDER",
     "value": "ses"
   }
   ```
2. Redeploy do serviço
3. Testar envio real

## Troubleshooting

### Email não chega (EMAIL_PROVIDER=ses)

1. Verificar logs do backend:
   ```bash
   aws logs tail /ecs/kaviar-backend --since 5m --region us-east-2 | grep EMAIL
   ```

2. Verificar status SES:
   ```bash
   aws ses get-identity-verification-attributes \
     --identities no-reply@kaviar.com.br \
     --region us-east-1
   ```

3. Verificar sandbox mode:
   - SES em sandbox só envia para emails verificados
   - Solicitar saída do sandbox: AWS Console > SES > Account Dashboard

### Erro de credenciais AWS

- ECS Task Role deve ter permissão `ses:SendEmail`
- Verificar IAM Role anexado ao Task Definition

### Fallback sempre ativo

- Confirmar `EMAIL_PROVIDER=ses` nas env vars
- Verificar logs: deve aparecer `[EMAIL_SENT]` ou `[EMAIL_SEND_FAILED]`, não `[EMAIL_DISABLED]`

## Dependências

```json
{
  "@aws-sdk/client-ses": "^3.982.0"
}
```

## Próximos Passos

1. ⏳ Aguardar verificação DKIM no SES
2. ⏳ Configurar `EMAIL_PROVIDER=ses` no ECS
3. ⏳ Testar envio real em produção
4. 📋 Considerar templates mais elaborados (HTML com CSS inline)
5. 📋 Adicionar tabela de audit log para rastreamento
6. 📋 Implementar retry com exponential backoff (se necessário)

## Referências

- AWS SES SDK: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/
- Verificação de domínio: https://docs.aws.amazon.com/ses/latest/dg/verify-domain-procedure.html
- Saída do sandbox: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
