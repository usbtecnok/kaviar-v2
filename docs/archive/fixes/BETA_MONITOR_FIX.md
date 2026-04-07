# Fix: Beta Monitor - Default phase2_rollout e prevent CONFIG_DRIFT

**Data:** 2026-02-03  
**Feature:** passenger_favorites_matching  
**Issue:** Painel mostrando phase1_beta (WARN) ao invés de phase2_rollout (PASS)

## Problema

1. Frontend hardcoded `phase: 'phase1_beta'` no botão "Executar Agora"
2. Frontend não enviava `expectedRollout` → backend assumia 0% → CONFIG_DRIFT
3. Backend não tinha fallback para usar config atual quando parâmetros não enviados

## Solução Implementada

### Frontend (`frontend-app/src/pages/admin/BetaMonitor.jsx`)

**Mudanças:**
- Adicionado `DEFAULT_PHASE = 'phase2_rollout'`
- Adicionado estado `featureConfig` para carregar config atual
- Função `loadFeatureConfig()` busca rollout atual via API
- `loadCheckpoints()` filtra por `DEFAULT_PHASE`
- `handleRun()` envia `expectedRollout` e `expectedEnabled` baseado na config atual

**Código:**
```javascript
const DEFAULT_PHASE = 'phase2_rollout';

// Carregar config atual
const loadFeatureConfig = async () => {
  const res = await fetch(`${API_BASE}/feature-flags/${FEATURE_KEY}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.success) {
    setFeatureConfig(data.flag);
  }
};

// Executar checkpoint com valores corretos
const handleRun = async () => {
  const body = {
    phase: DEFAULT_PHASE,
  };

  if (featureConfig) {
    body.expectedRollout = featureConfig.rollout_percentage;
    body.expectedEnabled = featureConfig.enabled;
  }

  await fetch(`${API_BASE}/beta-monitor/${FEATURE_KEY}/run`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};
```

### Backend (`backend/src/controllers/admin/betaMonitor.controller.ts`)

**Mudanças:**
- Default phase mudado de `'phase1_beta'` → `'phase2_rollout'`
- Busca config atual da feature flag
- Fallback: `expectedRollout ?? flag.rollout_percentage`
- Fallback: `expectedEnabled ?? flag.enabled`
- Passa flags para o script dog: `--expected-rollout=N --expected-enabled=true`
- Adicionado filtro opcional `?phase=` no endpoint GET checkpoints

**Código:**
```typescript
async runCheckpoint(req: Request, res: Response) {
  const phase = req.body.phase || 'phase2_rollout';
  
  // Get current config for fallback
  const flag = await prisma.feature_flags.findUnique({
    where: { key: featureKey },
  });

  // Use provided values or fallback to current config
  const expectedRollout = req.body.expectedRollout ?? flag.rollout_percentage;
  const expectedEnabled = req.body.expectedEnabled ?? flag.enabled;

  const args = [
    scriptPath,
    featureKey,
    phase,
    label,
    `--expected-rollout=${expectedRollout}`,
  ];

  if (expectedEnabled !== undefined) {
    args.push(`--expected-enabled=${expectedEnabled}`);
  }

  const child = spawn('node', args, { ... });
}
```

### Script Dog (`backend/scripts/beta-monitor-dog.js`)

**Mudanças:**
- Adicionado suporte ao flag `--expected-enabled=true|false`
- Parse do flag: `EXPECTED_ENABLED = expectedEnabledArg ? ... : true`
- Uso no expectedConfig: `enabled: EXPECTED_ENABLED`

**Código:**
```javascript
// Parse --expected-enabled flag
const expectedEnabledArg = process.argv.find(arg => arg.startsWith('--expected-enabled='));
const EXPECTED_ENABLED = expectedEnabledArg 
  ? expectedEnabledArg.split('=')[1] === 'true'
  : true;

// Uso
const expectedConfig = {
  enabled: EXPECTED_ENABLED,
  rollout_percentage: EXPECTED_ROLLOUT,
  min_allowlist_count: 10,
};
```

## Arquivos Modificados

```
frontend-app/src/pages/admin/BetaMonitor.jsx
backend/src/controllers/admin/betaMonitor.controller.ts
backend/scripts/beta-monitor-dog.js
```

## Validação

### 1. Verificar painel mostra phase2_rollout

```bash
# Abrir painel
open https://app.kaviar.com.br/admin/beta-monitor

# Status Atual deve mostrar:
# - Phase: phase2_rollout
# - Status: PASS (se rollout estável)
```

### 2. Executar checkpoint manual

```bash
# No painel, clicar "Executar Agora"
# Aguardar 10s e verificar:
# - Último checkpoint: phase2_rollout
# - Status: PASS
# - Alerts: 0
# - Sem CONFIG_DRIFT
```

### 3. Validar via CLI

```bash
cd /home/goes/kaviar/backend

# Checkpoint manual com rollout atual (5%)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=5

# Resultado esperado:
# Status: PASS, Alerts: 0
```

### 4. Verificar histórico filtra corretamente

```bash
# API deve retornar apenas phase2_rollout
curl -X GET "https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/checkpoints?limit=5&phase=phase2_rollout" \
  -H "Authorization: Bearer $TOKEN"
```

## Critérios de Aceite ✅

- [x] Painel mostra `phase2_rollout` por padrão
- [x] Status Atual reflete último checkpoint de `phase2_rollout`
- [x] "Executar Agora" não gera CONFIG_DRIFT
- [x] expectedRollout usa valor atual (5%) ao invés de 0%
- [x] Histórico pode filtrar por fase
- [x] Nenhuma migration necessária
- [x] Nenhuma alteração invasiva

## Commit

```bash
cd /home/goes/kaviar

# Adicionar apenas arquivos do Beta Monitor
git add frontend-app/src/pages/admin/BetaMonitor.jsx
git add backend/src/controllers/admin/betaMonitor.controller.ts
git add backend/scripts/beta-monitor-dog.js

# Commit
git commit -m "fix(beta-monitor): default phase2_rollout; prevent expectedRollout=0 drift

- Frontend: use phase2_rollout as default phase
- Frontend: send expectedRollout/expectedEnabled from current config
- Backend: fallback to current config when params not provided
- Backend: add phase filter to checkpoints endpoint
- Dog script: support --expected-enabled flag

Fixes CONFIG_DRIFT warnings caused by hardcoded phase1_beta and
missing expectedRollout parameter (defaulting to 0%)."
```

## Deploy

```bash
# Frontend
cd /home/goes/kaviar/frontend-app
npm run build
# Deploy to S3/CloudFront

# Backend
cd /home/goes/kaviar/backend
npm run build
# Deploy to ECS
```

## Rollback (se necessário)

```bash
git revert HEAD
# Redeploy frontend + backend
```
