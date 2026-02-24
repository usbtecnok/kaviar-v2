# MVP+ Changelog - Driver PWA

## Novas Funcionalidades

### 1. Solicitar Acesso (Driver Signup)

**UI:**
- Botão "📝 Solicitar Acesso" na tela de login
- Modal com formulário: nome, email, telefone, senha, neighborhoodId

**Backend:**
- Endpoint: `POST /api/driver/onboarding`
- Cria driver com status `pending` (aguarda aprovação)

**Fallback:**
- Se `VITE_FEATURE_DRIVER_SIGNUP=false`: abre WhatsApp com mensagem padronizada

**Logs:**
- `[PWA_DRIVER_DRIVER_SIGNUP_REQUEST]`
- `[PWA_DRIVER_DRIVER_SIGNUP_SUCCESS]`
- `[PWA_DRIVER_DRIVER_SIGNUP_ERROR]`

### 2. Esqueci Minha Senha

**UI:**
- Link "Esqueci minha senha" na tela de login
- Modal com campo de email

**Backend:**
- Endpoint: `POST /api/admin/auth/forgot-password`
- Envia email com link de reset (expira em 15min)
- Por segurança, sempre retorna sucesso

**Fallback:**
- Se `VITE_FEATURE_PASSWORD_RESET=false`: abre WhatsApp com mensagem padronizada

**Logs:**
- `[PWA_DRIVER_PASSWORD_RESET_REQUEST]`
- `[PWA_DRIVER_PASSWORD_RESET_SUCCESS]`
- `[PWA_DRIVER_PASSWORD_RESET_ERROR]`

## Arquivos Criados

```
src/
├── components/
│   ├── ForgotPassword.jsx    # Modal de esqueci senha
│   └── RequestAccess.jsx      # Modal de solicitar acesso
└── lib/
    └── whatsapp.js            # Helper para fallback WhatsApp
```

## Arquivos Modificados

```
src/
├── lib/
│   └── apiClient.js           # + requestPasswordReset, requestDriverAccess, maskEmail
├── pages/
│   └── Login.jsx              # + botões e modals
└── .env                       # + feature flags
```

## Configuração

### Feature Flags

```env
# Habilitar/desabilitar funcionalidades
VITE_FEATURE_PASSWORD_RESET=true
VITE_FEATURE_DRIVER_SIGNUP=true

# WhatsApp de suporte (fallback)
VITE_SUPPORT_WHATSAPP=5521980669989
```

### Comportamento

| Flag | `true` | `false` |
|------|--------|---------|
| `PASSWORD_RESET` | Chama API | Abre WhatsApp |
| `DRIVER_SIGNUP` | Chama API | Abre WhatsApp |

## Segurança

### Email Masking

Emails são mascarados nos logs:
```javascript
// Input: joao.silva@example.com
// Log: joa***@example.com
```

### Password Reset

- Token JWT com expiração de 15 minutos
- Sempre retorna sucesso (não revela se email existe)
- Email enviado apenas se usuário existir

### Driver Signup

- Senha com mínimo 6 caracteres
- Driver criado com status `pending`
- Requer aprovação admin antes de fazer login

## WhatsApp Fallback

**Número:** +55 21 98066-9989

**Mensagens Padronizadas:**

**Password Reset:**
```
Olá! Preciso resetar minha senha no KAVIAR Driver.

Email: {email}

Por favor, me ajude a recuperar o acesso.
```

**Solicitar Acesso:**
```
Olá! Quero acesso ao KAVIAR Driver.

Nome: {nome}
Email: {email}
Telefone: {telefone}

Preciso criar minha conta.
```

## Validação

### Checklist

- [ ] Botão "Solicitar Acesso" aparece na tela de login
- [ ] Link "Esqueci minha senha" aparece na tela de login
- [ ] Modal de solicitar acesso abre e fecha
- [ ] Modal de esqueci senha abre e fecha
- [ ] Com feature habilitada: chama API e mostra sucesso
- [ ] Com feature desabilitada: abre WhatsApp
- [ ] Logs estruturados aparecem no console
- [ ] Email mascarado nos logs
- [ ] Login original continua funcionando

### Comandos

```bash
# Testar com features habilitadas
VITE_FEATURE_PASSWORD_RESET=true \
VITE_FEATURE_DRIVER_SIGNUP=true \
npm run dev

# Testar com features desabilitadas (fallback WhatsApp)
VITE_FEATURE_PASSWORD_RESET=false \
VITE_FEATURE_DRIVER_SIGNUP=false \
npm run dev
```

## Endpoints Backend

### Confirmados no Código

```bash
# Password reset
rg -n "router.post.*'/forgot-password'" backend/src/routes/password-reset.ts
# Linha 35

# Driver onboarding
rg -n "router.post.*'/onboarding'" backend/src/routes/driver-onboarding.ts
# Linha 32

# Montagem
rg -n "app.use.*passwordResetRoutes" backend/src/app.ts
# Linha 187: /api/admin/auth

rg -n "app.use.*driverOnboardingRoutes" backend/src/app.ts
# Linha 217: /api/driver
```

## Compatibilidade

- ✅ Não quebra MVP original
- ✅ Login existente continua funcionando
- ✅ Feature flags permitem habilitar/desabilitar
- ✅ Fallback WhatsApp sempre disponível
- ✅ Mobile-friendly (modals responsivos)

## Status

**PRONTO PARA TESTE**

Todas as funcionalidades implementadas e documentadas.
