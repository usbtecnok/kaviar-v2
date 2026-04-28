# Rotina antes do push para main

## Comando único

```bash
npm run check
```

Esse comando roda, em sequência:

1. **Testes backend** (`cd backend && npm test`) — 44+ testes via Vitest
2. **Lint manual** (`eslint backend/src app src`) — 0 errors esperado
3. **Git status** — mostra arquivos pendentes

## Regras

- **Erros de teste bloqueiam push.** Não fazer push se algum teste falhar.
- **Erros de lint bloqueiam push.** Não fazer push se houver errors (não warnings).
- **Warnings de lint NÃO bloqueiam**, mas devem ser informados no PR/commit se aumentarem.
- **Git status deve estar limpo** (ou apenas com os arquivos que você quer commitar).

## Exemplo de saída esperada

```
 Test Files  4 passed (4)
      Tests  44 passed (44)

✖ 643 problems (0 errors, 643 warnings)

(git status limpo)
```

## Se algo falhar

- Teste falhou → corrigir antes de push
- Lint error → corrigir antes de push (geralmente é algo simples)
- Lint warning novo → avaliar se vale corrigir agora ou deixar para depois
- Git status sujo → verificar se tem arquivo não commitado que deveria estar

## Notas

- O lint cobre `backend/src`, `app/` e `src/` (TypeScript/TSX)
- `frontend-app/` está excluído do lint (precisa parser JSX separado — futuro)
- Não existe pre-commit hook — a rotina é manual e de confiança
- Para pular em emergência: faça push direto, mas rode `npm run check` depois
