# Fechamento Operacional - Regularizacao Municipal (Santa Rita)

Data da ativacao: 2026-07-09

## Estado Atual
- Servico ECS: `kaviar-backend-service` em `kaviar-cluster`.
- Task definition ativa: `kaviar-backend:687`.
- Flag ativa no container `kaviar-backend`: `ENABLE_MUNICIPAL_REGULATORY_GATE=true`.
- Estabilidade: deployment com rollout `COMPLETED`, `runningCount=1`, `pendingCount=0`.
- Health checks:
  - `GET /api/health` => `status: ok`.
  - `GET /api/health/ready` => `status: healthy`, checks `database=true` e `s3=true`.

## Smoke Final Curto (A/B/C)
Validacao executada com motoristas de teste, sem dependencia de motorista real aprovado em Santa Rita.

- Cenario A (cidade sem regra municipal): deve liberar.
  - Resultado: liberado (sem erro de availability).
- Cenario B (Santa Rita/CAR sem aprovacao): deve bloquear por `MUNICIPAL_AUTH_REQUIRED`.
  - Resultado: bloqueado conforme esperado.
- Cenario C (Santa Rita/CAR aprovado): deve liberar.
  - Resultado: liberado; `operationGate.allowed=true`; sem `MUNICIPAL_LOCATION_REQUIRED`.

Checks complementares confirmados:
- B e C com `neighborhood_id` preenchido.
- B com `authorization.status=WAITING_CITY_HALL_REVIEW` e gate `false`.
- C com `authorization.status=APPROVED_BY_CITY_HALL` e gate `true`.

## Rollback Preparado (Nao Executado)
- Ponteiro de rollback: `/tmp/kaviar-prev-taskdef-municipal-gate.txt` => `kaviar-backend:686`.
- Confirmacao: task `686` sem `ENABLE_MUNICIPAL_REGULATORY_GATE`.

Comando de rollback pronto (nao executar sem decisao explicita):

```bash
AWS_REGION=us-east-2
CLUSTER=kaviar-cluster
SERVICE=kaviar-backend-service
PREV_TD=$(cat /tmp/kaviar-prev-taskdef-municipal-gate.txt)
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$PREV_TD" \
  --force-new-deployment \
  --region "$AWS_REGION"
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$AWS_REGION"
```

## Riscos Conhecidos
- Ainda nao existe motorista real aprovado em Santa Rita em operacao real.
- A validacao desta fase foi feita com motoristas TESTE (A/B/C) e cobre comportamento funcional esperado de gate/regra.
- Mudancas de politica municipal futura podem exigir novo smoke e eventual ajuste de regra.

## Decisao de Fechamento
- Gate municipal permanece ativo.
- Sem rollback nesta fase.
- Validacao com motoristas TESTE considerada suficiente para seguir o avanco.
