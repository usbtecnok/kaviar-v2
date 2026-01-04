# PR #7 - Sistema de Avaliações (Rating)

## Visão Geral

Implementação de sistema de avaliações bidirecional (motorista ↔ passageiro) para fortalecer governança e qualidade do serviço no KAVIAR.

## Arquitetura

### **Feature Flag**
```env
ENABLE_RATING_SYSTEM=false  # Default OFF
```

### **Single Source of Truth**
- `RatingService` (`/src/services/rating.ts`) - Toda lógica centralizada
- Integração mínima nos demais services

### **Janela de Avaliação**
- **Trigger**: Após `ride.status = 'completed'`
- **Janela**: 7 dias configuráveis (`RATING_WINDOW_DAYS`)
- **Expiração**: `RATING_WINDOW_EXPIRED` após prazo

## Modelagem de Dados

### **Rating (Avaliações)**
```prisma
model Rating {
  id        String   @id @default(cuid())
  rideId    String   @map("ride_id")
  raterId   String   @map("rater_id")      // Quem avalia
  ratedId   String   @map("rated_id")      // Quem é avaliado  
  raterType String   @map("rater_type")    // DRIVER | PASSENGER
  score     Int      // 1-5 estrelas
  comment   String?  @db.VarChar(200)     // Limite 200 chars
  createdAt DateTime @default(now())

  // Constraint: 1 rating por corrida por tipo de usuário
  @@unique([rideId, raterType, raterId])
}
```

### **RatingStats (Estatísticas Agregadas)**
```prisma
model RatingStats {
  id            String  @id @default(cuid())
  userId        String  @unique @map("user_id")
  userType      String  @map("user_type")     // DRIVER | PASSENGER
  averageRating Decimal @db.Decimal(3, 2)
  totalRatings  Int     @default(0)
  updatedAt     DateTime @updatedAt
}
```

## API Endpoints

### **POST /api/governance/ratings**
Criar avaliação

**Request:**
```json
{
  "rideId": "ride123",
  "raterId": "driver456", 
  "ratedId": "passenger789",
  "raterType": "DRIVER",
  "score": 5,
  "comment": "Passageiro pontual e educado"
}
```

**Response 201:**
```json
{
  "success": true,
  "rating": {
    "id": "rating123",
    "score": 5,
    "comment": "Passageiro pontual e educado",
    "createdAt": "2026-01-03T22:40:00Z"
  },
  "updatedStats": {
    "averageRating": 4.85,
    "totalRatings": 127
  }
}
```

**Response 409 (Idempotência):**
```json
{
  "success": false,
  "error": "RATING_ALREADY_EXISTS",
  "existingRating": {
    "id": "rating123",
    "score": 5,
    "createdAt": "2026-01-03T22:40:00Z"
  }
}
```

### **GET /api/governance/ratings/summary/:type/:id**
Obter resumo de avaliações

**Exemplo:** `GET /api/governance/ratings/summary/driver/driver456`

**Response:**
```json
{
  "success": true,
  "summary": {
    "stats": {
      "userId": "driver456",
      "userType": "DRIVER", 
      "averageRating": 4.85,
      "totalRatings": 127,
      "updatedAt": "2026-01-03T22:40:00Z"
    },
    "recentRatings": [
      {
        "id": "rating123",
        "score": 5,
        "comment": "Excelente motorista",
        "createdAt": "2026-01-03T22:40:00Z"
      }
    ]
  }
}
```

## Regras de Negócio

### **Validações**
- Corrida deve estar `completed`
- Janela de 7 dias após conclusão
- Score entre 1-5 estrelas
- Comentário máximo 200 caracteres
- Constraint única: 1 rating por corrida por usuário

### **Idempotência**
- Segunda tentativa → 409 `RATING_ALREADY_EXISTS`
- Retorna rating existente
- Não duplica estatísticas

### **Auditoria**
- Comentários logados para moderação
- Console log: `[RATING_COMMENT] RideId: X, Comment: "..."`
- Sem refatoração geral do sistema de logs

## Configuração

### **Variáveis de Ambiente**
```env
ENABLE_RATING_SYSTEM=false
RATING_WINDOW_DAYS=7
RATING_COMMENT_MAX_LENGTH=200
```

### **Comportamento por Flag**
- **Flag OFF**: Todos endpoints retornam "Rating system disabled"
- **Flag ON**: Sistema funcional com validações completas

## Características Técnicas

### **Idempotência**
- Constraint única previne duplicatas
- Transaction para rating + stats
- Retorno consistente em tentativas repetidas

### **Performance**
- Stats calculadas em tempo real
- Índices únicos para busca rápida
- Agregação eficiente por usuário

### **Retrocompatibilidade**
- Tabelas novas (sem alteração de existentes)
- Flag OFF = zero impacto
- Integração mínima

## Limitações MVP

- Sem moderação automática de comentários
- Sem notificações de novas avaliações
- Sem filtros avançados (por período, score)
- Sem sistema de disputa/contestação

## Testes

### **Cenários Cobertos**
1. **Flag OFF**: Sistema desabilitado
2. **Criação**: Rating válido criado + stats atualizadas
3. **Idempotência**: Tentativa duplicada → 409
4. **Janela Expirada**: `RATING_WINDOW_EXPIRED`
5. **Validações**: Score inválido, comentário longo
6. **Bidirecional**: Motorista avalia passageiro + vice-versa

### **Casos Especiais**
- Corrida não completada → erro
- Usuário inexistente → stats criadas
- Comentário vazio → permitido
- Stats zeradas → média 0

## Benefícios

### **Para Motoristas**
- Feedback direto dos passageiros
- Histórico de qualidade
- Incentivo para bom atendimento

### **Para Passageiros**
- Transparência sobre motoristas
- Poder de avaliação
- Melhoria contínua do serviço

### **Para o Sistema**
- Dados para governança
- Qualidade mensurável
- Base para futuras funcionalidades
