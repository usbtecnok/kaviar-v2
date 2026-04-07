# Validação de Território - Dados Reais

**Data:** 2026-02-05  
**API:** https://api.kaviar.com.br  
**Script:** scripts/validate_territory_real_data.sh

---

## 📋 Objetivo

Validar o sistema de território inteligente com dados reais da API de produção, testando os 3 cenários de taxas:
- **Cenário A:** Mesmo bairro OFFICIAL → 7%
- **Cenário B:** Bairro adjacente OFFICIAL → 12%
- **Cenário C:** Fora da região ou NULL → 20%

---

## 🔧 Pré-requisitos

1. API rodando em https://api.kaviar.com.br
2. Credenciais admin válidas
3. Bairros cadastrados no banco
4. Sistema de território implementado

---

## 🚀 Execução

```bash
# Executar script
./scripts/validate_territory_real_data.sh

# Verificar log
tail -f /tmp/validate_territory_*.log
```

---

## 📊 Cenários Testados

### Cenário A: Mesmo Bairro (7%)
**Descrição:** Motorista e passageiro no mesmo bairro com geofence oficial  
**Coordenadas:**
- Pickup: -22.9068, -43.1729 (Copacabana)
- Dropoff: -22.9035, -43.2096 (Copacabana)

**Esperado:**
- `feePercent`: 7%
- `territoryType`: OFFICIAL ou SAME_NEIGHBORHOOD
- `matchType`: SAME_NEIGHBORHOOD

**Resultado:** ⏳ PENDENTE (executar script)

---

### Cenário B: Bairro Adjacente (12%)
**Descrição:** Motorista em um bairro, passageiro em bairro adjacente  
**Coordenadas:**
- Pickup: -22.9519, -43.2105 (Tijuca)
- Dropoff: -22.9035, -43.2096 (Copacabana)

**Esperado:**
- `feePercent`: 12%
- `territoryType`: OFFICIAL ou ADJACENT_NEIGHBORHOOD
- `matchType`: ADJACENT_NEIGHBORHOOD

**Resultado:** ⏳ PENDENTE (executar script)

---

### Cenário C: Fora da Região (20%)
**Descrição:** Motorista no Rio, passageiro em São Paulo  
**Coordenadas:**
- Pickup: -23.5505, -46.6333 (São Paulo)
- Dropoff: -23.5489, -46.6388 (São Paulo)

**Esperado:**
- `feePercent`: 20%
- `territoryType`: OUTSIDE_FENCE ou NULL
- `matchType`: OUTSIDE_FENCE

**Resultado:** ⏳ PENDENTE (executar script)

---

## 🧪 Recursos de Teste

### Motorista TEST_KIRO_
- Prefixo: `TEST_KIRO_DRIVER_`
- Email: `test_kiro_driver_<timestamp>@test.com`
- Bairro: Primeiro bairro disponível
- Status: Aprovado automaticamente

### Passageiro TEST_KIRO_
- Prefixo: `TEST_KIRO_PASSENGER_`
- Email: `test_kiro_pass_<timestamp>@test.com`

### Limpeza
- Recursos são deletados automaticamente ao final
- Idempotente: pode ser executado múltiplas vezes

---

## ✅ Critérios de Sucesso

| Cenário | Taxa Esperada | Validação |
|---------|---------------|-----------|
| A - Mesmo bairro | 7% | feePercent === 7 |
| B - Adjacente | 12% | feePercent === 12 |
| C - Fora | 20% | feePercent === 20 |

**PASS:** Todos os 3 cenários retornam taxa correta  
**FAIL:** Qualquer cenário retorna taxa diferente

---

## 📝 Logs

### Localização
```
/tmp/validate_territory_YYYYMMDD_HHMMSS.log
```

### Conteúdo
- Timestamp de execução
- IDs de recursos criados
- Respostas da API
- Taxa calculada para cada cenário
- Resultado PASS/FAIL

---

## 🔍 Troubleshooting

### "Login admin falhou"
- Verificar credenciais admin
- Verificar se API está acessível

### "Bairros não encontrados"
- Verificar se existem bairros cadastrados
- Endpoint: `GET /api/governance/neighborhoods`

### "Criação de motorista falhou"
- Verificar logs da API
- Verificar se bairro existe
- Verificar validações do backend

### "Taxa incorreta"
- Verificar implementação de `fee-calculation.ts`
- Verificar `territory-service.ts`
- Verificar se geofences estão cadastradas

---

## 📊 Resultado Final

**Status:** ⏳ PENDENTE  
**Executar:** `./scripts/validate_territory_real_data.sh`

---

## 🔗 Referências

- Script: `scripts/validate_territory_real_data.sh`
- Documentação: `docs/archive/misc/EXPLICACAO_SISTEMA_KAVIAR.md`
- Implementação: `docs/archive/implementation/IMPLEMENTACAO_TERRITORIO_INTELIGENTE.md`
