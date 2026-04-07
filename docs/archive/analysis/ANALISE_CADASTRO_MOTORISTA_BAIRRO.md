# 📋 Análise: Cadastro de Motorista e Alocação de Bairro

**Pergunta:** No frontend existe campo para alocar motorista em comunidade não cadastrada? É automático? Sistema obriga a escolher bairro existente e aprovado?

**Data:** 05/02/2026 09:09 BRT

---

## 🎯 RESPOSTA DIRETA

### **1. Frontend tem campo de bairro?**
❌ **NÃO** - Frontend atual não tem tela de cadastro implementada

### **2. Sistema obriga escolher bairro existente?**
✅ **SIM** - Backend valida que `neighborhoodId` é obrigatório

### **3. É automático pelo sistema?**
⚠️ **PARCIALMENTE** - Tem endpoint de geolocalização automática

### **4. Podemos verificar depois em geofence?**
✅ **SIM** - Sistema resolve coordenadas para bairro

---

## 📱 ESTADO ATUAL DO FRONTEND

### **App Mobile (React Native)**
**Arquivo:** `/kaviar-app/app/(auth)/register.tsx`

```tsx
// ❌ PLACEHOLDER - NÃO IMPLEMENTADO
export default function Register() {
  return (
    <View>
      <Text>Tela de registro - Lógica será implementada</Text>
    </View>
  );
}
```

**Status:** ❌ **Não tem formulário de cadastro**

### **Frontend Web (React)**
**Pasta:** `/frontend-app/src/pages/driver/`

**Arquivos existentes:**
- ✅ Login.jsx
- ✅ SetPassword.jsx
- ✅ Documents.jsx
- ✅ Home.jsx
- ❌ Register.jsx (NÃO EXISTE)

**Status:** ❌ **Não tem tela de cadastro de motorista**

---

## 🔧 BACKEND - COMO FUNCIONA

### **Endpoint de Cadastro**
**Rota:** `POST /api/governance/driver`  
**Arquivo:** `/backend/src/routes/governance.ts` (linha 209)

### **Schema de Validação:**
```typescript
const driverCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),  // ✅ OBRIGATÓRIO
  communityId: z.string().optional(),                          // ⚠️ OPCIONAL
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.string().optional()
});
```

### **Validações:**
✅ `neighborhoodId` é **OBRIGATÓRIO**  
✅ Deve ser string não vazia  
❌ **NÃO valida** se bairro existe no banco  
❌ **NÃO valida** se bairro está ativo (`is_active`)  
❌ **NÃO valida** se bairro tem geofence cadastrada

---

## 🗺️ ENDPOINT DE BAIRROS

### **Listar Bairros Disponíveis**
**Rota:** `GET /api/governance/neighborhoods`  
**Arquivo:** `/backend/src/routes/governance.ts` (linha 150)

```typescript
router.get('/neighborhoods', async (req, res) => {
  const neighborhoods = await prisma.neighborhoods.findMany({
    select: {
      id: true,
      name: true,
      zone: true,
      is_active: true  // ✅ Retorna status
    },
    orderBy: { name: 'asc' }
  });
  
  res.json({ success: true, data: neighborhoods });
});
```

**Retorna:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Copacabana",
      "zone": "Zona Sul",
      "is_active": true
    },
    {
      "id": "uuid-2",
      "name": "Rocinha",
      "zone": "Zona Sul",
      "is_active": true
    }
  ]
}
```

**Problema:** ❌ **Retorna TODOS os bairros**, inclusive:
- Bairros sem geofence oficial
- Bairros inativos (se `is_active: false`)
- Comunidades não mapeadas

---

## 📍 GEOLOCALIZAÇÃO AUTOMÁTICA

### **Endpoint de Complete Profile**
**Rota:** `POST /api/drivers/me/complete-profile`  
**Arquivo:** `/backend/src/routes/drivers.ts` (linha 22)

```typescript
const completeProfileSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // ❌ NÃO pede neighborhoodId aqui
});

// Resolve geolocation to neighborhood
const geoResult = await geoResolveService.resolveCoordinates(
  data.latitude, 
  data.longitude
);
```

**Como funciona:**
1. Motorista envia lat/lng
2. Sistema busca bairro via PostGIS
3. **NÃO atualiza** `neighborhood_id` automaticamente
4. Apenas retorna qual bairro foi encontrado

**Problema:** ⚠️ **Não persiste o bairro automaticamente**

---

## 🔍 VERIFICAÇÃO EM GEOFENCE

### **Serviço de Geo-Resolve**
**Arquivo:** `/backend/src/services/geo-resolve.ts`

```typescript
async resolveCoordinates(lat: number, lng: number) {
  // Busca bairro via PostGIS
  const result = await prisma.$queryRaw`
    SELECT n.id, n.name
    FROM neighborhoods n
    JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
    WHERE ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
    LIMIT 1
  `;
  
  return result[0] || null;
}
```

**Funciona para:**
- ✅ Bairros com geofence oficial cadastrada
- ❌ Comunidades sem geofence (retorna `null`)

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### **1. Sem Validação de Bairro Existente**
```typescript
// Backend aceita qualquer string como neighborhoodId
neighborhoodId: z.string().min(1, 'Bairro é obrigatório')

// ❌ NÃO valida se existe no banco
// ❌ NÃO valida se está ativo
// ❌ NÃO valida se tem geofence
```

**Risco:** Motorista pode cadastrar com `neighborhoodId` inválido

### **2. Sem Filtro de Bairros Ativos**
```typescript
// Endpoint retorna TODOS os bairros
await prisma.neighborhoods.findMany({
  // ❌ NÃO filtra por is_active: true
  // ❌ NÃO filtra por has_geofence: true
});
```

**Risco:** Frontend pode mostrar bairros inativos ou sem mapa

### **3. Geolocalização Não Persiste**
```typescript
// Complete profile resolve bairro mas NÃO salva
const geoResult = await geoResolveService.resolveCoordinates(lat, lng);
// ❌ NÃO atualiza drivers.neighborhood_id
```

**Risco:** Motorista fica sem bairro mesmo enviando localização

### **4. Frontend Não Implementado**
```tsx
// Tela de registro é placeholder
<Text>Tela de registro - Lógica será implementada</Text>
```

**Risco:** Não há UI para cadastro de motorista

---

## ✅ COMO DEVERIA FUNCIONAR

### **Fluxo Ideal:**

```
1. Motorista acessa tela de cadastro
   ↓
2. Preenche: nome, email, telefone, senha
   ↓
3. Sistema pede localização (GPS)
   ↓
4. Backend resolve lat/lng → bairro via geofence
   ↓
5a. ENCONTROU bairro oficial?
    → Salva neighborhood_id automaticamente
    → Mostra: "Você foi cadastrado em [Copacabana]"
   ↓
5b. NÃO encontrou bairro oficial?
    → Mostra lista de bairros próximos
    → Motorista escolhe manualmente
    → Sistema usa fallback 800m
   ↓
6. Motorista completa cadastro
   → Status: pending
   → neighborhood_id: definido
```

---

## 🛠️ O QUE PRECISA SER IMPLEMENTADO

### **1. Validação no Backend**
```typescript
// Validar se bairro existe e está ativo
const driverCreateSchema = z.object({
  neighborhoodId: z.string().min(1).refine(async (id) => {
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id, is_active: true }
    });
    return !!neighborhood;
  }, 'Bairro inválido ou inativo')
});
```

### **2. Filtrar Bairros Ativos**
```typescript
// Endpoint de bairros deve filtrar
router.get('/neighborhoods', async (req, res) => {
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: { is_active: true },  // ✅ Apenas ativos
    select: {
      id: true,
      name: true,
      zone: true,
      has_geofence: true  // ✅ Indicar se tem mapa oficial
    }
  });
});
```

### **3. Geolocalização Automática com Persistência**
```typescript
// Complete profile deve salvar bairro
router.post('/me/complete-profile', async (req, res) => {
  const geoResult = await geoResolveService.resolveCoordinates(lat, lng);
  
  if (geoResult?.neighborhoodId) {
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        neighborhood_id: geoResult.neighborhoodId,  // ✅ Salvar
        last_lat: lat,
        last_lng: lng
      }
    });
  }
});
```

### **4. Frontend de Cadastro**
```tsx
// Implementar tela de registro
export default function Register() {
  const [location, setLocation] = useState(null);
  const [neighborhood, setNeighborhood] = useState(null);
  
  // 1. Pedir localização GPS
  const getLocation = async () => {
    const coords = await Location.getCurrentPositionAsync();
    setLocation(coords);
    
    // 2. Resolver bairro automaticamente
    const result = await api.post('/geo/resolve', {
      lat: coords.latitude,
      lng: coords.longitude
    });
    
    if (result.neighborhood) {
      setNeighborhood(result.neighborhood);
    } else {
      // 3. Mostrar lista de bairros próximos
      const nearby = await api.get('/neighborhoods/nearby', {
        lat: coords.latitude,
        lng: coords.longitude
      });
      // Motorista escolhe manualmente
    }
  };
  
  // 4. Cadastrar com bairro definido
  const register = async () => {
    await api.post('/governance/driver', {
      name, email, phone, password,
      neighborhoodId: neighborhood.id  // ✅ Obrigatório
    });
  };
}
```

---

## 📊 RESUMO EXECUTIVO

### **Estado Atual:**

| Item | Status | Observação |
|------|--------|------------|
| Frontend tem cadastro? | ❌ NÃO | Apenas placeholder |
| Backend valida bairro? | ⚠️ PARCIAL | Obrigatório mas não valida existência |
| Sistema obriga bairro? | ✅ SIM | `neighborhoodId` é required |
| Valida se bairro existe? | ❌ NÃO | Aceita qualquer string |
| Valida se está ativo? | ❌ NÃO | Não verifica `is_active` |
| Valida se tem geofence? | ❌ NÃO | Não verifica mapa oficial |
| Geolocalização automática? | ⚠️ PARCIAL | Resolve mas não persiste |
| Pode verificar em geofence? | ✅ SIM | PostGIS funciona |

### **Resposta às Perguntas:**

**1. Existe campo no frontend para alocar motorista?**
- ❌ **NÃO** - Frontend não tem tela de cadastro implementada

**2. É automático pelo sistema?**
- ⚠️ **PARCIALMENTE** - Tem endpoint de geolocalização mas não persiste automaticamente

**3. Sistema obriga anunciar bairro existente e aprovado?**
- ⚠️ **PARCIALMENTE** - Obriga enviar `neighborhoodId` mas não valida se existe/está ativo

**4. Podemos verificar depois em geofence?**
- ✅ **SIM** - Sistema tem PostGIS e resolve coordenadas para bairro

---

## 🎯 RECOMENDAÇÕES

### **Curto Prazo (Urgente):**
1. Adicionar validação de `neighborhoodId` no backend
2. Filtrar apenas bairros ativos no endpoint `/neighborhoods`
3. Documentar que frontend precisa ser implementado

### **Médio Prazo:**
4. Implementar tela de cadastro no app mobile
5. Implementar geolocalização automática com persistência
6. Adicionar indicador de "tem geofence oficial" nos bairros

### **Longo Prazo:**
7. Criar endpoint `/neighborhoods/nearby` para sugerir bairros próximos
8. Implementar fluxo de fallback para comunidades sem mapa
9. Adicionar validação de distância (motorista deve estar próximo do bairro escolhido)

---

**Conclusão:** Sistema **OBRIGA** escolher bairro no cadastro, mas **NÃO VALIDA** se bairro existe/está ativo. Frontend **NÃO ESTÁ IMPLEMENTADO**. Geolocalização **FUNCIONA** mas não persiste automaticamente.
