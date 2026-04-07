# Demo Mode - Kaviar para Investidores
**Objetivo:** Apresentação profissional para 10 investidores anjo  
**Prioridade:** Segurança (read-only) + Visual impactante + Dados realistas

---

## 🎯 Implementação (Ordem de Prioridade)

### ✅ Fase 1: Demo Mode + Seed Data (CRÍTICO)
- [ ] Criar `src/demo/demoData.ts` com dados realistas
- [ ] Criar `src/demo/demoMode.ts` (ativar via ?demo=1)
- [ ] Badge "Ambiente de Demonstração" em todas as páginas
- [ ] Bloquear ações destrutivas (delete, approve, payment)

### ✅ Fase 2: Dashboard Executivo (IMPACTO VISUAL)
- [ ] 4 KPI cards no topo (motoristas, corridas, bairros, compliance)
- [ ] Gráfico de corridas (7/30 dias)
- [ ] Mapa com pins/geofences
- [ ] Skeleton loaders profissionais

### ✅ Fase 3: 10 Contas Investidor (SEGURANÇA)
- [ ] Criar role `INVESTOR_VIEW` no backend
- [ ] 10 contas: investor01@kaviar.com ... investor10@kaviar.com
- [ ] Permissões: somente leitura, sem dados sensíveis

### ✅ Fase 4: Status do Sistema (PROVA TÉCNICA)
- [ ] Página `/admin/system-status`
- [ ] Health check (/api/health)
- [ ] Versão/commit
- [ ] Feature flags (read-only)

### ⏳ Fase 5: Tour Guiado (NICE TO HAVE)
- [ ] 6 passos com overlay
- [ ] Pode ser implementado depois se tempo permitir

---

## 📁 Estrutura de Arquivos

```
frontend-app/src/
├── demo/
│   ├── demoData.ts          # Dados seed realistas
│   ├── demoMode.ts           # Lógica de ativação
│   └── demoConfig.ts         # Configurações
├── components/
│   ├── DemoBadge.tsx         # Badge "Demonstração"
│   ├── DemoBlocker.tsx       # Bloquear ações
│   └── admin/
│       ├── DashboardKPI.tsx  # 4 cards KPI
│       ├── RidesChart.tsx    # Gráfico corridas
│       └── SystemStatus.tsx  # Status do sistema
└── pages/admin/
    └── SystemStatus.tsx      # Página status

backend/src/
├── routes/
│   └── demo.ts               # Endpoints /api/demo/* (opcional)
└── middleware/
    └── investorView.ts       # Middleware read-only
```

---

## 🔐 Segurança (Regras Obrigatórias)

### 1. Não Tocar em Produção
- ✅ Dados demo em JSON local (frontend)
- ✅ Endpoints /api/demo/* separados (se necessário)
- ✅ Nenhuma migration no banco de produção

### 2. Read-Only para Investidores
- ✅ Role `INVESTOR_VIEW` com permissões limitadas
- ✅ Middleware bloqueia POST/PUT/DELETE
- ✅ Frontend desabilita botões de ação

### 3. Dados Sensíveis
- ✅ Sem CPF, telefone, endereço real
- ✅ Dados demo marcados claramente
- ✅ Nomes/emails fictícios

---

## 📊 Dados Demo (Realistas, Sem Mentir)

### Admin Dashboard
```typescript
{
  kpis: {
    bairrosMapeados: 162,        // Real
    motoristasAtivos: 28,         // Plausível (pré-lançamento)
    motoristasPendentes: 9,       // Plausível
    corridasDemo: 247,            // Últimos 30 dias (demo)
    eventosCompliance: 6          // Plausível
  },
  corridasPorDia: [
    { data: '2026-01-25', corridas: 4 },
    { data: '2026-01-26', corridas: 7 },
    // ... 30 dias
  ]
}
```

### Passenger
```typescript
{
  favoritos: [
    { id: 1, label: 'Casa', lat: -22.9068, lng: -43.1729 },
    { id: 2, label: 'Trabalho', lat: -22.9035, lng: -43.2096 },
    // ... 6-10 favoritos
  ],
  historicoCorreidas: [
    { id: 1, origem: 'Rocinha', destino: 'Copacabana', status: 'completed', valor: 18.50 },
    // ... 3-5 corridas
  ]
}
```

### Driver
```typescript
{
  ganhosMes: 1847.30,            // Plausível
  corridasConcluidas: 42,        // Plausível
  avaliacao: 4.8,                // Plausível
  documentos: {
    cnh: 'aprovado',
    certidao: 'pendente',
    // ...
  }
}
```

---

## 🎨 Visual (Impacto)

### Dashboard KPI Cards
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 162 Bairros │ 28 Motorist │ 9 Pendentes │ 247 Corridas│
│ Mapeados    │ Ativos      │ Aprovação   │ (30 dias)   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Gráfico de Corridas
```
Corridas por Dia (Últimos 30 dias)
  ▁▂▃▄▅▆▇█
```

### Mapa
```
[Mapa do Rio com pins nos bairros mapeados]
- 162 geofences coloridos
- Pins de motoristas ativos (demo)
```

---

## 🚀 Implementação Mínima (2-3 horas)

### Passo 1: Demo Data (30 min)
```bash
# Criar arquivo de dados
touch frontend-app/src/demo/demoData.ts
```

### Passo 2: Demo Mode (30 min)
```bash
# Criar lógica de ativação
touch frontend-app/src/demo/demoMode.ts
touch frontend-app/src/components/DemoBadge.tsx
```

### Passo 3: Dashboard KPI (45 min)
```bash
# Criar componentes visuais
touch frontend-app/src/components/admin/DashboardKPI.tsx
touch frontend-app/src/components/admin/RidesChart.tsx
```

### Passo 4: Contas Investidor (30 min)
```bash
# Backend: criar role e contas
# Frontend: bloquear ações
```

### Passo 5: System Status (30 min)
```bash
# Página de status
touch frontend-app/src/pages/admin/SystemStatus.tsx
```

---

## 📝 Próximos Passos

1. Criar estrutura de arquivos
2. Implementar demo data
3. Implementar demo mode
4. Criar dashboard visual
5. Criar contas investidor
6. Testar tudo
7. Documentar acesso

---

**Tempo estimado total:** 2-3 horas  
**Risco para produção:** Zero (tudo isolado)  
**Impacto visual:** Alto
