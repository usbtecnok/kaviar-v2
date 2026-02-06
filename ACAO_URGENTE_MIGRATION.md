# 🚨 AÇÃO URGENTE NECESSÁRIA

## ❌ PROBLEMA

O cadastro está falhando com erro:
```
The column `drivers.virtual_fence_center_lat` does not exist in the current database.
```

## ✅ SOLUÇÃO

Execute **AGORA** via Neon Console:

```sql
-- COPIE E COLE NO NEON CONSOLE:

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS territory_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS territory_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS territory_verification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_drivers_territory_type 
ON drivers(territory_type) 
WHERE territory_type IS NOT NULL;
```

## 📍 COMO EXECUTAR

1. Acesse: https://console.neon.tech
2. Selecione projeto Kaviar
3. Clique em "SQL Editor"
4. Cole o SQL acima
5. Clique em "Run"
6. Aguarde mensagem de sucesso

## ⏱️ TEMPO

- Execução: ~5 segundos
- Sem downtime
- Sem perda de dados

## ✅ APÓS EXECUTAR

O cadastro funcionará imediatamente, sem necessidade de restart.

---

**EXECUTE AGORA PARA RESOLVER O PROBLEMA!**
