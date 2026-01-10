# Correção de Governança para Geofences - Implementação Mínima

## 🎯 OBJETIVOS IMPLEMENTADOS

### 1. Validação RJ (Bloqueio de Verificação)
- **Arquivo**: `backend/src/utils/geofence-governance.ts`
- **Função**: `isLikelyInRioCity(lat, lng)`
- **Bbox RJ**: lat entre -23.15 e -22.70, lng entre -43.85 e -43.00
- **Comportamento**: Bloqueia verificação se coordenadas estão fora do RJ
- **Mensagem**: "⚠️ Coordenadas fora do RJ — este registro está incorreto/duplicado. Não verifique. Arquive ou corrija antes."

### 2. Detecção e Alerta de Duplicidade por Nome
- **Endpoint**: `GET /api/admin/communities/with-duplicates`
- **Função**: `pickCanonical(candidates)` - escolhe ID canônico automaticamente
- **Critérios de Canonicidade**:
  1. Preferir quem tem Polygon/MultiPolygon (score 25-30)
  2. Preferir quem tem centro dentro do RJ (+10 pontos)
  3. Preferir quem tem qualquer geofence vs SEM_DADOS (+1 ponto)
- **UI**: Badge "DUPLICADO (2+)" na listagem
- **Validação**: Não permite verificar duplicado sem escolher ID canônico

### 3. Botão "Arquivar" (Recomendado em vez de Apagar)
- **Endpoint**: `PATCH /api/admin/communities/:id/archive`
- **Implementação**: Usa `isActive=false` (campo já existente)
- **Comportamento**: Remove do fluxo padrão sem deletar dados
- **Critério**: Arquivar o "pior" (SEM_DADOS + coords fora do RJ)

## 📁 ARQUIVOS MODIFICADOS/CRIADOS

### Backend
```
backend/src/utils/geofence-governance.ts          [NOVO]
backend/src/controllers/geofence.ts               [MODIFICADO]
backend/src/routes/admin.ts                       [MODIFICADO]
```

### Frontend
```
frontend-app/src/utils/geofence-governance.js     [NOVO]
frontend-app/src/pages/admin/GeofenceManagement.jsx [MODIFICADO]
```

### Testes
```
test_geofence_governance.sh                       [NOVO]
```

## 🔧 ENDPOINTS IMPLEMENTADOS

### 1. Listar Communities com Duplicados
```http
GET /api/admin/communities/with-duplicates
```
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Alto da Boa Vista",
      "isDuplicate": true,
      "duplicateCount": 3,
      "canonicalId": "canonical-id",
      "isCanonical": true,
      "duplicateIds": ["id1", "id2", "id3"],
      "geofenceData": { ... }
    }
  ]
}
```

### 2. Arquivar Community
```http
PATCH /api/admin/communities/:id/archive
Content-Type: application/json

{
  "reason": "Coordenadas fora do RJ"
}
```

### 3. Revisão com Validação (Modificado)
```http
PATCH /api/admin/communities/:id/geofence-review
Content-Type: application/json

{
  "centerLat": -22.9068,
  "centerLng": -43.1729,
  "isVerified": true,
  "selectedCanonicalId": "canonical-id"  // Para duplicados
}
```

**Response com Erro de Validação**:
```json
{
  "success": false,
  "error": "Coordenadas fora do RJ (-10.900507, -37.691472).",
  "validationFailed": true,
  "duplicates": [...]
}
```

## 🎨 INTERFACE ATUALIZADA

### Filtros Adicionados
- **Duplicados**: Todos / Apenas Duplicados / Sem Duplicados

### Colunas da Tabela
- **Duplicado**: Badge "DUPLICADO (3)" + "CANÔNICO"
- **Validação RJ**: "OK" / "FORA DO RJ" 
- **Ações**: Botão "Arquivar" para casos problemáticos

### Validações Visuais
- **Linha vermelha**: Coordenadas fora do RJ
- **Linha laranja**: Duplicados
- **Ícone Warning**: Não pode ser verificado
- **Switch desabilitado**: Quando validação falha

### Dialogs
1. **Seleção de Canônico**: Lista duplicados com scores
2. **Arquivamento**: Campo de motivo obrigatório
3. **Edição**: Alertas de validação em tempo real

## 🧪 TESTES OBRIGATÓRIOS

Execute o script de teste:
```bash
./test_geofence_governance.sh
```

### Cenários Testados
1. **Detecção de duplicados**: Verifica se API retorna duplicados corretamente
2. **Validação RJ**: Tenta verificar coordenada fora do RJ (deve falhar)
3. **Validação duplicados**: Tenta verificar sem selecionar canônico (deve falhar)
4. **Arquivamento**: Testa isActive=false
5. **SEM_DADOS**: Tenta verificar sem geofence (deve falhar)

## ✅ CONFORMIDADE COM RESTRIÇÕES

### ✅ Não criar communities novas
- Implementação trabalha apenas com communities existentes

### ✅ Não mexer em migrations/seeds  
- Usa campo `isActive` já existente no schema
- Não cria novas tabelas ou campos

### ✅ Não apagar registros do banco
- Arquivamento usa `isActive=false`
- Dados permanecem íntegros para auditoria

### ✅ Correção admin/UI + regras de segurança
- Validações no backend (controller + utils)
- Interface administrativa atualizada
- Não permite bypass das regras

### ✅ Sem Frankenstein
- Código organizado em módulos específicos
- Reutiliza estruturas existentes
- Implementação mínima e focada

## 🚀 RESULTADO ESPERADO

1. **"Revisão de geofences" não deixa marcar verificado um bairro fora do RJ** ✅
2. **Duplicados ficam evidentes e controlados** ✅  
3. **Operador consegue "arquivar" o registro ruim sem deletar** ✅
4. **UI passa a trabalhar sempre com ID canônico e reduz risco** ✅

## 📋 MENSAGENS IMPLEMENTADAS

### Alertas de Bloqueio
- `⚠️ Coordenadas fora do RJ — este registro está incorreto/duplicado. Não verifique. Arquive ou corrija antes.`
- `🚧 Nome duplicado detectado. Escolha o ID canônico (preferência: Polygon/MultiPolygon) antes de verificar.`
- `ℹ️ Sem dados de cerca (SEM_DADOS). Para aparecer Polygon no mapa: buscar polígono → salvar geofence → UI renderiza Polygon.`

### Feedback Visual
- Badge "DUPLICADO (2+)" 
- Badge "CANÔNICO" para ID sugerido
- Chip "FORA DO RJ" em vermelho
- Switch desabilitado com tooltip explicativo

## 🔍 AUDITORIA

O sistema registra:
- Arquivamentos com motivo no console
- Tentativas de verificação bloqueadas
- Seleções de ID canônico
- Todas as ações mantêm rastreabilidade
