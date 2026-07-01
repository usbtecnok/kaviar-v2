# Runbook Operacional KAVIAR: Push, OTA, APK, Cloudflare/R2, Firebase/FCM, Sino real e Rotas Fixas arquivadas

Gerado para evitar repetição dos erros operacionais que já aconteceram no fluxo KAVIAR.

## 1. Resumo do que foi corrigido

- Push do Passageiro.
- Firebase/FCM no APK Passageiro.
- Publicação correta no Cloudflare/R2.
- Comparação de hash sha256.
- Sino real / Central de Notificações.
- Badge.
- Leitura inline.
- Botão voltar.
- Contraste visual.
- Rotas Fixas arquivadas como histórico somente leitura.

## 2. Incidente do Push Passageiro

### Sintoma

O motorista recebia push normalmente, mas o Passageiro não recebia push.

### Causa raiz

O app foi gerado com `APP_VARIANT=passenger`, porém o `android.googleServicesFile` correto não estava apontando para o arquivo específico do Passageiro em `app.config.js`.

### Erro-chave

`Default FirebaseApp is not initialized in this process com.kaviar.passenger`

### Correção aplicada

O Passageiro passou a usar `google-services-passenger.json`.

### Regra operacional

OTA não corrige Firebase/FCM nativo. Quando o problema está em `google-services`, package, projectId, assinatura, FirebaseApp ou dependência nativa, é necessário APK novo.

## 3. Caminho correto para novo APK Passageiro

### Passo a passo

1. Rodar:

```bash
APP_VARIANT=passenger npx expo config --type public
```

2. Confirmar no output:

- package: `com.kaviar.passenger`
- projectId: `23cab91b-82a5-4d92-9709-017279a2539d`
- googleServicesFile: `./google-services-passenger.json`

3. Gerar build EAS.
4. Baixar o APK correto do EAS.
5. Calcular `sha256` do APK baixado.
6. Subir no Cloudflare/R2 bucket `kaviar-downloads`.
7. Baixar do link oficial.
8. Comparar `sha256` entre o APK original e o APK publicado.

### Regra crítica

Não publicar APK sem comparar hash.

## 4. Link oficial do Passageiro

https://downloads.kaviar.com.br/kaviar-passageiro-v1.13.8-ota.apk

## 5. Hash correto validado do APK Passageiro com Firebase/FCM

`0ee80d23d5492fddb7014b3377314c57a1f4e5792f61bffec951c875fb7a70a0`

## 6. Regra Cloudflare/R2

- `downloads.kaviar.com.br` passa por Cloudflare/R2.
- Não tratar como bucket S3 chamado `downloads.kaviar.com.br`.
- Não publicar APK sem comparar hash.

## 7. Fluxo correto de OTA

### Ordem obrigatória

1. Commit/push primeiro.
2. Se houver backend, esperar deploy backend.
3. Se houver migration, rodar migration antes de OTA.
4. Publicar OTA com `--platform android`.

### Comandos corretos

Passageiro:

```bash
APP_VARIANT=passenger npx eas-cli update --branch passenger-production --platform android --message "..."
```

Motorista:

```bash
APP_VARIANT=driver npx eas-cli update --branch driver-production --platform android --message "..."
```

### Conferir canais

```bash
APP_VARIANT=passenger npx eas-cli channel:view passenger-production
APP_VARIANT=driver npx eas-cli channel:view driver-production
```

## 8. Regra sobre atualização no aparelho

- Fechar e abrir o app duas vezes.
- OTA pode baixar na primeira abertura e aplicar na segunda.
- Se não atualizar, verificar canal, runtime e logs de Expo Updates.

## 9. Central de Notificações

### Fonte de verdade

- `app_notifications` é a fonte persistente.
- Push não é fonte da verdade.
- A notificação deve ser criada mesmo se push falhar.
- O sino consulta backend.
- O badge vem de `unread-count`.

### UX correta

- Clicar na notificação lê/expande ali mesmo.
- O botão separado abre as mensagens da rota.
- Sempre manter botão Voltar visível.

### Regra operacional

Não mascarar erro de API como lista vazia no sino.

## 10. Rotas Fixas arquivadas

### Regra de dados

- Não apagar mensagens do banco.
- Rota arquivada/deletada não deve aparecer como conversa ativa.
- Passageiro vê histórico somente leitura.
- `canReply=false`.
- Campo de envio bloqueado ou oculto.

### Notificação antiga

- Ao abrir notificação antiga, mostrar a rota como histórico.
- Não permitir resposta.
- Não parecer conversa ativa.

### Regra de experiência

- Se a rota foi encerrada pelo motorista, exibir banner de encerramento.
- O card deve ficar em modo leitura.

## 11. Comandos úteis

```bash
git status --short
git diff --check
npx prisma validate
npm --prefix backend test -- fixed-route
npm --prefix backend run build
npm run lint:app
curl -s https://api.kaviar.com.br/api/health | jq
gh run list --branch main --limit 10
gh workflow run "Deploy Prisma Migrations" --ref main
sha256sum
curl -L
curl -I
aws logs filter-log-events
```

## 12. Seção Nunca repetir

- Não subir APK sem comparar `sha256`.
- Não tentar resolver Firebase/FCM nativo só com OTA.
- Não confundir Cloudflare/R2 com S3.
- Não publicar OTA antes do backend/migration quando o app depende de endpoint novo.
- Não tratar erro de API como lista vazia no sino.
- Não deixar rota arquivada como conversa ativa.
- Não deixar tela cheia sem botão Voltar.

## 13. Checklist operacional rápido

### APK Passageiro

- [ ] `APP_VARIANT=passenger`
- [ ] `package=com.kaviar.passenger`
- [ ] `projectId=23cab91b-82a5-4d92-9709-017279a2539d`
- [ ] `googleServicesFile=./google-services-passenger.json`
- [ ] `sha256` conferido
- [ ] arquivo publicado em `kaviar-downloads`
- [ ] link oficial testado

### OTA

- [ ] commit/push feito
- [ ] backend publicado, se necessário
- [ ] migration aplicada, se necessário
- [ ] branch correta por app
- [ ] canal correto validado

### Notificações

- [ ] sino consulta backend
- [ ] badge vem de unread-count
- [ ] notificação antiga abre como histórico
- [ ] botão Voltar sempre visível

### Rotas Fixas arquivadas

- [ ] mensagens preservadas no banco
- [ ] canReply=false em encerrada
- [ ] envio bloqueado/oculto
- [ ] visual de histórico, não conversa ativa
