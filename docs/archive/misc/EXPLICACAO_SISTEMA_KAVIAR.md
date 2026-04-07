# 🚗 KAVIAR - Sistema de Corridas Comunitário

## 📖 Visão Geral

O Kaviar é uma plataforma de mobilidade urbana focada em **comunidades e territórios**, diferente de apps tradicionais como Uber/99. O sistema conecta motoristas locais com passageiros da mesma região, priorizando economia solidária e pertencimento territorial.

---

## 👥 ATORES DO SISTEMA

### 1. **Motoristas (Drivers)**
- Cadastrados em um **bairro base** (neighborhood)
- Podem opcionalmente pertencer a uma **comunidade** (favela/vila)
- Recebem taxas diferenciadas baseadas em território (7%, 12% ou 20%)
- Ganham **badges** por performance territorial
- Status: `pending` → `approved` → `active`

### 2. **Passageiros (Passengers)**
- Solicitam corridas via app
- Podem ser vinculados a uma **comunidade**
- Podem ter contratos especiais (idosos, turismo)
- Pagam via PIX, cartão ou dinheiro

### 3. **Líderes Comunitários (Community Leaders)**
- Administram motoristas de uma comunidade específica
- Aprovam/rejeitam cadastros
- Monitoram performance local
- Vinculados a um `admin` e uma `community`

### 4. **Investidores (Investors)**
- Acessam dashboard de métricas
- Visualizam performance por região
- Recebem relatórios financeiros
- Não interagem diretamente com operação

### 5. **Admins (Super Admins)**
- Controle total do sistema
- Aprovam motoristas globalmente
- Gerenciam bairros e comunidades
- Configuram taxas e políticas

---

## 🗺️ ESTRUTURA TERRITORIAL

### **Hierarquia Geográfica:**
```
Cidade (City)
  └── Bairro (Neighborhood) ← OBRIGATÓRIO
       └── Comunidade (Community) ← OPCIONAL
```

### **1. Bairros (Neighborhoods)**
- **Definição:** Divisão administrativa oficial (ex: Copacabana, Tijuca)
- **Geofence:** Pode ter polígono PostGIS oficial
- **Obrigatório:** Todo motorista DEVE ter um bairro base
- **Taxa mínima:** 7% se tem geofence oficial
- **Exemplos:** Copacabana, Botafogo, Ipanema

**Campos principais:**
```typescript
{
  id: uuid,
  name: "Copacabana",
  city: "Rio de Janeiro",
  zone: "Zona Sul",
  is_active: true,
  has_geofence: true  // Tem mapa oficial?
}
```

### **2. Comunidades (Communities)**
- **Definição:** Subdivisão dentro de um bairro (favelas, vilas, conjuntos)
- **Geofence:** Pode ter cerca virtual (raio 800m) ou polígono
- **Opcional:** Motorista pode ou não pertencer a uma
- **Taxa mínima:** 12% (fallback 800m)
- **Exemplos:** Rocinha, Vidigal, Complexo do Alemão

**Campos principais:**
```typescript
{
  id: uuid,
  name: "Rocinha",
  neighborhood_id: uuid,  // Pertence a qual bairro
  center_lat: -22.9881,
  center_lng: -43.2492,
  radius_meters: 800,
  is_active: true,
  auto_activation: false
}
```

### **3. Geofences**
- **Neighborhood Geofences:** Polígonos PostGIS oficiais
- **Community Geofences:** Cercas virtuais (raio) ou polígonos
- **Uso:** Detectar automaticamente onde motorista/passageiro está

---

## 🎯 SISTEMA DE TERRITÓRIO INTELIGENTE

### **Tipos de Território do Motorista:**

#### **OFFICIAL (Bairro com Mapa Oficial)**
```typescript
{
  type: 'OFFICIAL',
  hasOfficialMap: true,
  minFee: 7%,   // Taxa mínima
  maxFee: 20%,  // Taxa máxima
  message: 'Seu território tem mapa oficial'
}
```
- Bairro tem geofence PostGIS cadastrada
- Melhor taxa possível (7%)
- Sistema detecta automaticamente via GPS

#### **FALLBACK_800M (Comunidade sem Mapa)**
```typescript
{
  type: 'FALLBACK_800M',
  hasOfficialMap: false,
  virtualRadius: 800,  // metros
  minFee: 12%,
  maxFee: 20%,
  message: 'Seu território usa cerca virtual de 800m'
}
```
- Comunidade/favela sem geofence oficial
- Usa raio de 800m do centro
- Taxa intermediária (12%)

#### **MANUAL (Escolha Manual)**
```typescript
{
  type: 'MANUAL',
  hasOfficialMap: false,
  minFee: 12%,
  maxFee: 20%,
  message: 'Território selecionado manualmente'
}
```
- Motorista escolheu bairro sem GPS
- Não foi possível detectar automaticamente

#### **NULL (Não Configurado)**
```typescript
{
  type: null,
  message: 'Configure seu território para reduzir taxas',
  penalty: 'Taxa de 20% em TODAS as corridas'
}
```
- Motorista não tem bairro cadastrado
- Penalidade máxima

---

## 💰 CÁLCULO DE TAXAS

### **Lógica de Match Territorial:**

```
Corrida solicitada em Copacabana
  ↓
Sistema busca motoristas disponíveis
  ↓
Para cada motorista:
  
  1. Motorista de Copacabana (mesmo bairro)
     → Taxa: 7% (SAME_NEIGHBORHOOD)
  
  2. Motorista de Ipanema (bairro adjacente)
     → Taxa: 12% (ADJACENT_NEIGHBORHOOD)
  
  3. Motorista de Tijuca (fora da região)
     → Taxa: 20% (OUTSIDE_FENCE)
  
  4. Motorista sem bairro
     → Taxa: 20% (PENALTY)
```

### **Regras:**
- **Pickup dentro do bairro do motorista:** 7%
- **Pickup em bairro adjacente:** 12%
- **Pickup fora da região:** 20%
- **Motorista sem território:** 20% sempre

---

## 🏆 SISTEMA DE BADGES (Gamificação)

### **5 Badges Disponíveis:**

1. **Herói Local** 🏆
   - Requisito: 80% das corridas no território
   - Benefício: Destaque no app

2. **Mestre do Território** ⭐
   - Requisito: 90% das corridas com taxa ≤12%
   - Benefício: Prioridade em corridas do bairro

3. **Campeão da Comunidade** 👑
   - Requisito: 100 corridas no território
   - Benefício: Badge especial no perfil

4. **Expert em Eficiência** 💎
   - Requisito: Taxa média < 10%
   - Benefício: Economia máxima

5. **Desempenho Consistente** 🔥
   - Requisito: 4 semanas com 70%+ no território
   - Benefício: Bônus de consistência

---

## 🔄 FLUXO DE CADASTRO DE MOTORISTA

### **Passo a Passo:**

```
1. Motorista acessa app
   ↓
2. Preenche dados básicos
   - Nome, email, telefone, senha
   ↓
3. Sistema pede localização GPS
   ↓
4. Backend detecta território:
   
   4a. Encontrou geofence oficial?
       → Cadastra como OFFICIAL
       → Bairro: Copacabana
       → Taxa mínima: 7%
   
   4b. Não encontrou geofence?
       → Mostra lista de bairros próximos
       → Motorista escolhe manualmente
       → Cadastra como FALLBACK_800M ou MANUAL
       → Taxa mínima: 12%
   ↓
5. Motorista envia documentos
   - CNH, RG, Comprovante
   ↓
6. Status: PENDING
   ↓
7. Admin/Líder aprova
   ↓
8. Status: APPROVED
   ↓
9. Motorista fica online
   ↓
10. Status: ACTIVE
```

---

## 🚦 FLUXO DE CORRIDA

### **Do Pedido ao Pagamento:**

```
1. PASSAGEIRO solicita corrida
   - Origem: Copacabana
   - Destino: Ipanema
   ↓
2. SISTEMA busca motoristas disponíveis
   - Filtra por proximidade
   - Calcula taxa de cada um baseado em território
   ↓
3. MOTORISTA aceita corrida
   - Vê valor total
   - Vê taxa que será cobrada (7%, 12% ou 20%)
   ↓
4. CORRIDA em andamento
   - Status: IN_PROGRESS
   - Sistema rastreia GPS
   ↓
5. CORRIDA finalizada
   - Status: COMPLETED
   - Valor: R$ 25,00
   - Taxa: R$ 1,75 (7%)
   - Motorista recebe: R$ 23,25
   ↓
6. PAGAMENTO
   - Passageiro paga via PIX/cartão
   - Sistema repassa para motorista
   ↓
7. ESTATÍSTICAS atualizadas
   - driver_territory_stats atualizado
   - Progresso de badges recalculado
```

---

## 📊 DIFERENÇAS: BAIRRO vs COMUNIDADE

| Aspecto | Bairro (Neighborhood) | Comunidade (Community) |
|---------|----------------------|------------------------|
| **Obrigatório?** | ✅ SIM | ❌ NÃO (opcional) |
| **Geofence oficial?** | ✅ Pode ter PostGIS | ⚠️ Geralmente não |
| **Taxa mínima** | 7% (se tem geofence) | 12% (fallback 800m) |
| **Exemplo** | Copacabana, Tijuca | Rocinha, Vidigal |
| **Hierarquia** | Nível 1 (cidade) | Nível 2 (dentro do bairro) |
| **Administração** | Super Admin | Líder Comunitário |
| **Ativação** | Manual | Pode ser automática |

---

## 🎭 CASOS DE USO

### **Caso 1: Motorista de Bairro Oficial**
```
João mora em Copacabana (tem geofence oficial)
  → Cadastra com GPS
  → Sistema detecta: OFFICIAL
  → Taxa mínima: 7%
  → Faz 90% das corridas em Copacabana
  → Ganha badge "Herói Local"
  → Economia: R$ 180/semana vs taxa 20%
```

### **Caso 2: Motorista de Comunidade**
```
Maria mora na Rocinha (sem geofence oficial)
  → Cadastra com GPS
  → Sistema não encontra geofence
  → Escolhe "Rocinha" manualmente
  → Sistema cria cerca virtual 800m
  → Tipo: FALLBACK_800M
  → Taxa mínima: 12%
  → Faz 70% das corridas na Rocinha
  → Economia: R$ 120/semana vs taxa 20%
```

### **Caso 3: Motorista sem Território**
```
Pedro não cadastrou bairro
  → Tipo: NULL
  → Taxa: 20% em TODAS as corridas
  → Não ganha badges
  → Perde R$ 200/semana
  → Sistema recomenda: "Configure seu território!"
```

---

## 🔐 SEGURANÇA E VALIDAÇÕES

### **Validações de Cadastro:**
- ✅ Bairro deve existir no banco
- ✅ Bairro deve estar ativo (`is_active: true`)
- ✅ Distância GPS < 20km do bairro escolhido (warning se > 20km)
- ✅ Email único
- ✅ Telefone único
- ✅ Documentos obrigatórios

### **Validações de Corrida:**
- ✅ Motorista deve estar `approved` ou `active`
- ✅ Passageiro deve ter saldo/cartão válido
- ✅ Origem e destino devem estar dentro da área de cobertura
- ✅ Distância máxima: configurável por região

---

## 📱 INVESTIDORES

### **O que veem:**
- Dashboard com métricas agregadas
- Performance por região/bairro
- Receita total e por território
- Taxa média cobrada
- Número de corridas
- Motoristas ativos por região

### **O que NÃO veem:**
- Dados pessoais de motoristas/passageiros
- Corridas individuais
- Localização em tempo real
- Documentos

### **Acesso:**
- Login via email/senha
- Role: `INVESTOR`
- Apenas leitura (read-only)

---

## 🎯 DIFERENCIAIS DO KAVIAR

### **vs Uber/99:**
1. **Foco territorial:** Motorista ganha mais ficando no bairro
2. **Taxas variáveis:** 7% a 20% (Uber cobra ~25% fixo)
3. **Gamificação:** Badges e conquistas
4. **Comunidades:** Suporte a favelas/vilas sem mapa oficial
5. **Economia solidária:** Prioriza motoristas locais
6. **Transparência:** Motorista sabe exatamente sua taxa

### **Vantagens para Motorista:**
- Taxa mínima de 7% (vs 25% Uber)
- Economia de até R$ 200/semana
- Trabalha perto de casa
- Conhece melhor as ruas
- Menos combustível
- Mais segurança

### **Vantagens para Passageiro:**
- Motorista conhece a região
- Mais confiança (vizinho)
- Preços competitivos
- Suporte a comunidades

---

## 🗄️ BANCO DE DADOS

### **Tabelas Principais:**

**Território:**
- `neighborhoods` (37 bairros cadastrados)
- `neighborhood_geofences` (35 geofences PostGIS)
- `communities` (comunidades/favelas)
- `community_geofences` (cercas virtuais)

**Usuários:**
- `drivers` (motoristas)
- `passengers` (passageiros)
- `admins` (super admins)
- `community_leaders` (líderes comunitários)

**Operação:**
- `rides` (corridas)
- `driver_territory_stats` (estatísticas territoriais)
- `driver_badges` (badges desbloqueados)

**Financeiro:**
- `transactions` (pagamentos)
- `driver_payouts` (repasses)

---

## 🚀 TECNOLOGIA

### **Backend:**
- Node.js + TypeScript
- Prisma ORM
- PostgreSQL 15.15 (AWS RDS)
- PostGIS (geolocalização)
- Express.js

### **Frontend:**
- React Native (app mobile)
- React (dashboard web)
- TypeScript

### **Infraestrutura:**
- AWS ECS Fargate (containers)
- AWS RDS Multi-AZ (banco)
- AWS S3 (uploads)
- AWS CloudWatch (logs)
- AWS ALB (load balancer)

---

## 📈 MÉTRICAS DE SUCESSO

### **Para o Sistema:**
- 37 bairros cadastrados
- 35 geofences oficiais
- 2 tasks ECS rodando
- API 100% disponível

### **Para Motoristas:**
- Taxa média < 12%
- 70%+ corridas no território
- 3+ badges desbloqueados
- Economia > R$ 150/semana

### **Para Passageiros:**
- Tempo de espera < 5min
- 95%+ corridas completadas
- Avaliação > 4.5 estrelas

---

## 🎓 RESUMO EXECUTIVO

**O Kaviar é um sistema de corridas que:**
1. Organiza motoristas por **bairros** (obrigatório) e **comunidades** (opcional)
2. Cobra taxas diferenciadas baseadas em **território** (7%, 12% ou 20%)
3. Usa **geofences PostGIS** para bairros oficiais e **cercas virtuais 800m** para comunidades
4. Gamifica com **badges** para incentivar corridas locais
5. Prioriza **economia solidária** e **pertencimento territorial**
6. Oferece **transparência total** sobre taxas e economia
7. Suporta **investidores** com dashboard de métricas
8. Administrado por **super admins** e **líderes comunitários**

**Diferencial:** Motorista ganha mais ficando no próprio bairro, ao contrário de apps tradicionais que cobram taxa fixa alta.
