# 📋 PR2: ADMIN RIDES - TESTES E VALIDAÇÃO
**Data:** 2026-03-01 14:55 BRT  
**Objetivo:** Deploy seguro do ride-service com select explícito  
**Risco:** 🟡 MÉDIO

---

## 🎯 MUDANÇAS PROPOSTAS

### Arquivo: `backend/src/modules/admin/ride-service.ts`

**Mudança principal:**
- `include` → `select` explícito (evita colunas inexistentes)
- Mapeamento camelCase → snake_case (sortBy)
- Adiciona campos: platform_fee, driver_amount, diamond_*, bonus_*

**Linhas afetadas:** +77 linhas

**Benefício:**
- Evita erro Prisma "column does not exist"
- Mais defensivo e explícito
- Facilita debug

---

## 📋 BATERIA DE TESTES OBRIGATÓRIA

### AMBIENTE: Staging (obrigatório) + Local (opcional)

**Setup:**
```bash
# 1. Obter token admin
TOKEN=$(curl -sS -X POST "https://staging-api.kaviar.com.br/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"***"}' \
  | jq -r '.token')

echo "TOKEN=$TOKEN"

# 2. Verificar token
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

---

### TESTE 1: List rides (básico)

**Endpoint:** `GET /api/admin/rides`

**Comando:**
```bash
curl -sS -X GET "https://staging-api.kaviar.com.br/api/admin/rides?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, total: (.data | length), first: .data[0] | {id, status, price}}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] `success: true`
- [ ] `data` é array com até 5 rides
- [ ] Cada ride tem: id, status, price, driver, passenger

**Critério de falha:**
- [ ] Status 500
- [ ] Erro Prisma "column does not exist"
- [ ] Campos undefined/null inesperados

---

### TESTE 2: Sort by createdAt (valida camelCase → snake_case)

**Endpoint:** `GET /api/admin/rides?sortBy=createdAt&sortOrder=desc`

**Comando:**
```bash
curl -sS -X GET "https://staging-api.kaviar.com.br/api/admin/rides?sortBy=createdAt&sortOrder=desc&limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id, created_at, status}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Rides ordenadas por created_at DESC (mais recente primeiro)
- [ ] Sem erro de "invalid column name"

**Validação:**
```bash
# Verificar ordem decrescente
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?sortBy=createdAt&sortOrder=desc&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[] | .created_at' | sort -r | diff - <(curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?sortBy=createdAt&sortOrder=desc&limit=5" -H "Authorization: Bearer $TOKEN" | jq -r '.data[] | .created_at')

# Se diff vazio: OK
```

---

### TESTE 3: Sort by created_at (snake_case direto)

**Endpoint:** `GET /api/admin/rides?sortBy=created_at&sortOrder=asc`

**Comando:**
```bash
curl -sS -X GET "https://staging-api.kaviar.com.br/api/admin/rides?sortBy=created_at&sortOrder=asc&limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id, created_at, status}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Rides ordenadas por created_at ASC (mais antiga primeiro)
- [ ] Mapeamento funciona para ambos (camelCase e snake_case)

---

### TESTE 4: Filter by status

**Endpoint:** `GET /api/admin/rides?status=completed`

**Comando:**
```bash
curl -sS -X GET "https://staging-api.kaviar.com.br/api/admin/rides?status=completed&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, total: (.data | length), statuses: [.data[] | .status] | unique}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Todas rides retornadas têm `status: "completed"`
- [ ] Filtro funciona corretamente

**Testar outros status:**
```bash
# requested
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?status=requested&limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | .status'

# cancelled
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?status=cancelled&limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | .status'
```

---

### TESTE 5: Pagination

**Endpoint:** `GET /api/admin/rides?page=1&limit=10`

**Comando:**
```bash
# Página 1
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{page: 1, count: (.data | length), first_id: .data[0].id}'

# Página 2
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?page=2&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{page: 2, count: (.data | length), first_id: .data[0].id}'
```

**Critério de sucesso:**
- [ ] Página 1 retorna até 10 rides
- [ ] Página 2 retorna rides diferentes (IDs não se repetem)
- [ ] Paginação funciona corretamente

---

### TESTE 6: Ride detail (by ID)

**Endpoint:** `GET /api/admin/rides/:id`

**Comando:**
```bash
# 1. Obter ID de uma ride
RIDE_ID=$(curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')

echo "RIDE_ID=$RIDE_ID"

# 2. Buscar detalhes
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides/$RIDE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{
      id, 
      status, 
      price, 
      platform_fee, 
      driver_amount,
      driver: .driver.name,
      passenger: .passenger.name,
      has_diamond: (.diamond_state != null),
      has_bonus: (.bonus_amount != null)
    }'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Ride completa retornada
- [ ] Campos novos presentes: platform_fee, driver_amount
- [ ] Campos diamond_* e bonus_* presentes (podem ser null)
- [ ] Relações (driver, passenger) carregadas corretamente

---

### TESTE 7: Search (se implementado)

**Endpoint:** `GET /api/admin/rides?search=<termo>`

**Comando:**
```bash
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?search=Paulista&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id, origin, destination}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Resultados contêm termo buscado (origin ou destination)

---

### TESTE 8: Date range filter

**Endpoint:** `GET /api/admin/rides?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

**Comando:**
```bash
curl -sS "https://staging-api.kaviar.com.br/api/admin/rides?dateFrom=2026-03-01&dateTo=2026-03-01&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id, created_at, status}'
```

**Critério de sucesso:**
- [ ] Status: 200 OK
- [ ] Todas rides dentro do range de datas
- [ ] Filtro funciona corretamente

---

## 🔍 VALIDAÇÃO CLOUDWATCH

### Verificar logs de erro Prisma

**Comando:**
```bash
# Buscar erros Prisma nos últimos 30 minutos
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --start-time $(($(date +%s) - 1800))000 \
  --filter-pattern "\"PrismaClientKnownRequestError\"" \
  --region us-east-2 \
  --query 'events[*].message' \
  --output text
```

**Critério de sucesso:**
- [ ] Zero erros "column does not exist"
- [ ] Zero erros "invalid column name"
- [ ] Zero erros Prisma relacionados a rides

**Buscar erros específicos:**
```bash
# Erro de coluna
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --start-time $(($(date +%s) - 1800))000 \
  --filter-pattern "\"column\" \"does not exist\"" \
  --region us-east-2

# Erro de enum
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --start-time $(($(date +%s) - 1800))000 \
  --filter-pattern "\"invalid input value for enum\"" \
  --region us-east-2
```

---

## 🚦 CRITÉRIOS GO/NO-GO

### ✅ GO (pode deployar para produção)
- [ ] **TODOS os 8 testes passaram em staging**
- [ ] CloudWatch sem erros Prisma (30 min de observação)
- [ ] Staging rodando por 24h sem erros
- [ ] Code review aprovado
- [ ] Rollback plan documentado
- [ ] Horário comercial (seg-sex 10h-16h BRT)
- [ ] Equipe disponível para monitorar

### 🛑 NO-GO (NÃO deployar)
- [ ] Qualquer teste falhou
- [ ] Erros no CloudWatch
- [ ] Staging instável
- [ ] Fora do horário comercial
- [ ] Equipe indisponível
- [ ] Outro deploy em andamento

---

## 📊 CHECKLIST DE VALIDAÇÃO FINAL

### Antes do deploy
- [ ] Branch criada: `feat/admin-ride-service-select-explicit`
- [ ] Cherry-pick apenas ride-service.ts (sem schema.prisma)
- [ ] Testes locais passaram
- [ ] Deploy em staging OK
- [ ] Bateria de 8 testes executada
- [ ] CloudWatch limpo (30 min)
- [ ] PR criado e aprovado

### Durante o deploy
- [ ] Build sem erros
- [ ] Push para ECR OK
- [ ] Task definition atualizada
- [ ] ECS rollout iniciado
- [ ] Monitorando CloudWatch em tempo real

### Após o deploy
- [ ] Health check 200 OK
- [ ] GET /api/admin/rides 200 OK
- [ ] GET /api/admin/rides/:id 200 OK
- [ ] CloudWatch sem erros (15 min)
- [ ] Testes de smoke passaram

---

## 🔄 ROLLBACK PLAN

**Se qualquer teste falhar em produção:**

```bash
# 1. Reverter task definition
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:159 \
  --force-new-deployment \
  --region us-east-2

# 2. Aguardar rollout
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2

# 3. Validar rollback
curl https://api.kaviar.com.br/api/health | jq .version
curl -H "Authorization: Bearer $TOKEN" \
  https://api.kaviar.com.br/api/admin/rides?limit=1 | jq .success
```

**Tempo de rollback:** ~3 minutos

---

## 📝 SCRIPT DE TESTE AUTOMATIZADO

**Arquivo:** `scripts/test-admin-rides.sh`

```bash
#!/bin/bash
set -euo pipefail

API_URL="${API_URL:-https://staging-api.kaviar.com.br}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kaviar.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

echo "🧪 Testando Admin Rides API"
echo "API: $API_URL"
echo ""

# Login
echo "1. Login..."
TOKEN=$(curl -sS -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Login falhou"
  exit 1
fi
echo "✅ Login OK"

# Teste 1: List
echo "2. List rides..."
RESULT=$(curl -sS "$API_URL/api/admin/rides?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ List OK" || (echo "❌ List falhou" && exit 1)

# Teste 2: Sort camelCase
echo "3. Sort by createdAt..."
RESULT=$(curl -sS "$API_URL/api/admin/rides?sortBy=createdAt&sortOrder=desc&limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ Sort camelCase OK" || (echo "❌ Sort falhou" && exit 1)

# Teste 3: Sort snake_case
echo "4. Sort by created_at..."
RESULT=$(curl -sS "$API_URL/api/admin/rides?sortBy=created_at&sortOrder=asc&limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ Sort snake_case OK" || (echo "❌ Sort falhou" && exit 1)

# Teste 4: Filter
echo "5. Filter by status..."
RESULT=$(curl -sS "$API_URL/api/admin/rides?status=completed&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ Filter OK" || (echo "❌ Filter falhou" && exit 1)

# Teste 5: Pagination
echo "6. Pagination..."
RESULT=$(curl -sS "$API_URL/api/admin/rides?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ Pagination OK" || (echo "❌ Pagination falhou" && exit 1)

# Teste 6: Detail
echo "7. Ride detail..."
RIDE_ID=$(curl -sS "$API_URL/api/admin/rides?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')
RESULT=$(curl -sS "$API_URL/api/admin/rides/$RIDE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.success')
[ "$RESULT" == "true" ] && echo "✅ Detail OK" || (echo "❌ Detail falhou" && exit 1)

echo ""
echo "🎉 Todos os testes passaram!"
```

**Uso:**
```bash
chmod +x scripts/test-admin-rides.sh
ADMIN_PASSWORD="***" ./scripts/test-admin-rides.sh
```

---

## ⏱️ TEMPO ESTIMADO

- **Criar branch + cherry-pick:** 10 min
- **Testes locais:** 15 min
- **Deploy staging:** 15 min
- **Bateria de testes:** 30 min
- **Observação CloudWatch:** 30 min
- **Code review:** 20 min
- **Deploy produção:** 15 min
- **Validação final:** 15 min

**Total:** ~2h30min (com staging 24h)

---

**Gerado por:** Kiro CLI  
**Timestamp:** 2026-03-01T14:55:01-03:00  
**Status:** PRONTO PARA EXECUÇÃO
