# Checklist de Validação - Demo Kaviar
**Versão:** 2.0 (Passenger + Admin)  
**Data:** 03/02/2026

---

## ✅ Validação Backend

### Contas de Investidor
- [ ] Rodar `node scripts/create-investor-accounts.js`
- [ ] Verificar arquivo `INVESTORS_ACCESS_GENERATED.md` criado
- [ ] Confirmar 10 contas no banco: `SELECT * FROM admins WHERE role = 'INVESTOR_VIEW';`
- [ ] Verificar senhas aleatórias (16 caracteres)
- [ ] Confirmar `must_change_password = true`

### Middleware
- [ ] Middleware `investorView` aplicado em `/api/admin` e `/api/passenger`
- [ ] POST retorna 403 para INVESTOR_VIEW
- [ ] PUT retorna 403 para INVESTOR_VIEW
- [ ] DELETE retorna 403 para INVESTOR_VIEW
- [ ] GET funciona normalmente
- [ ] Endpoints de auth (login, forgot, reset) funcionam
- [ ] Endpoints de documentos bloqueados
- [ ] Endpoints de exports bloqueados

### Headers
- [ ] Response tem `X-Demo-Mode: true`
- [ ] Response tem `X-Investor-View: true`

---

## ✅ Validação Frontend - Passenger

### Login
- [ ] Acessar `/login?demo=1`
- [ ] Login com `investor01@kaviar.com`
- [ ] Badge "Demonstração" aparece
- [ ] Roteiro guiado aparece (3 passos)

### Roteiro Guiado
- [ ] Passo 1: Link para Favoritos funciona
- [ ] Passo 2: Link para Histórico funciona
- [ ] Passo 3: Link para Perfil funciona
- [ ] Botão "Começar Exploração" fecha o roteiro
- [ ] Clicar fora fecha o roteiro
- [ ] Roteiro não aparece novamente na mesma sessão

### Favoritos
- [ ] Ver 8 favoritos salvos
- [ ] Nomes: Casa, Trabalho, Mercado, Academia, Escola, Posto de Saúde, Igreja, Padaria
- [ ] Endereços aparecem
- [ ] Mapa mostra pins (se implementado)
- [ ] Botão "Adicionar Favorito" desabilitado (com tooltip)
- [ ] Botão "Editar" desabilitado (com tooltip)
- [ ] Botão "Excluir" desabilitado (com tooltip)

### Histórico
- [ ] Ver 4 corridas
- [ ] 3 concluídas + 1 cancelada
- [ ] Valores aparecem: R$ 18,50 | R$ 22,00 | R$ 25,50 | R$ 0,00
- [ ] Datas aparecem
- [ ] Nomes de motoristas aparecem (João Silva, Maria Santos, Pedro Costa)
- [ ] Avaliações aparecem (5⭐, 5⭐, 4⭐)
- [ ] Status aparecem (completed, cancelled)
- [ ] Botão "Solicitar Novamente" desabilitado (com tooltip)

### Perfil
- [ ] Nome: Demo Passageiro
- [ ] Email: demo.passageiro@kaviar.com
- [ ] Telefone: (21) 9****-**** (mascarado)
- [ ] CPF: ***.***.***.** (mascarado)
- [ ] Corridas realizadas: 3
- [ ] Avaliação média: 4.7 ⭐
- [ ] Botão "Editar Perfil" desabilitado (com tooltip)

### Solicitar Corrida
- [ ] Botão "Solicitar Corrida" desabilitado (com tooltip)
- [ ] Formulário bloqueado (se acessível)
- [ ] Mensagem: "Ação não disponível em modo demonstração"

---

## ✅ Validação Frontend - Admin

### Login
- [ ] Acessar `/admin/login?demo=1`
- [ ] Login com `investor01@kaviar.com`
- [ ] Badge "Demonstração" aparece
- [ ] Roteiro guiado aparece (3 passos)

### Roteiro Guiado
- [ ] Passo 1: Link para Dashboard funciona
- [ ] Passo 2: Link para Bairros funciona
- [ ] Passo 3: Link para System Status funciona
- [ ] Botão "Começar Exploração" fecha o roteiro
- [ ] Clicar fora fecha o roteiro
- [ ] Roteiro não aparece novamente na mesma sessão

### Dashboard
- [ ] Ver 4 KPI cards
- [ ] KPI 1: 162 bairros mapeados
- [ ] KPI 2: 28 motoristas ativos
- [ ] KPI 3: 9 pendentes aprovação
- [ ] KPI 4: 247 corridas (30 dias)
- [ ] Gráfico de corridas aparece
- [ ] Gráfico mostra 30 dias
- [ ] Barras coloridas (últimos 7 dias em azul escuro)
- [ ] Estatísticas: Total 247 | Média 8.2 | Máximo 12

### Motoristas
- [ ] Ver lista de motoristas
- [ ] Ver 28 motoristas ativos
- [ ] Ver 9 pendentes aprovação
- [ ] Nomes aparecem (João Silva, Maria Santos, etc.)
- [ ] Comunidades aparecem (Rocinha, Vidigal, etc.)
- [ ] Avaliações aparecem (4.6-4.9 ⭐)
- [ ] Botão "Aprovar" desabilitado (com tooltip)
- [ ] Botão "Rejeitar" desabilitado (com tooltip)
- [ ] Botão "Editar" desabilitado (com tooltip)

### Bairros
- [ ] Ver 162 bairros mapeados
- [ ] Filtro por cidade: Rio de Janeiro
- [ ] Exemplos aparecem (Rocinha, Vidigal, Complexo do Alemão, etc.)
- [ ] Mapa com geofences (se implementado)
- [ ] Botão "Adicionar Bairro" desabilitado (com tooltip)
- [ ] Botão "Editar" desabilitado (com tooltip)

### System Status
- [ ] Acessar `/admin/system-status`
- [ ] Health: ✅ Healthy
- [ ] Database: ✅ Connected
- [ ] Uptime: 72h 15m (ou valor demo)
- [ ] Versão: 1.0.0
- [ ] Commit: 8652666
- [ ] Último Deploy: data aparece
- [ ] Feature Flags: 3 ativas
- [ ] Flag 1: passenger_favorites_matching (1%)
- [ ] Flag 2: beta_monitor (100%)
- [ ] Flag 3: compliance_notifications (100%)
- [ ] Aviso: "Dados de demonstração" aparece

---

## ✅ Validação de Segurança

### Bloqueios Frontend
- [ ] Todos os botões de ação desabilitados
- [ ] Tooltips explicativos aparecem ao hover
- [ ] Formulários bloqueados
- [ ] Badge sempre visível

### Bloqueios Backend
- [ ] POST /api/admin/drivers → 403
- [ ] PUT /api/admin/drivers/:id → 403
- [ ] DELETE /api/admin/drivers/:id → 403
- [ ] POST /api/passengers/rides → 403
- [ ] GET /api/admin/documents/download → 403
- [ ] GET /api/admin/exports → 403
- [ ] GET /api/admin/dashboard → 200 (permitido)
- [ ] GET /api/passengers/favorites → 200 (permitido)

### Dados Sensíveis
- [ ] CPF mascarado: ***.***.***.** 
- [ ] Telefone mascarado: (21) 9****-****
- [ ] Endereços completos não aparecem
- [ ] Documentos não podem ser baixados

---

## ✅ Validação Cross-Browser

### Desktop
- [ ] Chrome (última versão)
- [ ] Firefox (última versão)
- [ ] Safari (última versão)
- [ ] Edge (última versão)

### Mobile
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Responsivo em 375px (iPhone SE)
- [ ] Responsivo em 768px (iPad)

### Funcionalidades Mobile
- [ ] Login funciona
- [ ] Roteiro guiado aparece
- [ ] Badge visível
- [ ] KPIs legíveis
- [ ] Gráfico renderiza
- [ ] Listas scrolláveis
- [ ] Botões clicáveis

---

## ✅ Validação de Performance

### Tempo de Carregamento
- [ ] Login < 2s
- [ ] Dashboard < 3s
- [ ] Favoritos < 1s
- [ ] Histórico < 1s
- [ ] System Status < 2s

### Dados Demo
- [ ] Carregam instantaneamente (JSON local)
- [ ] Sem chamadas API desnecessárias
- [ ] Console sem erros

---

## ✅ Validação de UX

### Primeira Impressão
- [ ] Roteiro guiado aparece automaticamente
- [ ] Badge "Demonstração" é discreto mas visível
- [ ] Interface limpa e profissional
- [ ] Dados parecem reais (não obviamente fake)

### Navegação
- [ ] Menu funciona
- [ ] Links funcionam
- [ ] Voltar funciona
- [ ] Logout funciona

### Feedback Visual
- [ ] Botões desabilitados têm aparência diferente (opacity 0.5)
- [ ] Tooltips aparecem ao hover
- [ ] Gráfico tem animação suave
- [ ] Transições suaves

---

## ✅ Validação de Conteúdo

### Textos
- [ ] Sem erros de português
- [ ] Números formatados (R$ 18,50 não R$18.5)
- [ ] Datas formatadas (03/02/2026 não 2026-02-03)
- [ ] Nomes realistas (não "User 1", "User 2")

### Dados
- [ ] Números plausíveis (não inflados)
- [ ] Crescimento gradual (não exponencial)
- [ ] Marcados como "Demonstração" onde necessário

---

## ✅ Validação Final

### Documentação
- [ ] DEMO_RUNBOOK_V2.md completo
- [ ] DEMO_IMPLEMENTATION.md atualizado
- [ ] INVESTORS_ACCESS_GENERATED.md criado (não versionado)
- [ ] .gitignore atualizado

### Git
- [ ] Commit com mensagem clara
- [ ] Push para main
- [ ] INVESTORS_ACCESS*.md não está no Git

### Distribuição
- [ ] Template de email preparado
- [ ] Senhas geradas
- [ ] Data de expiração definida (30 dias)
- [ ] Contatos de suporte prontos

---

## 📊 Resumo de Validação

**Total de checks:** ~150

**Mínimo para aprovar:**
- ✅ 100% Backend (contas + middleware)
- ✅ 100% Segurança (bloqueios)
- ✅ 90% Frontend (pode ter pequenos bugs visuais)
- ✅ 80% Cross-browser (Chrome + Firefox obrigatório)

**Critério de aprovação:**
- Zero erros críticos (login, segurança, dados)
- Máximo 3 erros menores (visual, UX)
- Funciona em Chrome + Firefox + Mobile

---

## 🐛 Registro de Bugs

| # | Descrição | Severidade | Status |
|---|-----------|------------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Severidades:**
- 🔴 Crítico: Bloqueia demo
- 🟡 Médio: Afeta experiência
- 🟢 Baixo: Cosmético

---

**Validado por:** _____________  
**Data:** ___/___/______  
**Status:** ⬜ Aprovado | ⬜ Reprovado | ⬜ Aprovado com ressalvas
