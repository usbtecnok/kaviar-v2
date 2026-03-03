# ✅ CHECKLIST DIA 2 - E2E DEVICE (Android)

**Objetivo:** Validar envio periódico de localização quando motorista está online

---

## 📱 TESTES NO DEVICE

### Pré-requisitos
- [ ] App instalado no Android
- [ ] GPS habilitado no device
- [ ] Conexão com internet

---

### Teste 1: Login e Home
- [ ] Abrir app
- [ ] Fazer login com motorista cadastrado
- [ ] Verificar: tela Home exibe nome do motorista
- [ ] Verificar: status mostra "OFFLINE"

---

### Teste 2: Ficar Online
- [ ] Clicar botão "Ficar Online"
- [ ] Permitir acesso ao GPS (se solicitado)
- [ ] Verificar: status muda para "ONLINE"
- [ ] Verificar: botão "Ficar Offline" aparece

**Aguardar 45 segundos** (3 envios de 15s cada)

---

### Teste 3: Validar Envio no Backend

#### Opção A: Via SQL (direto no banco)
```sql
-- Substituir 'seu.email@kaviar.com' pelo email do motorista
SELECT 
  id,
  name,
  email,
  last_lat,
  last_lng,
  last_location_updated_at,
  EXTRACT(EPOCH FROM (NOW() - last_location_updated_at)) as seconds_ago
FROM drivers 
WHERE email = 'seu.email@kaviar.com';
```

**Esperado:**
- `last_lat` e `last_lng` preenchidos
- `last_location_updated_at` atualizado recentemente (< 20 segundos)
- Executar query 2x com 15s de intervalo → `last_location_updated_at` deve mudar

---

#### Opção B: Via CloudWatch Logs
```bash
# Buscar logs do motorista (últimos 2 minutos)
aws logs tail /ecs/kaviar-backend --since 2m --region us-east-2 \
  | grep "POST /driver/location" \
  | grep "status: 200"
```

**Esperado:**
```
2026-03-03T10:26:20.889Z | POST /driver/location | status: 200 | durationMs: 18
2026-03-03T10:26:35.889Z | POST /driver/location | status: 200 | durationMs: 12
2026-03-03T10:26:50.889Z | POST /driver/location | status: 200 | durationMs: 15
```

Logs a cada ~15 segundos

---

#### Opção C: Via Endpoint Admin (se existir)
```bash
# Obter token admin
ADMIN_TOKEN="<seu_token_admin>"

# Buscar motorista
curl -X GET "https://api.kaviar.com.br/api/admin/drivers?email=seu.email@kaviar.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.drivers[0] | {id, name, last_lat, last_lng, last_location_updated_at}'
```

---

### Teste 4: Ficar Offline
- [ ] No app, clicar botão "Ficar Offline"
- [ ] Verificar: status muda para "OFFLINE"
- [ ] Verificar: botão "Ficar Online" volta a aparecer

**Aguardar 30 segundos**

- [ ] Executar query SQL novamente
- [ ] Verificar: `last_location_updated_at` **NÃO mudou** (parou de enviar)

---

### Teste 5: Fechar e Reabrir App
- [ ] Fechar app completamente (swipe no Android)
- [ ] Reabrir app
- [ ] Verificar: mantém sessão (vai direto para Home)
- [ ] Verificar: status volta para "OFFLINE" (correto)

---

### Teste 6: Logout
- [ ] Clicar botão "Sair"
- [ ] Confirmar logout
- [ ] Verificar: volta para tela de Login
- [ ] Verificar: token foi limpo (não mantém sessão)

---

## ✅ VALIDAÇÃO CÓDIGO APP

### Permissão GPS
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~40)
const { status } = await Location.requestForegroundPermissionsAsync();
```
✅ Solicita permissão ao ficar online

### Intervalo 15s
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~11)
const LOCATION_INTERVAL = 15000; // 15 segundos
```
✅ Intervalo configurado

### Envio Periódico
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~50)
locationIntervalRef.current = setInterval(async () => {
  await sendLocation();
}, LOCATION_INTERVAL);
```
✅ setInterval implementado

### Cleanup no Logout
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~110)
const handleLogout = async () => {
  stopLocationTracking();  // ✅ Para envio
  await authStore.clearAuth();  // ✅ Limpa token
  router.replace('/(auth)/login');
};
```
✅ Cleanup implementado

### Cleanup no Offline
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~95)
const handleToggleOffline = async () => {
  stopLocationTracking();  // ✅ Para envio
  setIsOnline(false);
};
```
✅ Para envio ao ficar offline

### Cleanup ao Desmontar
```typescript
// kaviar-app/app/(driver)/online.tsx (linha ~20)
useEffect(() => {
  loadUser();
  return () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);  // ✅ Cleanup
    }
  };
}, []);
```
✅ Cleanup ao desmontar componente

---

## 📊 CRITÉRIOS DE SUCESSO

| Item | Esperado | Status |
|------|----------|--------|
| Login mantém sessão | Sim | [ ] |
| Nome aparece na Home | Sim | [ ] |
| Ficar Online solicita GPS | Sim | [ ] |
| Envia localização a cada 15s | Sim | [ ] |
| `last_location_updated_at` atualiza | Sim | [ ] |
| Ficar Offline para envio | Sim | [ ] |
| Timestamp para de atualizar | Sim | [ ] |
| Logout limpa token | Sim | [ ] |
| Cleanup funciona | Sim | [ ] |

---

## 🐛 TROUBLESHOOTING

### GPS não funciona
- Verificar permissões do app no Android
- Verificar se GPS está habilitado no device
- Testar em local aberto (não indoor)

### Localização não atualiza no backend
- Verificar logs CloudWatch: `aws logs tail /ecs/kaviar-backend --since 5m --region us-east-2`
- Verificar se token é válido: `jwt.io` (copiar token do AsyncStorage)
- Verificar conexão internet do device

### App não mantém sessão
- Verificar AsyncStorage: token deve estar salvo
- Verificar se `authStore.getToken()` retorna valor
- Verificar se token não expirou (24h)

---

## 💰 CUSTO AWS

**Atual:** 1 task ECS (us-east-2/kaviar-cluster)
- Task Definition: kaviar-backend:163
- Desired Count: 1
- Running Count: 1

**Custo:** Sem aumento (mantém 1 task)

---

## 🚀 PRÓXIMO PASSO (DIA 3)

Após validar Dia 2, implementar:
- Receber ofertas de corrida (push notification ou polling)
- Aceitar/rejeitar corrida
- Atualizar status da corrida

**Princípio:** Anti-frankenstein (mínimo funcional)

---

**Gerado em:** 2026-03-03T07:28:00-03:00  
**Status:** Pronto para teste no device
