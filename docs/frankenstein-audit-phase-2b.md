# KAVIAR Frankenstein Audit — Fase 2B

## Contexto

- Fase 1 security/docs concluida.
- Fase 2A typecheck concluida, mergeada, deployada e validada em producao.
- Fase 2B executada em modo somente leitura, sem alteracoes de codigo, regras de negocio, migracoes, endpoints ou infraestrutura.

## Escopo e Metodo

- Auditoria orientada a mapeamento de fluxos Frankenstein.
- Sem edicao de arquivos de backend, frontend, app mobile ou schema.
- Sem commit, sem push, sem deploy manual e sem OTA.

## Achados Principais

### 1) Wallet V2 + fluxo legado em paralelo

- Severidade: CRITICO
- Status: ativo (convivencia controlada por flag)
- Arquivos envolvidos:
  - backend/src/routes/rides-v2.ts
  - backend/src/services/offer-acceptance.service.ts
  - backend/src/routes/driver-wallet-v2.ts
  - backend/src/app.ts
- Risco de remover:
  - Alto risco operacional e financeiro, com impacto direto em aceite, reserva, liquidacao e cancelamento de corridas.
- Recomendacao:
  - Manter no curto prazo.
  - Preparar auditoria dedicada de wallet para consolidacao segura de caminhos.
- Proximo passo seguro:
  - Mapear metricas de uso por caminho (V2 x legado), taxas de erro e impacto por feature flag antes de qualquer unificacao.

### 2) Shadow mode financeiro (wallet shadow)

- Severidade: ALTO
- Status: ativo (trilha paralela nao bloqueante)
- Arquivos envolvidos:
  - backend/src/services/wallet-shadow.service.ts
  - backend/src/routes/rides-v2.ts
  - backend/prisma/schema.prisma
  - backend/prisma/migrations/manual/015_shadow_mode_foundation.sql
- Risco de remover:
  - Risco de perda de observabilidade/comparacao de modelos e de rastreabilidade historica.
- Recomendacao:
  - Nao remover agora.
  - Tratar depreciacao apenas apos confirmar desuso real e cobertura equivalente de telemetria.
- Proximo passo seguro:
  - Definir criterios objetivos de aposentadoria (uso, cobertura, confiabilidade, janela de observacao).

### 3) Retorno Familiar duplicado (family-return vs retorno-familiar)

- Severidade: ALTO
- Status: duplicado/alias ativo
- Arquivos envolvidos:
  - backend/src/routes/driver-family-return.ts
  - backend/src/routes/driver-retorno-familiar.ts
  - backend/src/app.ts
  - src/api/driver.api.ts
  - app/(driver)/credits.tsx
  - src/components/RetornoFamiliarCard.tsx
- Risco de remover:
  - Alto risco de quebra de cliente se um contrato for removido sem camada de compatibilidade.
- Recomendacao:
  - Unificar contrato canonicamente em rollout controlado.
  - Manter compatibilidade temporaria com plano de deprecacao.
- Proximo passo seguro:
  - Instrumentar uso por endpoint e migrar consumidores para um contrato unico antes da retirada do alias.

### 4) Endpoint temporario /api/temp

- Severidade: MEDIO
- Status: legado ativo (responde como desativado)
- Arquivos envolvidos:
  - backend/src/routes/rollout-temp.ts
  - backend/src/app.ts
- Risco de remover:
  - Medio: pode existir consumidor interno residual.
- Recomendacao:
  - Depreciar/remover somente apos verificacao de logs de acesso e ausencia de dependencias.
- Proximo passo seguro:
  - Janela de observacao de chamadas e, se zero uso, plano de retirada controlada.

### 5) Migrations heterogeneas (timestampadas, manuais e SQL avulso)

- Severidade: ALTO
- Status: legado estrutural ativo
- Arquivos envolvidos:
  - backend/prisma/migrations/** (timestampadas)
  - backend/prisma/migrations/manual/**
  - backend/prisma/migrations/*.sql (avulsas)
- Risco de remover:
  - Alto risco de drift entre ambientes e quebra de reproducibilidade.
- Recomendacao:
  - Nao alterar agora.
  - Realizar inventario por ambiente antes de qualquer consolidacao.
- Proximo passo seguro:
  - Construir matriz ambiente x migration aplicada x ordem de execucao.

### 6) Arquivos grandes versionados

- Severidade: MEDIO
- Status: informativo (tecnico/repositorio)
- Arquivos envolvidos (exemplos de maior impacto):
  - assets/audio/kaviar.mp4
  - backend/data/geojson/sp_distritos.json
  - docs/frentes/assets/kaviar-pet/kaviar-pet-video-1-final.mp4
  - docs/frentes/assets/kaviar-pet/kaviar-pet-video-2-final.mp4
- Risco de remover:
  - Medio: possivel quebra de referencias em docs/assets/public.
- Recomendacao:
  - Tratar em lote separado, com estrategia de armazenamento apropriada para binarios.
- Proximo passo seguro:
  - Inventario de consumo real e plano de migracao com validacao de links.

### 7) Nomes legados/suspeitos

- Severidade: INFORMATIVO
- Status: misto (legado, historico e operacional)
- Arquivos envolvidos (exemplos):
  - backend/src/routes/rollout-temp.ts
  - backend/data/geojson/sp_temp.json
  - backend/docs/archive/sql-historico/add_very_final_fields.sql
  - docs/final-critical-adjustments.md
  - scripts/backup-production.sh
- Risco de remover:
  - Baixo a medio, dependendo de uso real.
- Recomendacao:
  - Triagem orientada a uso (runtime, CI, operacao) antes de limpeza.
- Proximo passo seguro:
  - Classificar cada item como historico, ativo ou candidato a arquivamento.

### 8) Build/dist versionado ausente

- Severidade: INFORMATIVO
- Status: saudavel
- Arquivos envolvidos:
  - Nenhuma ocorrencia para dist/build/android/app/build/.expo no rastreamento de versao.
- Risco de remover:
  - Nao aplicavel.
- Recomendacao:
  - Manter politica atual.
- Proximo passo seguro:
  - Preservar verificacoes no checklist tecnico.

## Ordem Segura de Correcao

1. Retorno Familiar primeiro, em modo controlado e com compatibilidade temporaria.
2. /api/temp apenas apos checagem de logs de uso.
3. Migrations somente apos inventario completo por ambiente.
4. Wallet (V2/legado/shadow) somente com auditoria propria e plano dedicado.
5. Arquivos grandes em lote separado, fora do fluxo de regra de negocio.

## Decisoes Explicitas (Fase 2B)

- Nao remover wallet shadow agora.
- Nao remover wallet legado agora.
- Nao remover endpoints de Retorno Familiar agora.
- Nao alterar migrations agora.
- Nao apagar arquivos grandes agora.

## Conclusao

A Fase 2B cumpriu objetivo de mapeamento Frankenstein em modo somente leitura, com identificacao de pontos de coexistencia critica, duplicidades de contrato e riscos estruturais. Nenhuma mudanca funcional foi aplicada nesta fase.