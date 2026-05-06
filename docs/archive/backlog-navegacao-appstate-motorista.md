# Backlog: Correção de navegação/AppState em background no app Motorista

**Status:** backlog — não implementar agora  
**Registrado em:** 2026-05-06  
**Contexto:** problema pré-existente desde v1.11.2, identificado durante teste da v1.11.5

## Problema

Quando o app motorista vai para background e volta durante/após aceitar corrida, a tela pode piscar (loop de navegação).

## Causa raiz

1. `handleAcceptOffer` usa `router.push` (não `replace`) → `online.tsx` permanece montada na stack
2. AppState handler em `online.tsx` não verifica se a tela está focada
3. `checkCurrentRide()` no AppState detecta corrida ativa → `router.replace('complete-ride')` conflita com `complete-ride` já visível

## Correção proposta (quando autorizado)

- Adicionar `isFocusedRef` via `useFocusEffect`
- AppState handler: só agir se `isFocusedRef.current === true`
- Ao ganhar foco: reiniciar polling se online e sem pendingOffer

## Impacto atual

- Baixo: motoristas raramente colocam app em background entre receber oferta e aceitar
- Fluxo normal (sem background) funciona corretamente em v1.11.2 e v1.11.5
- Não afeta passageiro, backend, créditos ou Asaas
