# Fix: Metro Bundling - createBundleReleaseJsAndAssets

## Build ID
4d87c6d0-c3cb-45be-8a2f-9f3856a0dba8

## Erro Identificado

**Fase:** Run gradlew → :app:createBundleReleaseJsAndAssets

**Erro:**
```
Error: Unable to resolve module ../../src/api/driver.api from /home/expo/workingdir/build/app/(driver)/accept-ride.tsx
```

**Causa raiz:** 
Após mover `app/`, `assets/` e `src/` para a raiz, o `.easignore` ainda referenciava `!kaviar-app/`, fazendo com que `src/` não fosse incluído no archive do EAS.

## Correção Aplicada

### 1. Atualizado `.easignore`
```diff
- !kaviar-app/
+ !app/
+ !assets/
+ !src/
+ !tsconfig.json
```

### 2. Copiado `tsconfig.json` para raiz
```bash
cp kaviar-app/tsconfig.json .
```

### 3. Atualizado `.gitignore`
```diff
 *.json
+!package.json
+!package-lock.json
+!tsconfig.json
+!app.json
+!eas.json
```

## Arquivos Modificados (staged)

```
M  .easignore
M  .gitignore
A  tsconfig.json
```

## Próximo Passo

**Commitar:**
```bash
git commit -m "fix: atualizar .easignore para incluir app/assets/src da raiz"
```

**Build:**
```bash
eas build --platform android --profile driver-apk
```

## Expectativa

Metro bundler encontra `src/api/driver.api.ts` e completa o bundle JS corretamente.
