# ⚡ Comandos Rápidos - EAS Build

## Setup (uma vez só)

```bash
cd /home/goes/kaviar/kaviar-app
npx eas login
APP_VARIANT=driver npx eas build:configure
APP_VARIANT=passenger npx eas build:configure
# Depois preencher .env com os project IDs
```

## Build APKs

```bash
# Motorista
cd /home/goes/kaviar/kaviar-app
APP_VARIANT=driver npx eas build -p android --profile driver-apk

# Passageiro
cd /home/goes/kaviar/kaviar-app
APP_VARIANT=passenger npx eas build -p android --profile passenger-apk
```

## Ou use o script helper

```bash
cd /home/goes/kaviar/kaviar-app
./build-apk.sh
```

## Expo no dia a dia

```bash
cd /home/goes/kaviar/kaviar-app
npx expo start -c --tunnel
```

## Verificar config

```bash
# Driver
APP_VARIANT=driver npx expo config --type public

# Passenger
APP_VARIANT=passenger npx expo config --type public
```

## Listar e baixar builds

```bash
npx eas build:list
npx eas build:download --id BUILD_ID
```
