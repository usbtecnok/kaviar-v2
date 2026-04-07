# Fix: API_URL e Logs no Cadastro de Motorista

## Problema Identificado

**Causa raiz:** App estava usando `http://localhost:3000` porque `EXPO_PUBLIC_API_URL` não estava configurado.

```tsx
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
// No device, sempre cai no fallback localhost
```

## Correções Aplicadas

### 1. Configurar API_URL no app.config.js

```javascript
extra: {
  eas: {
    projectId: variantConfig.projectId
  },
  EXPO_PUBLIC_API_URL: 'https://api.kaviar.com.br'
}
```

### 2. Usar Constants.expoConfig no app

```tsx
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://api.kaviar.com.br';
```

### 3. Adicionar logs detalhados

```tsx
console.log('[loadSmartNeighborhoods] URL:', url);
console.log('[loadSmartNeighborhoods] Coords:', coords);
console.log('[loadSmartNeighborhoods] Status:', response.status);
console.log('[loadSmartNeighborhoods] Response:', JSON.stringify(data).substring(0, 200));
```

### 4. Corrigir lógica de fallback

```tsx
// Antes (quebrava se nearby fosse undefined)
setNeighborhoods(data.nearby.length > 0 ? data.nearby : data.data);

// Depois (tolera nearby undefined/null)
const neighborhoodList = (data.nearby && data.nearby.length > 0) ? data.nearby : (data.data || []);
setNeighborhoods(neighborhoodList);
```

### 5. Validar response.ok

```tsx
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

## Arquivos Modificados

```
M  app.config.js
M  app/(auth)/register.tsx
```

## Teste

**Rebuild necessário:**
```bash
eas build --platform android --profile driver-apk
```

**Logs esperados no device:**
```
[loadSmartNeighborhoods] URL: https://api.kaviar.com.br/api/neighborhoods/smart-list?lat=-22.9068&lng=-43.1729
[loadSmartNeighborhoods] Coords: {lat: -22.9068, lng: -43.1729}
[loadSmartNeighborhoods] Status: 200
[loadSmartNeighborhoods] Response: {"success":true,"data":[...],"detected":null,"nearby":[]}
[loadSmartNeighborhoods] Neighborhoods count: 300
```

## Próximo Passo

```bash
git commit -m "fix: configurar API_URL e adicionar logs no cadastro motorista"
eas build --platform android --profile driver-apk
```

Após instalar novo APK, verificar logs com:
```bash
adb logcat | grep -E "loadSmartNeighborhoods|loadNeighborhoods"
```
