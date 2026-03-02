# 🚀 PLANO MVP MÍNIMO - 14 DIAS ÚTEIS

**Data:** 01/03/2026 22:27 BRT  
**Objetivo:** Apps funcionais (Motorista + Passageiro) com fluxo completo de corrida  
**Escopo:** Mínimo viável - SEM dashboard, histórico, push, PIX, avaliações

---

## 📋 ESCOPO MVP MÍNIMO

### ✅ **INCLUÍDO**

**App Motorista:**
- Cadastro/Login mínimo
- Toggle Online/Offline
- Enviar localização em tempo real
- Receber oferta de corrida
- Aceitar/Rejeitar oferta
- Corrida ativa (pickup/dropoff)

**App Passageiro:**
- Cadastro/Login mínimo
- Solicitar corrida (origem/destino)
- Acompanhar status da corrida
- Finalizar corrida

**Backend:**
- Validar `neighborhoodId` no cadastro
- Criar `GET /api/neighborhoods/nearby`
- Endpoints mínimos para fluxo de corrida

**Teste E2E:**
- 1 fluxo completo passageiro↔motorista
- Evidências (screenshots + logs)

---

### ❌ **FORA DO ESCOPO**

- Dashboard/métricas
- Histórico de corridas
- Favoritos
- Notificações push
- Pagamentos PIX
- Avaliações (ratings)
- Chat/Suporte
- Bônus e incentivos

---

## 📅 CRONOGRAMA - 14 DIAS ÚTEIS

### **DIA 1 - Backend: Validações + Endpoint Nearby** (1 dia)

**Entregas:**
- ✅ Validar `neighborhoodId` no cadastro de motorista (`/api/governance/driver`)
- ✅ Validar `neighborhoodId` no cadastro de passageiro (`/api/governance/passenger`)
- ✅ Criar `GET /api/neighborhoods/nearby?lat=X&lng=Y&radius=5000`
- ✅ Testes unitários das validações

**Critério GO/NO-GO:**
- [ ] Cadastro rejeita `neighborhoodId` inválido (400)
- [ ] Endpoint `/nearby` retorna bairros dentro do raio
- [ ] Testes passam

**Arquivos afetados:**
- `backend/src/routes/governance.ts` (validação)
- `backend/src/routes/neighborhoods.ts` (novo endpoint)
- `backend/src/services/neighborhood.service.ts` (lógica)

---

### **DIA 2-3 - App Motorista: Cadastro + Login** (2 dias)

**Entregas:**
- ✅ Tela de Cadastro (nome, email, telefone, senha, bairro-base)
- ✅ Tela de Login (email, senha)
- ✅ Integração com `/api/governance/driver` (cadastro)
- ✅ Integração com `/api/auth/driver/login`
- ✅ Armazenar token JWT no AsyncStorage
- ✅ Navegação pós-login para Home

**Critério GO/NO-GO:**
- [ ] Cadastro cria motorista com status `pending`
- [ ] Login retorna token válido
- [ ] Token persiste após fechar app

**Telas:**
1. `DriverRegisterScreen.tsx` (cadastro)
2. `DriverLoginScreen.tsx` (login)

**Endpoints usados:**
- `POST /api/governance/driver` (cadastro)
- `POST /api/auth/driver/login` (login)
- `GET /api/neighborhoods/nearby` (buscar bairro-base)

---

### **DIA 4-5 - App Motorista: Home + Online/Offline** (2 dias)

**Entregas:**
- ✅ Tela Home com toggle Online/Offline
- ✅ Enviar localização a cada 10s quando online
- ✅ Integração com `POST /api/driver/location`
- ✅ Exibir status (online/offline) e nome do motorista

**Critério GO/NO-GO:**
- [ ] Toggle muda status do motorista no backend
- [ ] Localização é enviada a cada 10s quando online
- [ ] Backend registra última localização

**Telas:**
1. `DriverHomeScreen.tsx` (home + toggle)

**Endpoints usados:**
- `POST /api/driver/location` (enviar localização)
- `PATCH /api/driver/status` (online/offline)

**Nota:** Se endpoints não existirem, criar no backend (30min).

---

### **DIA 6-7 - App Motorista: Receber + Aceitar Oferta** (2 dias)

**Entregas:**
- ✅ Polling de ofertas (`GET /api/driver/offers/pending`)
- ✅ Modal de oferta (origem, destino, valor, tempo para aceitar)
- ✅ Botões Aceitar/Rejeitar
- ✅ Integração com `PUT /api/rides/:id/accept` (aceitar)
- ✅ Integração com `POST /api/driver/offers/:id/reject` (rejeitar)

**Critério GO/NO-GO:**
- [ ] Modal aparece quando há oferta pendente
- [ ] Aceitar muda status da corrida para `accepted`
- [ ] Rejeitar libera oferta para outro motorista

**Telas:**
1. `DriverHomeScreen.tsx` (atualizado com modal de oferta)

**Endpoints usados:**
- `GET /api/driver/offers/pending` (buscar ofertas)
- `PUT /api/rides/:id/accept` (aceitar)
- `POST /api/driver/offers/:id/reject` (rejeitar)

**Nota:** Se endpoint de ofertas não existir, criar no backend (1h).

---

### **DIA 8-9 - App Motorista: Corrida Ativa (Pickup/Dropoff)** (2 dias)

**Entregas:**
- ✅ Tela de corrida ativa (origem, destino, status)
- ✅ Botão "Cheguei no local" → `POST /api/rides-v2/:ride_id/arrived`
- ✅ Botão "Iniciar corrida" → `POST /api/rides-v2/:ride_id/start`
- ✅ Botão "Finalizar corrida" → `POST /api/rides-v2/:ride_id/complete`
- ✅ Atualizar localização a cada 10s durante corrida

**Critério GO/NO-GO:**
- [ ] Status da corrida muda corretamente (accepted → arrived → in_progress → completed)
- [ ] Passageiro vê mudanças de status em tempo real
- [ ] Corrida finalizada libera motorista para nova oferta

**Telas:**
1. `DriverActiveRideScreen.tsx` (corrida ativa)

**Endpoints usados:**
- `POST /api/rides-v2/:ride_id/arrived`
- `POST /api/rides-v2/:ride_id/start`
- `POST /api/rides-v2/:ride_id/complete`
- `POST /api/driver/location` (atualizar localização)

---

### **DIA 10-11 - App Passageiro: Cadastro + Login + Solicitar Corrida** (2 dias)

**Entregas:**
- ✅ Tela de Cadastro (nome, email, telefone, senha)
- ✅ Tela de Login (email, senha)
- ✅ Tela Home com mapa
- ✅ Selecionar origem/destino (input + autocomplete)
- ✅ Botão "Solicitar corrida"
- ✅ Integração com `POST /api/rides-v2` (criar corrida)

**Critério GO/NO-GO:**
- [ ] Cadastro cria passageiro com status `ACTIVE`
- [ ] Login retorna token válido
- [ ] Solicitar corrida cria registro no banco com status `pending`

**Telas:**
1. `PassengerRegisterScreen.tsx` (cadastro)
2. `PassengerLoginScreen.tsx` (login)
3. `PassengerHomeScreen.tsx` (home + solicitar corrida)

**Endpoints usados:**
- `POST /api/auth/passenger/register` (cadastro)
- `POST /api/auth/passenger/login` (login)
- `POST /api/rides-v2` (solicitar corrida)
- `GET /api/neighborhoods/nearby` (buscar bairros próximos)

---

### **DIA 12-13 - App Passageiro: Acompanhar Corrida** (2 dias)

**Entregas:**
- ✅ Tela de corrida ativa (status, motorista, localização)
- ✅ Polling de status (`GET /api/rides-v2/:ride_id`)
- ✅ Exibir status: `pending` → `accepted` → `arrived` → `in_progress` → `completed`
- ✅ Botão "Cancelar corrida" (apenas se status = `pending`)

**Critério GO/NO-GO:**
- [ ] Status atualiza automaticamente (polling a cada 5s)
- [ ] Passageiro vê nome do motorista após aceite
- [ ] Cancelar corrida muda status para `cancelled`

**Telas:**
1. `PassengerActiveRideScreen.tsx` (acompanhar corrida)

**Endpoints usados:**
- `GET /api/rides-v2/:ride_id` (buscar status)
- `POST /api/rides-v2/:ride_id/cancel` (cancelar)

---

### **DIA 14 - Teste E2E + Ajustes Finais** (1 dia)

**Entregas:**
- ✅ Executar fluxo completo: Passageiro solicita → Motorista aceita → Corrida completa
- ✅ Evidências: screenshots de cada etapa + logs do backend
- ✅ Ajustes de bugs críticos
- ✅ Documento de teste (`docs/TESTE_E2E_MVP_MINIMO.md`)

**Critério GO/NO-GO:**
- [ ] Fluxo completo funciona sem erros
- [ ] Evidências documentadas
- [ ] Bugs críticos corrigidos

---

## 📱 TELAS POR APP

### **APP MOTORISTA (6 telas)**

| # | Tela | Descrição | Endpoints |
|---|------|-----------|-----------|
| 1 | `DriverRegisterScreen` | Cadastro (nome, email, telefone, senha, bairro-base) | `POST /api/governance/driver`, `GET /api/neighborhoods/nearby` |
| 2 | `DriverLoginScreen` | Login (email, senha) | `POST /api/auth/driver/login` |
| 3 | `DriverHomeScreen` | Home + toggle online/offline + modal de oferta | `POST /api/driver/location`, `PATCH /api/driver/status`, `GET /api/driver/offers/pending` |
| 4 | `DriverOfferModal` | Modal de oferta (aceitar/rejeitar) | `PUT /api/rides/:id/accept`, `POST /api/driver/offers/:id/reject` |
| 5 | `DriverActiveRideScreen` | Corrida ativa (pickup/dropoff) | `POST /api/rides-v2/:ride_id/arrived`, `POST /api/rides-v2/:ride_id/start`, `POST /api/rides-v2/:ride_id/complete` |
| 6 | `DriverProfileScreen` | Perfil básico (nome, email, status) | `GET /api/driver/profile` |

---

### **APP PASSAGEIRO (5 telas)**

| # | Tela | Descrição | Endpoints |
|---|------|-----------|-----------|
| 1 | `PassengerRegisterScreen` | Cadastro (nome, email, telefone, senha) | `POST /api/auth/passenger/register` |
| 2 | `PassengerLoginScreen` | Login (email, senha) | `POST /api/auth/passenger/login` |
| 3 | `PassengerHomeScreen` | Home + mapa + solicitar corrida | `POST /api/rides-v2`, `GET /api/neighborhoods/nearby` |
| 4 | `PassengerActiveRideScreen` | Acompanhar corrida (status, motorista) | `GET /api/rides-v2/:ride_id`, `POST /api/rides-v2/:ride_id/cancel` |
| 5 | `PassengerProfileScreen` | Perfil básico (nome, email) | `GET /api/passenger/profile` |

---

## 🔌 ENDPOINTS NECESSÁRIOS

### **BACKEND - Endpoints Existentes (Referência: API_CONTRACT)**

| Endpoint | Método | Uso | Arquivo |
|----------|--------|-----|---------|
| `POST /api/governance/driver` | POST | Cadastro motorista | `governance.ts:237` |
| `POST /api/auth/driver/login` | POST | Login motorista | `driver-auth.ts:19` |
| `POST /api/auth/passenger/register` | POST | Cadastro passageiro | `passenger-auth.ts:23` |
| `POST /api/auth/passenger/login` | POST | Login passageiro | `passenger-auth.ts:118` |
| `POST /api/rides-v2` | POST | Solicitar corrida | `rides-v2.ts:62` |
| `POST /api/rides-v2/:ride_id/cancel` | POST | Cancelar corrida | `rides-v2.ts:115` |
| `POST /api/rides-v2/:ride_id/arrived` | POST | Motorista chegou | `rides-v2.ts:169` |
| `POST /api/rides-v2/:ride_id/start` | POST | Iniciar corrida | `rides-v2.ts:202` |
| `POST /api/rides-v2/:ride_id/complete` | POST | Finalizar corrida | `rides-v2.ts:235` |
| `PUT /api/rides/:id/accept` | PUT | Aceitar corrida | `rides.ts:156` |

---

### **BACKEND - Endpoints a CRIAR (Dia 1)**

| Endpoint | Método | Descrição | Prioridade |
|----------|--------|-----------|------------|
| `GET /api/neighborhoods/nearby` | GET | Buscar bairros próximos (lat, lng, radius) | 🔴 Crítica |
| `POST /api/driver/location` | POST | Atualizar localização do motorista | 🔴 Crítica |
| `PATCH /api/driver/status` | PATCH | Mudar status online/offline | 🔴 Crítica |
| `GET /api/driver/offers/pending` | GET | Buscar ofertas pendentes para motorista | 🔴 Crítica |
| `POST /api/driver/offers/:id/reject` | POST | Rejeitar oferta | 🟡 Média |
| `GET /api/rides-v2/:ride_id` | GET | Buscar detalhes da corrida | 🔴 Crítica |
| `GET /api/driver/profile` | GET | Perfil do motorista | 🟢 Baixa |
| `GET /api/passenger/profile` | GET | Perfil do passageiro | 🟢 Baixa |

---

## ✅ CRITÉRIOS GO/NO-GO POR FASE

### **FASE 1 - Backend (Dia 1)**

**GO:**
- [ ] Validação de `neighborhoodId` funciona (rejeita inválidos)
- [ ] Endpoint `/api/neighborhoods/nearby` retorna bairros corretos
- [ ] Testes unitários passam

**NO-GO:**
- [ ] Validação não funciona (aceita IDs inválidos)
- [ ] Endpoint retorna bairros fora do raio
- [ ] Testes falham

---

### **FASE 2 - App Motorista Core (Dia 2-9)**

**GO:**
- [ ] Cadastro + Login funcionam
- [ ] Toggle online/offline atualiza backend
- [ ] Localização é enviada a cada 10s
- [ ] Modal de oferta aparece corretamente
- [ ] Aceitar/Rejeitar oferta funciona
- [ ] Fluxo de corrida (arrived → start → complete) funciona

**NO-GO:**
- [ ] Login falha ou token não persiste
- [ ] Localização não é enviada
- [ ] Oferta não aparece ou aceitar falha
- [ ] Status da corrida não muda

---

### **FASE 3 - App Passageiro Core (Dia 10-13)**

**GO:**
- [ ] Cadastro + Login funcionam
- [ ] Solicitar corrida cria registro no banco
- [ ] Status da corrida atualiza automaticamente
- [ ] Cancelar corrida funciona (apenas se pending)

**NO-GO:**
- [ ] Login falha ou token não persiste
- [ ] Solicitar corrida retorna erro
- [ ] Status não atualiza
- [ ] Cancelar corrida falha

---

### **FASE 4 - Teste E2E (Dia 14)**

**GO:**
- [ ] Fluxo completo funciona: Passageiro solicita → Motorista aceita → Corrida completa
- [ ] Evidências documentadas (screenshots + logs)
- [ ] Bugs críticos corrigidos

**NO-GO:**
- [ ] Fluxo completo falha em qualquer etapa
- [ ] Bugs críticos não corrigidos
- [ ] Evidências incompletas

---

## 🧪 CHECKLIST DE VALIDAÇÃO

### **BACKEND**

```bash
# 1. Health check
curl -X GET "http://localhost:3000/health"

# 2. Buscar bairros próximos (Copacabana, RJ)
curl -X GET "http://localhost:3000/api/neighborhoods/nearby?lat=-22.9708&lng=-43.1829&radius=5000"

# 3. Cadastro motorista (deve validar neighborhoodId)
curl -X POST "http://localhost:3000/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@test.com",
    "phone": "+5521999999999",
    "neighborhoodId": "INVALID_ID"
  }'
# Esperado: 400 Bad Request

# 4. Login motorista
curl -X POST "http://localhost:3000/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@test.com",
    "password": "senha123"
  }'
# Esperado: 200 + token

# 5. Atualizar localização (com token)
curl -X POST "http://localhost:3000/api/driver/location" \
  -H "Authorization: Bearer <DRIVER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -22.9708,
    "lng": -43.1829
  }'

# 6. Solicitar corrida (passageiro)
curl -X POST "http://localhost:3000/api/rides-v2" \
  -H "Authorization: Bearer <PASSENGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "lat": -22.9708,
      "lng": -43.1829,
      "address": "Copacabana, Rio de Janeiro"
    },
    "destination": {
      "lat": -22.9519,
      "lng": -43.2105,
      "address": "Ipanema, Rio de Janeiro"
    }
  }'
```

---

### **APP MOTORISTA**

**Fluxo de teste:**

1. **Cadastro:**
   - [ ] Abrir app → Tela de cadastro
   - [ ] Preencher: nome, email, telefone, senha, bairro-base
   - [ ] Clicar "Cadastrar"
   - [ ] Verificar: redirecionamento para Home

2. **Login:**
   - [ ] Fechar app e reabrir
   - [ ] Tela de login aparece
   - [ ] Preencher: email, senha
   - [ ] Clicar "Entrar"
   - [ ] Verificar: redirecionamento para Home

3. **Online/Offline:**
   - [ ] Na Home, clicar toggle "Ficar Online"
   - [ ] Verificar: status muda para "Online"
   - [ ] Verificar no backend: localização sendo enviada a cada 10s

4. **Receber Oferta:**
   - [ ] Passageiro solicita corrida
   - [ ] Verificar: modal de oferta aparece
   - [ ] Verificar: origem, destino, valor exibidos

5. **Aceitar Oferta:**
   - [ ] Clicar "Aceitar"
   - [ ] Verificar: modal fecha e tela de corrida ativa aparece

6. **Corrida Ativa:**
   - [ ] Clicar "Cheguei no local"
   - [ ] Verificar: status muda para "Arrived"
   - [ ] Clicar "Iniciar corrida"
   - [ ] Verificar: status muda para "In Progress"
   - [ ] Clicar "Finalizar corrida"
   - [ ] Verificar: status muda para "Completed" e volta para Home

---

### **APP PASSAGEIRO**

**Fluxo de teste:**

1. **Cadastro:**
   - [ ] Abrir app → Tela de cadastro
   - [ ] Preencher: nome, email, telefone, senha
   - [ ] Clicar "Cadastrar"
   - [ ] Verificar: redirecionamento para Home

2. **Login:**
   - [ ] Fechar app e reabrir
   - [ ] Tela de login aparece
   - [ ] Preencher: email, senha
   - [ ] Clicar "Entrar"
   - [ ] Verificar: redirecionamento para Home

3. **Solicitar Corrida:**
   - [ ] Na Home, preencher origem e destino
   - [ ] Clicar "Solicitar corrida"
   - [ ] Verificar: tela de corrida ativa aparece com status "Pending"

4. **Acompanhar Corrida:**
   - [ ] Verificar: status atualiza automaticamente
   - [ ] Verificar: nome do motorista aparece após aceite
   - [ ] Verificar: status muda para "Arrived" → "In Progress" → "Completed"

5. **Cancelar Corrida:**
   - [ ] Solicitar nova corrida
   - [ ] Clicar "Cancelar" (antes do motorista aceitar)
   - [ ] Verificar: status muda para "Cancelled" e volta para Home

---

## 💰 REGRAS DE ECONOMIA AWS

### **1. MANTER 1 TASK QUANDO NECESSÁRIO**

**Contexto:** ECS Fargate cobra por vCPU/hora e memória/hora.

**Regra:**
- Durante desenvolvimento: manter **1 task** rodando (0.25 vCPU + 512 MB)
- Fora do horário de trabalho: **desligar task** (desired count = 0)

**Comandos:**

```bash
# Ligar backend (1 task)
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 1 \
  --region us-east-1

# Desligar backend (0 tasks)
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-1

# Verificar status
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-1 \
  --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'
```

---

### **2. JANELA DE TESTES**

**Horário recomendado:** 9h-18h (horário comercial)

**Fora da janela:**
- Desligar ECS tasks (desired count = 0)
- RDS pode ficar ligado (custo fixo mensal)
- S3 não tem custo de "estar ligado" (apenas storage + requests)

**Economia estimada:**
- ECS Fargate: ~$0.04/hora (1 task 0.25 vCPU + 512 MB)
- Desligar 15h/dia = ~$0.60/dia = ~$18/mês economizados

---

### **3. RECURSOS QUE PODEM SER DESLIGADOS**

| Recurso | Pode desligar? | Como | Economia |
|---------|----------------|------|----------|
| **ECS Tasks** | ✅ Sim | `desired-count 0` | ~$18/mês |
| **RDS** | ⚠️ Não recomendado | Stop instance (max 7 dias) | ~$15/mês (mas perde dados se não for snapshot) |
| **S3** | ❌ Não | N/A | Custo por storage (~$0.023/GB/mês) |
| **ALB** | ⚠️ Não recomendado | Delete ALB | ~$16/mês (mas perde configuração) |
| **CloudWatch Logs** | ❌ Não | N/A | Custo por GB armazenado (~$0.50/GB/mês) |

**Recomendação:** Desligar apenas ECS tasks fora da janela de testes.

---

### **4. MONITORAMENTO DE CUSTOS**

**Comando para verificar custos do mês:**

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --region us-east-1
```

**Alerta:** Configurar AWS Budget para alertar se custo ultrapassar $50/mês.

---

## 📝 ROTEIRO DE TESTES E2E

Ver arquivo: `docs/ROTEIRO_TESTE_E2E_MVP_MINIMO.md` (criado a seguir)

---

## 🎯 PRIMEIRA TAREFA DO DIA 1

### **Tarefa:** Validar `neighborhoodId` no cadastro de motorista

**Objetivo:** Garantir que apenas IDs válidos de bairros sejam aceitos no cadastro.

**Arquivo:** `backend/src/routes/governance.ts` (linha 237)

**Mudança:**

```typescript
// ANTES (sem validação)
router.post('/driver', async (req, res) => {
  const { name, email, phone, neighborhoodId } = req.body;
  // ... criar motorista sem validar neighborhoodId
});

// DEPOIS (com validação)
router.post('/driver', async (req, res) => {
  const { name, email, phone, neighborhoodId } = req.body;
  
  // Validar neighborhoodId
  if (neighborhoodId) {
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id: neighborhoodId }
    });
    
    if (!neighborhood) {
      return res.status(400).json({
        success: false,
        error: 'Bairro inválido'
      });
    }
  }
  
  // ... criar motorista
});
```

**Teste:**

```bash
# Deve retornar 400
curl -X POST "http://localhost:3000/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@test.com",
    "phone": "+5521999999999",
    "neighborhoodId": "INVALID_ID"
  }'
```

---

## 📊 RESUMO DO PLANO

| Fase | Dias | Entregas | Prioridade |
|------|------|----------|------------|
| Backend (validações + nearby) | 1 | Validar neighborhoodId + criar endpoint nearby | 🔴 Crítica |
| App Motorista (cadastro + login) | 2 | Telas de cadastro e login | 🔴 Crítica |
| App Motorista (home + online/offline) | 2 | Home + toggle + enviar localização | 🔴 Crítica |
| App Motorista (oferta) | 2 | Receber e aceitar/rejeitar oferta | 🔴 Crítica |
| App Motorista (corrida ativa) | 2 | Pickup/dropoff | 🔴 Crítica |
| App Passageiro (cadastro + solicitar) | 2 | Cadastro + login + solicitar corrida | 🔴 Crítica |
| App Passageiro (acompanhar) | 2 | Acompanhar status da corrida | 🔴 Crítica |
| Teste E2E + ajustes | 1 | Fluxo completo + evidências | 🔴 Crítica |
| **TOTAL** | **14 dias** | | |

---

**FIM DO PLANO MVP MÍNIMO**
