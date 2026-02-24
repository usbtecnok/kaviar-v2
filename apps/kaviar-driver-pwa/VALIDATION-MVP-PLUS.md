# Validação MVP+ - Driver PWA

## Comandos para Rodar

### 1. Setup
```bash
cd ~/kaviar/apps/kaviar-driver-pwa
npm install
```

### 2. Configurar
```bash
# Copiar .env.example
cp .env.example .env

# Editar .env
# VITE_FEATURE_PASSWORD_RESET=true
# VITE_FEATURE_DRIVER_SIGNUP=true
```

### 3. Rodar
```bash
npm run dev
```

Abrir: http://localhost:5173

## Checklist de Validação

### ✅ UI Aparece

- [ ] Tela de login carrega
- [ ] Botão "📝 Solicitar Acesso" visível
- [ ] Link "Esqueci minha senha" visível
- [ ] Campos de login (email/password) funcionam

### ✅ Solicitar Acesso

**Com feature habilitada (`VITE_FEATURE_DRIVER_SIGNUP=true`):**

1. [ ] Clicar em "📝 Solicitar Acesso"
2. [ ] Modal abre
3. [ ] Preencher:
   - Nome: "João Teste"
   - Email: "joao.teste@example.com"
   - Telefone: "21987654321"
   - Senha: "senha123"
   - Neighborhood ID: "test-neighborhood"
4. [ ] Clicar "Solicitar"
5. [ ] Ver mensagem "✅ Solicitação Enviada"
6. [ ] Console mostra:
   ```
   [PWA_DRIVER_DRIVER_SIGNUP_REQUEST] Requesting driver access { email: "joa***@example.com", name: "João Teste" }
   [PWA_DRIVER_API_REQUEST] POST /api/driver/onboarding
   [PWA_DRIVER_API_SUCCESS] 200 /api/driver/onboarding
   [PWA_DRIVER_DRIVER_SIGNUP_SUCCESS] Signup successful { email: "joa***@example.com" }
   ```

**Com feature desabilitada (`VITE_FEATURE_DRIVER_SIGNUP=false`):**

1. [ ] Clicar em "📝 Solicitar Acesso"
2. [ ] Modal abre
3. [ ] Preencher nome, email, telefone
4. [ ] Clicar "Contatar Suporte"
5. [ ] WhatsApp abre com mensagem:
   ```
   Olá! Quero acesso ao KAVIAR Driver.
   
   Nome: João Teste
   Email: joao.teste@example.com
   Telefone: 21987654321
   
   Preciso criar minha conta.
   ```

### ✅ Esqueci Senha

**Com feature habilitada (`VITE_FEATURE_PASSWORD_RESET=true`):**

1. [ ] Clicar "Esqueci minha senha"
2. [ ] Modal abre
3. [ ] Inserir email: "driver@example.com"
4. [ ] Clicar "Enviar"
5. [ ] Ver mensagem "✅ Email Enviado"
6. [ ] Console mostra:
   ```
   [PWA_DRIVER_PASSWORD_RESET_REQUEST] Requesting password reset { email: "dri***@example.com" }
   [PWA_DRIVER_API_REQUEST] POST /api/admin/auth/forgot-password
   [PWA_DRIVER_API_SUCCESS] 200 /api/admin/auth/forgot-password
   [PWA_DRIVER_PASSWORD_RESET_SUCCESS] Reset email sent { email: "dri***@example.com" }
   ```

**Com feature desabilitada (`VITE_FEATURE_PASSWORD_RESET=false`):**

1. [ ] Clicar "Esqueci minha senha"
2. [ ] Modal abre
3. [ ] Inserir email: "driver@example.com"
4. [ ] Clicar "Contatar Suporte"
5. [ ] WhatsApp abre com mensagem:
   ```
   Olá! Preciso resetar minha senha no KAVIAR Driver.
   
   Email: driver@example.com
   
   Por favor, me ajude a recuperar o acesso.
   ```

### ✅ Login Original

- [ ] Login com credenciais válidas funciona
- [ ] Token salvo no localStorage
- [ ] Redirecionamento para Dashboard
- [ ] Nenhuma regressão no fluxo original

### ✅ Segurança

- [ ] Email mascarado nos logs (joa***@example.com)
- [ ] Password nunca aparece nos logs
- [ ] Modals fecham ao clicar "Cancelar"
- [ ] Modals fecham ao clicar fora (overlay)

### ✅ Mobile

- [ ] Abrir DevTools → Toggle device toolbar
- [ ] Testar em iPhone SE (375x667)
- [ ] Modals responsivos
- [ ] Botões touch-friendly
- [ ] Sem scroll horizontal

## Validação Backend

### Password Reset

```bash
# Verificar endpoint existe
cd ~/kaviar/backend
rg -n "router.post.*'/forgot-password'" src/routes/password-reset.ts

# Verificar montagem
rg -n "app.use.*passwordResetRoutes" src/app.ts
```

**Esperado:**
- Linha 35 em password-reset.ts
- Linha 187 em app.ts: `/api/admin/auth`

### Driver Onboarding

```bash
# Verificar endpoint existe
rg -n "router.post.*'/onboarding'" src/routes/driver-onboarding.ts

# Verificar montagem
rg -n "app.use.*driverOnboardingRoutes" src/app.ts
```

**Esperado:**
- Linha 32 em driver-onboarding.ts
- Linha 217 em app.ts: `/api/driver`

### Testar Endpoints Diretamente

```bash
# Password reset
curl -X POST http://localhost:3000/api/admin/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com","userType":"driver"}'

# Driver onboarding
curl -X POST http://localhost:3000/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name":"João Teste",
    "email":"joao.teste@example.com",
    "phone":"21987654321",
    "password":"senha123",
    "neighborhoodId":"test-neighborhood"
  }'
```

## Evidências

### Screenshots

- [ ] Tela de login com novos botões
- [ ] Modal "Solicitar Acesso" aberto
- [ ] Modal "Esqueci Senha" aberto
- [ ] Mensagem de sucesso
- [ ] WhatsApp aberto (fallback)

### Logs

- [ ] Clicar "📥 Logs" no Dashboard
- [ ] Salvar JSON em `docs/evidencias/mvp-plus-{timestamp}.json`
- [ ] Verificar presença de tags:
  - `[PWA_DRIVER_DRIVER_SIGNUP_*]`
  - `[PWA_DRIVER_PASSWORD_RESET_*]`

## Critérios de Sucesso

✅ Todos os itens marcados  
✅ Nenhuma regressão no MVP original  
✅ Feature flags funcionam (on/off)  
✅ Fallback WhatsApp funciona  
✅ Logs estruturados e mascarados  
✅ Mobile-friendly  

## Tempo Estimado

- Setup: 1 minuto
- Teste com features ON: 3 minutos
- Teste com features OFF: 2 minutos
- Validação backend: 2 minutos
- **Total: ~8 minutos**
