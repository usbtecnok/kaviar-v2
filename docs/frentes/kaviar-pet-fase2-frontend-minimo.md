# KAVIAR Pet — Fase 2: Frontend Mínimo

> Plano técnico para a primeira presença visual do KAVIAR Pet no frontend/app, sem tocar no core crítico.

---

## 1. Card no App Passageiro

### Proposta

Adicionar um slide ao `HomeOpportunityCarousel` existente:

```typescript
{
  icon: '🐾',
  title: 'KAVIAR Pet',
  sub: 'Transporte pet com operação assistida. Motoristas certificados.',
  cta: 'Conhecer',
  action: 'pet'
}
```

### Onde aparece

- **Componente**: `src/components/passenger/HomeOpportunityCarousel.tsx`
- **Posição**: último slide do carousel "Destaques para você"
- **Tela**: Home do passageiro (`app/(passenger)/home.tsx`)

### Impacto visual

| Aspecto | Avaliação |
|---------|-----------|
| Mudança visual | Mínima — 1 card a mais no carousel horizontal |
| Consistência | Usa exatamente o mesmo padrão dos outros cards |
| Reversibilidade | Remover 1 objeto do array SLIDES |

### Risco técnico

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Regressão visual | Muito baixo | Mesmo componente, mesmo estilo |
| Impacto em performance | Zero | 1 card a mais no ScrollView |
| Conflito com fluxo existente | Zero | Ação abre URL externa ou tela isolada |

### Ação do card

Opções (em ordem de simplicidade):

1. **`Linking.openURL('https://kaviar.com.br/pet')`** — abre landing externa (mais seguro)
2. **`router.push('/(passenger)/pet')`** — tela interna isolada (mais integrado)

**Recomendação**: opção 1 na Fase 2, migrar para opção 2 quando a tela interna estiver pronta.

---

## 2. Landing Mínima

### Objetivo

Página pública que apresenta o KAVIAR Pet, mostra o teaser e captura pré-cadastros de motoristas interessados.

### Onde hospedar

| Opção | Prós | Contras |
|-------|------|---------|
| **Nova rota no frontend-app** (`/pet`) | Reutiliza infra S3+CloudFront, mesmo deploy | Acoplado ao admin |
| **Página no site principal** (`kaviar.com.br/pet`) | Separação total, SEO | Depende de outro deploy |
| **Rota pública no frontend-app** | Padrão já usado (`KaviarLanding.jsx`) | ✓ Recomendado |

**Recomendação**: criar `PetLanding.jsx` no frontend-app, seguindo o padrão de `KaviarLanding.jsx` (mesma estrutura, estilos, componentes MUI).

### Conteúdo da landing

| Seção | Conteúdo |
|-------|----------|
| Hero | Logo KAVIAR Pet + título + subtítulo premium |
| Teaser | Embed do vídeo teaser vertical (ou player inline) |
| Como funciona | 4 passos visuais (treinamento → questionário → fotos → selo) |
| Requisitos | Carro com banco traseiro, capa protetora, cinto pet, kit higienização |
| Homologação | "Treinamento obrigatório — operação assistida pela Central" |
| CTA | Botão "Quero me cadastrar" → formulário ou WhatsApp |
| Footer | KAVIAR Pet — Operação Certificada |

### Componentes reutilizáveis

Do `KaviarLanding.jsx` existente:
- Estilos `sx` (gold, bg, card, goldBtn, outlineBtn, input)
- Layout (Container, Box, Typography)
- Padrão de formulário com TextField MUI

### Rota

```javascript
// frontend-app/src/routes/index.jsx
{ path: '/pet', element: <PetLanding /> }
```

---

## 3. Pré-cadastro

### Campos do formulário

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Nome completo | text | ✓ | Min 3 chars |
| WhatsApp | tel | ✓ | Formato (XX) XXXXX-XXXX |
| Bairro/região | text | ✓ | — |
| Modelo do carro | text | ✓ | — |
| Experiência com pets | select | ✓ | "Tenho pet" / "Já transportei" / "Nunca transportei" |
| Aceite das regras | checkbox | ✓ | Deve ser true |

### Fluxo

```
Motorista preenche formulário
    → Dados salvos (planilha ou endpoint simples)
    → Mensagem de confirmação na tela
    → Operadora recebe notificação (WhatsApp ou e-mail)
    → Operadora inicia fluxo de homologação
```

### Opções de backend (sem complexidade)

| Opção | Esforço | Risco |
|-------|---------|-------|
| **Google Forms embed** | Zero | Sem controle visual |
| **Endpoint POST simples** (`/api/pet/lead`) | Baixo | 1 rota + 1 tabela |
| **Salvar em planilha via Apps Script** | Baixo | Sem migration |
| **WhatsApp direto** (link com mensagem pré-formatada) | Zero | Sem dados estruturados |

**Recomendação Fase 2**: endpoint POST simples que salva na tabela `pet_leads` (ou reutiliza `leads` existente com `source: 'pet'`). Alternativa zero-risco: WhatsApp com mensagem pré-formatada.

### Mensagem WhatsApp pré-formatada (fallback)

```
https://wa.me/5521XXXXXXXXX?text=Olá!%20Quero%20me%20cadastrar%20no%20KAVIAR%20Pet.%0ANome:%20%0ABairro:%20%0ACarro:%20
```

---

## 4. Arquitetura Segura — O que NÃO tocar

### Componentes protegidos (não alterar na Fase 2)

| Componente | Motivo |
|------------|--------|
| Dispatcher / matching | Core de corridas, qualquer bug para toda a operação |
| `rides_v2` / ride flow | Fluxo crítico motorista↔passageiro |
| Mapa / geolocalização | Afeta todas as corridas |
| Pricing engine | Cálculo de preço, impacto financeiro |
| App motorista (fluxo principal) | Regressão afeta operação real |
| App passageiro (fluxo de corrida) | Regressão afeta UX principal |
| Auth / JWT / sessions | Segurança global |
| Payments / Stripe | Financeiro |

### Princípios da Fase 2

| Princípio | Como garantir |
|-----------|--------------|
| **Isolamento** | Arquivos novos, sem editar existentes (exceto 1 linha no carousel + 1 rota) |
| **Reversibilidade** | Remover 1 slide do array + deletar `PetLanding.jsx` = rollback completo |
| **Sem risco de regressão** | Nenhum import em componentes core, nenhuma migration no schema principal |
| **Feature flag** | Card só aparece se `feature_pet_visible: true` (opcional) |

### Superfície de mudança

```
Arquivos NOVOS (sem impacto):
  frontend-app/src/pages/PetLanding.jsx        ← landing page
  backend/src/routes/pet.routes.ts             ← endpoint de lead (opcional)

Arquivos EDITADOS (1 linha cada):
  src/components/passenger/HomeOpportunityCarousel.tsx  ← +1 slide no array
  frontend-app/src/routes/index.jsx                    ← +1 rota /pet
```

---

## 5. Estrutura Futura (Conceitual)

### Roles

```
PET_OPERATOR
├── Ver corridas pet da sua região
├── Validar fotos de motoristas
├── Registrar incidentes
├── Comunicar via templates
└── Consultar motoristas certificados

PET_SUPERVISOR
├── Tudo de PET_OPERATOR
├── Suspender/reativar motoristas
├── Aprovar recursos
├── Revisar auditoria
├── Alterar protocolo
└── Gerenciar operadoras
```

### Corridas Pet

```
pet_rides (futura)
├── id
├── ride_id (FK → rides_v2)
├── pet_type (dog | cat | other)
├── pet_size (small | medium | large)
├── pet_count
├── containment_type (harness | crate | carrier)
├── photo_boarding_url
├── photo_delivery_url
├── hygiene_confirmed
├── operator_id (FK → admin_users)
├── incident_id (FK → pet_incidents, nullable)
├── created_at
└── updated_at
```

### Taxa Pet

```
pet_pricing (futura)
├── base_fee_cents (taxa fixa pet)
├── size_multiplier (1.0 | 1.3 | 1.6)
├── extra_pet_fee_cents
├── extraordinary_cleaning_fee_cents
└── region_id
```

### Validação de Selo

```
pet_certifications (futura)
├── id
├── driver_id
├── status (active | expired | suspended | revoked)
├── quiz_score
├── photos_approved_at
├── issued_at
├── expires_at
├── suspended_at
├── revoked_at
├── revoked_reason
└── operator_id (quem aprovou)
```

### Corrida Acompanhada pela Central

```
Fluxo futuro:
1. Passageiro solicita corrida pet
2. Sistema verifica selo do motorista
3. Central é notificada (operadora acompanha)
4. Motorista confirma capa instalada
5. Embarque: foto obrigatória → operadora valida
6. Corrida: monitoramento passivo
7. Entrega: confirmação tutor + motorista
8. Higienização: motorista confirma
9. Central fecha corrida pet
```

---

## 6. Recomendação Técnica

### Menor caminho seguro

| Ordem | Ação | Esforço | Risco |
|-------|------|---------|-------|
| 1 | Adicionar slide "KAVIAR Pet" no carousel do app | 5 min | Zero |
| 2 | Criar `PetLanding.jsx` no frontend-app | 2-3h | Muito baixo |
| 3 | Adicionar rota `/pet` no frontend-app | 1 min | Zero |
| 4 | Deploy frontend (S3 sync) | 5 min | Baixo (reversível) |
| 5 | Testar card → landing → WhatsApp | 15 min | — |

**Total: ~3h para ter KAVIAR Pet visível publicamente.**

### Risco geral

| Aspecto | Avaliação |
|---------|-----------|
| Risco de regressão | **Praticamente zero** — arquivos isolados |
| Risco de deploy | **Baixo** — frontend é S3 sync, rollback = sync anterior |
| Risco de dados | **Zero** — sem migration, sem alteração de schema |
| Risco de UX | **Baixo** — 1 card no carousel, landing separada |

### O que fazer PRIMEIRO

1. ✅ Criar `PetLanding.jsx` (cópia simplificada de `KaviarLanding.jsx`)
2. ✅ Adicionar rota `/pet`
3. ✅ Adicionar slide no carousel com `Linking.openURL`
4. ✅ Testar localmente
5. ✅ Deploy frontend

### O que NÃO fazer ainda

| Ação | Motivo |
|------|--------|
| Criar tabelas no banco | Sem necessidade na Fase 2, risco de migration |
| Alterar fluxo de corrida | Core crítico |
| Integrar com dispatcher | Complexidade alta, risco de regressão |
| Criar tela interna no app mobile | Requer build + deploy de APK |
| Implementar pagamento pet | Depende de pricing engine |
| Criar roles PET_OPERATOR | Depende de middleware de permissão |
| Alterar app do motorista | Requer APK, risco de regressão |

### Sequência recomendada (próximas fases)

```
Fase 2 (agora):  Card + Landing + WhatsApp          → 3h
Fase 3:          Endpoint /api/pet/lead + tabela     → 4h
Fase 4:          Tela interna no app passageiro      → 8h
Fase 5:          pet_certifications + dashboard      → 2-3 dias
Fase 6:          Integração com rides_v2             → 1 semana+
```

---

## Histórico

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-05-26 | 1.0 | Plano técnico inicial — card, landing, pré-cadastro, arquitetura segura |
