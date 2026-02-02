# MONITORAMENTO ATIVO - passenger_favorites_matching

## Status Atual
- ✅ Rollout: 1%
- ✅ Enabled: true
- ✅ Allowlist: 12 passengers
- ✅ Últimos checkpoints: PASS

## Ferramentas Criadas

### 1. Dashboard de Status
```bash
cd /home/goes/kaviar/backend
node scripts/rollout-status.js
```

### 2. Monitor Contínuo (15min)
```bash
cd /home/goes/kaviar/backend
./scripts/monitor-loop.sh
```
- Roda a cada 15min
- Rollback automático se FAIL

### 3. Rollback Imediato
```bash
cd /home/goes/kaviar/backend
cat ROLLBACK.md
```

### 4. Próximo Rollout (5%)
```bash
cd /home/goes/kaviar/backend
./next-rollout.sh
```

## Timeline

| Horário | Ação |
|---------|------|
| 07:51 | ✅ Rollout 1% deployed |
| 09:51 | Avaliar avanço para 5% |

## Critérios para 5%

- ✅ Mínimo 2 checkpoints PASS
- ✅ Zero FAIL
- ✅ Determinism PASS
- ✅ 5xx rate = 0%

## Comandos Rápidos

```bash
# Status
node scripts/rollout-status.js

# Checkpoint manual
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=1

# Avançar para 5%
./next-rollout.sh

# Rollback
node dist/scripts/update-rollout.js passenger_favorites_matching 0
```
