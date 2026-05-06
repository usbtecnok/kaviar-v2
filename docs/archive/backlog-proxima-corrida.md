# Backlog: Próxima Corrida / Oferta Antecipada

**Status:** backlog futuro — não implementar agora  
**Registrado em:** 2026-05-06  
**Contexto:** diagnóstico do alerta sonoro revelou que não existe lógica de "próxima corrida" e não deve ser misturada com pendingOffer comum.

## Ideia

Permitir que o motorista receba uma próxima corrida quando estiver perto de finalizar a corrida atual, sem misturar com pendingOffer comum.

## Regras futuras a estudar

1. Só permitir se a corrida atual estiver em `in_progress`.
2. Só permitir se o motorista estiver perto do destino final.
3. Só permitir se faltar pouco tempo ou pouca distância para encerrar.
4. A origem da próxima corrida precisa estar próxima do destino atual.
5. A próxima corrida deve ser tratada como `nextRide`, não como `currentRide`.
6. O app deve mostrar claramente: "Próxima corrida após finalizar a atual".
7. O motorista não pode iniciar a próxima corrida antes de completar a atual.
8. O passageiro da próxima corrida precisa saber que o motorista está finalizando outra corrida.
9. O alerta sonoro dessa próxima corrida deve ser diferente ou mais discreto.
10. O backend deve ter proteção própria para não confundir `currentRide`, `pendingOffer` e `nextRide`.

## Proteção atual (sem esta frente)

- `acceptOfferInternal()` seta `availability='busy'`
- Dispatcher busca apenas `availability='online'`
- App desmonta `online.tsx` ao aceitar corrida
- Motorista com corrida ativa não recebe oferta comum nem alerta sonoro

## Risco residual documentado

- `GET /api/v2/drivers/me/offers` não verifica `currentRide` diretamente
- Se `availability` ficar dessincronizado (bug/crash/stale-cleanup), cenário teórico de oferta indevida existe
- Mitigação futura: adicionar guard no endpoint ou no dispatcher verificando `rides_v2`
