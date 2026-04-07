# 🚨 ANÁLISE CRÍTICA: Gaps e Riscos nas Métricas do Motorista

**Sistema:** Kaviar (us-east-2)  
**Data:** 05/02/2026 08:29 BRT  
**Tipo:** Análise de Gaps (sem implementação)  
**Criticidade:** 🔴 ALTA - Problemas encontrados

---

## ❌ PROBLEMA CRÍTICO #1: TABELA `trips` NÃO EXISTE NO SCHEMA

### **Evidência:**
```typescript
// Arquivo: /backend/src/routes/driver-dashboard.ts (linha 46)
const trips: any[] = await prisma.$queryRaw`
  SELECT 
    id,
    fare_amount,
    platform_fee_percentage,
    platform_fee_amount,
    match_type,
    created_at
  FROM trips  // ❌ TABELA NÃO EXISTE NO SCHEMA.PRISMA
  WHERE driver_id = ${driverId}
```

### **Schema Real:**
```prisma
// Arquivo: /backend/prisma/schema.prisma
model rides {  // ✅ TABELA CORRETA É "rides"
  id                          String
  driver_id                   String?
  passenger_id                String
  price                       Decimal  // ❌ Campo é "price", não "fare_amount"
  platform_fee                Decimal? // ❌ Campo é "platform_fee", não "platform_fee_amount"
  driver_amount               Decimal?
  status                      String
  created_at                  DateTime
  // ❌ FALTAM CAMPOS CRÍTICOS:
  // - platform_fee_percentage (não existe)
  // - match_type (não existe)
}
```

### **Impacto:**
- ❌ **Dashboard do motorista QUEBRA** ao tentar buscar métricas
- ❌ **Erro SQL:** `relation "trips" does not exist`
- ❌ **Frontend recebe erro 500** e não mostra nada
- ❌ **Motorista não vê ganhos, taxa média, comparação com Uber**

### **Campos Faltantes na Tabela `rides`:**
```sql
-- CRÍTICOS para métricas:
platform_fee_percentage DECIMAL(5,2)  -- % cobrado (7%, 12%, 20%)
match_type VARCHAR(50)                -- SAME_NEIGHBORHOOD, ADJACENT_NEIGHBORHOOD, OUTSIDE_FENCE

-- IMPORTANTES para análise:
pickup_neighborhood_id VARCHAR(255)  -- Bairro de origem
dropoff_neighborhood_id VARCHAR(255) -- Bairro de destino
distance_km DECIMAL(10,2)            -- Distância da corrida
duration_minutes INT                 -- Duração da corrida
```

---

## ❌ PROBLEMA CRÍTICO #2: TABELA `match_logs` SEM LINK COM `rides`

### **Schema Atual:**
```prisma
model match_logs {
  id               String
  trip_id          String?  // ❌ NÃO TEM FOREIGN KEY
  driver_id        String
  passenger_id     String
  match_type       String
  platform_percent Decimal?
  platform_fee_brl Decimal?
  trip_value_brl   Decimal?
  created_at       DateTime?
  // ❌ FALTA: ride_id (link com tabela rides)
}
```

### **Impacto:**
- ❌ **Impossível rastrear** qual corrida gerou qual log
- ❌ **Métricas inconsistentes** (match_logs pode ter dados diferentes de rides)
- ❌ **Auditoria quebrada** (não dá pra validar se taxa foi aplicada corretamente)

---

## ❌ PROBLEMA CRÍTICO #3: FRONTEND USA API QUE NÃO EXISTE

### **Frontend Chama:**
```javascript
// Arquivo: /frontend-app/src/components/driver/NeighborhoodStatsCard.jsx (linha 18)
fetch(`${API_BASE_URL}/api/drivers/${driverId}/neighborhood-stats?period=month`)
```

### **Backend Tem:**
```typescript
// Arquivo: /backend/src/routes/neighborhood-stats.ts (linha 7)
router.get('/drivers/:driverId/neighborhood-stats', async (req, res) => {
  // ✅ ROTA EXISTE
  // ❌ MAS USA TABELA "trips" QUE NÃO EXISTE
  const query = `
    SELECT ... FROM trips t  // ❌ ERRO
  `;
});
```

### **Impacto:**
- ❌ **Card de ranking quebra** no frontend
- ❌ **Motorista não vê posição no bairro**
- ❌ **Erro 500 no console do navegador**

---

## ❌ PROBLEMA CRÍTICO #4: CÁLCULO DE TAXA NÃO É PERSISTIDO

### **Código Atual:**
```typescript
// Arquivo: /backend/src/routes/trips-integration-example.ts (linha 109)
const trip = await prisma.trips.create({
  data: {
    fare_amount: Number(fareAmount),
    platform_fee_percentage: feeCalc.feePercentage,  // ❌ CAMPO NÃO EXISTE
    platform_fee_amount: feeCalc.feeAmount,          // ❌ CAMPO NÃO EXISTE
    match_type: feeCalc.matchType                    // ❌ CAMPO NÃO EXISTE
  }
});
```

### **Schema Real:**
```prisma
model rides {
  price          Decimal  // ✅ Existe
  platform_fee   Decimal? // ✅ Existe (mas nome diferente)
  driver_amount  Decimal? // ✅ Existe
  // ❌ FALTAM:
  // - platform_fee_percentage
  // - match_type
}
```

### **Impacto:**
- ❌ **Taxa calculada é perdida** (não é salva)
- ❌ **Impossível gerar métricas** (não tem dados históricos)
- ❌ **Dashboard sempre vazio** (sem dados para calcular)

---

## ⚠️ PROBLEMA MÉDIO #5: CAMPOS OPCIONAIS CRÍTICOS

### **Schema Atual:**
```prisma
model drivers {
  neighborhood_id  String?  // ⚠️ OPCIONAL (deveria ser obrigatório)
  community_id     String?  // ⚠️ OPCIONAL (ok)
  vehicle_plate    String?  // ⚠️ OPCIONAL (deveria ser obrigatório após aprovação)
  vehicle_model    String?  // ⚠️ OPCIONAL (deveria ser obrigatório após aprovação)
  vehicle_color    String?  // ⚠️ OPCIONAL (deveria ser obrigatório após aprovação)
}
```

### **Impacto:**
- ⚠️ **Motorista aprovado sem bairro** → Taxa padrão 20% (ruim para ele)
- ⚠️ **Motorista sem veículo cadastrado** → Não pode ser identificado
- ⚠️ **Métricas quebram** se `neighborhood_id` for NULL

---

## ⚠️ PROBLEMA MÉDIO #6: FALTA VALIDAÇÃO DE STATUS

### **Código Atual:**
```typescript
// Arquivo: /backend/src/routes/driver-dashboard.ts (linha 53)
const trips: any[] = await prisma.$queryRaw`
  SELECT * FROM trips
  WHERE driver_id = ${driverId}
    AND status IN ('completed', 'finished')  // ⚠️ 2 status diferentes?
`;
```

### **Schema Real:**
```prisma
model rides {
  status  String  @default("requested")
  // ⚠️ Quais são os status válidos?
  // - requested, accepted, started, completed, cancelled?
  // - finished existe?
}
```

### **Impacto:**
- ⚠️ **Métricas podem contar corridas erradas**
- ⚠️ **Corridas canceladas podem entrar no cálculo**
- ⚠️ **Inconsistência entre "completed" e "finished"**

---

## ⚠️ PROBLEMA MÉDIO #7: FALTA ÍNDICES NO BANCO

### **Queries Lentas:**
```sql
-- Dashboard busca corridas por driver_id + created_at
SELECT * FROM rides 
WHERE driver_id = 'uuid' 
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC;

-- ⚠️ SEM ÍNDICE: Scan completo da tabela
-- ⚠️ COM 10.000 corridas: 2-3 segundos
-- ⚠️ COM 100.000 corridas: 20-30 segundos
```

### **Índices Faltantes:**
```sql
CREATE INDEX idx_rides_driver_created ON rides(driver_id, created_at DESC);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_match_logs_driver_created ON match_logs(driver_id, created_at DESC);
```

---

## ⚠️ PROBLEMA MÉDIO #8: FRONTEND USA DADOS MOCKADOS

### **Evidência:**
```javascript
// Arquivo: /frontend-app/src/pages/driver/Earnings.jsx (linha 22)
const mockEarningsHistory = [
  { id: 1, time: '14:30', passenger: 'Maria Silva', amount: 28.50 },
  { id: 2, time: '13:15', passenger: 'João Santos', amount: 35.00 },
  // ❌ DADOS FAKE - NÃO VEM DA API
];
```

### **Impacto:**
- ⚠️ **Motorista vê dados falsos**
- ⚠️ **Não reflete realidade**
- ⚠️ **Pode gerar confusão** (acha que ganhou R$ 135 mas não ganhou nada)

---

## 🟡 PROBLEMA BAIXO #9: FALTA CACHE

### **Código Atual:**
```typescript
// Toda vez que motorista abre dashboard:
const trips = await prisma.$queryRaw`SELECT * FROM trips...`;
// ❌ Query pesada executada sempre
// ❌ Sem cache Redis
// ❌ Sem cache em memória
```

### **Impacto:**
- 🟡 **Dashboard lento** (2-3 segundos)
- 🟡 **Carga alta no banco** (muitas queries)
- 🟡 **Custo AWS RDS aumenta**

---

## 🟡 PROBLEMA BAIXO #10: FALTA PAGINAÇÃO

### **Código Atual:**
```typescript
// Busca TODAS as corridas do período
const trips = await prisma.$queryRaw`
  SELECT * FROM trips
  WHERE driver_id = ${driverId}
    AND created_at >= ${startDate}
`;
// ❌ Se motorista tem 1000 corridas, retorna 1000 linhas
```

### **Impacto:**
- 🟡 **Resposta gigante** (pode ser 5MB+)
- 🟡 **Frontend trava** ao processar
- 🟡 **Timeout em conexões lentas**

---

## 📊 RESUMO DE GAPS

### **🔴 CRÍTICOS (Sistema quebra):**
1. ❌ Tabela `trips` não existe (usa `rides`)
2. ❌ Campos `platform_fee_percentage` e `match_type` não existem
3. ❌ `match_logs` sem foreign key para `rides`
4. ❌ Frontend chama API que usa tabela inexistente

### **⚠️ MÉDIOS (Métricas incorretas):**
5. ⚠️ `neighborhood_id` opcional (deveria ser obrigatório)
6. ⚠️ Status `finished` vs `completed` (inconsistência)
7. ⚠️ Sem índices (queries lentas)
8. ⚠️ Frontend usa dados mockados

### **🟡 BAIXOS (Performance):**
9. 🟡 Sem cache (dashboard lento)
10. 🟡 Sem paginação (resposta gigante)

---

## 🛠️ CAMPOS FALTANTES NA TABELA `rides`

### **Para Métricas Funcionarem:**
```sql
ALTER TABLE rides ADD COLUMN platform_fee_percentage DECIMAL(5,2);
ALTER TABLE rides ADD COLUMN match_type VARCHAR(50);
ALTER TABLE rides ADD COLUMN pickup_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN dropoff_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN distance_km DECIMAL(10,2);
ALTER TABLE rides ADD COLUMN duration_minutes INT;
ALTER TABLE rides ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN started_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN accepted_at TIMESTAMP;
```

### **Índices Necessários:**
```sql
CREATE INDEX idx_rides_driver_created ON rides(driver_id, created_at DESC);
CREATE INDEX idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_pickup_neighborhood ON rides(pickup_neighborhood_id);
CREATE INDEX idx_match_logs_driver_created ON match_logs(driver_id, created_at DESC);
```

---

## 🔗 FOREIGN KEYS FALTANTES

```sql
-- match_logs deve ter FK para rides
ALTER TABLE match_logs ADD COLUMN ride_id VARCHAR(255);
ALTER TABLE match_logs ADD CONSTRAINT fk_match_logs_ride 
  FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

-- rides deve ter FK para neighborhoods
ALTER TABLE rides ADD CONSTRAINT fk_rides_pickup_neighborhood 
  FOREIGN KEY (pickup_neighborhood_id) REFERENCES neighborhoods(id);
ALTER TABLE rides ADD CONSTRAINT fk_rides_dropoff_neighborhood 
  FOREIGN KEY (dropoff_neighborhood_id) REFERENCES neighborhoods(id);
```

---

## 🚨 VALIDAÇÕES FALTANTES

### **No Cadastro:**
```typescript
// Após aprovação, validar:
if (status === 'approved') {
  if (!neighborhood_id) throw new Error('Bairro obrigatório');
  if (!vehicle_plate) throw new Error('Placa obrigatória');
  if (!vehicle_model) throw new Error('Modelo obrigatório');
  if (!vehicle_color) throw new Error('Cor obrigatória');
}
```

### **Na Criação de Corrida:**
```typescript
// Sempre calcular e salvar taxa:
const feeCalc = await calculateTripFee(...);
await prisma.rides.create({
  data: {
    platform_fee_percentage: feeCalc.feePercentage,  // ❌ Campo não existe
    match_type: feeCalc.matchType                    // ❌ Campo não existe
  }
});
```

---

## 📋 CHECKLIST DE CORREÇÕES NECESSÁRIAS

### **Backend (Prisma Schema):**
- [ ] Adicionar `platform_fee_percentage` em `rides`
- [ ] Adicionar `match_type` em `rides`
- [ ] Adicionar `pickup_neighborhood_id` em `rides`
- [ ] Adicionar `dropoff_neighborhood_id` em `rides`
- [ ] Adicionar `distance_km` em `rides`
- [ ] Adicionar `duration_minutes` em `rides`
- [ ] Adicionar `ride_id` em `match_logs` com FK
- [ ] Tornar `neighborhood_id` obrigatório em `drivers` (após aprovação)
- [ ] Criar índices de performance

### **Backend (Código):**
- [ ] Corrigir `driver-dashboard.ts` para usar `rides` ao invés de `trips`
- [ ] Corrigir nomes de campos (`price` vs `fare_amount`)
- [ ] Adicionar validação de campos obrigatórios na aprovação
- [ ] Implementar cache Redis para dashboard
- [ ] Adicionar paginação nas queries
- [ ] Padronizar status (`completed` vs `finished`)

### **Frontend:**
- [ ] Remover dados mockados de `Earnings.jsx`
- [ ] Conectar com API real de ganhos
- [ ] Adicionar tratamento de erro quando API falha
- [ ] Adicionar loading state
- [ ] Adicionar fallback quando sem dados

---

## 🎯 PRIORIDADE DE CORREÇÃO

### **SPRINT 1 (Urgente - Sistema quebrado):**
1. Adicionar campos `platform_fee_percentage` e `match_type` em `rides`
2. Corrigir queries de `trips` para `rides`
3. Corrigir nomes de campos (`fare_amount` → `price`)
4. Adicionar FK `ride_id` em `match_logs`

### **SPRINT 2 (Importante - Métricas incorretas):**
5. Tornar `neighborhood_id` obrigatório após aprovação
6. Adicionar campos de localização (`pickup_neighborhood_id`, etc)
7. Padronizar status de corridas
8. Criar índices de performance

### **SPRINT 3 (Desejável - UX):**
9. Remover dados mockados do frontend
10. Implementar cache Redis
11. Adicionar paginação
12. Melhorar tratamento de erros

---

## ⚠️ RISCOS SE NÃO CORRIGIR

### **Curto Prazo (1-7 dias):**
- ❌ Dashboard quebra para todos os motoristas
- ❌ Motoristas não veem ganhos
- ❌ Suporte recebe muitas reclamações
- ❌ Reputação do app cai

### **Médio Prazo (1-4 semanas):**
- ❌ Impossível gerar relatórios financeiros
- ❌ Auditoria fiscal quebrada
- ❌ Não dá pra calcular comissões
- ❌ Motoristas abandonam o app

### **Longo Prazo (1-3 meses):**
- ❌ Banco de dados inconsistente
- ❌ Impossível migrar dados
- ❌ Custo de correção 10x maior
- ❌ Possível perda de dados

---

## ✅ CONCLUSÃO

**Status Atual:** 🔴 **SISTEMA QUEBRADO**

**Problemas Críticos:** 4  
**Problemas Médios:** 4  
**Problemas Baixos:** 2

**Recomendação:** **CORRIGIR IMEDIATAMENTE** antes de deploy em produção.

**Tempo Estimado de Correção:**
- Sprint 1 (crítico): 2-3 dias
- Sprint 2 (importante): 3-5 dias
- Sprint 3 (desejável): 5-7 dias

**Total:** 10-15 dias para sistema 100% funcional

---

**Gerado em:** 05/02/2026 08:29 BRT  
**Análise:** Completa (sem implementação)  
**Criticidade:** 🔴 ALTA
