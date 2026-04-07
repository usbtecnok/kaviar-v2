# Fix: Expo Router - Root de Rotas

## Problema Identificado

**Erro:** `Error: No routes found` ao abrir o app

**Causa raiz:** 
- Build executado da raiz `/home/goes/kaviar`
- Expo Router procura rotas em `app/` relativo à raiz do projeto
- Rotas estavam em `kaviar-app/app/`
- Resultado: expo-router não encontra as rotas → crash

## Solução Aplicada

**Movidas fisicamente** as pastas para a raiz:

```bash
mv kaviar-app/app ./app
mv kaviar-app/assets ./assets
mv kaviar-app/src ./src
```

Isso garante que:
- Expo Router encontre as rotas em `app/`
- Assets sejam resolvidos corretamente
- Funcione tanto em build local quanto **EAS cloud build**
- Arquivos versionados no Git (não depende de symlinks)

## Estrutura

```
/home/goes/kaviar/
├── app.config.js          # Config principal (fonte de verdade)
├── eas.json               # Config de build
├── package.json           # Dependencies (main: expo-router/entry)
├── app/                   # Rotas (driver, passenger, auth)
├── assets/                # Icons, splash screens
├── src/                   # Código fonte
└── kaviar-app/            # Configs e docs legados
```

## Build

**Local:**
```bash
./build-driver.sh
```

**EAS Cloud:**
```bash
eas build --platform android --profile driver-apk
```

## Teste

```bash
adb install -r <apk>
adb shell am start -n com.kaviar.driver/.MainActivity
adb logcat | grep -E 'ReactNativeJS|Expo'
```

**Expectativa:** App abre sem crash, expo-router encontra rotas e navega corretamente.
