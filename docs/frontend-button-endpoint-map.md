# MAPA BOTÃO → ENDPOINT - KAVIAR MVP

## PASSAGEIRO

| Botão | Endpoint | Payload | Condição |
|-------|----------|---------|----------|
| **"Pedir corrida na comunidade"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "COMMUNITY_RIDE", allow_external_drivers: false}` | Sempre disponível |
| **"Guia turístico local"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "TOUR_GUIDE", base_amount}` | Sempre disponível |
| **"Transporte para idosos"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "ELDERLY_ASSISTANCE", base_amount}` | Sempre disponível |
| **"Acompanhamento especial"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "SPECIAL_ASSISTANCE", base_amount}` | Sempre disponível |
| **"Serviço comunitário"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "COMMUNITY_SERVICE", base_amount}` | Sempre disponível |
| **"Emergência"** | `POST /api/v1/rides` | `{passenger_id, pickup_location, destination, service_type: "STANDARD_RIDE", is_emergency: true}` | Sempre disponível |
| **"Buscar fora da comunidade"** | `POST /api/v1/rides/:id/allow-external` | `{passenger_id}` | **APENAS** se backend retornar erro de indisponibilidade |
| **"Cancelar corrida"** | `POST /api/v1/rides/:id/cancel` | `{passenger_id, reason}` | Apenas se corrida status = "pending" ou "accepted" |
| **"Avaliar motorista"** | `POST /api/v1/rides/:id/rate` | `{rating, comment}` | Apenas se corrida status = "completed" |
| **"Solicitar mudança de comunidade"** | `POST /api/v1/community-change/request` | `{user_id, user_type: "passenger", requested_community_id, reason}` | Sempre disponível |

## MOTORISTA

| Botão | Endpoint | Payload | Condição |
|-------|----------|---------|----------|
| **"Ficar disponível"** | `POST /api/v1/drivers/availability` | `{driver_id, is_available: true}` | Sempre disponível |
| **"Ficar indisponível"** | `POST /api/v1/drivers/availability` | `{driver_id, is_available: false}` | Apenas se disponível |
| **"Aceitar corrida"** | `POST /api/v1/rides/:id/accept` | `{driver_id}` | **APENAS** se motorista habilitado para service_type |
| **"Recusar corrida"** | `POST /api/v1/rides/:id/decline` | `{driver_id, reason}` | Sempre disponível quando recebe corrida |
| **"Iniciar corrida"** | `POST /api/v1/rides/:id/start` | `{driver_id}` | Apenas se corrida status = "accepted" |
| **"Finalizar corrida"** | `POST /api/v1/rides/:id/finish` | `{driver_id, final_amount}` | Apenas se corrida status = "in_progress" |
| **"Ver ganhos"** | `GET /api/v1/incentives/drivers/:id/earnings` | Query: `{period, limit}` | Sempre disponível |
| **"Solicitar mudança de comunidade"** | `POST /api/v1/community-change/request` | `{user_id, user_type: "driver", requested_community_id, reason, document_url}` | Sempre disponível |

## ADMIN

| Botão | Endpoint | Payload | Condição |
|-------|----------|---------|----------|
| **"Criar comunidade"** | `POST /api/v1/communities` | `{name, type, location, description}` | Sempre disponível |
| **"Ativar comunidade"** | `POST /api/v1/incentives/communities/:id/update-status` | `{status: "active"}` | Apenas se comunidade status = "pending" |
| **"Desativar comunidade"** | `POST /api/v1/incentives/communities/:id/update-status` | `{status: "inactive"}` | Apenas se comunidade status = "active" |
| **"Aprovar mudança"** | `POST /api/v1/community-change/:id/approve` | `{reviewed_by, review_notes}` | Apenas se solicitação status = "pending" |
| **"Rejeitar mudança"** | `POST /api/v1/community-change/:id/reject` | `{reviewed_by, review_notes}` | Apenas se solicitação status = "pending" |
| **"Habilitar motorista para serviços"** | `POST /api/v1/special-services/drivers/:id/enable` | `{can_tour_guide, can_elderly_assistance, can_special_assistance, can_community_service, enabled_by}` | Sempre disponível |
| **"Baixar relatório PDF"** | `GET /api/v1/reports/executive` | Query: `{period, format: "pdf"}` | Sempre disponível |
| **"Enviar relatório por email"** | `POST /api/v1/reports/executive/distribute` | `{report_id, recipients}` | Sempre disponível |

## REGRAS CRÍTICAS

### ⚠️ CONDICIONAIS OBRIGATÓRIAS
- **Botões só aparecem** se backend permitir via API
- **Serviços especiais** só para motoristas habilitados
- **Mudança externa** só se backend indicar indisponibilidade
- **Ações sensíveis** exigem confirmação do usuário

### 🔒 VALIDAÇÕES BACKEND
- **Comunidade ativa** verificada antes de criar corrida
- **Habilitação do motorista** verificada antes de mostrar corrida
- **Status da corrida** determina botões disponíveis
- **Permissões de admin** verificadas em todas as ações

### 📱 ESTADOS DE UI
- **Loading** durante chamadas de API
- **Erro** se backend retornar erro
- **Sucesso** com feedback visual
- **Desabilitado** se condição não atendida
