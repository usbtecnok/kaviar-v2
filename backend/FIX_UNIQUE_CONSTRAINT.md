# Fix: Unique Constraint em driver_documents

## Problema
```
Unique constraint failed on the fields: (driver_id, type)
```

## Causa Raiz
Race condition entre `findFirst` e `create` quando:
- Múltiplas requisições simultâneas
- Retry de upload
- Fluxo de inicialização + submit rodando em paralelo

## Solução (Padrão KAVIAR)
Idempotência via **try/catch P2002** (sem depender de `@@unique` no Prisma schema):

```typescript
try {
  await tx.driver_documents.create({ data: {...} });
} catch (error: any) {
  if (error.code === 'P2002') {
    // Já existe: atualizar
    const existing = await tx.driver_documents.findFirst({
      where: { driver_id, type }
    });
    if (existing) {
      await tx.driver_documents.update({
        where: { id: existing.id },
        data: {...}
      });
    }
  } else {
    throw error;
  }
}
```

## Pontos Corrigidos
1. ✅ `driver-verification.ts` - criação de docs MISSING
2. ✅ `driver-verification.ts` - submit de documentos
3. ✅ `routes/drivers.ts` - endpoint `/me/documents`

## Validação
- Reenviar documentos múltiplas vezes → OK
- Retry de upload → OK
- Fluxo completo cadastro + docs → OK

## Render Environment
Atualizar `DATABASE_URL` com:
```
postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=60
```

---
**Commit:** 300a09f  
**Build:** ✅ TypeScript compila  
**Deploy:** Render auto-deploy após push
