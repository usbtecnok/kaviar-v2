# 📊 Explicação: Sistema de Métricas do Motorista - Kaviar

**Sistema:** Kaviar (us-east-2)  
**Data:** 05/02/2026 08:17 BRT  
**Modo:** Apenas explicação (sem modificações)

---

## 🔄 FLUXO COMPLETO: Do Cadastro às Métricas

### **FASE 1: CADASTRO INICIAL** 📝

**Endpoint:** `POST /api/governance/driver`  
**Arquivo:** `/backend/src/routes/governance.ts` (linha 209)

#### Dados Capturados no Cadastro:
```typescript
{
  name: "João Silva",
  email: "joao@email.com",
  phone: "+5511999999999",
  password: "senha123",
  neighborhoodId: "bairro_uuid",        // 🎯 BASE DO MOTORISTA
  communityId: "comunidade_uuid",       // 🏘️ COMUNIDADE
  familyBonusAccepted: true,            // 💰 BÔNUS FAMÍLIA
  familyProfile: "family"               // 👨‍👩‍👧‍👦 PERFIL
}
```

#### Campos Persistidos na Tabela `drivers`:
```sql
drivers {
  id: uuid
  name: "João Silva"
  email: "joao@email.com"
  phone: "+5511999999999"
  password_hash: "bcrypt_hash"
  status: "pending"                     -- ⏳ Aguardando aprovação
  neighborhood_id: "bairro_uuid"        -- 🎯 CHAVE PARA MÉTRICAS
  community_id: "comunidade_uuid"       -- 🏘️ CHAVE PARA MÉTRICAS
  family_bonus_accepted: true           -- 💰 AFETA CÁLCULO DE TAXA
  family_bonus_profile: "family"        -- 👨‍👩‍👧‍👦 AFETA CÁLCULO DE TAXA
  created_at: timestamp                 -- 📅 INÍCIO DAS MÉTRICAS
  updated_at: timestamp
}
```

**Status inicial:** `pending` (não pode fazer corridas ainda)

---

### **FASE 2: UPLOAD DE DOCUMENTOS** 📄

**Endpoint:** `POST /api/drivers/me/documents`  
**Arquivo:** `/backend/src/routes/drivers.ts` (linha 119)

#### Dados Adicionais Capturados:
```typescript
{
  vehicleColor: "Preto",
  vehiclePlate: "ABC1234",
  vehicleModel: "Gol 2020",
  pix_key: "11999999999",
  pix_key_type: "phone"
}
```

#### Atualização na Tabela `drivers`:
```sql
UPDATE drivers SET
  vehicle_plate = "ABC1234",
  vehicle_model = "Gol 2020",
  vehicle_color = "Preto",
  pix_key = "11999999999",
  pix_key_type = "phone"
WHERE id = driver_id;
```

**Status:** Ainda `pending` (aguardando aprovação admin)

---

### **FASE 3: APROVAÇÃO ADMIN** ✅

**Endpoint:** `POST /api/admin/drivers/:id/approve`  
**Arquivo:** `/backend/src/routes/admin-approval.ts`

#### Atualização na Tabela `drivers`:
```sql
UPDATE drivers SET
  status = "approved",              -- ✅ AGORA PODE FAZER CORRIDAS
  approved_at = NOW(),
  approved_by = "admin_uuid"
WHERE id = driver_id;
```

**Status:** `approved` → Motorista pode ficar online e aceitar corridas

---

### **FASE 4: PRIMEIRA CORRIDA** 🚗

**Endpoint:** `POST /api/rides` (passageiro solicita)  
**Match:** Sistema encontra motorista baseado em `neighborhood_id`

#### Criação de Registro na Tabela `rides`:
```sql
INSERT INTO rides (
  id,
  driver_id,                    -- 🔗 LINK PARA MÉTRICAS
  passenger_id,
  origin,
  destination,
  status,                       -- "requested" → "accepted" → "completed"
  price,                        -- R$ 25.00 (valor total)
  platform_fee,                 -- R$ 1.75 (7% se mesmo bairro)
  driver_amount,                -- R$ 23.25 (motorista recebe)
  created_at                    -- 📅 TIMESTAMP PARA MÉTRICAS
) VALUES (...);
```

#### Cálculo de Taxa (baseado em `neighborhood_id`):
```typescript
// Sistema de Cerca Virtual (Geofence)
if (pickup_neighborhood_id === driver.neighborhood_id) {
  platform_fee_percentage = 7%;   // 🎯 MESMO BAIRRO
  match_type = "SAME_NEIGHBORHOOD";
} else if (adjacent_neighborhood) {
  platform_fee_percentage = 12%;  // 🔄 BAIRRO ADJACENTE
  match_type = "ADJACENT_NEIGHBORHOOD";
} else {
  platform_fee_percentage = 20%;  // 🌍 FORA DA CERCA
  match_type = "OUTSIDE_FENCE";
}
```

#### Registro na Tabela `match_logs`:
```sql
INSERT INTO match_logs (
  trip_id,
  driver_id,
  passenger_id,
  match_type,                   -- "SAME_NEIGHBORHOOD"
  driver_base_lat,              -- Lat do neighborhood_id
  driver_base_lng,              -- Lng do neighborhood_id
  pickup_lat,                   -- Lat do pickup
  pickup_lng,                   -- Lng do pickup
  neighborhood_id,              -- 🎯 BAIRRO BASE
  platform_percent,             -- 7.00
  platform_fee_brl,             -- 1.75
  trip_value_brl,               -- 25.00
  created_at                    -- 📅 TIMESTAMP
) VALUES (...);
```

---

## 📊 MÉTRICAS GERADAS

### **1. DASHBOARD DO MOTORISTA** 📈

**Endpoint:** `GET /api/drivers/:driverId/dashboard?period=30`  
**Arquivo:** `/backend/src/routes/driver-dashboard.ts`

#### Query Principal:
```sql
SELECT 
  id,
  fare_amount,                  -- Valor total da corrida
  platform_fee_percentage,      -- % cobrado (7%, 12%, 20%)
  platform_fee_amount,          -- Valor em R$ cobrado
  match_type,                   -- Tipo de match
  created_at                    -- Data da corrida
FROM trips
WHERE driver_id = :driverId
  AND created_at >= :startDate  -- Últimos 30 dias
  AND status IN ('completed', 'finished')
ORDER BY created_at DESC;
```

#### Cálculos Realizados:

**1. Resumo Geral:**
```typescript
totalTrips = rides.length;                              // 45 corridas
totalFare = SUM(fare_amount);                           // R$ 1.125,00
totalKaviarFee = SUM(platform_fee_amount);              // R$ 101,25
totalEarnings = totalFare - totalKaviarFee;             // R$ 1.023,75
avgFeePercentage = AVG(platform_fee_percentage);        // 9% (média)
```

**2. Breakdown por Tipo de Match:**
```typescript
matchBreakdown = {
  SAME_NEIGHBORHOOD: {
    count: 30,                  // 30 corridas no mesmo bairro
    percentage: 66.7%,          // 30/45 * 100
    fee: 7%                     // Taxa fixa
  },
  ADJACENT_NEIGHBORHOOD: {
    count: 10,                  // 10 corridas em bairro adjacente
    percentage: 22.2%,          // 10/45 * 100
    fee: 12%                    // Taxa fixa
  },
  OUTSIDE_FENCE: {
    count: 5,                   // 5 corridas fora da cerca
    percentage: 11.1%,          // 5/45 * 100
    fee: 20%                    // Taxa fixa
  }
};
```

**3. Comparação com Uber:**
```typescript
UBER_FEE = 25%;                                         // Taxa fixa Uber
uberFeeAmount = (totalFare * 25) / 100;                 // R$ 281,25
kaviarFeeAmount = totalKaviarFee;                       // R$ 101,25
savings = uberFeeAmount - kaviarFeeAmount;              // R$ 180,00
savingsPercentage = (savings / totalFare) * 100;        // 16% de economia
```

**4. Status da Cerca Virtual:**
```typescript
fenceStatus = {
  active: true,                                         // Tem neighborhood_id
  neighborhood: {
    id: "bairro_uuid",
    name: "Copacabana",
    city: "Rio de Janeiro"
  },
  inNeighborhoodRate: "66.7%",                          // 30/45 corridas
  recommendation: "Ótimo! Você está aproveitando bem sua cerca virtual."
};
```

#### Resposta JSON:
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2026-01-05T00:00:00Z",
      "endDate": "2026-02-05T00:00:00Z"
    },
    "driver": {
      "id": "driver_uuid",
      "name": "João Silva",
      "homeNeighborhood": {
        "id": "bairro_uuid",
        "name": "Copacabana",
        "city": "Rio de Janeiro"
      }
    },
    "summary": {
      "totalTrips": 45,
      "totalFare": "1125.00",
      "totalEarnings": "1023.75",
      "avgFeePercentage": "9.0"
    },
    "comparison": {
      "kaviar": {
        "fee": "101.25",
        "percentage": "9.0"
      },
      "uber": {
        "fee": "281.25",
        "percentage": "25"
      },
      "savings": {
        "amount": "180.00",
        "percentage": "16.0",
        "message": "Você economizou R$ 180.00 vs Uber!"
      }
    },
    "matchBreakdown": {
      "sameNeighborhood": {
        "count": 30,
        "percentage": "66.7",
        "fee": "7%"
      },
      "adjacentNeighborhood": {
        "count": 10,
        "percentage": "22.2",
        "fee": "12%"
      },
      "outsideFence": {
        "count": 5,
        "percentage": "11.1",
        "fee": "20%"
      }
    },
    "fenceStatus": {
      "active": true,
      "neighborhood": {
        "id": "bairro_uuid",
        "name": "Copacabana",
        "city": "Rio de Janeiro"
      },
      "inNeighborhoodRate": "66.7%",
      "recommendation": "Ótimo! Você está aproveitando bem sua cerca virtual."
    },
    "recentTrips": [
      {
        "id": "ride_1",
        "fare": "25.00",
        "fee": "7%",
        "matchType": "SAME_NEIGHBORHOOD",
        "date": "2026-02-05T07:30:00Z"
      }
    ]
  }
}
```

---

### **2. GANHOS DO MOTORISTA** 💰

**Endpoint:** `GET /api/drivers/me/earnings?start_date=2026-01-01&end_date=2026-01-31`  
**Arquivo:** `/backend/src/routes/driver-earnings.ts`

#### Query:
```sql
SELECT 
  id,
  created_at,
  price,                        -- Valor total
  platform_fee,                 -- Taxa Kaviar
  driver_amount                 -- Valor que motorista recebe
FROM rides
WHERE driver_id = :driverId
  AND status = 'COMPLETED'
  AND created_at BETWEEN :start_date AND :end_date
ORDER BY created_at DESC;
```

#### Cálculos:
```typescript
total_earnings = SUM(driver_amount);                    // R$ 1.023,75
total_rides = COUNT(*);                                 // 45
avg_earnings = total_earnings / total_rides;            // R$ 22,75 por corrida
```

#### Resposta JSON:
```json
{
  "success": true,
  "summary": {
    "total_earnings": 1023.75,
    "total_rides": 45,
    "avg_earnings": 22.75,
    "period": {
      "start_date": "2026-01-01",
      "end_date": "2026-01-31"
    }
  },
  "rides": [
    {
      "id": "ride_1",
      "created_at": "2026-02-05T07:30:00Z",
      "price": "25.00",
      "platform_fee": "1.75",
      "driver_amount": "23.25"
    }
  ]
}
```

---

## 🎯 CAMPOS-CHAVE PARA MÉTRICAS

### **Tabela `drivers`:**
```sql
neighborhood_id         -- 🎯 BASE DO MOTORISTA (define taxa 7%)
community_id            -- 🏘️ COMUNIDADE (para métricas sociais)
family_bonus_accepted   -- 💰 AFETA CÁLCULO DE BÔNUS
family_bonus_profile    -- 👨‍👩‍👧‍👦 TIPO DE PERFIL
created_at              -- 📅 INÍCIO DAS MÉTRICAS
approved_at             -- ✅ QUANDO COMEÇOU A TRABALHAR
```

### **Tabela `rides`:**
```sql
driver_id               -- 🔗 LINK PARA MOTORISTA
status                  -- "completed" = conta para métricas
price                   -- 💵 VALOR TOTAL
platform_fee            -- 💰 TAXA KAVIAR (R$)
driver_amount           -- 💵 VALOR QUE MOTORISTA RECEBE
created_at              -- 📅 DATA DA CORRIDA
```

### **Tabela `match_logs`:**
```sql
driver_id               -- 🔗 LINK PARA MOTORISTA
match_type              -- 🎯 TIPO DE MATCH (afeta taxa)
neighborhood_id         -- 🏘️ BAIRRO BASE
platform_percent        -- 📊 % COBRADO (7%, 12%, 20%)
platform_fee_brl        -- 💰 VALOR EM R$
trip_value_brl          -- 💵 VALOR TOTAL
created_at              -- 📅 TIMESTAMP
```

---

## 📈 COMO AS MÉTRICAS SÃO CALCULADAS

### **1. Taxa Média do Motorista:**
```typescript
// Busca todas as corridas do período
rides = SELECT * FROM rides 
        WHERE driver_id = :id 
        AND created_at >= :startDate
        AND status = 'completed';

// Calcula média
avgFeePercentage = SUM(platform_fee_percentage) / COUNT(*);
```

### **2. Economia vs Uber:**
```typescript
// Uber cobra 25% fixo
uberFee = totalFare * 0.25;

// Kaviar cobra variável (7%, 12%, 20%)
kaviarFee = SUM(platform_fee_amount);

// Economia
savings = uberFee - kaviarFee;
savingsPercentage = (savings / totalFare) * 100;
```

### **3. Taxa por Tipo de Match:**
```typescript
// Conta corridas por tipo
sameNeighborhood = COUNT WHERE match_type = 'SAME_NEIGHBORHOOD';
adjacentNeighborhood = COUNT WHERE match_type = 'ADJACENT_NEIGHBORHOOD';
outsideFence = COUNT WHERE match_type = 'OUTSIDE_FENCE';

// Calcula percentuais
sameNeighborhoodPct = (sameNeighborhood / totalTrips) * 100;
```

### **4. Recomendação Inteligente:**
```typescript
if (inNeighborhoodRate < 50%) {
  recommendation = "Tente fazer mais corridas no seu bairro para economizar!";
} else {
  recommendation = "Ótimo! Você está aproveitando bem sua cerca virtual.";
}
```

---

## 🔄 FLUXO TEMPORAL COMPLETO

```
DIA 1 (Cadastro)
├─ POST /api/governance/driver
├─ Status: pending
├─ neighborhood_id: definido
└─ Métricas: 0 corridas

DIA 2 (Upload Documentos)
├─ POST /api/drivers/me/documents
├─ Status: pending
└─ Métricas: 0 corridas

DIA 3 (Aprovação)
├─ POST /api/admin/drivers/:id/approve
├─ Status: approved
├─ approved_at: timestamp
└─ Métricas: 0 corridas (pode começar)

DIA 4 (Primeira Corrida)
├─ Corrida no mesmo bairro
├─ Taxa: 7%
├─ INSERT INTO rides
├─ INSERT INTO match_logs
└─ Métricas: 1 corrida, R$ 23.25 ganho

DIA 5-34 (Mais Corridas)
├─ 44 corridas adicionais
├─ 30 no mesmo bairro (7%)
├─ 10 adjacentes (12%)
├─ 5 fora da cerca (20%)
└─ Métricas: 45 corridas, R$ 1.023,75 ganho

DIA 35 (Consulta Dashboard)
├─ GET /api/drivers/:id/dashboard?period=30
├─ Sistema calcula:
│   ├─ Total de corridas: 45
│   ├─ Ganho total: R$ 1.023,75
│   ├─ Taxa média: 9%
│   ├─ Economia vs Uber: R$ 180,00 (16%)
│   └─ Taxa no bairro: 66.7%
└─ Resposta JSON com todas as métricas
```

---

## 🎯 RESUMO: CAMPOS QUE AFETAM MÉTRICAS

### **No Cadastro (Fase 1):**
- ✅ `neighborhood_id` → Define taxa base (7%)
- ✅ `community_id` → Métricas sociais
- ✅ `family_bonus_accepted` → Bônus família
- ✅ `created_at` → Início das métricas

### **No Upload (Fase 2):**
- ✅ `vehicle_plate`, `vehicle_model`, `vehicle_color` → Identificação
- ✅ `pix_key` → Pagamentos

### **Na Aprovação (Fase 3):**
- ✅ `approved_at` → Quando começou a trabalhar
- ✅ `status = approved` → Pode fazer corridas

### **Nas Corridas (Fase 4+):**
- ✅ `match_type` → Define taxa (7%, 12%, 20%)
- ✅ `platform_fee_percentage` → % cobrado
- ✅ `platform_fee_amount` → Valor em R$
- ✅ `driver_amount` → Quanto motorista recebe
- ✅ `created_at` → Data da corrida

---

## 📊 MÉTRICAS DISPONÍVEIS

### **Dashboard Completo:**
- Total de corridas
- Ganho total
- Taxa média
- Economia vs Uber
- Breakdown por tipo de match
- Status da cerca virtual
- Últimas 5 corridas

### **Ganhos:**
- Total ganho no período
- Número de corridas
- Média por corrida
- Lista detalhada de corridas

### **Estatísticas de Bairro:**
- Taxa de corridas no bairro base
- Comparação com outros motoristas
- Ranking de bairros

---

**Conclusão:** O sistema de métricas é **totalmente baseado** no `neighborhood_id` definido no cadastro inicial. Quanto mais corridas o motorista fizer no seu bairro base, menor será a taxa média e maior será a economia vs Uber.
