# Correção Aplicada: Expo Router Root

## Status
✅ **Pronto para build EAS cloud**

## O que foi feito

1. **Movidas fisicamente** as pastas para a raiz:
   - `kaviar-app/app/` → `/home/goes/kaviar/app/`
   - `kaviar-app/assets/` → `/home/goes/kaviar/assets/`
   - `kaviar-app/src/` → `/home/goes/kaviar/src/`

2. **Atualizado** `app.config.js` para apontar para `./assets/` (não mais `./kaviar-app/assets/`)

3. **Versionado no Git** (33 arquivos adicionados)

4. **Removido** do `.gitignore` as entradas `/app`, `/assets`, `/src`

## Arquivos modificados (staged)
```
M  .gitignore
M  app.config.js
A  build-driver.sh
A  FIX_EXPO_ROUTER_ROOT.md
A  app/...  (11 arquivos)
A  assets/...  (9 arquivos)
A  src/...  (13 arquivos)
```

## Build

**Local:**
```bash
cd /home/goes/kaviar
./build-driver.sh
```

**EAS Cloud:**
```bash
cd /home/goes/kaviar
eas build --platform android --profile driver-apk
```

## Próximo passo

Commitar as mudanças:
```bash
git commit -m "fix: mover app/assets/src para raiz - expo router root"
```

Depois executar build para validar.
