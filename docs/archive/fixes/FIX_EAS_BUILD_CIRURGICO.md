# CORREÇÃO CIRÚRGICA: REMOVER PROJETO FANTASMA

## DIAGNÓSTICO

Existem DOIS projetos Expo:
1. `/home/goes/kaviar/` - ATIVO (com Expo Router, código real)
2. `/home/goes/kaviar/kaviar-app/` - FANTASMA (boilerplate vazio)

O EAS Build está confuso entre os dois.

## SOLUÇÃO

Remover completamente `kaviar-app/` e garantir que EAS builde da raiz.

## COMANDOS

```bash
cd /home/goes/kaviar

# 1. Backup de segurança (caso precise reverter)
tar -czf kaviar-app-backup-$(date +%Y%m%d-%H%M%S).tar.gz kaviar-app/

# 2. Remover projeto fantasma
rm -rf kaviar-app/

# 3. Verificar que eas.json está na raiz
cat eas.json

# 4. Verificar que package.json está na raiz
cat package.json | grep expo-image-picker

# 5. Limpar cache do EAS
rm -rf .expo/

# 6. Reinstalar dependências (garantir lockfile limpo)
rm -rf node_modules package-lock.json
npm install

# 7. Verificar que app/ existe na raiz
ls -la app/

# 8. Build EAS
eas build --platform android --profile driver-apk --clear-cache
```

## VALIDAÇÃO

Após remover `kaviar-app/`:
- ✅ Projeto único em `/home/goes/kaviar/`
- ✅ `app/` com rotas do Expo Router
- ✅ `assets/` com ícones
- ✅ `eas.json` e `app.config.js` na raiz
- ✅ Dependências corretas no `package.json` da raiz

## POR QUE ISSO RESOLVE

1. **Elimina ambiguidade:** EAS não terá dois projetos para escolher
2. **Lockfile correto:** `package-lock.json` da raiz tem as dependências certas
3. **Expo Router funciona:** `app/` está na raiz onde Expo Router espera
4. **Cache limpo:** `--clear-cache` garante que EAS não use build anterior

## SE DER ERRO AINDA

Verificar:
```bash
# Ver se há outros package.json conflitantes
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/backend/*" -not -path "*/frontend-app/*"

# Deve retornar apenas:
# ./package.json
```
