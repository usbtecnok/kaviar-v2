# 🔧 Configuração Premium Tourism + Turismo AI

## ✅ RESOLVIDO

### Variável de Ambiente

**Adicione em `/home/goes/kaviar/backend/.env.development`:**

```bash
ENABLE_PREMIUM_TOURISM=true
```

Isso habilita as rotas administrativas de Premium Tourism:
- `/api/admin/tour-packages`
- `/api/admin/tour-bookings`
- `/api/governance/tour-packages`
- `/api/governance/tour-bookings`

---

## 🎯 Arquitetura das Rotas

### 1. Rota `/api/turismo/chat` (SEMPRE DISPONÍVEL)

**Arquivo:** `backend/src/routes/turismo.ts`  
**Montada em:** `backend/src/app.ts` linha 226  
**Condicional:** ❌ NÃO (sempre disponível)

```typescript
// app.ts linha 226
app.use('/api/turismo', turismoRoutes); // ✅ Turismo chat with AI
```

Esta rota está **FORA** do bloco condicional do Premium Tourism, então funciona independentemente da flag `ENABLE_PREMIUM_TOURISM`.

### 2. Rotas Premium Tourism (CONDICIONAIS)

**Arquivo:** `backend/src/routes/premium-tourism.ts`  
**Montada em:** `backend/src/app.ts` linhas 253-256  
**Condicional:** ✅ SIM (requer `ENABLE_PREMIUM_TOURISM=true`)

```typescript
// app.ts linhas 253-256
if (config.premiumTourism.enablePremiumTourism) {
  app.use('/api', premiumTourismRoutes);
  console.log('✅ Premium Tourism: /api/admin/tour-*, /api/governance/tour-*');
} else {
  console.log('❌ Premium Tourism: DISABLED');
}
```

---

## 🔑 Variáveis de Ambiente

### `.env.development` (Desenvolvimento Local)

```bash
# Backend porta
PORT=3003

# Premium Tourism (rotas admin)
ENABLE_PREMIUM_TOURISM=true

# Turismo AI Chat (independente)
FEATURE_TURISMO_AI=true
OPENAI_API_KEY=sk-proj-...
```

### Comportamento

| Variável | Valor | Efeito |
|----------|-------|--------|
| `ENABLE_PREMIUM_TOURISM` | `false` | ❌ Rotas admin desabilitadas<br>✅ `/api/turismo/chat` funciona |
| `ENABLE_PREMIUM_TOURISM` | `true` | ✅ Rotas admin habilitadas<br>✅ `/api/turismo/chat` funciona |
| `FEATURE_TURISMO_AI` | `false` | FAQ + WhatsApp fallback |
| `FEATURE_TURISMO_AI` | `true` | Chat com IA (requer `OPENAI_API_KEY`) |

---

## 🚀 Comandos de Teste

### Teste Rápido
```bash
cd /home/goes/kaviar
./test-turismo.sh
```

### Teste Manual
```bash
# Backend (porta 3003)
cd /home/goes/kaviar/backend
npm run dev

# Frontend (porta 5173)
cd /home/goes/kaviar/frontend-app
npm run dev

# Testar API
curl -X POST http://localhost:3003/api/turismo/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá"}'
```

---

## 📊 Logs Esperados

### Com `ENABLE_PREMIUM_TOURISM=true`
```
✅ Core routes mounted:
   - /api/turismo/* (Turismo chat with AI)
✅ Premium Tourism: /api/admin/tour-*, /api/governance/tour-*
```

### Com `ENABLE_PREMIUM_TOURISM=false`
```
✅ Core routes mounted:
   - /api/turismo/* (Turismo chat with AI)
❌ Premium Tourism: DISABLED
```

**Nota:** A rota `/api/turismo/chat` funciona em AMBOS os casos!

---

## 🐛 Troubleshooting

### "❌ Premium Tourism: DISABLED" mas `/api/turismo/chat` funciona

✅ **NORMAL!** A mensagem se refere apenas às rotas admin (`/api/admin/tour-*`).  
A rota `/api/turismo/chat` está montada separadamente e sempre funciona.

### Erro 404 em `/api/turismo/chat`

1. Verificar se backend está rodando na porta 3003
2. Verificar logs do backend
3. Testar com curl:
   ```bash
   curl http://localhost:3003/api/turismo/chat
   ```

### Chat não responde com IA

1. Verificar `FEATURE_TURISMO_AI=true` no `.env.development`
2. Verificar `OPENAI_API_KEY` configurada
3. Verificar logs do backend para erros da OpenAI

---

## 📝 Resumo

**Para habilitar Premium Tourism localmente:**

```bash
# Editar .env.development
nano /home/goes/kaviar/backend/.env.development

# Adicionar/alterar:
ENABLE_PREMIUM_TOURISM=true
FEATURE_TURISMO_AI=true
OPENAI_API_KEY=sk-proj-...

# Reiniciar backend
cd /home/goes/kaviar/backend
npm run dev
```

**URLs:**
- Backend: `http://localhost:3003`
- Frontend: `http://localhost:5173`
- Turismo: `http://localhost:5173/turismo`
- API Chat: `POST http://localhost:3003/api/turismo/chat`

---

**✅ Configuração completa e documentada!**
