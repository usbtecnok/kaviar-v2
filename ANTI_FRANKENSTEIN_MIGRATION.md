# 🛡️ Sistema Anti-Frankenstein - Guia de Migração

## ✅ O que foi implementado

### 1. API Client Único (`src/lib/apiClient.ts`)
- ✅ Normaliza paths (garante `/api` no início)
- ✅ Injeta token automaticamente
- ✅ Anti-cache (`Cache-Control: no-store`)
- ✅ Log padronizado de erros
- ✅ Métodos: `get()`, `post()`, `put()`, `delete()`, `patch()`

### 2. Health Probe (`src/components/HealthProbe.tsx`)
- ✅ Valida `/api/health` ao carregar admin
- ✅ Banner de erro se API config inválida
- ✅ Detecta 404 (path errado) vs erro de rede

### 3. Backend Anti-Cache
- ✅ Headers `Cache-Control: no-store` em `/api/governance/neighborhoods`

### 4. Smoke Tests CI/CD (`scripts/smoke-tests.sh`)
- ✅ Test A: `/api/health` → 200
- ✅ Test B: `/api/governance/neighborhoods` sem token → 401
- ✅ Test C: com token válido → 200 (requer CI_ADMIN_TOKEN)

### 5. GitHub Actions Workflow
- ✅ Build → Deploy S3 → Invalidate CloudFront → Smoke Tests
- ✅ Bloqueia deploy se smoke tests falharem

---

## 📋 Rotas já migradas para apiClient

- ✅ `NeighborhoodsManagement.jsx`
- ✅ `NeighborhoodsByCity.jsx`

---

## 🔄 Como migrar outras rotas

### Antes (fetch direto):
```jsx
import { API_BASE_URL } from '../../config/api';

const token = localStorage.getItem('kaviar_admin_token');
const response = await fetch(`${API_BASE_URL}/api/admin/drivers`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### Depois (apiClient):
```jsx
import { apiClient } from '../../lib/apiClient';

const { data } = await apiClient.get('/api/admin/drivers');
```

### POST com body:
```jsx
// Antes
const response = await fetch(`${API_BASE_URL}/api/admin/drivers`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'João', email: 'joao@example.com' })
});

// Depois
const { data } = await apiClient.post('/api/admin/drivers', {
  name: 'João',
  email: 'joao@example.com'
});
```

### Tratamento de erro:
```jsx
try {
  const { data } = await apiClient.get('/api/admin/drivers');
  setDrivers(data.data);
} catch (error) {
  console.error('Erro:', error.message);
  setError(error.message);
  
  // Se 401, redirecionar para login
  if (error.status === 401) {
    navigate('/admin/login');
  }
}
```

---

## 🎯 Próximas rotas a migrar (prioridade)

### Alta prioridade (rotas críticas):
- [ ] `DriversManagement.jsx` (3 chamadas)
- [ ] `CommunitiesManagement.jsx` (5 chamadas)
- [ ] `GeofenceManagement.jsx` (5 chamadas)
- [ ] `AdminApp.jsx` (dashboard - 3 chamadas)

### Média prioridade:
- [ ] `GuidesManagement.jsx` (2 chamadas)
- [ ] `PassengersManagement.jsx` (1 chamada)
- [ ] `FeatureFlags.jsx` (5 chamadas)
- [ ] `MatchMonitor.jsx` (4 chamadas)

### Baixa prioridade:
- [ ] Rides (RideDetail, RideList, RideAudit)
- [ ] Premium Tourism (TourPackages, TourBookings, etc)
- [ ] Compliance

---

## 🔍 Como encontrar chamadas fetch/axios

```bash
# Buscar fetch direto
grep -r "fetch(" frontend-app/src/pages/admin/ --include="*.jsx" --include="*.tsx"

# Buscar axios direto
grep -r "axios\." frontend-app/src/pages/admin/ --include="*.jsx" --include="*.tsx"

# Buscar API_BASE_URL (indicador de fetch manual)
grep -r "API_BASE_URL" frontend-app/src/pages/admin/ --include="*.jsx" --include="*.tsx"
```

---

## 🧪 Como testar após migração

1. **Build local:**
   ```bash
   cd frontend-app
   npm run build
   ```

2. **Smoke tests:**
   ```bash
   ./scripts/smoke-tests.sh
   ```

3. **Testar no browser:**
   - Abrir DevTools → Network
   - Navegar para a rota migrada
   - Verificar:
     - ✅ Request tem header `Authorization: Bearer ...`
     - ✅ Request tem header `Cache-Control: no-store`
     - ✅ Status 200 (ou 401 se não logado)
     - ✅ Sem 304 (cache)

---

## 📦 Configuração CI_ADMIN_TOKEN

Para habilitar Test C nos smoke tests:

1. **Criar service account admin:**
   ```bash
   # No backend
   node backend/scripts/create-ci-admin.js
   # Output: CI_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Adicionar no GitHub Secrets:**
   - Ir em: Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `CI_ADMIN_TOKEN`
   - Value: (token gerado acima)

3. **Rotacionar periodicamente:**
   - Recomendado: a cada 90 dias
   - Usar token com role `OPERATOR` (não SUPER_ADMIN)

---

## 🚨 Regras de Ouro

1. **NUNCA** fazer `fetch()` ou `axios.` direto fora do apiClient
2. **SEMPRE** usar paths começando com `/api`
3. **SEMPRE** rodar smoke tests antes de merge
4. **NUNCA** commitar tokens no código
5. **SEMPRE** validar no DevTools após deploy

---

## 📊 Métricas de Sucesso

- [ ] 0 chamadas fetch/axios fora do apiClient
- [ ] 100% das rotas admin usando apiClient
- [ ] Smoke tests passando em 100% dos deploys
- [ ] 0 incidentes de "endpoint não encontrado" em 30 dias

---

**Status atual:** 2/43 rotas migradas (5%)  
**Meta:** 100% até 2026-02-14
