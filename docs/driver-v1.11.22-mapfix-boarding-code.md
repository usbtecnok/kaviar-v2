# Driver v1.11.22-mapfix — Cooldown + Boarding Code + Map Fix

## 1. Contexto

- Motorista aceitava corrida e conseguia avançar rápido demais.
- Precisávamos garantir que o botão "Cheguei no local" não fosse usado imediatamente.
- Precisávamos garantir que a corrida só iniciasse com código de embarque correto.

## 2. Correção principal

- Cooldown de 60 segundos após aceitar corrida.
- Botão "Cheguei no local" fica cinza/desabilitado com countdown.
- Após 60s, botão libera.
- Boarding code obrigatório para iniciar corrida.
- Sem código bloqueia.
- Código errado bloqueia.
- Código correto inicia.

## 3. Problema secundário encontrado

- APK v1.11.21 tinha mapa branco.
- O logo "Google" aparecia, mas os tiles não carregavam.

## 4. Causa do mapa branco

- Build anterior foi gerado com `EXPO_PUBLIC_PLACES_KEY` vazia no bundle JS.
- Mesmo com Google Maps API Key no AndroidManifest, o app precisava da `EXPO_PUBLIC_PLACES_KEY` preenchida.
- Também foi necessário garantir no Google Cloud a combinação:
  - package: `com.kaviar.driver`
  - SHA-1: `D8:58:D3:A5:D1:79:1E:E3:E7:DD:E9:74:52:91:AD:0F:C8:A2:59:83`

## 5. Correção do mapa

- Novo APK local gerado sem EAS/Expo cloud.
- Build local com:
  - `APP_VARIANT=driver`
  - `GOOGLE_MAPS_API_KEY` preenchida
  - `EXPO_PUBLIC_PLACES_KEY` preenchida
- Package final: `com.kaviar.driver`
- Maps key no AndroidManifest confirmada.
- `EXPO_PUBLIC_PLACES_KEY` confirmada no bundle.

## 6. Versão aprovada

- Arquivo local: `/home/goes/kaviar/kaviar-motorista-v1.11.22-mapfix.apk`
- Link público: https://downloads.kaviar.com.br/kaviar-motorista-v1.11.22-mapfix.apk
- Tamanho: 74 MB
- Data/hora: 2026-05-14 23:32

## 7. Validação real

- APK instalado via ADB.
- Mapa apareceu durante corrida.
- Motorista recebeu corrida.
- Aceite funcionou.
- Countdown 60s funcionou.
- Código de embarque funcionou.
- Fluxo completo aprovado.

## 8. Regra futura

- Não usar EAS/Expo cloud para gerar APK enquanto a conta estiver bloqueada.
- Usar build local Android/Gradle.
- Sempre garantir `GOOGLE_MAPS_API_KEY` e `EXPO_PUBLIC_PLACES_KEY` no build:

```bash
APP_VARIANT=driver \
GOOGLE_MAPS_API_KEY="<GOOGLE_MAPS_API_KEY>" \
EXPO_PUBLIC_PLACES_KEY="<GOOGLE_MAPS_API_KEY>" \
npx expo prebuild --platform android --clean

cp google-services.json android/app/google-services.json
cd android
./gradlew clean assembleRelease
```

- Sempre validar mapa no aparelho real antes de publicar.
- Não publicar APK sem teste real.
