# 🚀 KAVIAR - GUIA RÁPIDO DE EXECUÇÃO

**Data**: 2026-02-21  
**Tempo estimado**: 15 minutos  
**Custo**: ~$0.04

---

## ⚡ EXECUÇÃO RÁPIDA (5 COMANDOS)

### 1️⃣ Ligar ECS
```bash
cd /home/goes/kaviar/kaviar-app
./subida-producao.sh up
```

**Aguardar**: Task subir (30-60s)

---

### 2️⃣ Validar Health
```bash
./subida-producao.sh health
```

**Resultado esperado**:
```json
✅ Health OK (200)
{"status":"ok","database":true,"timestamp":"..."}
```

---

### 3️⃣ Configurar App
```bash
# Backup do .env atual
cp .env .env.backup

# Configurar produção
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env

# Rodar app
npx expo start --lan --clear
```

---

### 4️⃣ Testar no Expo Go
1. Escanear QR code
2. Tocar em "Criar conta de passageiro"
3. Preencher formulário
4. Submeter cadastro
5. Fazer login

---

### 5️⃣ Desligar ECS
```bash
./subida-producao.sh down
```

---

## 🔍 COMANDOS AUXILIARES

### Ver logs em tempo real
```bash
./subida-producao.sh logs
```

### Verificar erros
```bash
./subida-producao.sh errors
```

### Status do service
```bash
./subida-producao.sh status
```

### Validação completa
```bash
./subida-producao.sh validate
```

---

## 📋 CHECKLIST MÍNIMO

- [ ] `./subida-producao.sh up` → runningCount=1
- [ ] `./subida-producao.sh health` → HTTP 200
- [ ] App configurado com produção (.env)
- [ ] Cadastro funciona no Expo Go
- [ ] Login funciona no Expo Go
- [ ] `./subida-producao.sh down` → runningCount=0

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Health retorna 502/503
```bash
# Aguardar mais 20s
sleep 20
./subida-producao.sh health

# Ver logs
./subida-producao.sh logs
```

### App retorna "Network Error"
```bash
# Verificar .env
cat .env

# Deve mostrar:
# EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api

# Reiniciar Expo
npx expo start --lan --clear
```

### Cadastro retorna erro
```bash
# Ver logs do backend
./subida-producao.sh logs

# Buscar por "POST /api/auth/register"
```

---

## 📊 EVIDÊNCIAS ESPERADAS

### 1. ECS Status
```
desiredCount: 1
runningCount: 1
status: ACTIVE
```

### 2. Health Check
```json
{
  "status": "ok",
  "database": true,
  "timestamp": "2026-02-21T22:56:00.000Z"
}
```

### 3. Logs de Startup
```
Server running on port 3000
Database connected: true
```

### 4. Cadastro no App
```
POST /api/auth/register/passenger 201
```

### 5. Login no App
```
POST /api/auth/login/passenger 200
```

---

## 🎯 COMANDOS COMPLETOS (COPY-PASTE)

```bash
# FASE 1: LIGAR E VALIDAR
cd /home/goes/kaviar/kaviar-app
./subida-producao.sh up
sleep 30
./subida-producao.sh health

# FASE 2: CONFIGURAR APP
cp .env .env.backup
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env
npx expo start --lan --clear

# FASE 3: TESTAR NO EXPO GO
# (manual no celular)

# FASE 4: DESLIGAR
./subida-producao.sh down
cp .env.backup .env
```

---

**Tempo total**: 15 minutos  
**Comandos**: 5 principais + 4 auxiliares  
**Custo**: $0.04

---

**Criado por**: Kiro  
**Status**: ✅ Pronto para execução
