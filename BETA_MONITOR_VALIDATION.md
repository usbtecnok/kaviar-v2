# VALIDAÇÃO - Beta Monitor Fix

## Comandos de Validação

### 1. Build e Deploy Backend

```bash
cd /home/goes/kaviar/backend

# Build
npm run build

# Verificar que script foi copiado
ls -la dist/scripts/beta-monitor-dog.js

# Deploy (ECS)
# ... seu processo de deploy
```

### 2. Build e Deploy Frontend

```bash
cd /home/goes/kaviar/frontend-app

# Build
npm run build

# Deploy (S3/CloudFront)
# ... seu processo de deploy
```

### 3. Teste Local (Backend)

```bash
cd /home/goes/kaviar/backend

# Teste 1: Checkpoint manual com rollout atual (5%)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=5

# Resultado esperado:
# Config: enabled=true, rollout=5%, allowlist=12
# Expected config: rollout=5%, enabled=true
# Status: PASS, Alerts: 0

# Teste 2: Com enabled=false (simular)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=5 --expected-enabled=false

# Resultado esperado:
# Alert: CONFIG_DRIFT → "enabled=true, expected=false", severity WARN
# Status: WARN, Alerts: 1
```

### 4. Teste API (Backend)

```bash
# Obter token admin
TOKEN="seu_token_aqui"

# Teste 1: Listar checkpoints de phase2_rollout
curl -X GET "https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/checkpoints?limit=5&phase=phase2_rollout" \
  -H "Authorization: Bearer $TOKEN" | jq '.checkpoints[] | {phase, status, created_at}'

# Resultado esperado: apenas checkpoints de phase2_rollout

# Teste 2: Executar checkpoint (com fallback automático)
curl -X POST "https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "phase2_rollout"
  }'

# Resultado esperado:
# {"success": true, "message": "Checkpoint iniciado", "label": "manual-run-..."}

# Aguardar 10s e verificar último checkpoint
curl -X GET "https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/checkpoints?limit=1&phase=phase2_rollout" \
  -H "Authorization: Bearer $TOKEN" | jq '.checkpoints[0] | {status, phase, alerts_json}'

# Resultado esperado:
# status: "PASS"
# phase: "phase2_rollout"
# alerts_json: []
```

### 5. Teste Frontend (Painel)

```bash
# Abrir painel
open https://app.kaviar.com.br/admin/beta-monitor
```

**Checklist:**
- [ ] Status Atual mostra `Phase: phase2_rollout`
- [ ] Status Atual mostra último checkpoint de phase2_rollout (não phase1_beta)
- [ ] Se rollout estável, Status = PASS (verde)
- [ ] Histórico mostra checkpoints de phase2_rollout
- [ ] Clicar "Executar Agora" → aguardar 10s → novo checkpoint PASS
- [ ] Novo checkpoint não tem alert CONFIG_DRIFT
- [ ] Novo checkpoint tem `rollout=5%` (ou valor atual) no config

### 6. Validação de Regressão

```bash
# Garantir que phase1_beta ainda funciona (se necessário)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase1_beta manual --expected-rollout=0

# Resultado esperado:
# Status: PASS ou WARN (dependendo da config)
# Sem erros de execução
```

## Checklist Final

### Funcional
- [ ] Painel mostra phase2_rollout por padrão
- [ ] "Executar Agora" não gera CONFIG_DRIFT falso
- [ ] expectedRollout usa valor atual (não 0%)
- [ ] Histórico filtra por fase corretamente

### Técnico
- [ ] Build backend OK
- [ ] Build frontend OK
- [ ] Testes CLI passam
- [ ] Testes API passam
- [ ] Sem erros no console do navegador
- [ ] Sem erros nos logs do backend

### Documentação
- [ ] BETA_MONITOR_FIX.md criado
- [ ] Commit com mensagem descritiva
- [ ] Git diff revisado

## Rollback (se necessário)

```bash
cd /home/goes/kaviar

# Reverter commit
git revert HEAD

# Rebuild e redeploy
cd backend && npm run build
cd ../frontend-app && npm run build

# Redeploy ambos
```

## Próximos Passos

Após validação bem-sucedida:

1. Continuar monitoramento do rollout 5%
2. Aguardar 2h de estabilidade
3. Avançar para 10% quando critérios atendidos:
   ```bash
   cd /home/goes/kaviar/backend
   ./next-rollout.sh
   ```
