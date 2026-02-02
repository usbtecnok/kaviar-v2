# ROLLOUT 1% - DEPLOYED
**Data:** 2026-02-02 07:51 BRT  
**Feature:** passenger_favorites_matching  
**Status:** ✅ ATIVO

## Execução

```bash
# Update rollout
node dist/scripts/update-rollout.js passenger_favorites_matching 1

# Resultado
Before: enabled=true, rollout=0%
After: enabled=true, rollout=1%
```

## Validação

```
Config: enabled=true, rollout=1%, allowlist=12
Determinism: PASS
Expected: rollout=1%, enabled=true
Status: PASS, Alerts: 0
```

## Correções Aplicadas

1. ✅ Allowlist: 12 passengers (incluindo IDs de teste)
2. ✅ Feature flag: enabled=true
3. ✅ Determinism: PASS

## Próximo Passo

Após 2h de monitoramento estável → Avançar para 5%

```bash
node dist/scripts/update-rollout.js passenger_favorites_matching 5
```
