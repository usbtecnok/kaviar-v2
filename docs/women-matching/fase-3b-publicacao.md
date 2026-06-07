# Fase 3B — Publicação Mobile: Preferência por Motorista Mulher

**Data:** 2026-06-07
**Status:** ✅ Publicado e validado

---

## Commits

| Hash | Mensagem |
|------|----------|
| `4bf1f46` | feat(mobile): adiciona preferencia por motorista mulher nos perfis |
| `041f8e0` | fix(mobile): oculta programa motorista mulher para motorista inelegivel |
| `c671312` | fix(mobile): permite rolagem nos perfis |
| `21389ca` | chore(mobile): bump versoes para apk women preference |
| `1812fc3` | chore(mobile): bump versoes para apk scroll women preference |
| `325ca9a` | chore(site): atualiza links dos apks women preference |

---

## Versões publicadas

| App | Versão | versionCode |
|-----|--------|:-----------:|
| Kaviar Motorista | `1.11.25-women-preference-scroll` | 5 |
| Kaviar Passageiro | `1.13.2-women-preference-scroll` | 16 |

---

## Links oficiais

```
https://downloads.kaviar.com.br/kaviar-motorista-v1.11.25-women-preference-scroll.apk
https://downloads.kaviar.com.br/kaviar-passageiro-v1.13.2-women-preference-scroll.apk
```

## SHA256

```
f7e3bea4d9ccf7fcfe184c7012cfd204b727869943aba5e717f83dcf3feac7a2  kaviar-motorista-v1.11.25-women-preference-scroll.apk
eada9e245cb8a710408cb6b6109772f4cf544bee15884308d1c9cbcd78fbe194  kaviar-passageiro-v1.13.2-women-preference-scroll.apk
```

---

## Validações em device

| Teste | Resultado |
|-------|:---------:|
| Bruna (motorista elegível/participante) vê "Programa Motorista Mulher" | ✅ |
| Aparecido (motorista homem/inelegível) NÃO vê a seção | ✅ |
| Passageira vê "Preferência por Motorista Mulher" com toggle | ✅ |
| Corrida Maria→Aparecido aceita normalmente (flag OFF) | ✅ |
| Créditos, mapa, online, aceite e corrida sem regressão | ✅ |
| Links públicos baixam APK real (74 MB, ZIP válido) | ✅ |
| Site kaviar.com.br aponta para links novos | ✅ |

---

## Incidente de publicação

O upload inicial para o Cloudflare R2 enviou arquivos HTML (página do Expo) em vez dos binários APK. A resolução envolveu:

1. Identificar via `file` e `sha256sum` que os 58 KB servidos eram HTML.
2. Re-upload dos APKs corretos de `/home/goes/Imagens/apks/`.
3. Purge de cache CDN do Cloudflare (`Limpar tudo`).
4. Validação pós-purge confirmando 74 MB, tipo APK, SHA256 correto.

Cache do navegador mobile também causou confusão (bundle antigo). Resolução: limpar cache ou usar aba anônima.

---

## Feature flag

`WOMEN_DRIVER_PREFERENCE_ENABLED = false`

A preferência está registrada no banco e visível nos perfis, mas **não altera corridas**. O dispatch continua pareando normalmente sem considerar gênero/preferência.

---

## Itens intactos

- Backend: `ff60ce4` (Fase 3A)
- Dispatch: não alterado
- Rides / `prefer_woman_driver` em rides_v2: não utilizado
- Mapa, autocomplete, localização: intactos
- Push, som, vinheta: intactos
- Créditos, Pix, Asaas, wallet: intactos
- ECS: desired=1, running=1, pending=0

---

## Decisões de produto registradas

1. O sistema NÃO possui cadastro de gênero — participação é por autodeclaração voluntária.
2. Não há bloqueio técnico absoluto contra declaração falsa — mitigação por auditoria e bloqueio admin futuro.
3. Motorista mulher participante continua recebendo corridas normais de todos os passageiros.
4. A preferência é prioridade adicional futura, não categoria exclusiva.
5. Para motorista inelegível (eligible=false, opt_in=false), a seção é ocultada no perfil.
6. Para passageiro/passageira, a seção sempre aparece (preferência do passageiro).

---

## Contas de homologação (estado final)

| Conta | eligible | opt_in | participating | prefer_default |
|-------|:--------:|:------:|:-------------:|:--------------:|
| Bruna (motorista) | true | true | true | — |
| Asaas (motorista) | false | false | false | — |
| Pricing (passageira) | true | true | true | true |
| Timer (passageiro) | false | false | false | false |

---

## Próximas fases

| Fase | Escopo | Status |
|------|--------|:------:|
| 4 | Preferência aplicada à solicitação de corrida | ⏳ |
| 5 | Integração com dispatch, timeout e fallback | ⏳ |
| 6 | Piloto controlado por território | ⏳ |
| 3A.2 | Bloqueio administrativo de elegibilidade | ⏳ |
