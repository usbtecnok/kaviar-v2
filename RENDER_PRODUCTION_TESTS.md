# KAVIAR Backend - Testes de Produção

## Status: ✅ BACKEND FUNCIONANDO

**URL**: https://kaviar-v2.onrender.com  
**Última verificação**: 2026-01-05 20:01 UTC

## ✅ Testes Básicos

### Health Check
```bash
curl -s "https://kaviar-v2.onrender.com/api/health" | jq .
```
**Esperado**: `{"success": true, "message": "KAVIAR Backend is running", ...}`

### Admin Login
```bash
curl -s -X POST "https://kaviar-v2.onrender.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"admin123"}' | jq .
```
**Esperado**: `{"success": true, "data": {"token": "...", "admin": {...}}}`

## ✅ Endpoints Funcionando

### Admin Rides
```bash
TOKEN=$(curl -s -X POST "https://kaviar-v2.onrender.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"admin123"}' \
  | jq -r '.data.token')

curl -s "https://kaviar-v2.onrender.com/api/admin/rides" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.success'
```
**Esperado**: `true`

### Admin Drivers
```bash
curl -s "https://kaviar-v2.onrender.com/api/admin/drivers" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.success'
```
**Esperado**: `true`

## ❌ Endpoints com Problema

### Admin Communities (IMPLEMENTADO MAS NÃO FUNCIONANDO)
```bash
curl -i "https://kaviar-v2.onrender.com/api/admin/communities" \
  -H "Authorization: Bearer ${TOKEN}"
```
**Atual**: `HTTP/2 404` - "Endpoint não encontrado"  
**Esperado**: `HTTP/2 200` - Lista de communities

**Status**: Implementado no código (commits 9bbb333, dc9bbad) mas não funcionando em produção.
**Possível causa**: Problema de deploy/restart do Render ou conflito de rotas.

## 🔧 Comandos de Teste Completo

```bash
# Obter token
TOKEN=$(curl -s -X POST "https://kaviar-v2.onrender.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"admin123"}' \
  | jq -r '.data.token')

echo "TOKEN chars: ${#TOKEN}"

# Testar rides (deve funcionar)
echo "RIDES:"
curl -i "https://kaviar-v2.onrender.com/api/admin/rides" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | head -10

# Testar communities (problema conhecido)
echo "COMMUNITIES:"
curl -i "https://kaviar-v2.onrender.com/api/admin/communities" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | head -10
```

## 📋 Credenciais

- **Admin Email**: admin@kaviar.com
- **Admin Password**: admin123
- **Admin Role**: SUPER_ADMIN

## 🚀 Deploy Info

- **Branch**: main
- **Último commit**: 9055774 (debug: force server restart)
- **Build**: Automático via Render
- **Restart**: Manual necessário para aplicar mudanças de rota
