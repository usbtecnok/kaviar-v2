# 📁 Estrutura do Projeto - EAS Build

## Arquivos Principais

```
kaviar-app/
├── app.config.js              ← Config dinâmica (driver/passenger)
├── eas.json                   ← Profiles de build
├── .env                       ← EAS project IDs (preencher)
├── .env.example               ← Template
│
├── COMO_GERAR_APKS.md         ← Doc completa
├── COMANDOS_RAPIDOS.md        ← Referência rápida
├── build-apk.sh               ← Script helper
│
└── assets/
    ├── icon-driver.png        ← Ícone motorista
    ├── icon-passenger.png     ← Ícone passageiro
    ├── adaptive-icon-driver.png
    ├── adaptive-icon-passenger.png
    ├── splash-driver.png      ← Splash motorista
    └── splash-passenger.png   ← Splash passageiro
```

## Como Funciona

### 1. app.config.js

Lê `APP_VARIANT` e seta:
- `name`: "Kaviar Motorista" ou "Kaviar Passageiro"
- `slug`: "kaviar-driver" ou "kaviar-passenger"
- `android.package`: "com.kaviar.driver" ou "com.kaviar.passenger"
- `ios.bundleIdentifier`: mesma lógica
- `icon`, `splash`: assets separados
- `extra.eas.projectId`: ID do EAS separado

### 2. eas.json

Dois profiles:
- `driver-apk`: seta `APP_VARIANT=driver`
- `passenger-apk`: seta `APP_VARIANT=passenger`

### 3. .env

Contém os project IDs:
```
EAS_PROJECT_ID_DRIVER=...
EAS_PROJECT_ID_PASSENGER=...
```

## Fluxo de Build

```
1. Você roda:
   APP_VARIANT=driver npx eas build -p android --profile driver-apk

2. EAS lê eas.json → profile "driver-apk"

3. Profile seta env: APP_VARIANT=driver

4. app.config.js lê APP_VARIANT=driver

5. Config retorna:
   - name: "Kaviar Motorista"
   - package: "com.kaviar.driver"
   - icon: "./assets/icon-driver.png"
   - etc.

6. EAS builda com essa config

7. APK gerado: com.kaviar.driver
```

## Separação Limpa

✅ **Sem gambiarra em runtime**
- Não tem `if (isDriver)` no código
- Separação acontece no build time
- Cada APK é independente

✅ **Modo KAVIAR**
- 1 base só (mesmo repo)
- 2 variants separadas por config
- Commits pequenos + evidência
- Sem aumentar infraestrutura

## Customizar Assets

Para customizar os ícones/splash de cada app:

1. Edite os arquivos:
   - `assets/icon-driver.png` (1024x1024)
   - `assets/icon-passenger.png` (1024x1024)
   - `assets/adaptive-icon-driver.png` (1024x1024)
   - `assets/adaptive-icon-passenger.png` (1024x1024)
   - `assets/splash-driver.png` (1284x2778)
   - `assets/splash-passenger.png` (1284x2778)

2. Commit e push

3. Rebuild os APKs

## Verificar Config

```bash
# Ver config completa do driver
APP_VARIANT=driver npx expo config --type public

# Ver config completa do passenger
APP_VARIANT=passenger npx expo config --type public
```

## Troubleshooting

### "APP_VARIANT deve ser driver ou passenger"
→ Você esqueceu de setar `APP_VARIANT=driver` ou `APP_VARIANT=passenger`

### "projectId not found"
→ Você precisa preencher os IDs no `.env` após rodar `eas build:configure`

### Build falhou
→ Veja os logs no dashboard do EAS: https://expo.dev

## Referências

- Doc completa: `COMO_GERAR_APKS.md`
- Comandos rápidos: `COMANDOS_RAPIDOS.md`
- Script helper: `./build-apk.sh`
