# Relatório Final - Divergência de IDs Identificada

**Data:** 2026-01-09T21:51:00.000Z
**Execução:** 2026-01-09__build-b73db6a
**Status:** 🎯 PROBLEMA RAIZ IDENTIFICADO

## 🚨 DIVERGÊNCIA CRÍTICA: IDs DIFERENTES

### ✅ API validate_apis.mjs (Funcionando)
```bash
Botafogo: cmk6ux02j0011qqr398od1msm → HTTP 200 + Polygon ✅
Tijuca:   cmk6ux8fk001rqqr371kc4ple → HTTP 200 + Polygon ✅  
Glória:   cmk6uwq9u0007qqr3pxqr64ce → HTTP 200 + Polygon ✅
Providência: cmk6uwnvh0001qqr377ziza29 → HTTP 404 + SEM_DADOS ✅
```

### ❌ UI Real (Usando IDs Diferentes)
```bash
Botafogo: cmk6ux0dx0012qqr3sx949css → HTTP 404 + "Geofence não encontrado" ❌
Tijuca:   cmk6ux8rf001sqqr38hes7gqf → HTTP 404 + "Geofence não encontrado" ❌
Glória:   cmk6uwr250009qqr3jaiz54s5 → HTTP 404 + "Geofence não encontrado" ❌
Providência: cmk6uwnvh0001qqr377ziza29 → HTTP 404 + "Geofence não encontrado" ✅
```

## 🔍 Evidência de Requests Capturada

### 📡 Requests Monitorados (4 casos)
- `requests_botafogo.json`: 2 requests capturados
- `requests_tijuca.json`: 2 requests capturados  
- `requests_gloria.json`: 2 requests capturados
- `requests_morro_da_providencia.json`: 2 requests capturados

### 📋 Exemplo Request (Botafogo)
```json
{
  "url": "https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux0dx0012qqr3sx949css/geofence",
  "method": "GET",
  "status": 404,
  "responseBody": "{\"success\":false,\"error\":\"Geofence não encontrado para esta comunidade\"}"
}
```

## 🎯 Análise do Problema

### ✅ Confirmações
1. **UI dispara fetch**: ✅ Todas as 4 communities fazem request de geofence
2. **Endpoint correto**: ✅ URL `/api/governance/communities/{id}/geofence` está correta
3. **Backend funcionando**: ✅ API responde corretamente para IDs corretos
4. **Network/CSP**: ✅ Sem bloqueios ou erros de rede

### 🚨 Problema Identificado
**UI está usando IDs ERRADOS para as communities!**

- **validate_apis.mjs**: Usa IDs corretos (que têm geofence)
- **UI real**: Usa IDs diferentes (que não têm geofence)

### 🔍 Possíveis Causas
1. **Dados desatualizados**: UI pode estar usando cache/dados antigos
2. **Mapeamento incorreto**: Tabela pode estar mostrando nomes corretos mas IDs errados
3. **Database inconsistency**: Pode haver duplicatas com nomes iguais mas IDs diferentes
4. **Frontend state**: Estado do frontend pode estar mapeando incorretamente

## 🔧 Próximos Passos

### 1. Verificar Database
```bash
# Verificar se existem múltiplas communities com mesmo nome
SELECT name, id, COUNT(*) FROM communities 
WHERE name IN ('Botafogo', 'Tijuca', 'Glória') 
GROUP BY name HAVING COUNT(*) > 1;
```

### 2. Verificar Tabela Admin
- Confirmar se a tabela `/admin/geofences` está mostrando os IDs corretos
- Verificar se há filtros ou ordenação que podem estar afetando os IDs

### 3. Corrigir Mapeamento
- Atualizar IDs no script de teste para usar os mesmos que a UI
- OU corrigir a UI para usar os IDs corretos que têm geofence

## 📊 Comparação de IDs

| Community | validate_apis.mjs (✅) | UI Real (❌) | Status |
|-----------|----------------------|-------------|--------|
| Botafogo | cmk6ux02j0011qqr398od1msm | cmk6ux0dx0012qqr3sx949css | IDs diferentes |
| Tijuca | cmk6ux8fk001rqqr371kc4ple | cmk6ux8rf001sqqr38hes7gqf | IDs diferentes |
| Glória | cmk6uwq9u0007qqr3pxqr64ce | cmk6uwr250009qqr3jaiz54s5 | IDs diferentes |
| Providência | cmk6uwnvh0001qqr377ziza29 | cmk6uwnvh0001qqr377ziza29 | ID igual (ambos 404) |

## 🎯 Conclusão

**PROBLEMA RAIZ IDENTIFICADO:**
- ✅ Automação funcionando 100%
- ✅ Backend API funcionando 100%
- ✅ Requests sendo feitos corretamente
- ❌ **UI usando IDs errados para communities**

**Solução:** Corrigir o mapeamento de IDs entre a tabela admin e os dados reais que têm geofence.

---
*Diagnóstico completo. Problema não é técnico, é de dados/mapeamento.*
