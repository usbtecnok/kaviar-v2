# CHECKLIST TELAS MVP - KAVIAR

## 🎯 TELAS OBRIGATÓRIAS PARA LANÇAMENTO

### PASSAGEIRO (5 telas)

#### ✅ **P1. Home Passageiro** (`/passenger`)
**Elementos obrigatórios:**
- [ ] 6 botões de serviço (COMMUNITY_RIDE, TOUR_GUIDE, ELDERLY_ASSISTANCE, SPECIAL_ASSISTANCE, COMMUNITY_SERVICE, EMERGENCY)
- [ ] Botão "Meu Perfil"
- [ ] Indicação da comunidade atual

**Endpoints:**
- `GET /api/v1/communities` (para mostrar comunidade atual)

#### ✅ **P2. Pedir Corrida** (`/passenger/ride-request`)
**Elementos obrigatórios:**
- [ ] Campo origem (obrigatório)
- [ ] Campo destino (obrigatório)
- [ ] Campo observações (opcional para serviços especiais)
- [ ] Exibição do valor calculado
- [ ] Botão "Confirmar corrida"
- [ ] Botão "Buscar fora da comunidade" (condicional)
- [ ] Aviso sobre comunidade local

**Endpoints:**
- `POST /api/v1/rides`
- `POST /api/v1/special-services/calculate-total`
- `POST /api/v1/rides/:id/allow-external` (condicional)

#### ✅ **P3. Corrida em Andamento** (`/passenger/ride-progress`)
**Elementos obrigatórios:**
- [ ] Status da corrida
- [ ] Dados do motorista
- [ ] Origem e destino
- [ ] Botão "Cancelar" (condicional por status)
- [ ] Botão "Emergência"

**Endpoints:**
- `GET /api/v1/rides/:id`
- `POST /api/v1/rides/:id/cancel`

#### ✅ **P4. Finalização** (`/passenger/ride-completion`)
**Elementos obrigatórios:**
- [ ] Resumo da corrida
- [ ] Valor final pago
- [ ] Avaliação do motorista (1-5 estrelas)
- [ ] Campo comentário (opcional)
- [ ] Botão "Avaliar e finalizar"
- [ ] Botão "Pedir nova corrida"

**Endpoints:**
- `POST /api/v1/rides/:id/rate`

#### ✅ **P5. Perfil Passageiro** (`/passenger/profile`)
**Elementos obrigatórios:**
- [ ] Comunidade atual
- [ ] Status da comunidade
- [ ] Botão "Solicitar mudança de comunidade"
- [ ] Histórico de corridas (últimas 10)

**Endpoints:**
- `GET /api/v1/communities/:id`
- `POST /api/v1/community-change/request`
- `GET /api/v1/rides` (filtro por passageiro)

---

### MOTORISTA (5 telas)

#### ✅ **M1. Home Motorista** (`/driver`)
**Elementos obrigatórios:**
- [ ] Toggle "Disponível/Indisponível"
- [ ] Serviços habilitados (chips)
- [ ] Ganhos do dia
- [ ] Comunidade atual
- [ ] Botão "Ver ganhos"
- [ ] Botão "Meu perfil"

**Endpoints:**
- `POST /api/v1/drivers/availability`
- `GET /api/v1/incentives/drivers/:id/earnings`

#### ✅ **M2. Corrida Recebida** (`/driver/ride-received`)
**Elementos obrigatórios:**
- [ ] Timer 30 segundos
- [ ] Tipo de serviço
- [ ] Dados do passageiro
- [ ] Origem e destino
- [ ] Ganhos estimados
- [ ] Botão "Aceitar"
- [ ] Botão "Recusar"
- [ ] Avisos para serviços especiais

**Endpoints:**
- `POST /api/v1/rides/:id/accept`
- `POST /api/v1/rides/:id/decline`

#### ✅ **M3. Corrida Ativa** (`/driver/ride-active`)
**Elementos obrigatórios:**
- [ ] Status da corrida
- [ ] Dados do passageiro
- [ ] Origem e destino
- [ ] Botão "Iniciar corrida" (se status = accepted)
- [ ] Botão "Finalizar corrida" (se status = in_progress)
- [ ] Botão "Emergência"

**Endpoints:**
- `POST /api/v1/rides/:id/start`
- `POST /api/v1/rides/:id/finish`

#### ✅ **M4. Ganhos** (`/driver/earnings`)
**Elementos obrigatórios:**
- [ ] Total do período
- [ ] Separação: valor base vs bônus
- [ ] Lista de corridas
- [ ] Filtro por período (hoje, semana, mês)
- [ ] Detalhes por tipo de serviço

**Endpoints:**
- `GET /api/v1/incentives/drivers/:id/earnings`

#### ✅ **M5. Perfil Motorista** (`/driver/profile`)
**Elementos obrigatórios:**
- [ ] Comunidade atual
- [ ] Serviços habilitados
- [ ] Botão "Solicitar mudança de comunidade"
- [ ] Histórico de mudanças

**Endpoints:**
- `GET /api/v1/communities/:id`
- `POST /api/v1/community-change/request`
- `GET /api/v1/community-change/history/:user_id/driver`

---

### ADMIN (4 telas)

#### ✅ **A1. Dashboard Admin** (`/admin`)
**Elementos obrigatórios:**
- [ ] KPIs principais (corridas hoje, receita, motoristas online)
- [ ] Alertas ativos
- [ ] ROI por comunidade (top 5)
- [ ] Navegação rápida

**Endpoints:**
- `GET /api/v1/dashboard/overview`
- `GET /api/v1/alerts/active`

#### ✅ **A2. Comunidades** (`/admin/communities`)
**Elementos obrigatórios:**
- [ ] Lista de comunidades
- [ ] Status (ativa/inativa/pendente)
- [ ] Métricas básicas
- [ ] Botão "Criar comunidade"
- [ ] Botões "Ativar/Desativar"

**Endpoints:**
- `GET /api/v1/communities`
- `POST /api/v1/communities`
- `POST /api/v1/incentives/communities/:id/update-status`

#### ✅ **A3. Mudanças de Comunidade** (`/admin/community-changes`)
**Elementos obrigatórias:**
- [ ] Lista de solicitações pendentes
- [ ] Dados do solicitante
- [ ] Mudança solicitada (de → para)
- [ ] Motivo
- [ ] Botão "Aprovar"
- [ ] Botão "Rejeitar"
- [ ] Campo para notas da revisão

**Endpoints:**
- `GET /api/v1/community-change/requests`
- `POST /api/v1/community-change/:id/approve`
- `POST /api/v1/community-change/:id/reject`

#### ✅ **A4. Relatórios** (`/admin/reports`)
**Elementos obrigatórios:**
- [ ] Seletor de período
- [ ] Preview do relatório
- [ ] Botão "Baixar PDF"
- [ ] Botão "Enviar por email"
- [ ] Histórico de relatórios

**Endpoints:**
- `GET /api/v1/reports/executive`
- `POST /api/v1/reports/executive/distribute`
- `GET /api/v1/reports/history`

---

## 🚫 TELAS NÃO-MVP (EVOLUÇÃO FUTURA)

### Passageiro
- ❌ Histórico detalhado de corridas
- ❌ Configurações avançadas
- ❌ Chat com motorista
- ❌ Mapa em tempo real

### Motorista  
- ❌ Estatísticas avançadas
- ❌ Configurações de notificação
- ❌ Chat com passageiro
- ❌ Navegação GPS

### Admin
- ❌ Analytics avançado
- ❌ Gestão de usuários
- ❌ Configuração de incentivos
- ❌ Auditoria detalhada

---

## ✅ CRITÉRIOS DE ACEITE MVP

### Funcional
- [ ] Passageiro consegue pedir corrida
- [ ] Motorista consegue aceitar e finalizar corrida
- [ ] Admin consegue aprovar mudanças de comunidade
- [ ] Todos os serviços especiais funcionam
- [ ] Sistema de incentivos calcula corretamente

### Técnico
- [ ] Todas as 14 telas implementadas
- [ ] Todos os endpoints mapeados funcionando
- [ ] Estados de loading/erro tratados
- [ ] Validações básicas de UX
- [ ] Responsivo (mobile + desktop)

### Negócio
- [ ] Governança de comunidade respeitada
- [ ] Auditoria de ações mantida
- [ ] Transparência de valores
- [ ] Zero lógica de negócio no frontend
