# Fix: Expo Doctor - Deps e app.json

## Build ID
3ae29789-da2d-4bf2-83b0-7e793d9a68d3

## Erro Identificado

**Fase:** expo doctor

**Erros:**
1. `app.json` conflita com `app.config.js` dinâmico
2. Versões incompatíveis de `@react-navigation/*` com Expo SDK

**Erro fatal:**
```
Command "expo doctor" failed.
npx -y expo-doctor exited with non-zero code: 1
```

## Correção Aplicada

### 1. Removido `app.json`
```bash
rm -f app.json
```

### 2. Atualizado deps para versões compatíveis
```bash
npm install @react-navigation/native@^7.1.33 @react-navigation/native-stack@^7.14.4 --save
```

**Mudanças:**
```diff
- "@react-navigation/native": "^7.1.31"
+ "@react-navigation/native": "^7.1.33"
- "@react-navigation/native-stack": "^7.14.2"
+ "@react-navigation/native-stack": "^7.14.4"
```

## Arquivos Modificados (staged)

```
M  package.json
M  package-lock.json
```

## Próximo Passo

**Commitar:**
```bash
git commit -m "fix: remover app.json e atualizar react-navigation deps"
```

**Build:**
```bash
eas build --platform android --profile driver-apk
```

## Expectativa

`expo doctor` passa sem erros e build prossegue para Metro bundling.
