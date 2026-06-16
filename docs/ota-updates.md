# Expo Updates / EAS Update — Kaviar Motorista

## Visão Geral

OTA (Over-The-Air) permite atualizar JavaScript e assets do app sem gerar novo APK.

**IMPORTANTE:** Apenas APKs gerados DEPOIS desta configuração recebem OTA.
O APK v1.12.0-parceiro-premium publicado anteriormente NÃO recebe updates OTA.

## Canais

| Canal | Profile(s) | Uso |
|-------|-----------|-----|
| `driver-production` | driver-apk, driver-release | APK distribuído aos motoristas |
| `driver-preview` | driver-preview | Testar OTA antes de promover |
| `passenger-production` | passenger-apk, passenger-release | APK passageiro |

## Comandos

### 1. Gerar APK com OTA embutido (EAS Build)

```bash
# APK motorista (produção) — recebe OTA do canal driver-production
eas build --profile driver-apk --platform android

# APK motorista (preview) — recebe OTA do canal driver-preview
eas build --profile driver-preview --platform android
```

### 2. Publicar update OTA (produção)

```bash
# Publica JS bundle para todos os APKs no canal driver-production
APP_VARIANT=driver eas update --channel driver-production --message "descrição da mudança"
```

### 3. Publicar update em preview (testar antes)

```bash
# Publica para o canal preview (só APKs gerados com profile driver-preview)
APP_VARIANT=driver eas update --channel driver-preview --message "teste: descrição"
```

### 4. Promover update de preview para production

```bash
# Depois de validar no preview, republica no canal production
APP_VARIANT=driver eas update --channel driver-production --message "promovido de preview: descrição"
```

Alternativamente, via branch (se usar branches EAS):
```bash
eas channel:edit driver-production --branch <branch-name>
```

## Runtime Version

Usa policy `appVersion` — o runtimeVersion é derivado da `version` no app.config.js.

**Quando bumpar a version:** Sempre que alterar código nativo (novo plugin, nova permissão, SDK upgrade).
**Quando NÃO bumpar:** Mudanças apenas em JS/TS/assets — essas vão via OTA.

## Fluxo Recomendado

1. Gerar APK com `eas build --profile driver-apk`
2. Instalar e validar no celular
3. Distribuir APK (site, WhatsApp, etc.)
4. Para futuras correções JS:
   - Publicar em preview: `APP_VARIANT=driver eas update --channel driver-preview`
   - Testar no APK preview
   - Publicar em production: `APP_VARIANT=driver eas update --channel driver-production`
5. O APK dos motoristas baixa o update automaticamente no próximo lançamento

## Build Local (sem EAS Build)

Para builds locais com `npx expo run:android`, o OTA **não** funciona por padrão
porque não há channel embutido. Use EAS Build para APKs com suporte OTA.
