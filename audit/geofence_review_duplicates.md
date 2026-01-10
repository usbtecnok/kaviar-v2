# DUPLICADOS DETECTADOS - REVISÃO DE GEOFENCES

## Tabela: Nome → IDs

| Nome | IDs Encontrados | Status | Canônico Sugerido |
|------|----------------|--------|-------------------|
| Alto da Boa Vista | [id1, id2, id3] | ⚠️ ALERTANDO | id2 (Polygon) |
| Cruzada São Sebastião | [id4, id5] | ⚠️ ALERTANDO | id4 (dentro RJ) |
| Morro do Turano | [id6, id7, id8] | ⚠️ ALERTANDO | id7 (MultiPolygon) |
| Botafogo | [id9] | ✅ ÚNICO | id9 |
| Copacabana | [id10] | ✅ ÚNICO | id10 |

## Algoritmo de Canonicidade

### Critérios (em ordem de prioridade):
1. **Geometria**: MultiPolygon (30) > Polygon (25) > LineString (10) > Point (5) > SEM_DADOS (0)
2. **Localização**: Dentro do RJ (+10 pontos)
3. **Existência**: Tem geofence vs SEM_DADOS (+1 ponto)

### Exemplos de Score:
```
Alto da Boa Vista:
- id1: Point fora RJ = 5 + 0 + 1 = 6
- id2: Polygon dentro RJ = 25 + 10 + 1 = 36 ← CANÔNICO
- id3: SEM_DADOS fora RJ = 0 + 0 + 0 = 0
```

## Status de Resolução

### ⚠️ ALERTANDO (3 casos)
- **Alto da Boa Vista**: 3 IDs, operador deve escolher canônico
- **Cruzada São Sebastião**: 2 IDs, operador deve escolher canônico  
- **Morro do Turano**: 3 IDs, operador deve escolher canônico

### 🚧 BLOQUEANDO
- Tentativa de verificar duplicado sem seleção canônica → HTTP 400
- Mensagem: "Nome duplicado: selecione o ID canônico antes de marcar como verificado"

### ✅ RESOLVIDO
- IDs únicos passam direto na verificação
- IDs canônicos selecionados podem ser verificados

## Ações Recomendadas

### Para Duplicados Problemáticos:
1. **Fora do RJ**: Arquivar com isActive=false
2. **SEM_DADOS**: Buscar geofence real ou arquivar
3. **Canônico**: Manter ativo, arquivar os outros

### Interface de Seleção:
- Dialog mostra todos os IDs duplicados
- Destaca o canônico sugerido
- Permite seleção manual pelo operador
- Bloqueia verificação até seleção
