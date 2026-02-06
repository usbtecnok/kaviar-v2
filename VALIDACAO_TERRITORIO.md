# Validação do Sistema de Território

Scripts para validar o sistema de território inteligente implementado no Kaviar.

## 📋 O que é validado

### Script Bash (`validate-territory.sh`)
1. ✅ Detecção automática de território via GPS
2. ✅ Cálculo de taxa baseado em território (7%, 12%, 15%)
3. ✅ Estatísticas de motorista por território
4. ✅ Integridade básica do banco

### Script SQL (`validate-territory.sql`)
1. ✅ Resumo geral (bairros, geofences, motoristas)
2. ✅ Bairros com mais motoristas
3. ✅ Motoristas sem bairro cadastrado
4. ✅ Geofences sem geometria
5. ✅ Estatísticas de corridas por território
6. ✅ Tipos de território (A, B, C)
7. ✅ Integridade referencial

## 🚀 Como usar

### Validação via API (Bash)

```bash
# Execução básica
./validate-territory.sh

# Com URL customizada
API_URL=https://seu-ambiente.com ./validate-territory.sh
```

### Validação via Banco (SQL)

```bash
# Definir senha do banco
export DB_PASSWORD="sua_senha_aqui"

# Executar validação
psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
     -U kaviaradmin \
     -d kaviar \
     -f validate-territory.sql
```

## 📊 Saída esperada

### Bash
```
✅ Admin autenticado
✅ Motorista: João Silva (ID: abc-123)
✅ Bairro cadastrado: def-456
✅ Copacabana: Copacabana (tipo: BAIRRO_OFICIAL)
✅ Cálculo territorial funcionando
```

### SQL
```
 total_bairros | geofences_cadastradas | motoristas_com_bairro
---------------+-----------------------+-----------------------
            37 |                    35 |                    12
```

## ⚠️ Problemas comuns

### "Motorista sem bairro cadastrado"
- Normal para motoristas novos
- Use o endpoint `/api/driver/territory/verify` para cadastrar

### "Taxa zerada"
- Verificar se motorista tem `neighborhood_id`
- Verificar se geofences estão cadastradas

### "Não foi possível conectar ao banco"
- Definir variável `DB_PASSWORD`
- Verificar Security Group do RDS
