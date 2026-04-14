# Regras de Deploy — KAVIAR Backend

> Criado após incidente 2026-04-14: API 503 por 7h causado por task definition apontando para imagem expirada no ECR.

## Regras obrigatórias

1. **Toda task definition nova deve apontar para uma imagem confirmada no ECR no momento do deploy.**
   Antes de registrar ou atualizar o service, verificar que a tag existe:
   ```bash
   aws ecr describe-images --repository-name kaviar-backend \
     --image-ids imageTag=TAG_AQUI --region us-east-2
   ```
   Se retornar erro, **não deployar**.

2. **Deploy manual não deve reutilizar tag antiga.**
   Sempre usar `latest` ou o `github.sha` do commit atual. Tags customizadas de deploys anteriores podem ter sido expiradas pela lifecycle policy do ECR.

3. **Nunca usar `--task-definition kaviar-backend` (sem revisão) em deploy manual.**
   O CI/CD usa isso porque acabou de registrar a revisão. Em deploy manual, sempre especificar a revisão exata: `kaviar-backend:NNN`.

## Proteções ativas

| Proteção | Configuração |
|----------|-------------|
| ECR lifecycle policy | Keep last 30 images |
| ECS deployment circuit breaker | Habilitado com rollback automático |

## Referência do incidente

- **Data:** 2026-04-14, ~01:00 → 08:17 (BRT)
- **Causa:** Rev 267 registrada com tag `asaas-qr-fix-20260408021334`, já expirada no ECR
- **Impacto:** API 503 por ~7h, 49 tasks falharam
- **Correção:** Rollback para rev 265
