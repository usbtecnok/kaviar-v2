# Backlog Técnico: Vinheta KAVIAR em Push/Background Android

**Status:** pendente — investigação futura  
**Registrado em:** 2026-05-07  
**Última tentativa:** v1.11.10 a v1.11.15 (todas falharam)

## Objetivo

Fazer a notificação push de nova corrida tocar a vinheta `kaviar_ride.wav` quando o app motorista estiver minimizado, em background ou fechado.

## Estado atual (operacional)

- **Foreground (app aberto):** vinheta KAVIAR toca via `expo-av` ✅
- **Background (app minimizado):** push chega com som padrão do sistema (gotícula) ✅
- **Versão publicada:** v1.11.9 no site

## O que foi tentado e falhou

| Versão | Abordagem | Resultado |
|--------|-----------|-----------|
| v1.11.9 | `setNotificationChannelAsync` com `sound: 'kaviar_ride.wav'` no module scope | Canal criado com som padrão |
| v1.11.10 | Novo canal `rides_kaviar_v2` | Mesmo resultado |
| v1.11.11 | Canal criado dentro do `useEffect` (após mount) | Mesmo resultado |
| v1.11.12 | `keep.xml` + `android.enableResourceOptimizations=false` | Arquivo preservado em `res/raw/` mas som não resolvido |
| v1.11.13 | Canal `rides_kaviar_v4` em top-level + deletar antigos | Mesmo resultado |
| v1.11.14 | Hijack do canal fallback `expo_notifications_fallback_notification_channel` | Mesmo resultado |
| v1.11.15 | Config plugin nativo `MainApplication.onCreate()` com URI direta | **Quebrou notificações completamente** |

## Causa raiz identificada

1. O `SoundResolver` do expo-notifications chama `getResources().getIdentifier("kaviar_ride", "raw", packageName)` e retorna **0** em runtime, apesar do arquivo estar em `res/raw/kaviar_ride.wav` no APK.

2. O Android não lista `kaviar_ride` como som disponível nas configurações do canal.

3. Quando o canal é criado com som que não resolve, o Android usa `DEFAULT_NOTIFICATION_URI` (gotícula) e o canal fica **imutável** com esse som.

4. A tentativa nativa (URI direta `android.resource://com.kaviar.driver/raw/kaviar_ride`) quebrou completamente o recebimento de notificações.

## Hipóteses para investigação futura

1. **Formato do arquivo:** testar `.ogg` (formato nativo Android para sons de notificação) em vez de `.wav`
2. **FCM direto:** enviar via FCM HTTP v1 API com controle total do payload `android.notification.channel_id` e `android.notification.sound`
3. **react-native-notifee:** biblioteca alternativa com controle total sobre canais e sons
4. **Projeto limpo:** testar em projeto Expo novo/mínimo para isolar se é bug do expo-notifications ou do projeto
5. **Resource ID:** investigar por que `getIdentifier()` retorna 0 — pode ser conflito de package ou R.java não gerado corretamente
6. **adb logcat:** capturar logs nativos durante criação do canal para ver erro exato

## Arquivos relevantes

- `assets/sounds/kaviar_ride.wav` — vinheta (3s, WAV PCM 16-bit mono 44100Hz)
- `app/(driver)/online.tsx` — usa `Audio.Sound.createAsync(require('...kaviar_ride.wav'))` para foreground
- `app/_layout.tsx` — cria canais de notificação
- `backend/src/services/push.service.ts` — envia push via Expo Push API

## Restrições

- Não migrar todo o push para FCM direto sem análise de impacto
- Não usar `withMainApplication` config plugin (quebrou notificações)
- Não alterar passageiro, dispatch, corrida, créditos ou admin
- Qualquer nova tentativa deve ser testada em APK de teste antes de publicar
