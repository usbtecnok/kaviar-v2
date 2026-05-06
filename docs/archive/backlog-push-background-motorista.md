# Backlog: Push/Background de nova corrida para motorista

**Status:** backlog futuro — não implementar agora  
**Registrado em:** 2026-05-06  
**Contexto:** teste da v1.11.7 confirmou que notificação push de nova corrida não chega quando app está em background.

## Problema

Quando o motorista está com o app em background (minimizado ou tela desligada), ele não recebe notificação visível de nova corrida disponível.

## Situação atual

- O backend (`dispatcher.service.ts`) chama `sendPushToDriver()` ao criar oferta
- O push token é registrado no `handleGoOnline`
- O `NotificationHandler` está configurado com `shouldShowAlert: true`
- O polling de `/me/offers` só funciona em foreground (ou com background location ativo)

## Investigar

1. O push está sendo enviado pelo backend? (verificar logs `[PUSH]`)
2. O token Expo está válido e atualizado?
3. O push chega ao dispositivo mas não mostra notificação?
4. O canal de notificação Android está configurado corretamente?
5. O app está sendo morto pelo SO (battery optimization)?
6. O `shouldShowAlert: true` funciona quando app está em background?

## Regras futuras

- Push deve mostrar banner visível no celular mesmo com app fechado
- Ao tocar na notificação, deve abrir o app na tela de oferta
- Não depender apenas de polling para receber corridas
- Considerar WebSocket/SSE como alternativa ao polling para real-time
