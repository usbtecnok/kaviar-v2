# Como Gerar os 2 APKs do Kaviar

## Modo KAVIAR (Anti-Frankenstein)

Uma base só, 2 variants separadas por config. Nada de gambiarra em runtime.

## Estrutura

- **Kaviar Motorista**: `com.kaviar.driver`
- **Kaviar Passageiro**: `com.kaviar.passenger`

Cada um tem:
- Nome próprio
- Package ID próprio
- Ícones/splash próprios (assets separados)
- EAS Project ID próprio

## Setup Inicial (uma vez só)

### 1. Login no EAS

```bash
cd /home/goes/kaviar/kaviar-app
npx eas login
npx eas whoami
```

### 2. Configurar Projects

Você precisa rodar `eas build:configure` **duas vezes**, uma para cada variant:

```bash
# Configurar projeto DRIVER
APP_VARIANT=driver npx eas build:configure

# Configurar projeto PASSENGER
APP_VARIANT=passenger npx eas build:configure
```

Cada comando vai gerar um `projectId` diferente. Anote os IDs e coloque no `.env`:

```bash
# Editar .env
nano .env

# Adicionar os IDs:
EAS_PROJECT_ID_DRIVER=seu-id-driver-aqui
EAS_PROJECT_ID_PASSENGER=seu-id-passenger-aqui
```

## Gerar APKs

### APK Motorista

```bash
cd /home/goes/kaviar/kaviar-app
APP_VARIANT=driver npx eas build -p android --profile driver-apk
```

### APK Passageiro

```bash
cd /home/goes/kaviar/kaviar-app
APP_VARIANT=passenger npx eas build -p android --profile passenger-apk
```

## Baixar APKs

Após o build terminar, o EAS vai dar um link. Você pode:

1. Abrir o link no navegador e baixar
2. Ou usar o CLI:

```bash
# Listar builds
npx eas build:list

# Baixar um build específico
npx eas build:download --id BUILD_ID
```

## Rodar Expo no Dia a Dia (com tunnel)

```bash
cd /home/goes/kaviar/kaviar-app
npx expo start -c --tunnel
```

## Arquivos Importantes

- `app.config.js` - Config dinâmica que muda conforme `APP_VARIANT`
- `eas.json` - Profiles de build (driver-apk, passenger-apk)
- `.env` - Project IDs do EAS
- `assets/icon-driver.png` - Ícone do motorista
- `assets/icon-passenger.png` - Ícone do passageiro
- `assets/splash-driver.png` - Splash do motorista
- `assets/splash-passenger.png` - Splash do passageiro

## Verificar Config

Para ver como ficou a config de cada variant:

```bash
# Ver config do driver
APP_VARIANT=driver npx expo config --type public

# Ver config do passenger
APP_VARIANT=passenger npx expo config --type public
```

## Troubleshooting

### Erro "APP_VARIANT deve ser driver ou passenger"

Você esqueceu de setar `APP_VARIANT`. Sempre use:
- `APP_VARIANT=driver` para motorista
- `APP_VARIANT=passenger` para passageiro

### Erro "projectId not found"

Você precisa preencher os IDs no `.env` após rodar `eas build:configure`.

### Build falhou

Veja os logs no dashboard do EAS: https://expo.dev/accounts/SEU_USERNAME/projects

## Custo

- EAS Build tem plano free com limite de builds/mês
- Sem infraestrutura adicional (mantém 1 task no backend)
- APKs podem ser distribuídos direto (sem Play Store por agora)
