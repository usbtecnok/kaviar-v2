# Plano de contingência — bloqueio/queda do Expo

Gerado 2026-05-11. Baseado na configuração real do projeto nessa data.

## TL;DR — o que acontece se o Expo cair/bloquear?

| O que | Impacto |
|-------|---------|
| Backend, RDS, frontend admin | Zero — rodam na AWS, independentes do Expo |
| APKs já instalados nos celulares | Zero — continuam funcionando |
| Push notifications para drivers | **Degrada** (default é Expo Push Service). Mitigação: flipar env var pra FCM. |
| Gerar novo APK/AAB | Bloqueado no EAS Build. Mitigação: build local via Gradle. |
| Submit para Play Store | Bloqueado no EAS Submit. Mitigação: upload manual pelo Console. |
| OTA updates | Não aplicável — projeto não usa `expo-updates`. |

**Sistema Kaviar não trava. Nenhuma corrida em andamento ou futura depende do Expo.**

---

## Estado atual (referência rápida)

**Push providers configurados:**
- Default (`DRIVER_PUSH_PROVIDER` não setado) → Expo Push Service (`exp.host`).
- Fallback automático já implementado em `backend/src/services/dispatcher.service.ts` linhas ~481-500: se FCM falha, tenta Expo, e vice-versa.
- Allowlist atual (usa FCM): `DRIVER_FCM_ALLOWLIST=driver_1773052109702_h2stisw01`.

**Backend já tem tudo pronto pra FCM:**
- `FIREBASE_SERVICE_ACCOUNT` no SSM (`/kaviar/prod/FIREBASE_SERVICE_ACCOUN`).
- `backend/src/services/fcm-push.service.ts` usando `firebase-admin`.
- Coluna `drivers.fcm_push_token` existe no schema.
- Driver app (`app/(driver)/online.tsx`) já captura FCM token via `getDevicePushTokenAsync()` e envia pro backend via `POST /drivers/token`.

**Build nativo:**
- Keystore Android em `credentials/android/keystore.jks` (senhas em `credentials.json` — tratar como secret).
- Firebase config em `google-services.json`.
- `app.config.js` já faz prebuild Android com `withDangerousMod` (injeta `sdk.dir` e notification channels).

---

## Cenário 1 — Bloqueio total da conta Expo (pior caso)

### Ação imediata (< 5 min): flipar push pra FCM

Todos os drivers que já abriram a v1.11.x no app registraram FCM token. Pra forçar FCM em todos:

```bash
# 1. Ver task definition atual
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].taskDefinition' --output text
# Guarda o ARN retornado: arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:NN

# 2. Baixar a task def atual como JSON base
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinition' > /tmp/taskdef-current.json

# 3. Preparar nova revisão: adicionar/alterar DRIVER_PUSH_PROVIDER=fcm
# Remover campos read-only antes de registrar
jq '. | {
  family, taskRoleArn, executionRoleArn, networkMode, cpu, memory,
  requiresCompatibilities, containerDefinitions, volumes, placementConstraints,
  runtimePlatform
} | .containerDefinitions[0].environment |= (
  map(select(.name != "DRIVER_PUSH_PROVIDER")) +
  [{"name": "DRIVER_PUSH_PROVIDER", "value": "fcm"}]
)' /tmp/taskdef-current.json > /tmp/taskdef-new.json

# 4. Registrar nova revisão
aws ecs register-task-definition \
  --region us-east-2 \
  --cli-input-json file:///tmp/taskdef-new.json

# 5. Atualizar service pra usar a nova revisão (ele pega a :LATEST do family)
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --region us-east-2 \
  --force-new-deployment
```

**Validação:**
- Monitorar CloudWatch Logs do service. Buscar por `[FCM] Sent to driver` e `[FCM] Failed`.
- Se ver muito `No FCM token for driver X, skipping` → significa que o driver X não abriu a v1.11+ ainda; ele continua recebendo push via fallback automático (Expo). Se Expo estiver bloqueado de verdade, esse driver fica sem push até reabrir o app.

### Rollback rápido (< 1 min)

Se a troca der problema:
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --region us-east-2 \
  --task-definition kaviar-backend:<revisão-anterior> \
  --force-new-deployment
```

### Alternativa sem redeploy: ampliar allowlist

Se quiser migrar por etapas sem mudar o default:
```bash
# Pega lista de drivers com fcm_push_token
psql $DATABASE_URL -t -c "SELECT string_agg(id, ',') FROM drivers WHERE fcm_push_token IS NOT NULL;"

# Cola o resultado em DRIVER_FCM_ALLOWLIST na task def (mesmo procedimento de cima)
```

---

## Cenário 2 — Só EAS Build bloqueado (preciso gerar novo APK)

### Opção A — Build local com Gradle (recomendado)

Pré-requisitos no host local:
- Android SDK (`ANDROID_HOME`).
- JDK 17 (`JAVA_HOME`).
- Node 20 (`nvm use`).

```bash
cd /home/goes/kaviar

# 1. Prebuild (gera /android/ com tudo incluindo plugins do app.config.js)
# ATENÇÃO: isso limpa /android/ existente. Commitar antes se tiver mods manuais.
APP_VARIANT=driver npx expo prebuild --platform android --clean

# 2. Copiar o keystore e o google-services.json pros lugares certos
cp google-services.json android/app/google-services.json

# 3. Configurar assinatura em android/gradle.properties
cat >> android/gradle.properties <<EOF
KAVIAR_UPLOAD_STORE_FILE=../../credentials/android/keystore.jks
KAVIAR_UPLOAD_KEY_ALIAS=bb27c6890131f10860a80de587228c30
KAVIAR_UPLOAD_STORE_PASSWORD=88ee8d089a82651a86d216624d95b418
KAVIAR_UPLOAD_KEY_PASSWORD=79fb6abfc00b9f9716d90c7d728267a4
EOF

# 4. Editar android/app/build.gradle — adicionar signingConfig no buildTypes.release:
#   signingConfigs {
#     release {
#       storeFile file(KAVIAR_UPLOAD_STORE_FILE)
#       storePassword KAVIAR_UPLOAD_STORE_PASSWORD
#       keyAlias KAVIAR_UPLOAD_KEY_ALIAS
#       keyPassword KAVIAR_UPLOAD_KEY_PASSWORD
#     }
#   }
#   buildTypes { release { signingConfig signingConfigs.release ... } }

# 5. Build APK release assinado
cd android
./gradlew assembleRelease
# → APK em android/app/build/outputs/apk/release/app-release.apk

# 6. Para AAB (Play Store): ./gradlew bundleRelease
# → AAB em android/app/build/outputs/bundle/release/app-release.aab
```

Repetir com `APP_VARIANT=passenger` pra gerar o app do passageiro.

**⚠️ Segredos**: as senhas do keystore estão em `credentials.json` (já rastreado no git — considerar migrar pra AWS Secrets Manager ou SSM num momento oportuno).

### Opção B — Docker build local (reprodutível, sem instalar SDK no host)

Se o host não tiver Android SDK/JDK, usar imagem `reactnativecommunity/react-native-android`:

```bash
docker run --rm -v $PWD:/app -w /app \
  -e APP_VARIANT=driver \
  reactnativecommunity/react-native-android:latest \
  bash -c "npm ci && npx expo prebuild --platform android --clean && cd android && ./gradlew assembleRelease"
```

(Ajustar tag da imagem conforme versão do RN 0.81.)

---

## Cenário 3 — EAS Submit bloqueado (não consigo publicar na Play Store)

Upload manual:

1. Build gerou `app-release.aab` (via EAS ou local).
2. [Google Play Console](https://play.google.com/console) → app Kaviar → **Produção** ou **Teste interno** → **Criar nova versão**.
3. Upload do AAB. Preencher changelog. Revisar. Publicar.
4. Service account `play-store-key.json` usado pelo EAS Submit → pode reutilizar o mesmo via `gcloud` ou `fastlane supply` se quiser automatizar:
   ```bash
   bundle exec fastlane supply \
     --aab app-release.aab \
     --json_key play-store-key.json \
     --package_name com.kaviar.driver \
     --track internal
   ```

---

## Validação pós-contingência

Checklist rápido depois de qualquer mudança:

- [ ] CloudWatch Logs sem spike de erros `[PUSH]` ou `[FCM]`.
- [ ] Testar com driver real em ambiente de staging (ou o do `DRIVER_FCM_ALLOWLIST`): criar corrida e conferir se notificação chegou com o som `kaviar_ride` no canal `rides_kaviar_native_v1`.
- [ ] Se gerou APK local: instalar em device teste, abrir, logar, verificar que o token FCM foi enviado ao backend (`POST /drivers/token` 200).
- [ ] Se subiu versão nova Play Store: aguardar 1-2h, instalar via Play, testar fluxo de corrida completo.

---

## Nota sobre Expo Push Service ≠ EAS Build

Billing e TOS do Expo tratam como produtos separados:
- **EAS Build/Submit** — billing por build, plano mensal. Bloqueio por inadimplência afeta APENAS builds.
- **Expo Push Service** (`exp.host/--/api/v2/push/send`) — gratuito, sem SLA garantido, mas raramente afetado por billing da conta EAS.

Na prática, é muito improvável que ambos caiam ao mesmo tempo por motivo de pagamento. Mas a mitigação pra push (fipar pra FCM) é barata e deve ser testada periodicamente mesmo sem crise.

---

## Teste de fogo recomendado (fazer agora, sem pressão)

Antes que aconteça qualquer problema, rodar um drill:

1. Setar `DRIVER_FCM_ALLOWLIST` com 3-5 drivers reais por 24h.
2. Monitorar logs.
3. Se passar limpo, documentar que o switch pra FCM está validado.
4. Reverter ou manter, à escolha.

Isso transforma a contingência em procedimento testado em vez de plano teórico.
