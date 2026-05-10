# Paleta Visual KAVIAR Admin — Claro Premium

**Data:** 2026-05-09  
**Aplicado em:** Dashboard admin (`AdminApp.jsx`, `RatingsOverviewCard.jsx`)

---

## Cores Base

| Token | Valor | Uso |
|-------|-------|-----|
| Fundo claro | `#FAFAF8` | Background da página |
| Card | `#FFFFFF` | Fundo dos cards |
| Texto principal | `#1A1A1A` | Títulos, números, conteúdo |
| Texto secundário | `#6B7280` | Descrições, labels |
| Dourado KAVIAR | `#B8942E` | Ícones, bordas, botões, destaques |
| Dourado texto acessível | `#8B6914` | Texto dourado pequeno (passa AA) |
| Borda clara | `#E8E5DE` | Bordas de cards neutros |
| Borda dourada suave | `rgba(184,148,46,0.18)` | Bordas de cards de gerenciamento |
| Borda dourada hover | `rgba(184,148,46,0.45)` | Hover em cards |

---

## Regras de Uso

- Usar `#1A1A1A` para texto principal
- Usar `#6B7280` para texto secundário
- Usar `#B8942E` para ícones, bordas, detalhes e botões
- Evitar `#B8942E` em texto pequeno — não passa contraste WCAG AA (3.8:1)
- Usar `#8B6914` quando precisar de texto dourado em tamanho normal
- Evitar `#FFD700` no tema claro — parece neon e tem baixo contraste (1.3:1)
- Manter visual claro, empresarial e premium

---

## Contraste

| Par | Ratio | WCAG AA |
|-----|-------|---------|
| `#1A1A1A` sobre `#FAFAF8` | 15.5:1 | ✅ Excelente |
| `#6B7280` sobre `#FAFAF8` | 5.3:1 | ✅ Adequado |
| `#8B6914` sobre `#FFFFFF` | ~6:1 | ✅ Passa AA |
| `#B8942E` sobre `#FFFFFF` | 3.8:1 | ❌ Só decoração |
| `#9CA3AF` sobre `#FAFAF8` | 3.3:1 | ⚠️ Apenas labels uppercase/bold |

---

## Migração Futura (ordem sugerida)

1. `StaffManagement.jsx` (2 ocorrências — teste mínimo)
2. `LocalOperators.jsx` (parcialmente migrado)
3. `ConsultantLeads.jsx` (7 ocorrências)
4. `CompensationsPage.jsx` (4 ocorrências)
5. `FinancePayments.jsx` (6 ocorrências)
6. `LocalSupportDrivers.jsx` (9 ocorrências)
7. `ReferralManagement.jsx` (11 ocorrências)
8. `CreditPurchases.jsx` (14 ocorrências)
9. `OperationsMonitor.jsx` (6 ocorrências)
10. `WhatsAppCentral.jsx` (16 ocorrências — mais complexo)
