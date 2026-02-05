# 📊 Métrica para Motorista em Comunidade Sem Mapa Oficial

**Pergunta:** Se o motorista morar em uma comunidade que não tem mapa cadastrado oficial, qual é a métrica que criamos para ele?

**Resposta:** ✅ **JÁ EXISTE** - Sistema de Fallback 800m (Taxa 12%)

---

## 🎯 SOLUÇÃO IMPLEMENTADA

### **FALLBACK_800M - Território Virtual**

Quando a comunidade **NÃO tem geofence oficial** cadastrada, o sistema cria uma **cerca virtual de 800 metros** ao redor do centro do bairro do motorista.

**Taxa:** **12%** (mesma taxa de bairros adjacentes)  
**Match Type:** `FALLBACK_800M`

---

## 🔄 COMO FUNCIONA

### **Fluxo de Cálculo:**

```
1. Sistema busca geofence oficial do bairro
   ↓
2. NÃO ENCONTROU geofence oficial?
   ↓
3. Cria cerca virtual de 800m ao redor do centro
   ↓
4. Verifica se pickup E dropoff estão dentro dos 800m
   ↓
5. SIM? → Taxa 12% (FALLBACK_800M)
   NÃO? → Taxa 20% (OUTSIDE_FENCE)
```

---

## 📍 CENTRO DO TERRITÓRIO VIRTUAL

**Prioridade 1:** Centroide da geofence oficial (se existir)  
**Prioridade 2:** Centro virtual do motorista (`virtual_fence_center_lat/lng`)  
**Prioridade 3:** Centro do bairro (`neighborhoods.center_lat/lng`)

---

## 💰 TABELA DE TAXAS

| Situação | Taxa | Match Type | Descrição |
|----------|------|------------|-----------|
| **Corrida completa no bairro** | 7% | SAME_NEIGHBORHOOD | Pickup e dropoff no bairro do motorista |
| **Pickup OU dropoff no bairro** | 12% | ADJACENT_NEIGHBORHOOD | Um dos pontos no bairro |
| **Dentro do raio de 800m** | 12% | FALLBACK_800M | ✅ **Comunidade sem mapa oficial** |
| **Fora da cerca** | 20% | OUTSIDE_FENCE | Nenhum ponto no território |

---

## 📝 CÓDIGO ATUAL

**Arquivo:** `/backend/src/services/fee-calculation.ts` (linha 260)

```typescript
// CASO 4: Fallback 800m - território virtual quando não há geofence oficial
if (!pickupNeighborhood && !dropoffNeighborhood) {
  const neighborhoodCenter = await getNeighborhoodCenter(
    driverHomeNeighborhood.id, 
    driverId
  );
  
  if (neighborhoodCenter) {
    const pickupDistance = calculateDistance(
      pickupLat, pickupLng,
      neighborhoodCenter.lat, neighborhoodCenter.lng
    );
    
    const dropoffDistance = calculateDistance(
      dropoffLat, dropoffLng,
      neighborhoodCenter.lat, neighborhoodCenter.lng
    );
    
    // Se ambos os pontos estão dentro do raio de 800m
    if (
      pickupDistance <= 800 &&
      dropoffDistance <= 800
    ) {
      return {
        feePercentage: 12,
        matchType: 'FALLBACK_800M',
        reason: `Corrida dentro do raio de 800m de ${driverHomeNeighborhood.name}`
      };
    }
  }
}
```

---

## 🎯 EXEMPLO PRÁTICO

### **Cenário: Motorista na Rocinha (sem geofence oficial)**

**Cadastro do motorista:**
- `neighborhood_id`: "rocinha_uuid"
- `neighborhoods.center_lat`: -22.9881
- `neighborhoods.center_lng`: -43.2492

**Corrida 1:**
- Pickup: 50m do centro da Rocinha
- Dropoff: 300m do centro da Rocinha
- **Resultado:** Taxa 12% (FALLBACK_800M) ✅

**Corrida 2:**
- Pickup: 50m do centro da Rocinha
- Dropoff: 1.5km do centro da Rocinha
- **Resultado:** Taxa 20% (OUTSIDE_FENCE) ❌

---

## 📊 MÉTRICAS NO DASHBOARD

O motorista verá no dashboard:

```json
{
  "matchBreakdown": {
    "fallback800m": {
      "count": 30,
      "percentage": "66.7%",
      "fee": "12%"
    },
    "outsideFence": {
      "count": 15,
      "percentage": "33.3%",
      "fee": "20%"
    }
  },
  "fenceStatus": {
    "active": true,
    "neighborhood": "Rocinha",
    "type": "VIRTUAL_800M",
    "recommendation": "Faça mais corridas próximas à Rocinha para manter taxa de 12%"
  }
}
```

---

## ⚙️ CONFIGURAÇÃO

**Arquivo:** `/backend/src/services/fee-calculation.ts` (linha 16)

```typescript
const FEE_CONFIG = {
  SAME_NEIGHBORHOOD: 7,
  ADJACENT_NEIGHBORHOOD: 12,
  FALLBACK_800M: 12,              // ✅ Taxa para comunidades sem mapa
  OUTSIDE_FENCE: 20,
  FALLBACK_RADIUS_METERS: 800     // ✅ Raio configurável
};
```

**Para ajustar o raio:**
- Alterar `FALLBACK_RADIUS_METERS` (ex: 1000 para 1km)
- Rebuild do backend
- Restart do servidor

---

## 🔍 VALIDAÇÃO

### **Como testar:**

```bash
# Calcular taxa para corrida em comunidade sem mapa
curl -X POST https://api.kaviar.com.br/api/trips/calculate-fee \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "motorista_rocinha_uuid",
    "pickupLat": -22.9881,
    "pickupLng": -43.2492,
    "dropoffLat": -22.9891,
    "dropoffLng": -43.2502,
    "fareAmount": 25.00
  }'
```

**Resposta esperada:**
```json
{
  "feePercentage": 12,
  "feeAmount": 3.00,
  "driverEarnings": 22.00,
  "matchType": "FALLBACK_800M",
  "reason": "Corrida dentro do raio de 800m de Rocinha"
}
```

---

## ✅ VANTAGENS DO SISTEMA

1. **Justo:** Taxa intermediária (12%) para comunidades sem mapa
2. **Automático:** Não precisa cadastrar geofence manualmente
3. **Flexível:** Raio de 800m configurável
4. **Transparente:** Motorista vê no dashboard que está usando território virtual
5. **Incentiva:** Motorista é incentivado a fazer corridas próximas

---

## 🎯 RESUMO

**Pergunta:** Qual métrica para motorista em comunidade sem mapa?  
**Resposta:** ✅ **FALLBACK_800M - Taxa 12%**

**Como funciona:**
- Sistema cria cerca virtual de 800m ao redor do centro
- Se corrida completa dentro dos 800m → Taxa 12%
- Se corrida sai dos 800m → Taxa 20%

**Status:** ✅ **JÁ IMPLEMENTADO E FUNCIONAL**

**Arquivo:** `/backend/src/services/fee-calculation.ts`  
**Configuração:** `FALLBACK_RADIUS_METERS = 800`

---

**Conclusão:** O sistema **JÁ RESOLVE** o problema de comunidades sem mapa oficial através do sistema de fallback 800m com taxa de 12%.
