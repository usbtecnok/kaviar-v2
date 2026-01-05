# 🔍 RELATÓRIO FASE 1: DIAGNÓSTICO ANTI-FRANKENSTEIN

**Data:** 2026-01-05 08:36:18  
**Branch:** audit/anti-frankenstein  
**Status:** CONCLUÍDO ✅

---

## A) MAPA DO QUE ESTÁ ATIVO EM PRODUÇÃO VS LOCAL

### 📁 **FRONTENDS IDENTIFICADOS:**

#### 1. **Frontend React Oficial** (`/kaviar/frontend-app/`)
- **Tecnologia:** React 18 + Vite + Material-UI + React Router
- **Porta:** 5173 (dev), 4173 (preview)
- **Build:** `npm run build` → `/dist`
- **Status:** ✅ **ESTE É O OFICIAL**
- **Dependências:** React, MUI, Axios, Google Maps API

#### 2. **Frontend HTML Legado** (`/kaviar/public/`)
- **Tecnologia:** HTML puro + JavaScript vanilla + Supabase
- **Servido por:** Express static (`server.js`)
- **Status:** ❌ **DUPLICADO/CONFLITANTE**
- **Função:** Dashboard admin básico WhatsApp

### 🔧 **BACKENDS IDENTIFICADOS:**

#### 1. **Backend TypeScript Oficial** (`/kaviar/backend/`)
- **Tecnologia:** TypeScript + Express + Prisma + PostgreSQL
- **Porta:** 3001
- **Start:** `npm run dev` (tsx watch) ou `npm start` (compiled)
- **Status:** ✅ **ESTE É O OFICIAL**
- **Features:** Feature flags, autenticação JWT, rate limiting

#### 2. **Backend JavaScript Legado** (`/kaviar/server.js`)
- **Tecnologia:** JavaScript + Express + Supabase
- **Porta:** 3000
- **Start:** `npm start` (raiz)
- **Status:** ❌ **CONFLITANTE**
- **Função:** WhatsApp webhook + APIs antigas

### 🚀 **COMANDOS ATIVOS:**
```bash
# OFICIAL (deve ser usado):
cd /kaviar/backend && npm run dev     # Backend TS (porta 3001)
cd /kaviar/frontend-app && npm run dev # Frontend React (porta 5173)

# LEGADO (conflitante):
cd /kaviar && npm start               # server.js (porta 3000)
```

---

## B) INVENTÁRIO DE CONFLITOS

### 🔴 **CONFLITOS CRÍTICOS IDENTIFICADOS:**

#### 1. **Rotas Duplicadas:**
- `/api/admin/*` existe em ambos backends
- `/api/auth/*` implementado diferente em cada um
- `/health` vs `/api/health` endpoints diferentes

#### 2. **Frontend HTML Legado (`/public/`) ainda chama:**
```javascript
// Chamadas para APIs que podem não existir no backend oficial:
fetch('/api/audit/log', ...)          // ❌ Pode não existir
fetch('/api/messages/send', ...)      // ❌ Pode não existir
```

#### 3. **Frontend React (`/frontend-app/`) chama:**
```javascript
// Hardcoded para porta 3001 (backend oficial):
fetch('http://localhost:3001/api/admin/rides/...')  // ✅ Correto
fetch('http://localhost:3001/api/admin/auth/login') // ✅ Correto
```

#### 4. **Problemas de Autenticação:**
- **Backend Legado:** Usa Supabase auth + JWT próprio
- **Backend Oficial:** Usa Prisma + bcrypt + JWT próprio
- **Resultado:** Senhas/tokens incompatíveis entre sistemas

#### 5. **Schemas Diferentes:**
- **Legado:** Supabase schema (não versionado)
- **Oficial:** Prisma schema com migrations

---

## C) BACKUP SEGURO ✅

### 📦 **Backups Criados:**
```
/kaviar/audit/backups/20260105_083618/
├── public_backup/           # Cópia completa da pasta /public
├── server_js_backup.js      # Cópia do server.js raiz
├── env_root_backup.txt      # .env da raiz (sem secrets no git)
└── env_backend_backup.txt   # .env do backend (sem secrets no git)
```

### 🗄️ **Schema do Banco:**
- **Conexão:** PostgreSQL (Neon) ✅ Conectado
- **Tabelas Principais:** roles, admins, communities, drivers, passengers, rides
- **Status:** Schema Prisma sincronizado com banco

---

## D) PROPOSTA DE CONSOLIDAÇÃO

### 🎯 **DECISÕES ARQUITETURAIS:**

#### ✅ **FRONTEND OFICIAL:**
- **Manter:** `/kaviar/frontend-app/` (React + Vite)
- **Motivo:** Arquitetura moderna, componentizada, escalável

#### ✅ **BACKEND OFICIAL:**
- **Manter:** `/kaviar/backend/` (TypeScript + Prisma)
- **Motivo:** Type safety, migrations, feature flags, segurança

#### 🗂️ **LEGADO (Arquivar):**
- **Mover:** `/kaviar/public/` → `/kaviar/legacy/public/`
- **Mover:** `/kaviar/server.js` → `/kaviar/legacy/server.js`
- **Mover:** APIs antigas → `/kaviar/legacy/api/`

### 🔧 **AÇÕES NECESSÁRIAS (FASE 2):**

1. **Consolidar Autenticação:**
   - Implementar "Esqueci minha senha" no backend oficial
   - Corrigir login admin no frontend React
   - Remover dependência do Supabase auth

2. **Migrar Funcionalidades:**
   - WhatsApp webhook → Backend oficial
   - Dashboard admin → Frontend React
   - APIs essenciais → Backend oficial

3. **Atualizar Configurações:**
   - `package.json` raiz → apontar para backend oficial
   - CORS → remover referências ao legado
   - Deploy → usar apenas frontend React + backend TS

### ⚠️ **RISCOS E MITIGAÇÕES:**

#### 🚨 **Riscos:**
- **Downtime:** Durante migração das APIs
- **Perda de dados:** WhatsApp conversations/logs
- **Quebra de integração:** Twilio webhook

#### 🛡️ **Mitigações:**
- **Blue-Green Deploy:** Manter legado rodando até validação
- **Backup completo:** Antes de qualquer mudança
- **Testes:** Validar cada endpoint migrado
- **Rollback:** Script para reverter rapidamente

---

## 📋 **PRÓXIMOS PASSOS (AGUARDANDO APROVAÇÃO):**

### **FASE 2: CONSOLIDAÇÃO DOS FRONTENDS**
1. Arquivar `/public/` → `/legacy/public/`
2. Atualizar `package.json` raiz
3. Configurar deploy para usar apenas React

### **FASE 3: CORREÇÕES DE AUTENTICAÇÃO**
1. Implementar "Esqueci minha senha"
2. Corrigir login admin
3. Padronizar JWT/bcrypt

### **FASE 4: ADMIN FUNCIONAL**
1. Migrar dashboard para React
2. Implementar aprovação de cadastros
3. Sistema de bairros ativo/inativo

### **FASE 5: NOMENCLATURA E SEEDS**
1. Trocar "Comunidade" → "Bairros"
2. Criar seeds dos 5 bairros
3. Botão "Acompanhamento ativo"

---

## ✅ **GATE DE APROVAÇÃO**

**Status:** AGUARDANDO APROVAÇÃO PARA FASE 2

**Commit:** `e63361e` - Snapshot inicial criado  
**Branch:** `audit/anti-frankenstein`  
**Backups:** Seguros em `/audit/backups/`

**Próxima ação:** Aguardando autorização para iniciar FASE 2
