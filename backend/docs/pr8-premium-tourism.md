# PR #8 - Sistema Premium/Turismo

## Visão Geral

Implementação de sistema de pacotes turísticos premium no KAVIAR, incluindo gestão de tours, transfers aeroporto e matching exclusivo com motoristas premium.

## Arquitetura

### **Feature Flag**
```env
ENABLE_PREMIUM_TOURISM=false  # Default OFF
```

### **Single Source of Truth**
- `PremiumTourismService` (`/src/services/premium-tourism.ts`) - Toda lógica centralizada
- Integração mínima com sistema de rides existente

### **Fluxo MVP**
1. **Admin cria pacote** → `TourPackage`
2. **Passageiro reserva** → `TourBooking` (REQUESTED)
3. **Admin confirma** → Cria `Ride` tipo TOURISM
4. **Matching**: Apenas motoristas premium

## Modelagem de Dados

### **TourPackage (Pacotes)**
```prisma
model TourPackage {
  id                      String   @id @default(cuid())
  title                   String
  description             String   @db.Text
  type                    String   // TOUR | AIRPORT_TRANSFER
  partnerName             String   // MVP: texto simples
  basePrice               Decimal  @db.Decimal(10, 2)
  locations               Json     // Array de strings
  estimatedDurationMinutes Int
  isActive                Boolean  @default(true)
  createdBy               String   // Admin ID
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

### **TourBooking (Reservas)**
```prisma
model TourBooking {
  id              String    @id @default(cuid())
  packageId       String
  passengerId     String
  scheduledAt     DateTime
  pickupLocation  String
  dropoffLocation String?
  status          String    @default("REQUESTED") // REQUESTED | CONFIRMED | CANCELLED | COMPLETED
  rideId          String?   @unique // Quando vira corrida
  confirmedBy     String?   // Admin ID
  confirmedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### **Driver Premium Fields**
```prisma
model Driver {
  // ... campos existentes
  isPremium         Boolean   @default(false)
  premiumOverride   Boolean   @default(false) // Override admin
}
```

## API Endpoints

### **Admin APIs**

#### **POST /api/admin/tour-packages**
Criar pacote turístico

**Request:**
```json
{
  "title": "City Tour São Paulo",
  "description": "Tour pelos principais pontos turísticos de SP",
  "type": "TOUR",
  "partnerName": "SP Turismo Ltda",
  "basePrice": 150.00,
  "locations": ["Museu do Ipiranga", "Mercado Municipal", "Teatro Municipal"],
  "estimatedDurationMinutes": 240
}
```

**Response 201:**
```json
{
  "success": true,
  "package": {
    "id": "pkg123",
    "title": "City Tour São Paulo",
    "type": "TOUR",
    "basePrice": 150.00,
    "isActive": true,
    "createdAt": "2026-01-03T23:00:00Z"
  }
}
```

#### **GET /api/admin/tour-packages**
Listar todos os pacotes (admin)

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "pkg123",
      "title": "City Tour São Paulo",
      "type": "TOUR",
      "partnerName": "SP Turismo Ltda",
      "basePrice": 150.00,
      "isActive": true,
      "bookingsCount": 5
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### **GET /api/admin/tour-bookings**
Listar reservas (admin)

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking123",
      "packageTitle": "City Tour São Paulo",
      "passengerName": "João Silva",
      "scheduledAt": "2026-01-10T14:00:00Z",
      "status": "REQUESTED",
      "pickupLocation": "Hotel Copacabana",
      "createdAt": "2026-01-03T23:00:00Z"
    }
  ]
}
```

#### **POST /api/admin/tour-bookings/:id/confirm**
Confirmar reserva (cria ride)

**Request:**
```json
{
  "adminId": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "booking123",
    "status": "CONFIRMED"
  },
  "rideId": "ride456",
  "message": "Tour booking confirmed and ride created"
}
```

### **Public APIs**

#### **GET /api/governance/tour-packages**
Listar pacotes ativos (público)

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "pkg123",
      "title": "City Tour São Paulo",
      "description": "Tour pelos principais pontos...",
      "type": "TOUR",
      "basePrice": 150.00,
      "locations": ["Museu do Ipiranga", "Mercado Municipal"],
      "estimatedDurationMinutes": 240
    }
  ]
}
```

#### **POST /api/governance/tour-bookings**
Criar reserva (público)

**Request:**
```json
{
  "packageId": "pkg123",
  "passengerId": "pass456",
  "scheduledAt": "2026-01-10T14:00:00Z",
  "pickupLocation": "Hotel Copacabana",
  "dropoffLocation": "Aeroporto GRU"
}
```

**Response 201:**
```json
{
  "success": true,
  "booking": {
    "id": "booking123",
    "status": "REQUESTED",
    "scheduledAt": "2026-01-10T14:00:00Z"
  },
  "premiumDriversAvailable": 3,
  "message": "Booking created successfully"
}
```

## Selo Premium (Critérios)

### **Configuração**
```env
MIN_RATING_PREMIUM=4.7
MIN_RATINGS_COUNT_PREMIUM=20
```

### **Lógica de Elegibilidade**
```typescript
// 1. Override admin sempre ganha
if (driver.premiumOverride) return true;

// 2. Verificar rating mínimo + quantidade
const stats = await getRatingStats(driverId);
return stats.averageRating >= 4.7 && 
       stats.totalRatings >= 20;
```

### **Disponibilidade Premium**
- Driver premium (`isPremium=true` OR `premiumOverride=true`)
- Status `approved`
- Não suspenso (`suspendedAt=null`)
- Localização recente (≤ 5 min)
- Não ocupado (sem rides ativas)

## Fluxo Completo

### **1. Criação de Pacote (Admin)**
```
Admin → POST /admin/tour-packages → TourPackage criado
```

### **2. Reserva (Passageiro)**
```
Passageiro → POST /governance/tour-bookings → TourBooking (REQUESTED)
```

### **3. Confirmação (Admin)**
```
Admin → POST /admin/tour-bookings/:id/confirm → 
  - Verifica premium drivers disponíveis
  - Cria Ride tipo TOURISM
  - TourBooking → CONFIRMED
```

### **4. Matching Premium**
```
Ride TOURISM → Apenas motoristas premium podem aceitar
```

## Configuração

### **Variáveis de Ambiente**
```env
ENABLE_PREMIUM_TOURISM=false
MIN_RATING_PREMIUM=4.7
MIN_RATINGS_COUNT_PREMIUM=20
```

### **Comportamento por Flag**
- **Flag OFF**: Todos endpoints retornam "Premium tourism disabled"
- **Flag ON**: Sistema funcional com validações completas

## Características Técnicas

### **Auditoria**
- Criação/alteração de pacotes logada
- Confirmação de reservas auditada
- Console logs: `[TOUR_PACKAGE_CREATED]`, `[TOUR_BOOKING_CONFIRMED]`

### **Integração Mínima**
- Novo tipo de ride: `TOURISM`
- Sem alteração no core de rides
- Matching via critérios premium

### **Retrocompatibilidade**
- 2 tabelas novas (sem alteração de existentes)
- Flag OFF = zero impacto
- Campos opcionais no Driver

## Limitações MVP

- Partner como texto simples (sem tabela Partner)
- Confirmação manual via admin (sem automação)
- Sem geofence para tours (simplificação)
- Sem integração com pagamento diferenciado
- Sem notificações automáticas

## Testes

### **Cenários Cobertos**
1. **Flag OFF**: Sistema desabilitado
2. **CRUD Pacotes**: Criar, listar, editar, desativar
3. **Reservas**: Criar, listar, confirmar
4. **Premium Matching**: Apenas drivers premium
5. **Ride Creation**: Booking confirmado vira ride TOURISM
6. **Auditoria**: Logs de operações

### **Casos Especiais**
- Pacote inativo → não aparece público
- Sem premium drivers → erro na confirmação
- Booking já processado → erro
- Override admin → sempre premium

## Benefícios

### **Para o Negócio**
- Diferenciação premium
- Receita adicional
- Parcerias turísticas
- Qualidade garantida

### **Para Motoristas**
- Incentivo para qualidade (rating)
- Corridas premium
- Reconhecimento diferenciado

### **Para Passageiros**
- Experiência premium
- Tours organizados
- Transfers confiáveis
- Motoristas qualificados

## Próximos Passos

1. **Tabela Partner**: Evolução de `partnerName` texto
2. **Automação**: Confirmação automática com regras
3. **Geofence Tours**: Integração com sistema existente
4. **Pagamento Premium**: Preços diferenciados
5. **Notificações**: Alerts para reservas/confirmações
