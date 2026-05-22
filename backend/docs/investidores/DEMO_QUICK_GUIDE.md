# Demo Mode - Guia de Implementação Rápido
**Data:** 03/02/2026 20:45 BRT  
**URLs Padronizadas:**
- Passenger: `https://d29p7cirgjqbxl.cloudfront.net/login?demo=1`
- Admin: `https://d29p7cirgjqbxl.cloudfront.net/admin/login?demo=1`

---

## ✅ O Que Foi Implementado

### Backend
- ✅ Middleware `investorView` aplicado em `/api/*`
- ✅ Bloqueia POST/PUT/PATCH/DELETE para role `INVESTOR_VIEW`
- ✅ Bloqueia endpoints sensíveis (documentos, PII, exports)
- ✅ Permite autenticação (login, forgot, reset)
- ✅ Headers `X-Demo-Mode` e `X-Investor-View` nas respostas

### Frontend
- ✅ Detecção de `?demo=1` em Login e AdminLogin
- ✅ Badge "Ambiente de Demonstração" (fixo top-right)
- ✅ `demoMode.ts` com funções de controle
- ✅ `demoData.ts` com dados realistas
- ✅ `DemoBadge.tsx` componente visual
- ✅ `DemoBlocker.tsx` para bloquear ações
- ✅ `DemoWelcome.tsx` roteiro guiado

---

## 🚀 Próximos Passos (30 min)

### 1. Criar Contas INVESTOR_VIEW (5 min)

```bash
cd backend
node scripts/create-investor-accounts.js
```

**Output:** `INVESTORS_ACCESS_GENERATED.md` com 10 credenciais

### 2. Integrar DemoBadge (5 min)

**Admin Dashboard** (`src/pages/admin/Dashboard.jsx`):
```jsx
import DemoBadge from '../../components/DemoBadge';

function Dashboard() {
  return (
    <>
      <DemoBadge />
      {/* resto do dashboard */}
    </>
  );
}
```

**Passenger Home** (`src/pages/passenger/Home.jsx`):
```jsx
import DemoBadge from '../../components/DemoBadge';

function Home() {
  return (
    <>
      <DemoBadge />
      {/* resto da home */}
    </>
  );
}
```

**AdminApp** (`src/components/admin/AdminApp.jsx`):
```jsx
import DemoBadge from '../DemoBadge';

function AdminApp() {
  return (
    <>
      <DemoBadge />
      {/* resto do app */}
    </>
  );
}
```

### 3. Integrar DemoWelcome (5 min)

**Admin Dashboard**:
```jsx
import DemoWelcome from '../../components/DemoWelcome';

<DemoWelcome type="admin" />
```

**Passenger Home**:
```jsx
import DemoWelcome from '../../components/DemoWelcome';

<DemoWelcome type="passenger" />
```

### 4. Bloquear Ações no Frontend (10 min)

**Exemplo - Botão de Aprovar**:
```jsx
import { isDemoMode, canPerformAction } from '../../demo/demoMode';
import DemoBlocker from '../../components/DemoBlocker';

<DemoBlocker action="approve">
  <Button
    onClick={handleApprove}
    disabled={isDemoMode() || !canPerformAction('approve')}
  >
    Aprovar
  </Button>
</DemoBlocker>
```

**Exemplo - Formulário**:
```jsx
<DemoBlocker action="edit">
  <TextField
    disabled={isDemoMode()}
    value={value}
    onChange={handleChange}
  />
</DemoBlocker>
```

### 5. Testar (5 min)

```bash
# Acessar com ?demo=1
https://d29p7cirgjqbxl.cloudfront.net/login?demo=1

# Login com conta investidor
investor01@kaviar.com
[senha gerada]

# Verificar:
✅ Badge aparece
✅ Roteiro guiado aparece
✅ Botões desabilitados
✅ POST/PUT/DELETE bloqueados (403)
```

---

## 📦 Arquivos Criados/Modificados

### Backend (2 arquivos)
```
src/
├── middleware/
│   └── investorView.ts          ✅ Middleware read-only
└── app.ts                        ✅ Aplicado em /api/*
```

### Frontend (7 arquivos)
```
src/
├── demo/
│   ├── demoMode.ts               ✅ Lógica de controle
│   └── demoData.ts               ✅ Dados realistas
├── components/
│   ├── DemoBadge.tsx             ✅ Badge visual
│   ├── DemoBlocker.tsx           ✅ Bloquear ações
│   └── DemoWelcome.tsx           ✅ Roteiro guiado
├── pages/
│   ├── Login.jsx                 ✅ Detecta ?demo=1
│   └── admin/
│       └── AdminLogin.jsx        ✅ Detecta ?demo=1
```

---

## 🔒 Segurança

### Backend
- ✅ Role `INVESTOR_VIEW` no banco
- ✅ Middleware bloqueia métodos destrutivos
- ✅ Endpoints sensíveis bloqueados
- ✅ Auth endpoints permitidos

### Frontend
- ✅ Badge sempre visível
- ✅ Botões desabilitados
- ✅ Tooltips explicativos
- ✅ Dados demo em JSON local

---

## 📊 Dados Demo

### Passenger
- 8 favoritos salvos
- 4 corridas no histórico
- Valores: R$ 18,50 | R$ 22,00 | R$ 25,50
- CPF/telefone mascarados

### Admin
- 162 bairros mapeados
- 28 motoristas ativos
- 247 corridas (30 dias)
- 9 pendentes aprovação

---

## 🎯 URLs Finais

**Passenger:**
```
https://d29p7cirgjqbxl.cloudfront.net/login?demo=1
```

**Admin:**
```
https://d29p7cirgjqbxl.cloudfront.net/admin/login?demo=1
```

**Credenciais:**
```
investor01@kaviar.com até investor10@kaviar.com
[senhas em INVESTORS_ACCESS_GENERATED.md]
```

---

## ✅ Checklist

**Backend:**
- [x] Middleware investorView criado
- [x] Middleware aplicado em /api/*
- [ ] Contas INVESTOR_VIEW criadas (rodar script)

**Frontend:**
- [x] DemoBadge criado
- [x] DemoWelcome criado
- [x] DemoBlocker criado
- [x] demoMode.ts criado
- [x] demoData.ts criado
- [x] Login detecta ?demo=1
- [x] AdminLogin detecta ?demo=1
- [ ] DemoBadge integrado em Dashboard
- [ ] DemoBadge integrado em Passenger Home
- [ ] DemoWelcome integrado
- [ ] Botões bloqueados

**Testes:**
- [ ] Acessar com ?demo=1
- [ ] Login com investor01
- [ ] Badge aparece
- [ ] Roteiro guiado funciona
- [ ] POST/PUT/DELETE retornam 403
- [ ] Testar em Chrome + Firefox
- [ ] Testar em mobile

---

## 🚀 Deploy

```bash
# Backend
cd backend
npm run build
pm2 restart kaviar-api

# Frontend
cd frontend-app
npm run build
aws s3 sync dist/ s3://kaviar-frontend/
aws cloudfront create-invalidation --distribution-id E123456 --paths "/*"
```

---

**Status:** ✅ Implementado (falta integração + testes)  
**Tempo estimado:** 30 minutos  
**Pronto para:** 10 investidores

---

**Versão:** 1.0  
**Preparado por:** Kiro (AWS AI Assistant)  
**Data:** 03/02/2026 20:45 BRT
