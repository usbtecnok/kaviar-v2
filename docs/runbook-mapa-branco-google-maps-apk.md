# Runbook — Mapa branco / Google Maps não aparece no APK

## Sintoma

- Tela do mapa fica branca, preta ou vazia.
- Às vezes aparece apenas o logo "Google" no canto inferior.
- Login, online e corrida podem funcionar normalmente, mas o mapa não renderiza.

## Causas mais comuns

1. `EXPO_PUBLIC_PLACES_KEY` vazia no bundle JS.
2. `GOOGLE_MAPS_API_KEY` ausente ou vazia no AndroidManifest.
3. Package name errado:
   - Passageiro: `com.kaviar.passenger`
   - Motorista: `com.kaviar.driver`
4. SHA-1 do APK release não liberado no Google Cloud.
5. Maps SDK for Android não permitido nas restrições da API key.
6. APK gerado por prebuild sem passar as variáveis de ambiente corretas.

## Checklist de diagnóstico

### 1. Confirmar package do APK

Usar `aapt` ou ferramenta equivalente e confirmar:

- Motorista: `com.kaviar.driver`
- Passageiro: `com.kaviar.passenger`

### 2. Confirmar Google Maps key no Manifest

Verificar se existe:

`com.google.android.geo.API_KEY`

E se o valor não está vazio, null ou placeholder.

### 3. Confirmar EXPO_PUBLIC_PLACES_KEY no bundle

Verificar se `EXPO_PUBLIC_PLACES_KEY` está preenchida no bundle JS.

Se estiver vazia, o APK precisa ser gerado novamente.

### 4. Confirmar restrições no Google Cloud

No Google Cloud Console → APIs & Services → Credentials → API key usada pelo app:

Verificar se existe a combinação correta:

Motorista:
- package: `com.kaviar.driver`
- SHA-1 release correto

Passageiro:
- package: `com.kaviar.passenger`
- SHA-1 release correto

Importante: o mesmo SHA-1 pode ser usado por passageiro e motorista se ambos forem assinados com o mesmo keystore. O que importa é a combinação package + SHA-1.

### 5. Confirmar API restrictions

A API key precisa permitir:

- Maps SDK for Android
- Places API, se usado pelo autocomplete/busca
- Geocoding API, se usado
- Directions API, se usado

## Correção padrão

Gerar APK localmente, sem EAS/Expo cloud, passando as variáveis:

```bash
APP_VARIANT=driver \
GOOGLE_MAPS_API_KEY="<GOOGLE_MAPS_API_KEY>" \
EXPO_PUBLIC_PLACES_KEY="<GOOGLE_MAPS_API_KEY>" \
npx expo prebuild --platform android --clean

cp google-services.json android/app/google-services.json

cd android
./gradlew clean assembleRelease
```

Para Passageiro, trocar:

```bash
APP_VARIANT=passenger
```

## Regras importantes

- Não usar EAS/Expo cloud enquanto a conta Expo estiver bloqueada.
- Usar build local Android/Gradle.
- Não commitar API key real em documentação.
- Não commitar APK.
- Não commitar `android/` gerado pelo prebuild sem decisão explícita.
- Sempre testar o mapa em aparelho real antes de publicar.
- Se aparecer logo "Google" mas tiles não carregarem, verificar autorização da API key, SHA-1, package e `EXPO_PUBLIC_PLACES_KEY`.

## Validação final

Antes de publicar o APK:

- [ ] App abre
- [ ] Login funciona
- [ ] Mapa aparece
- [ ] Motorista/passageiro recebe fluxo esperado
- [ ] Corrida real/controlada funciona
- [ ] Se for Motorista: validar countdown e código de embarque
- [ ] Se for Passageiro: validar mapa, autocomplete e solicitação de corrida
