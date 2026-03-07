# Fix: Metro Bundling - createBundleReleaseJsAndAssets

## Build IDs
- 4d87c6d0-c3cb-45be-8a2f-9f3856a0dba8
- 3ae29789-da2d-4bf2-83b0-7e793d9a68d3
- (continuou após fix expo doctor)

## Erro Identificado

**Fase:** Run gradlew → :app:createBundleReleaseJsAndAssets

**Erro:**
```
Error: Unable to resolve module ../../src/api/driver.api from /home/expo/workingdir/build/app/(driver)/accept-ride.tsx
```

**Causa raiz:** 
O `.easignore` usava `!src/` que só inclui o diretório, não o conteúdo recursivo. Padrões de negação em gitignore/easignore precisam de `**` para incluir subdiretórios.

## Correção Aplicada

### Atualizado `.easignore` com padrões recursivos
```diff
-!app/
-!assets/
-!src/
+!app/**
+!assets/**
+!src/**
```

## Verificação

✅ `src/api/driver.api.ts` existe
✅ Versionado no Git
✅ Import correto em `accept-ride.tsx`: `from '../../src/api/driver.api'`

## Arquivos Modificados (staged)

```
M  .easignore
```

## Próximo Passo

**Commitar:**
```bash
git commit -m "fix: usar padrões recursivos no .easignore (app/** assets/** src/**)"
```

**Build:**
```bash
eas build --platform android --profile driver-apk
```

## Expectativa

Metro bundler encontra todos os arquivos em `src/**` recursivamente e completa o bundle JS sem erros.
