# ✅ EAS Build - 2 APKs Separados (Driver/Passenger)

**Data**: 2026-03-04  
**Commit**: 12ee652  
**Status**: Pronto para build

---

## 🎯 Smoke Test

```
HEALTH:
{
  "status": "ok",
  "version": "57502ff7441d9f03fdfcc73e2cdcfad5556da95d",
  "timestamp": "2026-03-04T23:37:44.336Z"
}

TOKEN_OK?
OK

LOCATION:
HTTP/2 200
{
  "success": true
}
```

✅ API funcionando perfeitamente

---

## 📦 O Que Foi Feito

### 1. Config Dinâmica (`app.config.js`)

- Lê `APP_VARIANT=driver|passenger`
- Seta nome, slug, package, ícones, splash automaticamente
- Cada variant tem seu `EAS_PROJECT_ID` separado

### 2. EAS Profiles (`eas.json`)

```json
{
  "build": {
    "driver-apk": {
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "driver" }
    },
    "passenger-apk": {
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "passenger" }
    }
  }
}
```

### 3. Assets Separados

- `icon-driver.png` / `icon-passenger.png`
- `adaptive-icon-driver.png` / `adaptive-icon-passenger.png`
- `splash-driver.png` / `splash-passenger.png`

(Inicialmente cópias, mas estrutura pronta para customizar)

### 4. Documentação

`kaviar-app/COMO_GERAR_APKS.md` - Guia completo de como gerar os APKs

---

## 🚀 Próximos Passos (Você Executa)

### 1. Setup Inicial (uma vez só)

```bash
cd /home/goes/kaviar/kaviar-app

# Login
npx eas login
npx eas whoami

# Configurar projeto DRIVER
APP_VARIANT=driver npx eas build:configure

# Configurar projeto PASSENGER
APP_VARIANT=passenger npx eas build:configure

# Preencher .env com os project IDs gerados
nano .env
```

### 2. Gerar APKs

```bash
# APK Motorista
APP_VARIANT=driver npx eas build -p android --profile driver-apk

# APK Passageiro
APP_VARIANT=passenger npx eas build -p android --profile passenger-apk
```

### 3. Baixar APKs

O EAS vai dar links para download. Ou use:

```bash
npx eas build:list
npx eas build:download --id BUILD_ID
```

---

## 📱 Expo no Dia a Dia

```bash
cd /home/goes/kaviar/kaviar-app
npx expo start -c --tunnel
```

---

## 🎨 Modo KAVIAR (Anti-Frankenstein)

✅ 1 base só (mesmo repo)  
✅ 2 variants separadas por config  
✅ Nada de gambiarra em runtime  
✅ Separação limpa: nome, package, ícones, splash  
✅ Commits pequenos + evidência  
✅ Sem aumentar infraestrutura (mantém 1 task)

---

## 📊 Estrutura Final

```
kaviar-app/
├── app.config.js          # Config dinâmica (driver/passenger)
├── eas.json               # Profiles de build
├── .env                   # EAS project IDs
├── COMO_GERAR_APKS.md     # Doc completa
└── assets/
    ├── icon-driver.png
    ├── icon-passenger.png
    ├── adaptive-icon-driver.png
    ├── adaptive-icon-passenger.png
    ├── splash-driver.png
    └── splash-passenger.png
```

---

## 🔍 Verificar Config

```bash
# Ver config do driver
APP_VARIANT=driver npx expo config --type public

# Ver config do passenger
APP_VARIANT=passenger npx expo config --type public
```

---

## 💰 Custo

- EAS Build: plano free com limite de builds/mês
- Sem infraestrutura adicional
- APKs distribuídos direto (sem Play Store por agora)

---

## 📝 Arquivos Commitados

```
[main 12ee652] feat(app): config 2 APKs separados (driver/passenger) via EAS Build
 11 files changed, 207 insertions(+), 36 deletions(-)
 create mode 100644 kaviar-app/COMO_GERAR_APKS.md
 create mode 100644 kaviar-app/app.config.js
 delete mode 100644 kaviar-app/app.json
 create mode 100644 kaviar-app/assets/adaptive-icon-driver.png
 create mode 100644 kaviar-app/assets/adaptive-icon-passenger.png
 create mode 100644 kaviar-app/assets/icon-driver.png
 create mode 100644 kaviar-app/assets/icon-passenger.png
 create mode 100644 kaviar-app/assets/splash-driver.png
 create mode 100644 kaviar-app/assets/splash-passenger.png
 create mode 100644 kaviar-app/eas.json
```

Pushed to: `origin/main`

---

## ✅ Checklist

- [x] Smoke test passou
- [x] Config dinâmica criada
- [x] EAS profiles configurados
- [x] Assets separados criados
- [x] Documentação completa
- [x] Commitado e pushado
- [ ] Setup EAS (você executa)
- [ ] Build APK driver (você executa)
- [ ] Build APK passenger (você executa)
- [ ] Download e teste dos APKs (você executa)

---

**Pronto para você rodar os builds! 🚀**
