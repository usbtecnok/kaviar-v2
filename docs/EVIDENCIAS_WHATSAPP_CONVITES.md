# EVIDÊNCIAS: WHATSAPP PARA CONVITES INVESTIDOR/ANJO

**Data**: 2026-02-10  
**Commit**: 578c5c4  
**Status**: ✅ BACKEND IMPLEMENTADO

---

## OBJETIVO

Trocar envio de convite de Investidor/Anjo de Email (SES) para WhatsApp (Twilio), porque Amazon ainda não aprovou SES.

**Requisitos**:
- ✅ Não quebrar fluxo atual (email continua funcionando)
- ✅ Implementação limpa (sem Frankenstein)
- ✅ Backward compatible
- ✅ Safe by default

---

## IMPLEMENTAÇÃO BACKEND

### 1. Serviço WhatsApp

**Arquivo**: `backend/src/services/whatsapp.ts`

```typescript
class WhatsAppService {
  private client: ReturnType<typeof twilio> | null = null;
  
  constructor() {
    // Inicializa apenas se env vars existirem
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('[WhatsApp] Missing Twilio env vars - WhatsApp invites disabled');
      return;
    }
    
    this.client = twilio(accountSid, authToken);
  }
  
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  async sendWhatsAppInvite(params: { to: string; body: string }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not configured. Check TWILIO_* env vars.');
    }
    
    const normalizedTo = this.normalizeWhatsAppNumber(params.to);
    const normalizedFrom = this.normalizeWhatsAppNumber(this.config!.fromNumber);
    
    await this.client!.messages.create({
      body: params.body,
      from: normalizedFrom,  // whatsapp:+14155238886
      to: normalizedTo       // whatsapp:+5521980669989
    });
  }
}
```

**Normalização**: Converte `+5521980669989` → `whatsapp:+5521980669989`

**Env Vars Necessárias**:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

### 2. Endpoint Atualizado

**Arquivo**: `backend/src/routes/investor-invites.ts`

**Schemas de Validação**:
```typescript
// Email (legacy)
const inviteSchemaEmail = z.object({
  channel: z.literal('email').optional(),
  email: z.string().email('Email inválido'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'])
});

// WhatsApp (novo)
const inviteSchemaWhatsApp = z.object({
  channel: z.literal('whatsapp'),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Telefone deve estar no formato E.164 (+5521...)'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'])
});

const inviteSchema = z.union([inviteSchemaEmail, inviteSchemaWhatsApp]);
```

**Lógica**:
```typescript
const channel = 'channel' in data ? data.channel : 'email';  // Default: email

if (channel === 'whatsapp') {
  phone = data.phone;
  // Criar email temporário único
  email = `whatsapp${phone.replace(/\+/g, '').replace(/\D/g, '')}@kaviar.local`;
  displayName = `Investidor (${phone})`;
} else {
  email = data.email;
  displayName = 'Investidor';
}

// Verificar se WhatsApp está disponível
if (channel === 'whatsapp' && !whatsappService.isAvailable()) {
  return res.status(503).json({ 
    success: false, 
    error: 'WhatsApp não configurado. Entre em contato com o administrador.' 
  });
}

// Mesmo token/link para ambos canais
const token = generateInviteToken(admin.id, 'admin');
const resetUrl = `${config.frontendUrl}/admin/reset-password?token=${token}`;

// Enviar pelo canal escolhido
if (channel === 'whatsapp') {
  await whatsappService.sendWhatsAppInvite({
    to: phone,
    body: `🔐 *KAVIAR - Convite para Acesso*\n\n` +
          `Você foi convidado...\n\n` +
          `📱 Defina sua senha:\n${resetUrl}\n\n` +
          `⏱️ Este link expira em *15 minutos*.`
  });
  
  return res.json({ success: true, message: 'Convite enviado via WhatsApp.' });
} else {
  await emailService.sendMail({ to: email, subject: '...', html: '...' });
  return res.json({ success: true, message: 'Convite enviado (se o email existir...).' });
}
```

---

## EVIDÊNCIAS DE CÓDIGO

### 1. Serviço WhatsApp
```bash
$ rg -n "sendWhatsAppInvite" backend/src/services/whatsapp.ts

backend/src/services/whatsapp.ts:67:  async sendWhatsAppInvite(params: SendWhatsAppParams): Promise<void> {
```

### 2. Endpoint Atualizado
```bash
$ rg -n "channel.*whatsapp" backend/src/routes/investor-invites.ts

backend/src/routes/investor-invites.ts:18:const inviteSchemaWhatsApp = z.object({
backend/src/routes/investor-invites.ts:19:  channel: z.literal('whatsapp'),
backend/src/routes/investor-invites.ts:48:    const channel = 'channel' in data ? data.channel : 'email';
backend/src/routes/investor-invites.ts:55:    if (channel === 'whatsapp') {
backend/src/routes/investor-invites.ts:67:    if (channel === 'whatsapp' && !whatsappService.isAvailable()) {
backend/src/routes/investor-invites.ts:103:    if (channel === 'whatsapp' && phone) {
```

---

## TESTES COM CURL

### Teste 1: Email (Legacy - Backward Compatible)
```bash
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","role":"ANGEL_VIEWER"}' | jq

# Esperado:
{
  "success": true,
  "message": "Convite enviado (se o email existir, receberá instruções)."
}
```

### Teste 2: Email Explícito
```bash
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","email":"teste@exemplo.com","role":"INVESTOR_VIEW"}' | jq

# Esperado: mesmo resultado acima
```

### Teste 3: WhatsApp (Novo)
```bash
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","phone":"+5521980669989","role":"ANGEL_VIEWER"}' | jq

# Esperado (se Twilio configurado):
{
  "success": true,
  "message": "Convite enviado via WhatsApp."
}

# Esperado (se Twilio NÃO configurado):
{
  "success": false,
  "error": "WhatsApp não configurado. Entre em contato com o administrador."
}
```

### Teste 4: Validação de Phone (E.164)
```bash
# ❌ Sem +
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","phone":"5521980669989","role":"ANGEL_VIEWER"}' | jq

# Esperado:
{
  "success": false,
  "error": "Telefone deve estar no formato E.164 (+5521...)"
}

# ❌ Com espaços/parênteses
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","phone":"+55 (21) 98066-9989","role":"ANGEL_VIEWER"}' | jq

# Esperado: mesmo erro acima
```

---

## CONFIGURAÇÃO TWILIO (PRODUÇÃO)

### 1. Obter Credenciais
```
1. Acessar: https://console.twilio.com
2. Criar conta (ou usar existente)
3. Copiar:
   - Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Configurar WhatsApp Sandbox (Teste)
```
1. Console → Messaging → Try it out → Try WhatsApp
2. Enviar mensagem "join <code>" para +1 415 523 8886
3. Usar TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 3. Configurar WhatsApp Business (Produção)
```
1. Console → Messaging → WhatsApp → Get Started
2. Conectar Facebook Business Manager
3. Submeter template de mensagem para aprovação
4. Usar número próprio: whatsapp:+5521XXXXXXXX
```

### 4. Adicionar Secrets no GitHub
```bash
gh secret set TWILIO_ACCOUNT_SID --body "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set TWILIO_AUTH_TOKEN --body "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set TWILIO_WHATSAPP_FROM --body "whatsapp:+14155238886"
```

### 5. Atualizar ECS Task Definition
```json
{
  "environment": [
    {
      "name": "TWILIO_ACCOUNT_SID",
      "value": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    {
      "name": "TWILIO_AUTH_TOKEN",
      "value": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    {
      "name": "TWILIO_WHATSAPP_FROM",
      "value": "whatsapp:+14155238886"
    }
  ]
}
```

---

## MENSAGEM WHATSAPP (EXEMPLO)

```
🔐 *KAVIAR - Convite para Acesso*

Olá,

Você foi convidado para acessar o sistema KAVIAR com permissões de *Investidor* (read-only).

📱 Defina sua senha:
https://kaviar.com.br/admin/reset-password?token=eyJhbGciOiJIUzI1NiIs...

⏱️ Este link expira em *15 minutos*.

Após definir sua senha, faça login em:
https://kaviar.com.br/admin/login
```

---

## SEGURANÇA

### 1. Safe by Default ✅
- WhatsApp desabilitado se env vars faltarem
- Retorna erro 503 claro (não crash)
- Email continua funcionando como fallback

### 2. Validação ✅
- Phone: regex E.164 (`^\+\d{10,15}$`)
- Role: enum `INVESTOR_VIEW | ANGEL_VIEWER`
- Rate limit: 10 invites/min (ambos canais)

### 3. Token ✅
- Mesmo JWT para email e WhatsApp
- Expiração: 15 minutos
- Tipo: `password_reset`

### 4. Email Temporário ✅
- WhatsApp cria: `whatsapp5521980669989@kaviar.local`
- Único por phone
- Permite login futuro (se necessário)

---

## LIMITAÇÕES CONHECIDAS

### 1. Twilio WhatsApp Sandbox
- **Limitação**: Usuário precisa enviar "join <code>" antes
- **Solução**: Usar WhatsApp Business API (produção)

### 2. Templates Aprovados
- **Limitação**: WhatsApp Business exige templates pré-aprovados
- **Solução**: Submeter template de "convite" para aprovação
- **Tempo**: 24-48h para aprovação

### 3. Custo
- **Sandbox**: Gratuito (teste)
- **Business**: ~$0.005 por mensagem (Brasil)
- **Estimativa**: 100 convites/mês = $0.50/mês

---

## PRÓXIMOS PASSOS

### Backend ✅ COMPLETO
- [x] Serviço WhatsApp criado
- [x] Endpoint atualizado
- [x] Validações implementadas
- [x] Build OK
- [x] Commit feito

### Frontend ⏳ PENDENTE
- [ ] Adicionar seletor "Canal: Email / WhatsApp"
- [ ] Input condicional (email vs phone)
- [ ] Validação E.164 no frontend
- [ ] Atualizar texto "Como funciona"

### Deploy ⏳ PENDENTE
- [ ] Configurar secrets Twilio no GitHub
- [ ] Atualizar ECS task definition
- [ ] Deploy backend
- [ ] Testar em PROD

### Documentação ⏳ PENDENTE
- [ ] Runbook de configuração Twilio
- [ ] Guia de troubleshooting
- [ ] Exemplos de uso

---

**Status**: ✅ BACKEND PRONTO - Aguardando frontend + deploy
