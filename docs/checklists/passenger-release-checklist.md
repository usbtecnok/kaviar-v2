# Passenger Release Checklist

Checklist obrigatório antes de publicar qualquer APK Passageiro.

## Build

- [ ] `APP_VARIANT=passenger`
- [ ] `GOOGLE_MAPS_API_KEY` preenchida (termina em FRwOag)
- [ ] `EXPO_PUBLIC_PLACES_KEY` preenchida (mesma key, termina em FRwOag)
- [ ] `google-services-passenger.json` configurado no `app.config.js`
- [ ] Prebuild executado com as 3 env vars acima

## Signing

- [ ] EAS keystore usado (`credentials/android/eas-keystore.jks`)
- [ ] SHA-1 do APK final: `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`
- [ ] `signingConfig signingConfigs.release` no buildType release

## APK final

- [ ] `package`: `com.kaviar.passenger`
- [ ] AndroidManifest contém `com.google.android.geo.API_KEY` com key FRwOag
- [ ] Bundle JS contém `EXPO_PUBLIC_PLACES_KEY` preenchida (não vazia)
- [ ] `APP_VARIANT` = `passenger` no `assets/app.config`
- [ ] `google_app_id` presente nos resources (Firebase/FCM)
- [ ] `apksigner verify` passa (v2 scheme)
- [ ] `versionCode` incrementado

## Google Cloud

- [ ] Key FRwOag permite package `com.kaviar.passenger`
- [ ] Key FRwOag permite SHA-1 `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`
- [ ] APIs habilitadas na key:
  - Maps SDK for Android
  - Places API
  - Geocoding API
  - Directions API

## Teste físico obrigatório

- [ ] Instalar APK limpo (desinstalar anterior se assinatura mudou)
- [ ] Login funciona
- [ ] **Mapa aparece** (tiles carregam, não fica cinza/branco)
- [ ] Solicitar corrida funciona
- [ ] Push FCM chega (app aberto, minimizado, fechado)
- [ ] Corrida completa funciona (aceite → chegada → início → fim)
- [ ] Perfil e histórico funcionam

## Erros conhecidos

| Sintoma | Causa provável |
|---------|---------------|
| Mapa não renderiza (cinza/branco) | `EXPO_PUBLIC_PLACES_KEY` vazia no build |
| Crash ao abrir mapa | `GOOGLE_MAPS_API_KEY` ausente no AndroidManifest |
| Mapa não renderiza (key correta) | SHA-1 errado (não é EAS keystore) |
| Push token falha | `google-services-passenger.json` ausente |
| "Pacote inválido" ao instalar | Assinatura v2 ausente (não usou assembleRelease) |

## Script de validação

Executar `scripts/validate/validate-passenger-apk.sh` antes de publicar.
