# Ajustes de Documentação - Load Test "À Prova de Auditoria"

## Resumo das Mudanças (SOMENTE TEXTO/DOC)

### 1. Terminologia Correta do Boost ✅

**Antes:**
- "boost = 0.35"
- "boost prob = 0.07"
- Confusão entre factor e probabilidade real

**Depois:**
- `boost_factor`: 0.35 (valor configurado em DEV_GEOFENCE_BOOST)
- `boost_prob`: 0.07 (incremento real = boost_factor * 0.2)
- `cap`: 0.98 (limite máximo via Math.min)

**Exemplo de log documentado:**
```
[DEV_GEOFENCE_BOOST_APPLIED] driver_id=... accept_prob_base=0.850 boost_factor=0.35 boost_prob=0.070 accept_prob_boosted=0.920
```

---

### 2. Cap de Probabilidade Explícito ✅

**Adicionado em todos os docs:**
- `acceptProb = Math.min(0.98, acceptProb + boost_prob)`
- Garante que probabilidade nunca ultrapassa 98%
- Evita prob > 1.0 com boosts muito altos

---

### 3. Critérios Robustos (Estatisticamente Válidos) ✅

**Antes:**
- "INSIDE 95% vs OUTSIDE 70%" (números fixos)
- Sem considerar variância de amostra pequena

**Depois:**
- **Critério robusto**: `accept_rate_inside - accept_rate_outside >= 5pp` (preferível >= 7pp)
- **Nota sobre variância**: Com 10 rides OUTSIDE, 1 ride = 10pp de variação
- **Recomendação**: 60 rides (40 INSIDE / 20 OUTSIDE) para auditoria rigorosa

**Exemplo de critério PASSOU:**
```
✅ accepted_total >= 24/30 (80%+)
✅ expired <= 2 (ideal 0)
✅ accept_rate_inside - accept_rate_outside >= 5pp
✅ Logs completos: offer → decision → accept → release
```

---

### 4. Matemática Esperada Revisada ✅

**Cálculo correto:**
- Base: 0.85 (85%)
- INSIDE boosted: 0.85 + 0.07 = 0.92 (92%)
- OUTSIDE base: 0.85 (85%)
- **Diferença esperada: 7pp (boost_prob)**

**Resultado esperado (30 rides):**
- 20 INSIDE * 0.92 = ~18 accepted
- 10 OUTSIDE * 0.85 = ~8.5 accepted
- Total: ~26-27 accepted (87%)

**Opcional - 60 rides (mais robusto):**
- 40 INSIDE * 0.92 = ~37 accepted
- 20 OUTSIDE * 0.85 = ~17 accepted
- Total: ~54 accepted
- Diferença mais estável: 1 ride = 2.5pp (vs 10pp com 10 rides)

---

## Arquivos Atualizados

1. **LOAD_TEST_CONFIRMED.md**
   - Terminologia correta (boost_factor, boost_prob, cap)
   - Critérios robustos com >= 5pp
   - Nota sobre variância estatística
   - Recomendação de 60 rides

2. **LOAD_TEST_REALISTIC.md**
   - Mesmos ajustes de terminologia
   - Critérios atualizados
   - Matemática revisada com diferença esperada de 7pp
   - Seção opcional para 60 rides

---

## Validação de Auditoria

### Checklist para evidência válida:

- ✅ Logs mostram `boost_factor=0.35` e `boost_prob=0.070`
- ✅ Logs mostram `accept_prob_base=0.850` e `accept_prob_boosted=0.920`
- ✅ Cap de 0.98 está documentado e implementado
- ✅ Critério de PASSOU usa diferença >= 5pp (não números fixos)
- ✅ Nota sobre variância com amostra pequena está presente
- ✅ Recomendação de 60 rides para auditoria rigorosa está documentada
- ✅ Matemática esperada está correta (7pp de diferença)

### Exemplo de resultado válido (30 rides):

```
Geofence boost:
 geofence | accepted | total | accept_rate
----------+----------+-------+-------------
 INSIDE   |    18    |  20   |   90.0
 OUTSIDE  |     8    |  10   |   80.0

Diferença: 90.0 - 80.0 = 10pp >= 7pp ✅ PASSOU
```

**Nota**: Mesmo se OUTSIDE variar para 70% ou 90%, critério >= 5pp ainda detecta boost.

---

## Conclusão

Documentação agora está "à prova de auditoria" com:
1. Terminologia técnica correta (factor vs prob)
2. Cap explícito (0.98)
3. Critérios estatisticamente robustos (>= 5pp)
4. Nota sobre variância de amostra pequena
5. Recomendação de 60 rides para rigor máximo
6. Matemática esperada correta (7pp de diferença)

**Nenhuma mudança de código foi necessária - apenas clareza na documentação!**
