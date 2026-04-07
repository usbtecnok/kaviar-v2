# 🚀 GUIA RÁPIDO - RETOMADA DIA 3

**Data:** 04/03/2026  
**Status Atual:** Dia 1 + Dia 2 completos ✅

---

## ✅ SMOKE TEST OBRIGATÓRIO

Antes de começar qualquer trabalho, validar backend:

```bash
# 1. Health check
curl -s https://api.kaviar.com.br/api/health | jq .
# Esperado: {"status":"ok"}

# 2. Cadastro (obter token)
TOKEN=$(curl -s -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test '$(date +%Y%m%d)'",
    "email": "smoke.'$(date +%s)'@kaviar.com",
    "phone": "+5521999999999",
    "password": "senha123"
  }' | jq -r '.token')

echo "Token: ${TOKEN:0:50}..."

# 3. Endpoint localização
curl -s -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lat": -22.9708, "lng": -43.1829}' | jq .
# Esperado: {"success":true}
```

**Se algum falhar:** Verificar task ECS em us-east-2

---

## 📱 E2E DEVICE (PENDENTE)

Seguir: `/home/goes/kaviar/CHECKLIST_DIA2_E2E_DEVICE.md`

**Resumo:**
1. Login → Home (nome aparece)
2. Ficar Online → aguardar 45s
3. Verificar SQL: `last_location_updated_at` mudou 3x
4. Ficar Offline → aguardar 30s
5. Verificar SQL: timestamp parou de mudar

**SQL:**
```sql
SELECT id, name, last_lat, last_lng, last_location_updated_at,
  EXTRACT(EPOCH FROM (NOW() - last_location_updated_at)) as seconds_ago
FROM drivers 
WHERE email = 'seu.email@kaviar.com';
```

---

## 🚀 DIA 3 - RECEBER OFERTA / ACEITAR CORRIDA

### Objetivo
Motorista online recebe oferta de corrida e pode aceitar/rejeitar.

### Princípios
- ✅ Anti-frankenstein (mínimo funcional)
- ✅ Sem aumentar custo AWS (1 task)
- ✅ Usar endpoints existentes (se houver)

### Endpoints Necessários

#### Backend (verificar se existem)
```bash
# Listar ofertas pendentes
GET /api/driver/offers

# Aceitar oferta
POST /api/driver/offers/:offerId/accept

# Rejeitar oferta
POST /api/driver/offers/:offerId/reject
```

**Se não existirem:** Criar mínimo necessário

#### Frontend
- Tela: `/(driver)/offers.tsx` - Lista ofertas
- Tela: `/(driver)/offer-detail.tsx` - Detalhes + aceitar/rejeitar
- Polling a cada 10s quando online (ou WebSocket se já existir)

### Fluxo Mínimo
```
1. Motorista online
2. App faz polling /api/driver/offers a cada 10s
3. Nova oferta aparece
4. Motorista clica "Ver Detalhes"
5. Motorista clica "Aceitar" ou "Rejeitar"
6. Backend atualiza status da oferta
7. App volta para lista de ofertas
```

---

## 📱 EXPO TUNNEL (INTERNET ROTEADA)

### Iniciar app com tunnel
```bash
cd /home/goes/kaviar/kaviar-app

# Opção 1: Tunnel automático
npx expo start --tunnel

# Opção 2: Especificar tunnel
npx expo start --tunnel --lan
```

### Conectar device
1. Abrir Expo Go no Android
2. Escanear QR code
3. App carrega via tunnel (funciona com internet roteada)

### Troubleshooting
- Se tunnel não funcionar: `npx expo start --localhost`
- Verificar firewall: porta 8081 liberada
- Verificar Expo CLI atualizado: `npm install -g expo-cli`

---

## 🔍 VERIFICAR ENDPOINTS EXISTENTES

Antes de criar novos endpoints, verificar se já existem:

```bash
# Buscar no código
cd /home/goes/kaviar/backend
grep -r "offers" src/routes/ | grep -E "(GET|POST)"
grep -r "rides" src/routes/ | grep -E "(accept|reject)"

# Verificar documentação
ls docs/ | grep -i "ride\|offer"
```

---

## 💰 MANTER CUSTO BAIXO

```bash
# Verificar task count
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount}'

# Esperado: {"desired":1,"running":1}
```

**Se > 1 task:** Reduzir para 1
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 1 \
  --region us-east-2
```

---

## 📝 COMMITS DO DIA

Ao final do dia, commitar com padrão:

```bash
git add .
git commit -m "feat(dia3): receber e aceitar ofertas de corrida

- Endpoint GET /api/driver/offers (se criado)
- Endpoint POST /api/driver/offers/:id/accept (se criado)
- Tela offers.tsx com polling 10s
- Tela offer-detail.tsx com aceitar/rejeitar
- Custo: 1 task (sem aumento)

Dia 3: ofertas implementadas"

git push origin main
```

---

## 🎯 CHECKLIST DIA 3

- [ ] Smoke test backend (3 comandos)
- [ ] E2E device Dia 2 (se não fez ontem)
- [ ] Verificar endpoints existentes
- [ ] Criar endpoints mínimos (se necessário)
- [ ] Implementar tela de ofertas
- [ ] Implementar aceitar/rejeitar
- [ ] Testar fluxo completo
- [ ] Commit + push
- [ ] Verificar custo (1 task)

---

## 📚 REFERÊNCIAS

- Evidências Dia 2: `/home/goes/kaviar/DEPLOY_DIA2_FINAL_EVIDENCIAS_2026-03-03.md`
- Checklist E2E: `/home/goes/kaviar/CHECKLIST_DIA2_E2E_DEVICE.md`
- Fechamento: `/home/goes/kaviar/DIA2_FECHAMENTO_COMPLETO.md`
- Roteiro original: `/home/goes/kaviar/docs/DIA_1_APP_MOTORISTA_EXECUCAO.md`

---

**Última atualização:** 2026-03-03T07:33:00-03:00  
**Próxima sessão:** 2026-03-04 (Dia 3)
