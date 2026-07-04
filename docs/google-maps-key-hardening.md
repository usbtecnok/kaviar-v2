# Hardening de Chaves Google Maps/Places

## Objetivo

Definir práticas obrigatórias para uso de `GOOGLE_MAPS_API_KEY` e `EXPO_PUBLIC_PLACES_KEY` no projeto KAVIAR sem expor segredos no repositório.

## Situação atual de risco

- Existe chave em valor literal no AndroidManifest do app Passageiro.
- Existe histórico de documentação com valor real de key.

## Regras obrigatórias

1. Nunca registrar valor real de chave em arquivos versionados.
2. Em docs, usar apenas placeholders:
   - `<GOOGLE_MAPS_API_KEY>`
   - `<EXPO_PUBLIC_PLACES_KEY>`
3. Armazenar chaves somente em secrets de CI/CD e ambiente controlado.
4. Tratar qualquer chave exposta como comprometida e rotacionar.

## Restrições obrigatórias no Google Cloud

1. Restringir por pacote Android:
   - `com.kaviar.passenger`
2. Restringir por SHA-1 do certificado de assinatura usado no release.
3. Permitir apenas APIs necessárias:
   - Maps SDK for Android
   - Places API
   - Geocoding API
   - Directions API
4. Bloquear APIs não utilizadas.

## Ações recomendadas imediatas

1. Rotacionar a chave atualmente usada no AndroidManifest.
2. Aplicar restrições de pacote e SHA-1 antes de publicar novo APK.
3. Revisar logs e métricas de uso para detectar abuso.
4. Validar runbooks/checklists para garantir ausência de valores reais.

## Observação operacional

Não remover chave do AndroidManifest sem planejar fallback e validação de build/apk, para evitar quebra de renderização de mapa no app Passageiro.
