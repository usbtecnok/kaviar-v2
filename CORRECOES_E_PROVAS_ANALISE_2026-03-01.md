# 🔍 CORREÇÕES E PROVAS - ANÁLISE KAVIAR 2026-03-01

**Data:** 01/03/2026 19:52 BRT  
**Objetivo:** Corrigir imprecisões da análise anterior com PROVAS do código real

---

## 1️⃣ "NÃO DÁ MATCH" vs "Taxa 20% (OUTSIDE_FENCE)"

### ❌ **ERRO NA ANÁLISE ANTERIOR**

Escrevi: "❌ NÃO DÁ MATCH quando pickup Barra e dropoff Recreio"

### ✅ **COMPORTAMENTO REAL DO SISTEMA**

**RESPOSTA:** A) Fora da cerca: **ainda oferta a corrida** (match ocorre), apenas muda a taxa para 20%

### 📋 **PROVAS DO CÓDIGO**

**1. Dispatcher NÃO bloqueia por OUTSIDE_FENCE**

**Arquivo:** `/backend/src/services/dispatcher.service.ts` (linhas 18-169)

```typescript
async dispatchRide(rideId: string): Promise<void> {
  // ...
  
  // Buscar candidatos
  const candidates = await this.findCandidates(ride);
  
  if (candidates.length === 0) {
    console.log(`[DISPATCHER] No candidates for ride ${rideId}, setting no_driver`);
    await prisma.rides_v2.update({
      where: { id: rideId },
      data: { status: 'no_driver' }
    });
    return;
  }
  
  // Pegar o melhor candidato
  const bestCandidate = candidates[0];
  
  // Criar oferta (SEM verificar match_type)
  const offer = await prisma.ride_offers.create({
    data: {
      ride_id: rideId,
      driver_id: bestCandidate.driver_id,
      status: 'pending',
      expires_at: expiresAt,
      rank_score: new Decimal(bestCandidate.score)
    }
  });
  // ...
}
```

**Conclusão:** Dispatcher cria oferta **independente do match_type**. Não há bloqueio por OUTSIDE_FENCE.

**2. Cálculo de Taxa SEMPRE retorna valor (nunca bloqueia)**

**Arquivo:** `/backend/src/services/fee-calculation.ts` (linhas 147-260)

```typescript
export async function calculateTripFee(
  driverId: string,
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  fareAmount: number,
  city: string = 'São Paulo'
): Promise<FeeCalculation> {
  
  // ... lógica de matching ...
  
  // CASO 5: Fora da cerca = taxa máxima (20%)
  const feePercentage = FEE_CONFIG.OUTSIDE_FENCE; // 20
  const feeAmount = (fareAmount * feePercentage) / 100;
  
  return {
    feePercentage,
    feeAmount,
    driverEarnings: fareAmount - feeAmount,
    matchType: 'OUTSIDE_FENCE',
    reason: 'Corrida fora da cerca virtual',
    pickupNeighborhood: pickupNeighborhood || undefined,
    dropoffNeighborhood: dropoffNeighborhood || undefined,
    driverHomeNeighborhood
  };
}
```

**Conclusão:** Função SEMPRE retorna um cálculo de taxa. OUTSIDE_FENCE = 20%, mas corrida é permitida.

**3. Dashboard mostra OUTSIDE_FENCE como métrica válida**

**Arquivo:** `/backend/src/routes/driver-dashboard.ts` (linhas 80-188)

```typescript
const matchBreakdown = {
  SAME_NEIGHBORHOOD: trips.filter(t => t.match_type === 'SAME_NEIGHBORHOOD').length,
  ADJACENT_NEIGHBORHOOD: trips.filter(t => t.match_type === 'ADJACENT_NEIGHBORHOOD').length,
  FALLBACK_800M: trips.filter(t => t.match_type === 'FALLBACK_800M').length,
  OUTSIDE_FENCE: trips.filter(t => t.match_type === 'OUTSIDE_FENCE').length // ✅ Contabilizado
};

// ...

outsideFence: {
  count: matchBreakdown.OUTSIDE_FENCE,
  percentage: totalTrips > 0
    ? ((matchBreakdown.OUTSIDE_FENCE / totalTrips) * 100).toFixed(1)
    : '0.0',
  fee: '20%'
}
```

**Conclusão:** Sistema contabiliza OUTSIDE_FENCE como tipo de match válido, não como bloqueio.

### ✅ **CORREÇÃO FINAL**

**Tabela de Matching Corrigida:**

| Situação | Taxa | Match Type | Comportamento |
|----------|------|------------|---------------|
| Pickup E dropoff no bairro | 7% | SAME_NEIGHBORHOOD | ✅ Match ocorre |
| Pickup OU dropoff no bairro | 12% | ADJACENT_NEIGHBORHOOD | ✅ Match ocorre |
| Dentro do raio de 800m | 12% | FALLBACK_800M | ✅ Match ocorre |
| **Fora da cerca** | **20%** | **OUTSIDE_FENCE** | **✅ Match ocorre (taxa maior)** |

**Texto corrigido:**
- ❌ ANTES: "NÃO DÁ MATCH quando fora da cerca"
- ✅ AGORA: "Match ocorre com taxa 20% quando fora da cerca virtual"

---

## 2️⃣ MAPA REAL DE ENDPOINTS ADMIN

### 📊 **ROTAS REGISTRADAS NO BACKEND**

**Arquivo:** `/backend/src/app.ts` (linhas 100-280)

```typescript
// Core admin routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/auth', passwordResetRoutes);
app.use('/api/admin/investors', investorInvitesRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin', adminApprovalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDriversRoutes);
app.use('/api/admin', adminPresignRoutes);
app.use('/api/admin/dashboard', adminDashboardMetricsRoutes);
app.use('/api/admin/community-leaders', communityLeadersRoutes);

// Governance routes (ADMIN TOKEN REQUIRED)
app.use('/api/governance', governanceRoutes);

// Premium Tourism routes (ADMIN + PUBLIC)
app.use('/api', premiumTourismRoutes); // Monta /admin/* e /governance/*

// Public routes
app.use('/api/public', publicRoutes);
app.use('/api/geo', geoRoutes);
```

### 📋 **TABELA DE ENDPOINTS USADOS PELO FRONTEND ADMIN**

| Recurso | Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|---------|----------|--------|------------|------------|-----------------|------------------|
| **MOTORISTAS** |
| Listar motoristas | `/api/admin/drivers` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:78` | `DriversList.jsx:31` |
| Detalhes motorista | `/api/admin/drivers/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:159` | `DriverDetail.jsx:87` |
| Documentos motorista | `/api/admin/drivers/:id/documents` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:240` | `DriverDetail.jsx:113` |
| Aprovar motorista | `/api/admin/drivers/:id/approve` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-approval.ts:15` | `DriverDetail.jsx:126` |
| Rejeitar motorista | `/api/admin/drivers/:id/reject` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-approval.ts:16` | `DriverDetail.jsx:144` |
| Créditos motorista | `/api/admin/drivers/:id/credits/balance` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-driver-credits.ts:64` | `DriverCreditsCard.jsx:47` |
| Ajustar créditos | `/api/admin/drivers/:id/credits/adjust` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-driver-credits.ts:119` | `DriverCreditsCard.jsx:86` |
| **PASSAGEIROS** |
| Listar passageiros | `/api/admin/passengers` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:45` | N/A |
| Detalhes passageiro | `/api/admin/passengers/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:87` | N/A |
| **COMUNIDADES** |
| Listar comunidades | `/api/governance/communities` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:151` | `CommunitiesManagement.jsx:51` |
| Geofence comunidade | `/api/governance/communities/:id/geofence` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts` (via public) | `CommunitiesManagement.jsx:170` |
| **BAIRROS** |
| Listar bairros | `/api/governance/neighborhoods` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:175` | `NeighborhoodsByCity.jsx:36` |
| **CORRIDAS** |
| Listar corridas | `/api/admin/rides` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:123` | N/A |
| Detalhes corrida | `/api/admin/rides/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:126` | N/A |
| **TURISMO PREMIUM** |
| Listar pacotes | `/api/admin/tour-packages` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `premium-tourism.ts:30` | N/A |
| Criar pacote | `/api/admin/tour-packages` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:29` | N/A |
| Atualizar pacote | `/api/admin/tour-packages/:id` | PUT | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:32` | N/A |
| Desativar pacote | `/api/admin/tour-packages/:id/deactivate` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:33` | N/A |
| Listar reservas | `/api/admin/tour-bookings` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `premium-tourism.ts:36` | N/A |
| Confirmar reserva | `/api/admin/tour-bookings/:id/confirm` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:37` | N/A |
| Atualizar status reserva | `/api/admin/tour-bookings/:id/status` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:38` | N/A |
| **TURISMO PREMIUM (PÚBLICO)** |
| Listar pacotes ativos | `/api/governance/tour-packages` | GET | Público (sem token) | `requirePremiumTourismEnabled` | `premium-tourism.ts:58` + `tour-controller.ts:8` | N/A |
| Criar reserva | `/api/governance/tour-bookings` | POST | Público (sem token) | `requirePremiumTourismEnabled` | `premium-tourism.ts:59` + `tour-controller.ts:27` | N/A |
| **OUTROS** |
| Presigned URL (S3) | `/api/admin/presign` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-presign.ts` | `DriverDetail.jsx:260` |
| Dashboard overview | `/api/admin/dashboard/overview` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `dashboard.ts` | `NeighborhoodsByCity.jsx:84` |
| Convites investidores | `/api/admin/investors/invite` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `investor-invites-v2.ts` | `InvestorInvites.jsx:24` |

### 🔐 **MIDDLEWARES DE AUTENTICAÇÃO**

**Arquivo:** `/backend/src/middlewares/auth.ts`

```typescript
// Verifica se é admin (qualquer role)
export const authenticateAdmin = async (req, res, next) => {
  // Valida JWT token
  // Verifica se user.role existe (SUPER_ADMIN ou OPERATOR)
};

// Requer SUPER_ADMIN
export const requireSuperAdmin = async (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Permite leitura (SUPER_ADMIN ou OPERATOR)
export const allowReadAccess = async (req, res, next) => {
  if (!['SUPER_ADMIN', 'OPERATOR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Requer roles específicas
export const requireRole = (roles: string[]) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

### ✅ **CORREÇÃO: Rotas /api/governance/* EXIGEM TOKEN ADMIN**

**Arquivo:** `/backend/src/routes/governance.ts` (linhas 1-35)

```typescript
import { Router } from 'express';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();

// ✅ TODAS as rotas exigem admin token
router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN','OPERATOR']));

// POST /api/governance/passenger
router.post('/passenger', async (req, res) => { ... });

// POST /api/governance/consent
router.post('/consent', async (req, res) => { ... });

// GET /api/governance/communities
router.get('/communities', async (req, res) => { ... });

// GET /api/governance/neighborhoods
router.get('/neighborhoods', async (req, res) => { ... });

// POST /api/governance/driver
router.post('/driver', async (req, res) => { ... });
```

**Conclusão:** `/api/governance/*` NÃO é público. Exige token admin com scope SUPER_ADMIN ou OPERATOR.

### ❌ **ERRO NA ANÁLISE ANTERIOR**

Escrevi: "Criar comunidade via `/api/admin/communities`"

**Realidade:** Não existe endpoint `/api/admin/communities`. Comunidades são gerenciadas via `/api/governance/communities` (admin token required).

---

## 3️⃣ CRONOGRAMA NORMALIZADO

### ⏱️ **DISCREPÂNCIA IDENTIFICADA**

- Documento "PROXIMOS_PASSOS_APPS_2026-03-01.md": **21 dias**
- Resumo executivo: **16 dias**

### ✅ **CRONOGRAMA CORRIGIDO**

#### **MVP MÍNIMO (14 dias úteis)**

**Escopo:** Apps funcionais sem features avançadas

| Fase | Descrição | Dias | Prioridade |
|------|-----------|------|------------|
| **1. Backend - Validações** | Validar `neighborhoodId`, criar `/api/neighborhoods/nearby`, filtrar ativos | 1 | 🔴 Crítica |
| **2. App Motorista - Core** | Cadastro + Upload docs + Home básico | 5 | 🔴 Crítica |
| **3. App Passageiro - Core** | Cadastro + Home + Solicitar corrida | 5 | 🔴 Crítica |
| **4. Testes E2E** | Validação fluxo completo | 2 | 🔴 Crítica |
| **5. Deploy Staging** | Deploy e validação em staging | 1 | 🔴 Crítica |
| **TOTAL MVP MÍNIMO** | | **14 dias** | |

**O que FICA FORA do MVP Mínimo:**
- ❌ Dashboard de métricas (motorista)
- ❌ Histórico de corridas (passageiro)
- ❌ Favoritos (passageiro)
- ❌ Notificações push
- ❌ Pagamentos PIX
- ❌ Avaliações (ratings)

#### **MVP REALISTA (21 dias úteis)**

**Escopo:** MVP Mínimo + features essenciais + estabilização

| Fase | Descrição | Dias | Prioridade |
|------|-----------|------|------------|
| **1-5. MVP Mínimo** | (conforme acima) | 14 | 🔴 Crítica |
| **6. Dashboard Motorista** | Métricas e breakdown de taxas | 2 | 🟡 Média |
| **7. Histórico Passageiro** | Lista de corridas anteriores | 1 | 🟡 Média |
| **8. Notificações Push** | Firebase + backend integration | 2 | 🟡 Média |
| **9. Testes de Carga** | Validação com múltiplos usuários | 1 | 🟡 Média |
| **10. Ajustes e Bugs** | Correções pós-testes | 1 | 🟡 Média |
| **TOTAL MVP REALISTA** | | **21 dias** | |

**O que FICA FORA do MVP Realista:**
- ❌ Pagamentos PIX (integração externa)
- ❌ Avaliações (ratings)
- ❌ Favoritos (passageiro)
- ❌ Chat/Suporte
- ❌ Bônus e incentivos

#### **MVP COMPLETO (30 dias úteis)**

**Escopo:** MVP Realista + features avançadas

| Fase | Descrição | Dias | Prioridade |
|------|-----------|------|------------|
| **1-10. MVP Realista** | (conforme acima) | 21 | 🔴 Crítica |
| **11. Pagamentos PIX** | Integração Mercado Pago/PagSeguro | 3 | 🟢 Baixa |
| **12. Avaliações** | Sistema de ratings motorista/passageiro | 2 | 🟢 Baixa |
| **13. Favoritos** | Passageiro favoritar motoristas | 2 | 🟢 Baixa |
| **14. Testes Finais** | Validação completa | 1 | 🟢 Baixa |
| **15. Deploy Produção** | Deploy final + monitoramento | 1 | 🟢 Baixa |
| **TOTAL MVP COMPLETO** | | **30 dias** | |

### 📊 **COMPARAÇÃO DE ESCOPOS**

| Feature | MVP Mínimo (14d) | MVP Realista (21d) | MVP Completo (30d) |
|---------|------------------|--------------------|--------------------|
| Cadastro motorista | ✅ | ✅ | ✅ |
| Upload documentos | ✅ | ✅ | ✅ |
| Home motorista | ✅ | ✅ | ✅ |
| Aceitar/Rejeitar corrida | ✅ | ✅ | ✅ |
| Cadastro passageiro | ✅ | ✅ | ✅ |
| Solicitar corrida | ✅ | ✅ | ✅ |
| Acompanhar corrida | ✅ | ✅ | ✅ |
| Dashboard métricas | ❌ | ✅ | ✅ |
| Histórico corridas | ❌ | ✅ | ✅ |
| Notificações push | ❌ | ✅ | ✅ |
| Pagamentos PIX | ❌ | ❌ | ✅ |
| Avaliações | ❌ | ❌ | ✅ |
| Favoritos | ❌ | ❌ | ✅ |

### 🎯 **RECOMENDAÇÃO**

**Opção 1: MVP Mínimo (14 dias)**
- ✅ Apps funcionais
- ✅ Fluxo completo de corrida
- ✅ Menor custo
- ❌ Sem métricas/histórico

**Opção 2: MVP Realista (21 dias)** ⭐ **RECOMENDADO**
- ✅ Apps funcionais
- ✅ Fluxo completo de corrida
- ✅ Dashboard de métricas (diferencial vs Uber)
- ✅ Notificações push
- ✅ Histórico de corridas
- ⚠️ Custo moderado

**Opção 3: MVP Completo (30 dias)**
- ✅ Todas as features
- ✅ Pagamentos PIX
- ✅ Avaliações
- ❌ Maior custo
- ❌ Maior risco de atraso

---

## 4️⃣ TURISMO PREMIUM - ADMIN VS PÚBLICO

### 📊 **PADRONIZAÇÃO DE ENDPOINTS**

**Arquivo:** `/backend/src/routes/premium-tourism.ts`

```typescript
// Apply feature flag middleware to all routes
router.use(requirePremiumTourismEnabled);

// Admin routes (require authentication)
const adminRouter = Router();
adminRouter.use(authenticateAdmin);

// Tour Packages (Admin)
adminRouter.post('/tour-packages', requireSuperAdmin, tourPackageController.createTourPackage);
adminRouter.get('/tour-packages', allowReadAccess, tourPackageController.getAllTourPackages);
adminRouter.get('/tour-packages/:id', allowReadAccess, tourPackageController.getTourPackage);
adminRouter.put('/tour-packages/:id', requireSuperAdmin, tourPackageController.updateTourPackage);
adminRouter.patch('/tour-packages/:id/deactivate', requireSuperAdmin, tourPackageController.deactivateTourPackage);

// Tour Bookings (Admin)
adminRouter.get('/tour-bookings', allowReadAccess, tourBookingController.getAllTourBookings);
adminRouter.post('/tour-bookings/:id/confirm', requireSuperAdmin, tourBookingController.confirmTourBooking);
adminRouter.patch('/tour-bookings/:id/status', requireSuperAdmin, tourBookingController.updateTourBookingStatus);

// Governance routes (public API)
const governanceRouter = Router();

// Tour Packages (Public)
governanceRouter.get('/tour-packages', tourController.getActiveTourPackages);
governanceRouter.post('/tour-bookings', tourController.createTourBooking);

// Mount routers
router.use('/admin', adminRouter);
router.use('/governance', governanceRouter);
```

### 📋 **TABELA DE ENDPOINTS - TURISMO PREMIUM**

#### **ADMIN (CRUD Completo)**

| Endpoint | Método | Token/Role | Middleware | Operação | Arquivo Backend |
|----------|--------|------------|------------|----------|-----------------|
| `/api/admin/tour-packages` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | Listar todos os pacotes | `premium-tourism.ts:30` |
| `/api/admin/tour-packages` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | Criar novo pacote | `premium-tourism.ts:29` |
| `/api/admin/tour-packages/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | Detalhes de um pacote | `premium-tourism.ts:31` |
| `/api/admin/tour-packages/:id` | PUT | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | Atualizar pacote | `premium-tourism.ts:32` |
| `/api/admin/tour-packages/:id/deactivate` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | Desativar pacote | `premium-tourism.ts:33` |
| `/api/admin/tour-bookings` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | Listar todas as reservas | `premium-tourism.ts:36` |
| `/api/admin/tour-bookings/:id/confirm` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | Confirmar reserva | `premium-tourism.ts:37` |
| `/api/admin/tour-bookings/:id/status` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | Atualizar status da reserva | `premium-tourism.ts:38` |

**Exemplo cURL - Criar Pacote (Admin):**

```bash
curl -X POST "http://localhost:3000/api/admin/tour-packages" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour Cristo Redentor",
    "description": "Visita guiada ao Cristo Redentor com motorista premium",
    "duration_hours": 4,
    "price": 250.00,
    "max_passengers": 4,
    "city": "Rio de Janeiro",
    "active": true
  }'
```

**Resposta:**

```json
{
  "success": true,
  "package": {
    "id": "pkg_001",
    "name": "Tour Cristo Redentor",
    "duration_hours": 4,
    "price": "250.00",
    "active": true,
    "created_at": "2026-03-01T22:00:00Z"
  }
}
```

---

#### **PÚBLICO (Consulta e Reserva)**

| Endpoint | Método | Token/Role | Middleware | Operação | Arquivo Backend |
|----------|--------|------------|------------|----------|-----------------|
| `/api/governance/tour-packages` | GET | Público (sem token) | `requirePremiumTourismEnabled` | Listar pacotes ativos | `premium-tourism.ts:58` + `tour-controller.ts:8` |
| `/api/governance/tour-bookings` | POST | Público (sem token) | `requirePremiumTourismEnabled` | Criar reserva | `premium-tourism.ts:59` + `tour-controller.ts:27` |

**Exemplo cURL - Listar Pacotes Ativos (Público):**

```bash
curl -X GET "http://localhost:3000/api/governance/tour-packages" \
  -H "Content-Type: application/json"
```

**Resposta:**

```json
{
  "success": true,
  "packages": [
    {
      "id": "pkg_001",
      "name": "Tour Cristo Redentor",
      "description": "Visita guiada ao Cristo Redentor com motorista premium",
      "duration_hours": 4,
      "price": "250.00",
      "max_passengers": 4,
      "city": "Rio de Janeiro",
      "active": true
    }
  ]
}
```

**Exemplo cURL - Criar Reserva (Público):**

```bash
curl -X POST "http://localhost:3000/api/governance/tour-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "pkg_001",
    "passenger_name": "Maria Santos",
    "passenger_email": "maria@example.com",
    "passenger_phone": "+5521999999999",
    "pickup_location": {
      "lat": -22.9068,
      "lng": -43.1729,
      "address": "Copacabana, Rio de Janeiro"
    },
    "scheduled_date": "2026-03-15T09:00:00Z",
    "num_passengers": 2
  }'
```

**Resposta:**

```json
{
  "success": true,
  "booking": {
    "id": "booking_001",
    "package_id": "pkg_001",
    "status": "pending",
    "scheduled_date": "2026-03-15T09:00:00Z",
    "created_at": "2026-03-01T22:00:00Z"
  },
  "premiumDriversAvailable": 3,
  "message": "Booking created successfully"
}
```

---

### 🔐 **DIFERENÇAS ADMIN VS PÚBLICO**

| Aspecto | Admin | Público |
|---------|-------|---------|
| **Path** | `/api/admin/tour-packages` | `/api/governance/tour-packages` |
| **Token** | ✅ Admin (SUPER_ADMIN/OPERATOR) | ❌ Não requerido |
| **Operações** | GET, POST, PUT, PATCH (CRUD completo) | GET (listar ativos) |
| **Reservas** | `/api/admin/tour-bookings` (listar todas + confirmar + atualizar status) | `/api/governance/tour-bookings` (criar reserva) |
| **Middleware Auth** | `authenticateAdmin` + `requireSuperAdmin` (escrita) / `allowReadAccess` (leitura) | Nenhum |
| **Middleware Feature** | `requirePremiumTourismEnabled` | `requirePremiumTourismEnabled` |
| **Controller** | `TourPackageController` + `TourBookingController` | `TourController` |
| **Arquivo** | `backend/src/modules/admin/tour-package-controller.ts` | `backend/src/modules/governance/tour-controller.ts` |

---

### ✅ **CORREÇÃO: Uso no Frontend**

**Análise do código:**

Não há uso de endpoints de Turismo Premium no frontend atual. O módulo está implementado apenas no backend.

**Possível uso futuro:**
- Frontend Admin: `/api/admin/tour-packages` (CRUD)
- Site/App Público: `/api/governance/tour-packages` (consulta e reserva)

---

## 📝 RESUMO DAS CORREÇÕES

### 1️⃣ **OUTSIDE_FENCE**

❌ **ANTES:** "NÃO DÁ MATCH quando fora da cerca"  
✅ **AGORA:** "Match ocorre com taxa 20% quando fora da cerca"

**Prova:** Dispatcher não bloqueia por OUTSIDE_FENCE (dispatcher.service.ts:18-169)

### 2️⃣ **ENDPOINTS ADMIN**

❌ **ANTES:** "Criar comunidade via `/api/admin/communities`"  
✅ **AGORA:** "Criar comunidade via `/api/governance/communities` (admin token required)"

**Prova:** Rotas registradas em app.ts:100-280 + governance.ts:1-35

### 3️⃣ **CRONOGRAMA**

❌ **ANTES:** "21 dias" e "16 dias" (inconsistente)  
✅ **AGORA:**
- MVP Mínimo: 14 dias (apps funcionais)
- MVP Realista: 21 dias (+ métricas + notificações) ⭐ RECOMENDADO
- MVP Completo: 30 dias (+ pagamentos + avaliações)

### 4️⃣ **TURISMO PREMIUM - ADMIN VS PÚBLICO**

✅ **PADRONIZADO:**

**Admin (CRUD completo):**
- Path: `/api/admin/tour-packages`
- Token: Admin (SUPER_ADMIN para escrita, OPERATOR para leitura)
- Operações: GET, POST, PUT, PATCH (deactivate)
- Reservas: `/api/admin/tour-bookings` (listar, confirmar, atualizar status)

**Público (Consulta e reserva):**
- Path: `/api/governance/tour-packages`
- Token: Nenhum (público)
- Operações: GET (listar ativos)
- Reservas: `/api/governance/tour-bookings` (criar reserva)

**Prova:** premium-tourism.ts:29-59 + tour-controller.ts:8-56

---

## 🎯 PRÓXIMO PASSO IMEDIATO

**DECISÃO NECESSÁRIA:** Escolher escopo do MVP

**Opção Recomendada:** MVP Realista (21 dias)
- Inclui dashboard de métricas (diferencial vs Uber)
- Inclui notificações push (essencial para UX)
- Inclui histórico (transparência)
- Custo-benefício ideal

**Após decisão:**
1. Validar `neighborhoodId` no backend (1h)
2. Criar endpoint `/api/neighborhoods/nearby` (2h)
3. Iniciar desenvolvimento app motorista (5 dias)

---

**FIM DO DOCUMENTO DE CORREÇÕES**
