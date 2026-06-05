# Plano de Rollback — Territory Price Floors (Fase 1A)

## Resumo da Feature

A Fase 1A adiciona pisos territoriais de preço. A regra é:
```
preço_final = MAX(preço_calculado_pelo_engine, piso_territorial)
```

Se não houver match na tabela `territory_price_floors`, o cálculo atual permanece inalterado.

---

## Componentes Deployados

| Componente | Tipo | Arquivo |
|---|---|---|
| Tabela SQL | Migration | `007_territory_price_floors.sql` |
| Dados seed | SQL | `008_seed_territory_floors_zona_sul.sql` |
| Service | TypeScript | `src/services/territory-floor.service.ts` |
| Rota admin | TypeScript | `src/routes/admin-territory-floors.ts` |
| Integração engine | TypeScript | `src/services/pricing-engine.ts` (3 linhas) |
| Registro rota | TypeScript | `src/app.ts` (2 linhas) |

---

## Cenários de Rollback

### Cenário A: Floor está calculando preço errado (emergência operacional)

**Ação: Desativar todos os floors SEM deploy**

```sql
-- Desativa TODOS os pisos territoriais imediatamente
UPDATE territory_price_floors SET is_active = false;
```

**Tempo de efeito:** Imediato (próxima corrida já ignora floors).
**Impacto:** Zero — o `getFloorForRoute()` só retorna rows com `is_active = true`. Sem rows ativas → retorna `null` → cálculo normal.

---

### Cenário B: Desativar apenas um território específico

```sql
-- Desativa floors de um território específico
UPDATE territory_price_floors 
SET is_active = false 
WHERE territory_id = '<UUID_DO_TERRITORIO>';
```

---

### Cenário C: Bug no service/engine (requer deploy)

**Ação: Reverter o código e redeployar**

1. Reverter `pricing-engine.ts` — remover as 3 linhas de floor:
```bash
git revert <commit_hash> -- backend/src/services/pricing-engine.ts
```

Ou manualmente remover:
- Linha de import: `import { getFloorForRoute } from './territory-floor.service';`
- Bloco de 10 linhas: `// Apply territory price floor...` até `}`
- Referência no log: `${floor_applied ? ...}`

2. Deploy do backend normalmente.

**Tempo de efeito:** Após deploy (~5 min no ECS).

---

### Cenário D: Rollback total (remover tudo)

**Ordem de execução:**

```bash
# 1. Deploy sem a feature (reverter código)
git revert <commit_hash>
# deploy...

# 2. Após deploy estável, dropar tabela (não urgente)
psql -c "DROP TABLE IF EXISTS territory_price_floors;"
```

**SQL de rollback completo:**
```sql
-- Remove dados
DELETE FROM territory_price_floors;

-- Remove tabela
DROP TABLE IF EXISTS territory_price_floors;
```

---

## Design Fail-Safe

A feature foi projetada para ser segura por padrão:

| Situação | Comportamento |
|---|---|
| Tabela não existe | `getFloorForRoute()` retorna `null` → cálculo normal |
| Query falha (erro SQL) | `catch` retorna `null` → cálculo normal |
| Nenhum match na tabela | Retorna `null` → cálculo normal |
| `is_active = false` | Não inclui na query → como se não existisse |
| `floor_price < preço_calculado` | Floor não aplica (só aplica se floor > calculado) |
| `origin_neighborhood_id = null` | Retorna `null` imediatamente → cálculo normal |

**Conclusão:** Em qualquer cenário de falha, o sistema se comporta exatamente como antes da feature.

---

## Monitoramento Pós-Deploy

### Logs para acompanhar:
```bash
# Floor sendo aplicado (sucesso)
grep "PRICING_FLOOR" /var/log/app.log

# Quote normal (sem floor)
grep "PRICING_QUOTE" /var/log/app.log | grep -v "FLOOR_APPLIED"

# Erros no floor service
grep "TerritoryFloor.*Error" /var/log/app.log
```

### Métricas esperadas após ativação:
- Corridas Rocinha/Vidigal → Zona Sul: preço deve ser >= tabela do gestor
- Corridas fora do escopo (Tambaú, SP, etc.): preço inalterado
- Nenhum erro 500 relacionado a territory_price_floors

---

## Checklist Pré-Deploy

- [ ] Migration 007 executada com sucesso
- [ ] Seed 008 executado com UUIDs reais substituídos
- [ ] Validar com `GET /api/admin/territory-floors?territory_id=<UUID>` (deve retornar 66 rows)
- [ ] Testar corrida Rocinha → Leblon no staging (deve retornar R$ 30+)
- [ ] Testar corrida fora do território (deve manter cálculo normal)
- [ ] Confirmar que `[PRICING_FLOOR]` aparece nos logs de staging
- [ ] Aprovar para produção

---

## Contatos de Emergência

- **Rollback SQL imediato:** Executar Cenário A (UPDATE is_active = false)
- **Rollback com deploy:** Cenário C (reverter commit + deploy)
- **Tempo máximo sem intervenção:** Feature é fail-safe, mas se preços estiverem errados, Cenário A resolve em < 1 minuto via SQL direto.
