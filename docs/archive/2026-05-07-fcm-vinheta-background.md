# FCM Direto — Vinheta KAVIAR em Background

**Data:** 2026-05-07
**Status:** ✅ Validado em produção (controlado)

## Problema

A vinheta KAVIAR não tocava com o app motorista minimizado/background/fechado. O push Expo usava `channelId: 'rides'` com som padrão (gotícula). O `expo-notifications` `setNotificationChannelAsync` não criava canais no Xiaomi/Android 15.

## Solução

FCM direto com canal Android criado nativamente via config plugin Kotlin no `MainApplication.onCreate`.

## Commits

| Hash | Descrição |
|------|-----------|
| `cbd00d5` | feat(driver): add fcm push backend foundation |
| `3117f03` | feat(driver): collect FCM device token on go-online |
| `01db917` | fix(driver): create native Android notification channel for Kaviar sound |
| `5088c73` | feat(driver): enable controlled FCM push allowlist |

## Infraestrutura

| Recurso | Valor |
|---------|-------|
| SSM Parameter | `/kaviar/prod/FIREBASE_SERVICE_ACCOUNT` (SecureString) |
| ECS env var | `DRIVER_FCM_ALLOWLIST=driver_1773052109702_h2stisw01` |
| ECS env var | `DRIVER_PUSH_PROVIDER=expo` (default, não alterado) |
| Canal Android | `rides_kaviar_native_v1` |
| Som | `android.resource://com.kaviar.driver/raw/kaviar_ride` |
| APK motorista | v1.11.20-native-channel-kotlin |

## Fluxo

1. App motorista v1.11.20 cria canal `rides_kaviar_native_v1` nativamente no `MainApplication.onCreate`.
2. App coleta `fcm_push_token` via `getDevicePushTokenAsync` e envia ao backend.
3. Dispatcher verifica `DRIVER_FCM_ALLOWLIST`:
   - Se driver está na allowlist e tem `fcm_push_token`: envia FCM direto para `rides_kaviar_native_v1`.
   - Se FCM falhar: fallback para Expo Push (gotícula).
   - Se driver não está na allowlist: Expo Push normal.
4. Android toca vinheta KAVIAR via canal nativo com som customizado.

## Causa raiz do problema original

- `expo-notifications` `setNotificationChannelAsync` não criava canais no Xiaomi/MIUI + Android 15 (SDK 35).
- O `MainApplication` é Kotlin (`.kt`), não Java — o config plugin original procurava `super.onCreate();` com ponto-e-vírgula.
- Notificações caíam no `fcm_fallback_notification_channel` com som padrão do sistema.

## Rollback

1. Limpar `DRIVER_FCM_ALLOWLIST=` (vazio) no ECS.
2. `aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --force-new-deployment --region us-east-2`
3. Todos os motoristas voltam para Expo Push (gotícula).
4. Tempo: < 3 minutos.

## Observações

- Para trocar a vinheta no futuro, é necessário criar um **novo channelId** (Android não permite alterar som de canal existente).
- O APK v1.11.20 precisa estar instalado no motorista para o canal nativo existir.
- Motoristas com versões anteriores continuam recebendo gotícula via Expo Push.
- `DRIVER_PUSH_PROVIDER` não foi alterado — a allowlist é independente.

## Ativação global (futuro)

Para ativar FCM para todos os motoristas:
1. Publicar APK v1.11.20+ no site/Play Store.
2. Aguardar adoção.
3. Expandir `DRIVER_FCM_ALLOWLIST` com mais IDs ou setar `DRIVER_PUSH_PROVIDER=fcm`.
4. Monitorar logs `[FCM] Sent` vs `[PUSH] Expo fallback`.
