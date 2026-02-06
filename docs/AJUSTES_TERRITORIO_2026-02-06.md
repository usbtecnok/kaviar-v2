# Ajustes no Sistema de Território - 2026-02-06

## Mudanças Implementadas

### 1. Backend: territory-service.ts
**Arquivo**: `backend/src/services/territory-service.ts`

**Mudança**: Ajustado `getSmartNeighborhoodList()` para retornar estrutura clara:
```typescript
return {
  detected,  // Bairro detectado via GPS (null se não detectado)
  nearby,    // Bairros próximos (array vazio se detectado)
  all,       // Todos os bairros ativos
};
```

**Antes**: Retornava `currentLocation` (removido para simplificar)

**Compatibilidade**: ✅ Frontend React Native não usa `currentLocation`

### 2. Scripts de Teste

#### test_neighborhoods_smart.sh
- Obtém coordenadas reais via `ST_PointOnSurface` (garante ponto dentro do polígono)
- Testa detecção automática com GPS
- Testa fallback sem GPS
- Usa `jq` para formatar saída: `{detected, nearby: (.nearby[0:5])}`

#### validate_territory_fee.sh
- Obtém coordenadas de 3 bairros via `ST_PointOnSurface`:
  - Zumbi (mesmo bairro)
  - Del Castilho (adjacente)
  - Acari (fora da cerca)
- Valida 3 cenários de taxa: 7%, 12%, 20%
- Exit code 0 se todos passarem, 1 se falhar

### 3. Documentação
**Arquivo**: `scripts/README.md`

Documenta:
- Pré-requisitos (AWS CLI, jq, SSM)
- Como executar cada script
- Comandos úteis para teste manual
- Arquitetura do sistema
- Troubleshooting

## Padrão Kaviar Aplicado

✅ **Sem Frankenstein**: Código limpo, direto ao ponto
✅ **Sem hardcode**: Usa Secrets Manager para credenciais
✅ **Região fixa**: us-east-2 em todos os scripts
✅ **Coordenadas reais**: ST_PointOnSurface garante pontos válidos
✅ **jq para JSON**: Formatação clara e legível

## Próximos Passos

### Deploy Necessário
O código foi alterado mas não deployado. Versão atual em produção: `27fcd02`

Para aplicar as mudanças:
```bash
# 1. Build
cd backend
npm run build

# 2. Deploy (método a definir)
# - Docker push + ECS update
# - ou CI/CD pipeline
```

### Validação Pós-Deploy
```bash
# Testar detecção automática
./scripts/test_neighborhoods_smart.sh

# Validar sistema de taxa
./scripts/validate_territory_fee.sh
```

## Estrutura de Resposta

### GET /api/neighborhoods/smart-list?lat=X&lng=Y

**Com GPS (detectado):**
```json
{
  "success": true,
  "data": [...],
  "detected": {
    "id": "uuid",
    "name": "Zumbi",
    "hasGeofence": true,
    "minFee": 7,
    "maxFee": 20
  },
  "nearby": []
}
```

**Com GPS (não detectado):**
```json
{
  "success": true,
  "data": [...],
  "detected": null,
  "nearby": [
    {
      "id": "uuid",
      "name": "Abolição",
      "distance": 1234,
      "hasGeofence": false,
      "minFee": 12,
      "maxFee": 20
    }
  ]
}
```

**Sem GPS:**
```json
{
  "success": true,
  "data": [...],
  "detected": null,
  "nearby": []
}
```

## Compatibilidade Frontend

O app React Native (`kaviar-app/app/(auth)/register.tsx`) já está preparado:
- Verifica `data.detected` para mostrar bairro detectado
- Usa `data.nearby` para sugestões
- Fallback para `data.all` se necessário
- Exibe badge com taxa mínima (7% ou 12%)

## Segurança

✅ Credenciais via Secrets Manager
✅ Sem senhas em código
✅ SSM com audit trail
✅ Região fixa (us-east-2)
✅ Validação de entrada (zod schemas)

## Arquivos Modificados

1. `backend/src/services/territory-service.ts` - Ajuste em getSmartNeighborhoodList
2. `scripts/test_neighborhoods_smart.sh` - Novo
3. `scripts/validate_territory_fee.sh` - Novo
4. `scripts/README.md` - Novo
5. `docs/AJUSTES_TERRITORIO_2026-02-06.md` - Este arquivo
