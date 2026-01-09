# Relatório - Importação RJ Padrão Ouro (Piloto)

**Data:** 2026-01-09T15:34:10.296Z

## Resumo

- **Total processados:** 3
- **Criados:** 0
- **Atualizados:** 3
- **Ignorados:** 0

## Detalhes

### Glória
- **Ação:** UPDATED
- **Community ID:** cmk6uwq9u0007qqr3pxqr64ce
- **Tipo:** Polygon
- **Confidence:** MED


### Botafogo
- **Ação:** UPDATED
- **Community ID:** cmk6ux02j0011qqr398od1msm
- **Tipo:** Polygon
- **Confidence:** MED


### Tijuca
- **Ação:** UPDATED
- **Community ID:** cmk6ux8fk001rqqr371kc4ple
- **Tipo:** Polygon
- **Confidence:** MED


## Validação Obrigatória

Testar em produção:

1. **Botafogo:** GET /api/governance/communities/{id}/geofence → deve retornar Polygon
2. **Tijuca:** GET /api/governance/communities/{id}/geofence → deve retornar Polygon  
3. **UI "Ver no mapa"** deve desenhar polígonos para ambos

## Próximos Passos

Após validação do piloto:
- Executar importação completa dos 13 polígonos restantes
- Manter isVerified=false para todos
- Documentar melhorias no "Ver no mapa"
