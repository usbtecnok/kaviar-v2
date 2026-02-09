# ADR-002: Modelo de Dados para Feedback de Corridas com Análise de Sentimento

**Status:** Proposto  
**Data:** 2026-02-08  
**Autor:** Engenharia KAVIAR  
**Contexto:** Sistema de feedback de clientes (passageiros) sobre corridas realizadas

---

## Contexto

O sistema KAVIAR precisa coletar feedback de passageiros sobre corridas realizadas para:
- Medir satisfação do serviço
- Identificar problemas operacionais
- Preparar infraestrutura para análise de sentimento futura (via AI externa)

**Requisitos:**
- Feedback vinculado a corridas (`rides`)
- Apenas passageiros podem avaliar (não motoristas)
- Estrutura para armazenar análise de sentimento (sem cálculo imediato)
- Zero impacto no core MVP (rides, pricing, geo, auth)
- Migration isolada e reversível

---

## Decisões

### 1. Estrutura de Duas Tabelas

**Decisão:** Separar feedback (dados do usuário) de análise de sentimento (dados computados).

**Justificativa:**
- **Separação de responsabilidades:** Feedback é input do usuário, sentimento é output de processamento
- **Evolução independente:** Análise pode ser recalculada sem tocar no feedback original
- **Auditabilidade:** Histórico de análises (se recalcular com modelo diferente)
- **Performance:** Queries de feedback não carregam dados de análise desnecessariamente

**Alternativas rejeitadas:**
- Tabela única com campos de sentimento: Mistura input/output, dificulta auditoria
- Tabela única com JSON: Perde tipagem, dificulta queries analíticas

---

### 2. Tabela `ride_feedbacks`

**Schema:**
```prisma
model ride_feedbacks {
  id            String   @id @default(uuid())
  ride_id       String   @unique
  passenger_id  String
  rating        Int      // 1-5 stars
  comment       String?  // Texto livre (opcional)
  tags          String?  // JSON array de tags (ex: ["pontualidade", "limpeza"])
  is_anonymous  Boolean  @default(false)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  
  rides         rides    @relation(fields: [ride_id], references: [id], onDelete: Cascade)
  passengers    passengers @relation(fields: [passenger_id], references: [id], onDelete: Cascade)
  
  @@index([passenger_id])
  @@index([rating])
  @@index([created_at])
}
```

**Decisões de design:**

#### 2.1. `ride_id` como `@unique`
- **Decisão:** 1 feedback por corrida (não múltiplos)
- **Justificativa:** Simplicidade, evita spam, alinhado com padrão de mercado (Uber/99)
- **Impacto:** Passageiro pode editar feedback (UPDATE), não criar novo

#### 2.2. `rating` como `Int` (não String)
- **Decisão:** Tipo numérico para facilitar agregações (AVG, COUNT)
- **Justificativa:** Queries analíticas (`SELECT AVG(rating)`) sem casting
- **Validação:** Aplicação valida range 1-5 (não constraint DB para flexibilidade futura)

#### 2.3. `comment` como `String?` (opcional)
- **Decisão:** Texto livre, não obrigatório
- **Justificativa:** Usuário pode avaliar apenas com estrelas
- **Limite:** Aplicação valida max 1000 chars (não constraint DB)

#### 2.4. `tags` como `String?` (JSON serializado)
- **Decisão:** Array de strings em JSON, não tabela separada
- **Justificativa:** 
  - Tags são metadados auxiliares (não entidade core)
  - Evita JOIN extra em queries simples
  - Flexibilidade para adicionar tags sem migration
- **Formato:** `["pontualidade", "limpeza", "simpatia"]`
- **Alternativa rejeitada:** Tabela `feedback_tags` (over-engineering para MVP)

#### 2.5. `is_anonymous` como `Boolean`
- **Decisão:** Flag para ocultar identidade do passageiro em relatórios
- **Justificativa:** LGPD/privacidade, permite feedback honesto
- **Impacto:** `passenger_id` sempre armazenado (auditoria), mas UI pode ocultar

#### 2.6. Sem `deleted_at` (soft delete)
- **Decisão:** Feedback não é deletável (apenas editável)
- **Justificativa:** Integridade de dados, auditoria, evita manipulação
- **Alternativa:** Admin pode marcar como "reportado" (feature futura, não neste modelo)

---

### 3. Tabela `ride_feedback_sentiment_analysis`

**Schema:**
```prisma
model ride_feedback_sentiment_analysis {
  id                String   @id @default(uuid())
  ride_feedback_id  String   @unique
  sentiment_score   Decimal? @db.Decimal(5, 4) // -1.0000 a +1.0000
  sentiment_label   String?  // "positive", "neutral", "negative"
  confidence_score  Decimal? @db.Decimal(5, 4) // 0.0000 a 1.0000
  model_version     String?  // Ex: "openai-gpt4-2024", "aws-comprehend-v2"
  analyzed_at       DateTime?
  analysis_metadata String?  // JSON com detalhes (keywords, emotions, etc)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  ride_feedbacks    ride_feedbacks @relation(fields: [ride_feedback_id], references: [id], onDelete: Cascade)
  
  @@index([sentiment_label])
  @@index([analyzed_at])
}
```

**Decisões de design:**

#### 3.1. `ride_feedback_id` como `@unique`
- **Decisão:** 1 análise ativa por feedback (última versão)
- **Justificativa:** Simplicidade, evita histórico desnecessário no MVP
- **Evolução futura:** Se precisar histórico, criar `sentiment_analysis_history`

#### 3.2. Campos `nullable` (sentiment_score, sentiment_label, etc)
- **Decisão:** Todos campos de análise são opcionais
- **Justificativa:** 
  - Registro pode ser criado antes da análise (placeholder)
  - Análise pode falhar (API externa indisponível)
  - Permite inserção incremental (score agora, metadata depois)

#### 3.3. `sentiment_score` como `Decimal(5,4)`
- **Decisão:** Range -1.0000 a +1.0000 (padrão NLP)
- **Justificativa:** Compatível com APIs (AWS Comprehend, OpenAI, HuggingFace)
- **Precisão:** 4 casas decimais suficientes para análise

#### 3.4. `sentiment_label` como `String` (não enum)
- **Decisão:** Valores esperados: "positive", "neutral", "negative"
- **Justificativa:** 
  - Flexibilidade para labels customizadas ("very_positive", "mixed")
  - Evita migration se API mudar taxonomia
  - Validação na aplicação, não no DB

#### 3.5. `model_version` para rastreabilidade
- **Decisão:** Armazenar qual modelo/API gerou a análise
- **Justificativa:** 
  - Auditoria (comparar modelos)
  - Debug (se análise estiver errada)
  - Recálculo seletivo (apenas feedbacks de modelo antigo)

#### 3.6. `analysis_metadata` como `String?` (JSON)
- **Decisão:** Campo livre para dados extras (keywords, emotions, topics)
- **Justificativa:** 
  - APIs retornam dados variados (não padronizável)
  - Evita criar 10+ colunas para metadados raros
  - Queries analíticas usam `sentiment_score`/`label`, não metadata

---

## Relacionamentos

```
rides (1) ──< (1) ride_feedbacks (1) ──< (1) ride_feedback_sentiment_analysis
passengers (1) ──< (*) ride_feedbacks
```

**Cascade Delete:**
- `ride_feedbacks.ride_id` → `onDelete: Cascade` (se corrida deletada, feedback vai junto)
- `ride_feedbacks.passenger_id` → `onDelete: Cascade` (se passageiro deletado, feedback vai junto)
- `sentiment_analysis.ride_feedback_id` → `onDelete: Cascade` (se feedback deletado, análise vai junto)

**Justificativa:** Feedback não existe sem corrida/passageiro (integridade referencial)

---

## Índices

**ride_feedbacks:**
- `ride_id` (unique) - Lookup por corrida (comum em UI)
- `passenger_id` - Histórico de feedbacks do passageiro
- `rating` - Queries analíticas (AVG, distribuição)
- `created_at` - Ordenação temporal, relatórios

**ride_feedback_sentiment_analysis:**
- `ride_feedback_id` (unique) - Lookup 1:1
- `sentiment_label` - Filtros analíticos ("mostrar apenas negativos")
- `analyzed_at` - Rastrear quando foi analisado

---

## Impacto no Core MVP

**Zero impacto:**
- ✅ Não altera tabelas existentes (`rides`, `passengers`, `drivers`)
- ✅ Não adiciona foreign keys em tabelas core
- ✅ Não cria triggers ou procedures
- ✅ Não adiciona lógica automática (cron, webhooks)
- ✅ Migration isolada e reversível

**Integração futura (fora deste escopo):**
- API endpoint `POST /api/rides/:id/feedback` (criar/editar feedback)
- API endpoint `GET /api/rides/:id/feedback` (ler feedback)
- Job assíncrono para chamar API de sentimento (fora do core)
- Dashboard admin para visualizar feedbacks (fora do core)

---

## Alternativas Consideradas

### Alt 1: Feedback direto sobre motorista (não sobre corrida)
**Rejeitada:** Motorista é inferível via `rides.driver_id`. Feedback sobre corrida é mais preciso (contexto: horário, rota, condições).

### Alt 2: Tabela única com campos de sentimento
**Rejeitada:** Mistura input do usuário com output de processamento. Dificulta auditoria e recálculo.

### Alt 3: Enum para `sentiment_label`
**Rejeitada:** Rigidez. Se API mudar taxonomia, precisa migration. String com validação na app é mais flexível.

### Alt 4: Tabela `feedback_tags` separada
**Rejeitada:** Over-engineering. Tags são metadados auxiliares, não entidade core. JSON é suficiente para MVP.

### Alt 5: Histórico de análises (múltiplas versões)
**Rejeitada:** Complexidade desnecessária no MVP. Se precisar, criar `sentiment_analysis_history` depois.

---

## Riscos e Mitigações

### Risco 1: Spam de feedbacks (edição infinita)
**Mitigação:** 
- `ride_id` unique garante 1 feedback por corrida
- Aplicação pode limitar edições (ex: apenas 24h após corrida)
- Auditoria via `updated_at`

### Risco 2: Análise de sentimento falhar
**Mitigação:** 
- Campos nullable permitem feedback sem análise
- `analyzed_at` null indica "pendente"
- Retry logic na aplicação (fora do DB)

### Risco 3: Crescimento de `analysis_metadata` (JSON grande)
**Mitigação:** 
- Aplicação valida tamanho (ex: max 10KB)
- Se crescer muito, mover para S3 e armazenar URL

### Risco 4: LGPD (dados sensíveis em `comment`)
**Mitigação:** 
- `is_anonymous` flag para ocultar identidade
- Aplicação pode sanitizar comentários (remover CPF, telefone)
- Passageiro pode editar/remover comentário

---

## Decisões de Implementação

### Migration
- Arquivo: `backend/prisma/migrations/YYYYMMDD_add_ride_feedback_system.sql`
- Reversível: `DOWN` migration remove tabelas e índices
- Sem dados seed (tabelas vazias inicialmente)

### Prisma Schema
- Adicionar models ao `backend/prisma/schema.prisma`
- Rodar `prisma generate` para atualizar client
- Sem alteração em models existentes

### Código Backend (fora deste escopo, apenas estrutura)
- Controller: `backend/src/controllers/rideFeedback.controller.ts` (futuro)
- Service: `backend/src/services/rideFeedback.service.ts` (futuro)
- Routes: `backend/src/routes/rideFeedback.ts` (futuro)
- **Nenhum código ativo nesta migration**

---

## Conclusão

Este modelo fornece estrutura mínima e flexível para:
- ✅ Coletar feedback de passageiros sobre corridas
- ✅ Armazenar análise de sentimento (calculada externamente)
- ✅ Evoluir sem impactar core MVP
- ✅ Manter auditabilidade e integridade referencial
- ✅ Preparar para features futuras (dashboard, alertas, ML)

**Próximos passos:**
1. Revisar e aprovar este ADR
2. Criar migration SQL
3. Atualizar Prisma schema
4. Rodar `prisma generate`
5. (Futuro) Implementar endpoints de API
