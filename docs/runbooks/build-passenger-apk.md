# Build APK Passageiro — Checklist Obrigatório

## Mapa do Passageiro não aparece — checklist obrigatório

### Problema observado

Em builds recentes do Passageiro, o app instalava normalmente, login funcionava, corrida funcionava e push FCM funcionava, mas o mapa não aparecia/renderizava.

### Diagnóstico feito

1. Confirmamos que o APK tinha a Google Maps key no AndroidManifest.
2. Confirmamos package correto: `com.kaviar.passenger`.
3. Confirmamos SHA-1 correto do EAS keystore:
   `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`
4. Confirmamos que a key no Google Cloud tinha as APIs necessárias:
   - Maps SDK for Android
   - Places API
   - Geocoding API
   - Directions API
5. Mesmo assim, o mapa não aparecia.
6. A comparação com o APK v1.12.1, que funcionava, mostrou que o build bom tinha:
   `EXPO_PUBLIC_PLACES_KEY` preenchida
   e o build ruim estava com:
   `EXPO_PUBLIC_PLACES_KEY` vazio.

### Causa confirmada

O bundle JS do app Passageiro depende de `EXPO_PUBLIC_PLACES_KEY` preenchida para lógica relacionada a mapa/Places/renderização. Portanto, não basta apenas `GOOGLE_MAPS_API_KEY` estar no AndroidManifest.

### Regra obrigatória para builds do Passageiro

Nunca gerar APK do Passageiro sem estas variáveis preenchidas:

- `GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_PLACES_KEY`

 Ambas devem usar a key Android correta do Google Maps/Places.
 Nunca registrar valor real de key em documentação versionada.

### Resolução

O APK v1.12.11-map-env-fix resolveu o problema porque voltou a preencher `EXPO_PUBLIC_PLACES_KEY`, mantendo o mesmo SHA-1, package, Maps key e EAS keystore.

---

## Env vars obrigatórias no prebuild

```bash
APP_VARIANT=passenger
GOOGLE_MAPS_API_KEY=<GOOGLE_MAPS_API_KEY>
EXPO_PUBLIC_PLACES_KEY=<EXPO_PUBLIC_PLACES_KEY>
```

## Comando de prebuild

```bash
APP_VARIANT=passenger \
GOOGLE_MAPS_API_KEY="<GOOGLE_MAPS_API_KEY>" \
EXPO_PUBLIC_PLACES_KEY="<EXPO_PUBLIC_PLACES_KEY>" \
npx expo prebuild --platform android --clean
```

## Signing — EAS keystore obrigatório

No `android/app/build.gradle`, o release DEVE usar:

```groovy
signingConfigs {
    release {
        storeFile file('../../credentials/android/eas-keystore.jks')
    storePassword '<EAS_STORE_PASSWORD>'
    keyAlias '<EAS_KEY_ALIAS>'
    keyPassword '<EAS_KEY_PASSWORD>'
    }
}
```

SHA-1 esperado: `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`

## Versão

Atualizar `versionCode` e `versionName` no `build.gradle` após o prebuild (prebuild --clean reseta).

## Build

```bash
cd android
./gradlew clean assembleRelease
```

## Validação pós-build

```bash
APK="android/app/build/outputs/apk/release/app-release.apk"
BT="/usr/lib/android-sdk/build-tools/36.0.0"

# 1. Assinatura (SHA-1 deve ser d858d3a5...)
"$BT/apksigner" verify --print-certs "$APK" | grep "SHA-1"

# 2. Package
aapt dump badging "$APK" | grep "^package:"

# 3. Maps key no Manifest
aapt dump xmltree "$APK" AndroidManifest.xml | grep -A1 "com.google.android.geo.API_KEY"

# 4. EXPO_PUBLIC_PLACES_KEY no bundle
unzip -p "$APK" assets/app.config | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(d['extra'].get('EXPO_PUBLIC_PLACES_KEY','VAZIO'))
"

# 5. APP_VARIANT
unzip -p "$APK" assets/app.config | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(d['extra']['APP_VARIANT'])
"
```

## Checklist antes de publicar APK Passageiro

### 1. Confirmar no build

- [ ] `APP_VARIANT=passenger`
- [ ] `package=com.kaviar.passenger`
- [ ] EAS keystore usado
- [ ] SHA-1 = `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`
- [ ] `GOOGLE_MAPS_API_KEY` preenchida
- [ ] `EXPO_PUBLIC_PLACES_KEY` preenchida

### 2. Confirmar no APK final

- [ ] AndroidManifest contém `com.google.android.geo.API_KEY`
- [ ] Valor da key não está exposto em docs/versionamento
- [ ] Bundle JS contém `EXPO_PUBLIC_PLACES_KEY` preenchida
- [ ] `versionCode` correto

### 3. Confirmar no Google Cloud

- [ ] Package: `com.kaviar.passenger`
- [ ] SHA-1: `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`
- [ ] APIs permitidas:
  - Maps SDK for Android
  - Places API
  - Geocoding API
  - Directions API

### 4. Teste físico obrigatório

- [ ] Instalar APK limpo
- [ ] Abrir app
- [ ] Fazer login
- [ ] Confirmar que o mapa aparece
- [ ] Solicitar corrida
- [ ] Confirmar que o mapa continua visível durante o fluxo

## Orientação de troubleshooting

Se o mapa não aparecer em build futuro, antes de gerar vários APKs no escuro, verificar primeiro:

1. `EXPO_PUBLIC_PLACES_KEY` no bundle (causa mais comum)
2. `GOOGLE_MAPS_API_KEY` no AndroidManifest
3. SHA-1/package no Google Cloud
4. Maps SDK for Android permitido na key
5. Logcat se ainda houver dúvida

## Erros conhecidos se faltar algo

| Faltando | Sintoma |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Crash ao abrir mapa (key ausente no Manifest) |
| `EXPO_PUBLIC_PLACES_KEY` | Mapa não renderiza (tiles não carregam) |
| EAS keystore | Mapa não renderiza (SHA-1 não autorizado na key) |
| `google-services-passenger.json` | Push token falha (Firebase não inicializa) |

## Melhorias futuras de UX/copy (não bloqueantes)

- [ ] Após aceite do motorista, push com copy mais humano:
  "Seu motorista aceitou a corrida e está a caminho."
- [ ] Após finalização, push com copy de encerramento:
  "Você chegou ao seu destino. Obrigado por viajar com a KAVIAR. Pague diretamente ao motorista."
- [ ] Card/status visual no app após aceite: "Motorista a caminho"
