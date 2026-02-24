# Test Checklist - Driver PWA

## Pre-requisitos

- [ ] Backend rodando (staging ou local)
- [ ] Credenciais de driver válidas
- [ ] Browser com DevTools aberto
- [ ] Permissão de localização habilitada

## Testes Funcionais

### 0. Solicitar Acesso (Novo)
- [ ] Abrir http://localhost:5173
- [ ] Clicar em "📝 Solicitar Acesso"
- [ ] Preencher nome, email, telefone
- [ ] Se `VITE_FEATURE_DRIVER_SIGNUP=true`: preencher senha e enviar
- [ ] Se `VITE_FEATURE_DRIVER_SIGNUP=false`: abre WhatsApp
- [ ] Verificar log `[PWA_DRIVER_DRIVER_SIGNUP_SUCCESS]` ou WhatsApp aberto

### 0b. Esqueci Senha (Novo)
- [ ] Na tela de login, clicar "Esqueci minha senha"
- [ ] Inserir email
- [ ] Se `VITE_FEATURE_PASSWORD_RESET=true`: verificar mensagem de sucesso
- [ ] Se `VITE_FEATURE_PASSWORD_RESET=false`: abre WhatsApp
- [ ] Verificar log `[PWA_DRIVER_PASSWORD_RESET_SUCCESS]` ou WhatsApp aberto

### 1. Login
- [ ] Abrir http://localhost:5173
- [ ] Inserir email válido
- [ ] Inserir password válida
- [ ] Clicar "Login"
- [ ] Verificar redirecionamento para Dashboard
- [ ] Verificar log `[PWA_DRIVER_AUTH_LOGIN_SUCCESS]` no console

### 2. GPS
- [ ] Permitir acesso à localização quando solicitado
- [ ] Verificar coordenadas exibidas na tela
- [ ] Verificar log `[PWA_DRIVER_GPS_UPDATE]` no console
- [ ] Aguardar 10s
- [ ] Verificar log `[PWA_DRIVER_GPS_SEND]` no console
- [ ] Repetir 3x para confirmar intervalo

### 3. Online/Offline
- [ ] Clicar em "🔴 OFFLINE"
- [ ] Verificar mudança para "🟢 ONLINE" (verde)
- [ ] Verificar log `[PWA_DRIVER_AVAILABILITY_SUCCESS]` no console
- [ ] Verificar log `[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/me/availability`
- [ ] Clicar novamente
- [ ] Verificar volta para "🔴 OFFLINE" (vermelho)

### 4. SSE (Realtime)
- [ ] Colocar driver ONLINE
- [ ] Verificar log `[PWA_DRIVER_SSE_CONNECT]` no console
- [ ] Abrir DevTools → Network → Filter: EventStream
- [ ] Verificar conexão ativa em `/api/realtime/driver`
- [ ] Criar offer no sistema (via admin ou API)
- [ ] Verificar log `[PWA_DRIVER_SSE_OFFER_RECEIVED]` no console
- [ ] Verificar card de offer apareceu na tela

### 5. Accept Offer
- [ ] Verificar offer visível na tela
- [ ] Clicar em "Accept"
- [ ] Verificar log `[PWA_DRIVER_OFFER_ACCEPT_SUCCESS]` no console
- [ ] Verificar card desapareceu
- [ ] Verificar `rideId` no log

### 6. Logs Export
- [ ] Clicar no botão "📥 Logs"
- [ ] Verificar download do arquivo JSON
- [ ] Abrir arquivo e validar estrutura
- [ ] Verificar presença de todos os eventos testados

### 7. Logout
- [ ] Clicar em "Logout"
- [ ] Verificar redirecionamento para tela de login
- [ ] Verificar log `[PWA_DRIVER_AUTH_LOGOUT]` no console
- [ ] Verificar localStorage vazio (DevTools → Application → Local Storage)

## Testes Mobile

### 8. Layout Responsivo
- [ ] Abrir DevTools → Toggle device toolbar
- [ ] Testar em iPhone SE (375x667)
- [ ] Testar em iPhone 12 Pro (390x844)
- [ ] Testar em iPad (768x1024)
- [ ] Verificar botões com tamanho adequado (min 44px)
- [ ] Verificar texto legível
- [ ] Verificar sem scroll horizontal

### 9. Touch
- [ ] Testar todos os botões com touch
- [ ] Verificar feedback visual
- [ ] Verificar sem delay no tap

## Validação Backend

### 10. CloudWatch (se em staging/prod)
```bash
# Login events
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-api \
  --filter-pattern "driver/login" \
  --start-time $(date -d '5 minutes ago' +%s)000

# GPS updates
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-api \
  --filter-pattern "me/location" \
  --start-time $(date -d '5 minutes ago' +%s)000

# Offer accepts
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-api \
  --filter-pattern "offers/*/accept" \
  --start-time $(date -d '5 minutes ago' +%s)000
```

### 11. Database
```bash
# Verificar driver_status
psql -c "SELECT * FROM driver_status WHERE driver_id = 'DRIVER_ID';"

# Verificar driver_locations
psql -c "SELECT * FROM driver_locations WHERE driver_id = 'DRIVER_ID';"

# Verificar rides criadas
psql -c "SELECT * FROM rides WHERE driver_id = 'DRIVER_ID' ORDER BY created_at DESC LIMIT 5;"
```

## Evidências

- [ ] Salvar logs exportados em `docs/evidencias/driver-pwa-{timestamp}.json`
- [ ] Screenshot do login
- [ ] Screenshot do GPS funcionando
- [ ] Screenshot de offer recebida
- [ ] Screenshot de offer aceita
- [ ] Screenshot do export de logs

## Critérios de Sucesso

✅ Todos os itens marcados
✅ Nenhum erro no console (exceto esperados)
✅ Logs estruturados com tags corretas
✅ Backend recebeu todas as requests
✅ Database atualizado corretamente
