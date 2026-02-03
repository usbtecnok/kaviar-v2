# 🔑 ESQUECI MINHA SENHA - IMPLEMENTAÇÃO COMPLETA

**Data:** 2026-02-02 17:55 BRT  
**Status:** ✅ **CÓDIGO COMPLETO** | ⚠️ **AGUARDANDO DNS**

---

## 📋 IMPLEMENTAÇÃO

### Backend

**1. Email Service (`src/services/email.service.ts`)**
- AWS SES SDK (@aws-sdk/client-ses)
- Remetente: `no-reply@kaviar.com.br`
- Template HTML + texto plano
- Link: `https://kaviar.com.br/admin/reset-password?token=...`

**2. Password Reset Controller (`src/modules/auth/password-reset.controller.ts`)**
- `POST /api/admin/auth/forgot-password`
- `POST /api/admin/auth/reset-password`
- Rate limiting: 3 tentativas / 15 min (in-memory)
- Token: SHA-256 hash (32 bytes random)
- Expiração: 15 minutos
- Anti-enumeration: sempre retorna 200

**3. Database Schema**
```prisma
model admins {
  // ... campos existentes
  reset_token            String?   @unique
  reset_token_expires_at DateTime?
}
```

**4. Migration**
```sql
ALTER TABLE admins ADD COLUMN reset_token VARCHAR(255) UNIQUE;
ALTER TABLE admins ADD COLUMN reset_token_expires_at TIMESTAMP;
CREATE INDEX idx_admins_reset_token ON admins(reset_token) WHERE reset_token IS NOT NULL;
```

---

### Frontend

**1. ForgotPassword.jsx**
- Formulário de email
- Sempre mostra sucesso (anti-enumeration)
- Link para voltar ao login

**2. ResetPassword.jsx**
- Lê token da query string
- Formulário de nova senha + confirmação
- Validação: mínimo 8 caracteres
- Redirect automático para login após sucesso

**3. AdminLogin.jsx**
- Link "🔑 Esqueci minha senha"
- Redirect para `/admin/forgot-password`

**4. Rotas**
```jsx
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

---

## 🔒 SEGURANÇA

### Anti-Enumeration
- Sempre retorna 200 OK
- Mesma mensagem para email existente ou não
- Não revela se email está cadastrado

### Token Security
- 32 bytes random (crypto.randomBytes)
- Hasheado com SHA-256 antes de salvar
- Único (constraint no banco)
- Expiração: 15 minutos
- Invalidado após uso (set null)

### Rate Limiting
- 3 tentativas por email
- Janela de 15 minutos
- In-memory (simples, efetivo)

### Sem Logs Sensíveis
- Token nunca logado
- Senha nunca logada
- Apenas erros genéricos no console

---

## 📧 AWS SES

### Status Atual
- ✅ Domínio criado: `kaviar.com.br`
- ✅ DKIM habilitado (3 tokens gerados)
- ⚠️ Verificação pendente (aguardando DNS)
- ⚠️ Sandbox mode (só emails verificados)

### Registros DNS Necessários

**DKIM (3 registros CNAME):**
```
tlemhsjmzycvgs6stao224xbnu5eeczh._domainkey.kaviar.com.br → tlemhsjmzycvgs6stao224xbnu5eeczh.dkim.amazonses.com
pb7bfue3x22fla36ic5eo7nvuv2uy4id._domainkey.kaviar.com.br → pb7bfue3x22fla36ic5eo7nvuv2uy4id.dkim.amazonses.com
2uwxtsgqbab445rm2tuerot6tj7wqicu._domainkey.kaviar.com.br → 2uwxtsgqbab445rm2tuerot6tj7wqicu.dkim.amazonses.com
```

**SPF (1 registro TXT):**
```
kaviar.com.br → "v=spf1 include:amazonses.com ~all"
```

**DMARC (1 registro TXT):**
```
_dmarc.kaviar.com.br → "v=DMARC1; p=quarantine; rua=mailto:postmaster@kaviar.com.br; pct=100; adkim=s; aspf=s"
```

### Sair do Sandbox

**Após DNS verificado:**
1. Acessar: https://console.aws.amazon.com/ses/home?region=us-east-1#/account
2. Clicar "Request production access"
3. Preencher:
   - Use case: Transactional emails (password reset)
   - Website: https://kaviar.com.br
   - Volume: < 1000 emails/day
   - Bounce handling: Automated via SES suppression list

---

## 🔧 CONFIGURAÇÃO

### Environment Variables

**Backend (.env):**
```bash
FRONTEND_URL=https://kaviar.com.br
```

### ECS Task Role

Adicionar permissão ao Task Role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-east-1:847895361928:identity/kaviar.com.br"
    }
  ]
}
```

---

## 🧪 FLUXO COMPLETO

### 1. Usuário Esquece Senha
```
1. Acessa /admin/login
2. Clica "🔑 Esqueci minha senha"
3. Redireciona para /admin/forgot-password
```

### 2. Solicita Reset
```
1. Digite email
2. POST /api/admin/auth/forgot-password
3. Backend:
   - Verifica rate limit
   - Busca admin no banco
   - Gera token random (32 bytes)
   - Hasheia token (SHA-256)
   - Salva hash + expiração no banco
   - Envia email com token original
4. Frontend mostra sucesso (sempre)
```

### 3. Recebe Email
```
Subject: Redefinição de Senha - KAVIAR Admin
Body: Link com token
Link: https://kaviar.com.br/admin/reset-password?token=abc123...
Expira em: 15 minutos
```

### 4. Redefine Senha
```
1. Clica no link do email
2. Redireciona para /admin/reset-password?token=abc123...
3. Digite nova senha + confirmação
4. POST /api/admin/auth/reset-password
5. Backend:
   - Hasheia token recebido
   - Busca admin com hash + não expirado
   - Valida nova senha (min 8 chars)
   - Hasheia nova senha (bcrypt)
   - Atualiza senha
   - Invalida token (set null)
   - Set must_change_password = false
6. Frontend mostra sucesso
7. Redirect para /admin/login (3s)
```

### 5. Faz Login
```
1. Login com nova senha
2. Acesso liberado ao admin
```

---

## 📝 ENDPOINTS

### POST /api/admin/auth/forgot-password

**Request:**
```json
{
  "email": "admin@kaviar.com.br"
}
```

**Response (sempre 200):**
```json
{
  "success": true,
  "message": "Se o email existir, você receberá instruções para redefinir sua senha."
}
```

**Rate Limit:** 3 tentativas / 15 min por email

---

### POST /api/admin/auth/reset-password

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "NovaSenh@123"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso"
}
```

**Response (erro):**
```json
{
  "success": false,
  "error": "Token inválido ou expirado"
}
```

---

## ✅ CHECKLIST DE DEPLOY

### Pré-Deploy
- [x] Código implementado
- [x] Build backend OK
- [x] Build frontend OK
- [x] Migration criada
- [ ] DNS configurado
- [ ] Domínio verificado no SES
- [ ] Saída do sandbox aprovada
- [ ] ECS Task Role configurado

### Deploy
- [ ] Aplicar migration no banco de produção
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Configurar FRONTEND_URL env var

### Pós-Deploy
- [ ] Testar forgot-password
- [ ] Verificar email recebido
- [ ] Testar reset-password
- [ ] Validar login com nova senha
- [ ] Monitorar logs do SES

---

## 🎯 PRÓXIMOS PASSOS

1. **URGENTE: Configurar DNS**
   - Adicionar 5 registros (3 CNAME + 2 TXT)
   - Ver detalhes em: `docs/AWS_SES_SETUP.md`

2. **Aguardar Verificação**
   - Propagação DNS: até 48h
   - Verificar status: `aws sesv2 get-email-identity --email-identity kaviar.com.br`

3. **Solicitar Saída do Sandbox**
   - Após domínio verificado
   - Formulário AWS (link acima)

4. **Deploy**
   - Aplicar migration
   - Deploy backend + frontend
   - Testar fluxo completo

---

## 📊 ARQUIVOS CRIADOS/MODIFICADOS

### Backend
- ✅ `src/services/email.service.ts` - Serviço de email com SES
- ✅ `src/modules/auth/password-reset.controller.ts` - Controller
- ✅ `src/routes/auth.ts` - Rotas adicionadas
- ✅ `prisma/schema.prisma` - Campos adicionados
- ✅ `prisma/migrations/.../migration.sql` - Migration
- ✅ `package.json` - @aws-sdk/client-ses instalado

### Frontend
- ✅ `src/pages/admin/ForgotPassword.jsx` - Página de esqueci senha
- ✅ `src/pages/admin/ResetPassword.jsx` - Página de reset
- ✅ `src/components/admin/AdminLogin.jsx` - Link adicionado
- ✅ `src/components/admin/AdminApp.jsx` - Rotas adicionadas

### Documentação
- ✅ `docs/AWS_SES_SETUP.md` - Guia de configuração do SES
- ✅ `docs/FORGOT_PASSWORD_IMPLEMENTATION.md` - Este documento

---

**Status:** ✅ Código completo, aguardando configuração DNS para testes

**Data:** 2026-02-02 17:55 BRT
