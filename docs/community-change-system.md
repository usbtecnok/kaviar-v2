# 🔄 Sistema de Mudança de Comunidade com Governança

## 📋 Visão Geral

Sistema completo para gerenciar mudanças de comunidade de usuários (motoristas e passageiros) com fluxo de aprovação, auditoria e histórico imutável.

## 🏗️ Arquitetura

### **Componentes Implementados**

```
1. 📊 SCHEMA DE BANCO
   ├─ community_change_requests (solicitações)
   ├─ user_community_history (histórico imutável)
   └─ Stored procedures para aprovação/rejeição

2. 📚 BIBLIOTECA DE FUNÇÕES
   ├─ Criação de solicitações
   ├─ Aprovação/rejeição com validações
   ├─ Mudanças administrativas
   └─ Consultas e estatísticas

3. 🌐 API REST COMPLETA
   ├─ 8 endpoints principais
   ├─ Validações robustas
   └─ Tratamento de erros

4. 🔧 STORED PROCEDURES
   ├─ approve_community_change()
   ├─ reject_community_change()
   └─ admin_change_community()
```

## 🗄️ Schema do Banco

### **community_change_requests**
```sql
id                      UUID PRIMARY KEY
user_id                 UUID NOT NULL
user_type               TEXT NOT NULL CHECK (user_type IN ('driver', 'passenger'))
current_community_id    UUID NOT NULL REFERENCES communities(id)
requested_community_id  UUID NOT NULL REFERENCES communities(id)
reason                  TEXT NOT NULL
document_url            TEXT
status                  TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
reviewed_by             TEXT
review_notes            TEXT
reviewed_at             TIMESTAMPTZ
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

### **user_community_history**
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID NOT NULL
user_type           TEXT NOT NULL CHECK (user_type IN ('driver', 'passenger'))
old_community_id    UUID REFERENCES communities(id)
new_community_id    UUID NOT NULL REFERENCES communities(id)
change_type         TEXT NOT NULL CHECK (change_type IN ('request_approved', 'admin_change'))
changed_by          TEXT NOT NULL
reason              TEXT
request_id          UUID REFERENCES community_change_requests(id)
changed_at          TIMESTAMPTZ DEFAULT NOW()
```

## 🔧 Stored Procedures

### **approve_community_change()**
- Valida se solicitação existe e está pendente
- Atualiza tabela de drivers/passengers
- Registra no histórico
- Atualiza status da solicitação
- Retorna resultado da operação

### **reject_community_change()**
- Valida solicitação
- Atualiza status para rejeitado
- Registra reviewer e notas
- Não altera comunidade do usuário

### **admin_change_community()**
- Mudança direta sem solicitação
- Atualiza tabela de drivers/passengers
- Registra no histórico como admin_change
- Bypass do fluxo de aprovação

## 🌐 API REST

### **Endpoints Implementados**

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/v1/community-change/request` | Criar solicitação |
| POST | `/api/v1/community-change/:id/approve` | Aprovar solicitação |
| POST | `/api/v1/community-change/:id/reject` | Rejeitar solicitação |
| POST | `/api/v1/community-change/admin-change` | Mudança administrativa |
| GET | `/api/v1/community-change/requests` | Listar solicitações |
| GET | `/api/v1/community-change/requests/:id` | Buscar solicitação específica |
| GET | `/api/v1/community-change/history/:user_id/:user_type` | Histórico do usuário |
| GET | `/api/v1/community-change/stats` | Estatísticas |

## 📝 Exemplos de Uso

### **1. Criar Solicitação**
```bash
curl -X POST http://localhost:3000/api/v1/community-change/request \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_type": "driver",
    "requested_community_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
    "reason": "Mudança de residência para nova região",
    "document_url": "https://docs.example.com/comprovante.pdf"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "request": {
    "id": "req-uuid-here",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_type": "driver",
    "current_community": {
      "id": "current-uuid",
      "name": "Vila Madalena"
    },
    "requested_community": {
      "id": "requested-uuid", 
      "name": "Pinheiros"
    },
    "reason": "Mudança de residência para nova região",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Solicitação de mudança criada com sucesso"
}
```

### **2. Aprovar Solicitação**
```bash
curl -X POST http://localhost:3000/api/v1/community-change/req-uuid-here/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewed_by": "admin@kaviar.com",
    "review_notes": "Documentação válida, aprovado"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_type": "driver",
    "old_community_id": "current-uuid",
    "new_community_id": "requested-uuid",
    "changed_at": "2024-01-15T14:20:00Z"
  },
  "message": "Mudança de comunidade aprovada com sucesso"
}
```

### **3. Listar Solicitações Pendentes**
```bash
curl "http://localhost:3000/api/v1/community-change/requests?status=pending&limit=10"
```

**Resposta:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "req-uuid-1",
      "user_id": "user-uuid-1",
      "user_type": "passenger",
      "current_community": {
        "id": "comm-1",
        "name": "Copacabana",
        "type": "neighborhood"
      },
      "requested_community": {
        "id": "comm-2", 
        "name": "Ipanema",
        "type": "neighborhood"
      },
      "reason": "Trabalho na nova região",
      "status": "pending",
      "created_at": "2024-01-15T09:15:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

### **4. Histórico de Mudanças**
```bash
curl "http://localhost:3000/api/v1/community-change/history/user-uuid/driver"
```

**Resposta:**
```json
{
  "success": true,
  "history": [
    {
      "id": "hist-uuid-1",
      "user_id": "user-uuid",
      "user_type": "driver",
      "old_community": {
        "id": "old-comm-uuid",
        "name": "Vila Madalena",
        "type": "neighborhood"
      },
      "new_community": {
        "id": "new-comm-uuid",
        "name": "Pinheiros", 
        "type": "neighborhood"
      },
      "change_type": "request_approved",
      "changed_by": "admin@kaviar.com",
      "reason": "Mudança de residência aprovada",
      "changed_at": "2024-01-15T14:20:00Z"
    }
  ],
  "count": 1
}
```

### **5. Mudança Administrativa**
```bash
curl -X POST http://localhost:3000/api/v1/community-change/admin-change \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "user_type": "driver",
    "new_community_id": "new-comm-uuid",
    "changed_by": "system@kaviar.com",
    "reason": "Correção de dados cadastrais"
  }'
```

## 📊 Validações Implementadas

### **Validações de Negócio**
- ✅ Usuário não pode solicitar mudança para comunidade atual
- ✅ Apenas uma solicitação pendente por usuário
- ✅ Comunidade de destino deve existir e estar ativa
- ✅ Motivo deve ter pelo menos 10 caracteres
- ✅ Solicitação deve estar pendente para aprovação/rejeição

### **Validações Técnicas**
- ✅ UUIDs válidos para IDs
- ✅ Tipos de usuário válidos (driver/passenger)
- ✅ Status válidos (pending/approved/rejected)
- ✅ Campos obrigatórios preenchidos
- ✅ Limites de paginação respeitados

## 🔒 Segurança e Auditoria

### **Histórico Imutável**
- Todas as mudanças são registradas em `user_community_history`
- Registro inclui quem fez a mudança e quando
- Não é possível alterar ou deletar histórico
- Rastreabilidade completa de mudanças

### **Controle de Acesso**
- Aprovações requerem identificação do reviewer
- Mudanças administrativas são logadas separadamente
- Todas as operações incluem timestamps
- Validação de permissões por tipo de operação

## 🎯 Benefícios Implementados

### **Para Usuários**
- ✅ Processo transparente de mudança
- ✅ Acompanhamento de status em tempo real
- ✅ Histórico completo de mudanças
- ✅ Justificativa obrigatória

### **Para Administradores**
- ✅ Controle total sobre aprovações
- ✅ Visibilidade de todas as solicitações
- ✅ Estatísticas de mudanças
- ✅ Capacidade de mudança administrativa

### **Para o Sistema**
- ✅ Auditoria completa
- ✅ Integridade referencial
- ✅ Performance otimizada
- ✅ Escalabilidade garantida

## 🚀 Integração com Sistema Existente

### **Compatibilidade**
- ✅ Zero breaking changes no sistema atual
- ✅ Reutiliza tabelas existentes (communities, drivers, passengers)
- ✅ Mantém integridade referencial
- ✅ Adiciona funcionalidade sem impacto

### **Extensibilidade**
- ✅ Preparado para notificações automáticas
- ✅ Suporte a documentos anexos
- ✅ Configurável para diferentes tipos de aprovação
- ✅ Integrável com sistema de permissões

## 📈 Próximos Passos

### **Melhorias Futuras**
- [ ] Notificações automáticas por email/WhatsApp
- [ ] Interface web para administradores
- [ ] Aprovação em múltiplas etapas
- [ ] Integração com sistema de documentos
- [ ] Dashboard de métricas de mudanças
- [ ] Exportação de relatórios

### **Monitoramento**
- [ ] Alertas para solicitações pendentes há muito tempo
- [ ] Métricas de tempo de aprovação
- [ ] Análise de padrões de mudança
- [ ] Detecção de anomalias

## ✅ Status de Implementação

**COMPLETO E FUNCIONAL** 🎉

- ✅ Schema de banco implementado
- ✅ Stored procedures criadas
- ✅ Biblioteca de funções completa
- ✅ API REST com 8 endpoints
- ✅ Validações robustas
- ✅ Tratamento de erros
- ✅ Documentação completa
- ✅ Integração com servidor principal

**Pronto para uso em produção!**
