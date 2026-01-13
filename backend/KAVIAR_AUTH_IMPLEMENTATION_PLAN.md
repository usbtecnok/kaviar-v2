# KAVIAR - Plano de Implementação: Autenticação, Onboarding e Avaliação

## 🎯 OBJETIVO
Implementar fluxo completo de autenticação para 3 perfis + admin com aprovação e sistema de avaliação funcional.

## 🚫 REGRAS DE GOVERNANÇA
- ❌ NÃO COMMITAR (sem git commit/push)
- ❌ NÃO bagunçar backend (mudanças mínimas e cirúrgicas)
- ❌ NÃO gerar lixo (sem duplicatas, v2, temp, etc.)
- ✅ Mudanças idempotentes e compatíveis
- ✅ Diffs exatos para aplicação manual

## 📊 AUDITORIA ATUAL

### ✅ JÁ FUNCIONA
- Login admin (`/api/admin/auth/login`)
- Login passageiro (`/api/auth/passenger/login`)
- Cadastro passageiro (`/api/governance/passenger`)
- LGPD consent (`/api/governance/consent`)
- Schema completo no Prisma
- Frontend com telas prontas

### ❌ PRECISA IMPLEMENTAR

#### Backend (Mínimo)
1. **Cadastro Motorista**: `POST /api/governance/driver`
2. **Cadastro Guia**: `POST /api/governance/guide`  
3. **Login Guia**: `POST /api/auth/guide/login`
4. **Admin Aprovação**: `PUT /api/admin/drivers/:id/approve`
5. **Admin Aprovação**: `PUT /api/admin/guides/:id/approve`
6. **Avaliação**: `POST /api/ratings` (ativar módulo existente)
7. **Avaliação**: `GET /api/ratings/driver/:id` (estatísticas)
8. **LGPD Check**: Validar aceite no login passageiro

#### Frontend (Correções)
1. **Conectar avaliação** ao backend real
2. **Guards de rota** com redirect 401
3. **Admin approval** conectar ao backend
4. **Persistência sessão** com interceptor
5. **Loading states** e tratamento erro

## 🔧 IMPLEMENTAÇÃO

### FASE 1: Backend - Rotas de Cadastro
- Adicionar rotas governance para driver e guide
- Usar padrão existente do passenger
- Validação mínima com Zod
- Hash de senha com bcrypt

### FASE 2: Backend - Rotas de Login  
- Login guide seguindo padrão driver
- Verificar status approved
- JWT com userType correto

### FASE 3: Backend - Admin Aprovação
- Endpoints para aprovar/rejeitar
- Atualizar status no banco
- Logs de auditoria

### FASE 4: Backend - Sistema Avaliação
- Ativar módulo rating existente
- Montar rotas no app.ts
- Conectar ao controller existente

### FASE 5: Frontend - Correções
- Conectar RideRating ao backend
- Implementar guards
- Corrigir admin panels
- Loading e error states

## 📝 ENTREGÁVEIS
1. **Diffs Backend** (para aplicação manual)
2. **Scripts SQL** (usuários teste)
3. **Roteiro cURL** (validação completa)
4. **Relatório Final** (auditoria + mudanças)

## 🧪 USUÁRIOS TESTE
- Admin: admin@kaviar.com / admin123
- Driver: driver@test.com / driver123 (pendente → aprovado)
- Passenger: passenger@test.com / pass123 (ativo com LGPD)
- Guide: guide@test.com / guide123 (pendente → aprovado)

## ✅ VALIDAÇÃO
- [ ] Cadastro completo (3 perfis)
- [ ] Login completo (3 perfis + admin)
- [ ] Aprovação admin (driver + guide)
- [ ] LGPD blocking (passenger)
- [ ] Avaliação motorista (end-to-end)
- [ ] Guards de rota (401 redirect)
- [ ] Persistência sessão
- [ ] Botão pânico (não quebrar)

---
**INÍCIO DA IMPLEMENTAÇÃO: 2026-01-13 16:40**
