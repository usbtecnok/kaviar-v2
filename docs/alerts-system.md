# 🚨 Sistema de Alertas Automáticos

## 📋 Visão Geral

O Sistema de Alertas monitora automaticamente métricas críticas do programa de incentivos e dispara alertas quando thresholds configuráveis são violados, permitindo intervenção humana proativa sem aplicar ajustes automáticos.

### **Princípios Fundamentais**

- **Monitoramento proativo** de métricas críticas
- **Thresholds configuráveis** por comunidade ou globalmente
- **Alertas informativos** - humano decide a ação
- **Auditoria completa** de todos os alertas
- **Sem automação perigosa** - apenas notificação

## 🏗️ Arquitetura de Alertas

### **1. Configuração de Thresholds**

```sql
alert_thresholds (
  community_id UUID NULL, -- NULL = configuração global
  threshold_type ENUM('min_roi_percent', 'max_bonus_percent_of_revenue', 'min_acceptance_rate', 'min_daily_rides'),
  threshold_value DECIMAL,
  is_active BOOLEAN
)
```

### **2. Eventos de Alerta**

```sql
alert_events (
  community_id UUID,
  alert_type ENUM('roi_low', 'bonus_excessive', 'acceptance_low', 'volume_low'),
  severity ENUM('low', 'medium', 'high', 'critical'),
  current_value DECIMAL,
  threshold_value DECIMAL,
  message TEXT,
  status ENUM('active', 'acknowledged', 'resolved')
)
```

## 🔔 Tipos de Alerta

### **ROI Baixo (`roi_low`)**
- **Threshold:** `min_roi_percent` (padrão: 100%)
- **Severidade:** Medium se ROI < threshold, High se ROI < threshold/2
- **Ação sugerida:** Revisar estratégia de bônus ou aumentar eficiência

### **Bônus Excessivo (`bonus_excessive`)**
- **Threshold:** `max_bonus_percent_of_revenue` (padrão: 15%)
- **Severidade:** Medium se > threshold, High se > threshold*1.5
- **Ação sugerida:** Reduzir percentual de bônus ou revisar configuração

### **Taxa de Aceitação Baixa (`acceptance_low`)**
- **Threshold:** `min_acceptance_rate` (padrão: 70%)
- **Severidade:** Medium se < threshold, High se < threshold*0.7
- **Ação sugerida:** Investigar problemas operacionais ou aumentar incentivos

### **Volume Baixo (`volume_low`)**
- **Threshold:** `min_daily_rides` (padrão: 5 corridas/30 dias)
- **Severidade:** Low se < threshold, Critical se = 0
- **Ação sugerida:** Campanhas de marketing ou revisão de estratégia

## ⏰ Monitoramento Automático

### **Job de Alertas**
- **Frequência:** A cada 30 minutos (6h-22h)
- **Função:** Avaliar todas as comunidades ativas
- **Ação:** Disparar alertas quando thresholds são violados
- **Prevenção:** Não criar alertas duplicados (24h de cooldown)

### **Processamento de Alertas**
```
1. Avaliar métricas da comunidade
2. Comparar com thresholds aplicáveis
3. Criar alerta se threshold violado
4. Log estruturado do alerta
5. Disparar webhook interno (se configurado)
6. Enviar email (se configurado)
```

## 🔌 APIs de Alertas

### **Monitoramento**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/alerts/active` | GET | Buscar alertas ativos |
| `/api/v1/alerts/stats` | GET | Estatísticas de alertas |
| `/api/v1/alerts/monitor` | POST | Executar monitoramento manual |

### **Gestão de Alertas**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/alerts/:id/acknowledge` | POST | Reconhecer alerta |
| `/api/v1/alerts/:id/resolve` | POST | Resolver alerta |

### **Configuração**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/alerts/thresholds` | GET | Buscar thresholds configurados |
| `/api/v1/alerts/thresholds` | POST | Configurar threshold |

## 📝 Exemplos de Uso

### **1. Configurar Thresholds Globais**

```bash
# ROI mínimo de 150%
curl -X POST http://localhost:3000/api/v1/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{
    "threshold_type": "min_roi_percent",
    "threshold_value": 150.00,
    "created_by": "admin@kaviar.com"
  }'

# Bônus máximo de 10% da receita
curl -X POST http://localhost:3000/api/v1/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{
    "threshold_type": "max_bonus_percent_of_revenue", 
    "threshold_value": 10.00,
    "created_by": "admin@kaviar.com"
  }'
```

### **2. Configurar Threshold Específico por Comunidade**

```bash
curl -X POST http://localhost:3000/api/v1/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{
    "community_id": "uuid-vila-madalena",
    "threshold_type": "min_acceptance_rate",
    "threshold_value": 80.00,
    "created_by": "admin@kaviar.com"
  }'
```

### **3. Buscar Alertas Ativos**

```bash
# Todos os alertas ativos
curl "http://localhost:3000/api/v1/alerts/active"

# Alertas críticos apenas
curl "http://localhost:3000/api/v1/alerts/active?severity=critical"

# Alertas de uma comunidade específica
curl "http://localhost:3000/api/v1/alerts/active?community_id=uuid-comunidade"
```

### **4. Reconhecer e Resolver Alertas**

```bash
# Reconhecer alerta
curl -X POST http://localhost:3000/api/v1/alerts/uuid-alerta/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledged_by": "operador@kaviar.com"}'

# Resolver alerta
curl -X POST http://localhost:3000/api/v1/alerts/uuid-alerta/resolve
```

### **5. Executar Monitoramento Manual**

```bash
# Monitorar todas as comunidades
curl -X POST http://localhost:3000/api/v1/alerts/monitor

# Monitorar comunidade específica
curl -X POST http://localhost:3000/api/v1/alerts/monitor \
  -H "Content-Type: application/json" \
  -d '{"community_id": "uuid-comunidade"}'
```

## 📊 Exemplos de Alertas

### **Alerta de ROI Baixo**
```json
{
  "alert_id": "uuid",
  "alert_type": "roi_low",
  "severity": "medium",
  "current_value": 85.50,
  "threshold_value": 100.00,
  "message": "ROI da comunidade Vila Madalena está baixo: 85.50% (mínimo: 100.00%)",
  "metadata": {
    "community_name": "Vila Madalena",
    "period_days": 30,
    "bonus_paid": 150.00,
    "revenue": 2550.00
  }
}
```

### **Alerta de Bônus Excessivo**
```json
{
  "alert_id": "uuid",
  "alert_type": "bonus_excessive", 
  "severity": "high",
  "current_value": 22.50,
  "threshold_value": 15.00,
  "message": "Bônus da comunidade Centro está excessivo: 22.50% da receita (máximo: 15.00%)",
  "metadata": {
    "community_name": "Centro",
    "bonus_amount": 450.00,
    "revenue_amount": 2000.00
  }
}
```

## 🔧 Configurações de Integração

### **Webhook Interno**
```bash
# Configurar URL do webhook
export ALERT_WEBHOOK_URL="http://localhost:3000/internal/alerts"
```

**Payload do Webhook:**
```json
{
  "event": "alert_triggered",
  "alert_id": "uuid",
  "alert_type": "roi_low",
  "severity": "medium", 
  "message": "ROI baixo detectado...",
  "timestamp": "2026-01-01T13:00:00Z"
}
```

### **Email (Opcional)**
```bash
# Habilitar emails
export ALERT_EMAIL_ENABLED="true"
export ALERT_EMAIL_TO="alerts@kaviar.com"
```

## 📈 Fluxo de Alertas

### **Detecção Automática**
```
1. Job executa a cada 30 minutos
2. Busca comunidades ativas
3. Avalia métricas vs thresholds
4. Cria alerta se threshold violado
5. Log estruturado + webhook + email
```

### **Gestão Manual**
```
1. Admin visualiza alertas ativos
2. Reconhece alerta (acknowledged)
3. Investiga causa raiz
4. Aplica correção manual
5. Resolve alerta (resolved)
```

### **Prevenção de Spam**
- Alertas do mesmo tipo não são duplicados por 24h
- Alertas antigos (>30 dias) são resolvidos automaticamente
- Cooldown entre avaliações da mesma comunidade

## 🎯 Casos de Uso

### **Para Gestores**
- **Monitoramento proativo:** Ser alertado antes que problemas se agravem
- **ROI em risco:** Identificar comunidades com retorno baixo
- **Custos elevados:** Detectar bônus excessivos automaticamente

### **Para Operações**
- **Performance baixa:** Taxa de aceitação em queda
- **Volume crítico:** Comunidades sem atividade
- **Intervenção rápida:** Alertas em tempo real

### **Para Financeiro**
- **Controle de custos:** Bônus acima do orçamento
- **Eficiência:** ROI abaixo do esperado
- **Auditoria:** Histórico completo de alertas

## 📊 Thresholds Padrão

| Tipo | Valor Padrão | Descrição |
|------|--------------|-----------|
| `min_roi_percent` | 100% | ROI mínimo aceitável |
| `max_bonus_percent_of_revenue` | 15% | Bônus máximo como % da receita |
| `min_acceptance_rate` | 70% | Taxa mínima de aceitação |
| `min_daily_rides` | 5 | Corridas mínimas em 30 dias |

## 🔒 Segurança e Auditoria

### **Logs Estruturados**
```json
{
  "timestamp": "2026-01-01T13:00:00Z",
  "alert_id": "uuid",
  "alert_type": "roi_low",
  "severity": "medium",
  "message": "ROI baixo detectado...",
  "source": "automatic_monitoring"
}
```

### **Auditoria de Ações**
- Quem reconheceu cada alerta
- Quando alertas foram resolvidos
- Histórico de mudanças de thresholds
- Rastreabilidade completa

### **Prevenção de Automação**
- Alertas apenas informam, não agem
- Decisões sempre requerem intervenção humana
- Thresholds configuráveis por usuário autorizado
- Logs de todas as ações administrativas

## 🚀 Status de Implementação

✅ **Schema de alertas** criado  
✅ **Thresholds configuráveis** implementados  
✅ **Job automático** de monitoramento  
✅ **APIs completas** para gestão  
✅ **Logs estruturados** funcionais  
✅ **Webhook interno** preparado  
✅ **Prevenção de duplicação** ativa  
✅ **Auditoria completa** implementada  

**Sistema de Alertas 100% funcional e pronto para produção!** 🎉

## ⚠️ Garantias de Segurança

- ✅ **Sem automação perigosa** - Apenas notificação, humano decide
- ✅ **Thresholds configuráveis** - Flexibilidade total de configuração
- ✅ **Auditoria completa** - Rastreabilidade de todas as ações
- ✅ **Prevenção de spam** - Cooldown e deduplicação
- ✅ **Logs estruturados** - Monitoramento e debugging facilitados
- ✅ **Zero breaking changes** - Sistema existente preservado
