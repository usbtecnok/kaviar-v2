# Central de Notificações KAVIAR (Sino)

> Status: **Evolução futura** — não implementar na Fase 1.
> Registrado em: 2026-05-01

## Contexto

O ícone de sino já está presente na Home Premium do passageiro (`home.tsx`).
A ideia é transformá-lo em uma central de notificações real, começando pelo app motorista.

## Casos de uso prioritários (motorista)

1. **Créditos adicionados** — "Você recebeu +10 créditos KAVIAR. Saldo atual: 18 créditos."
2. **Compensação por deslocamento** — "Foi adicionada uma compensação em créditos à sua conta. Saldo atualizado: 14 créditos."
3. **Bônus por indicação** — quando indicação gerar crédito
4. **Saldo baixo** — alerta quando créditos estiverem próximos de zero
5. **Campanha de prontidão noturna** — convite para ficar online em horários estratégicos
6. **Aviso operacional da comunidade** — comunicados da base local
7. **Documentos aprovados/pendentes** — status de aprovação de documentos

## Exemplos de notificação

```
Título: "Créditos adicionados"
Corpo: "Você recebeu +10 créditos KAVIAR. Saldo atual: 18 créditos."

Título: "Compensação recebida"
Corpo: "Foi adicionada uma compensação em créditos à sua conta. Saldo atualizado: 14 créditos."
```

## Requisitos técnicos (quando implementar)

- Backend: endpoint `GET /api/v2/notifications` com paginação
- Backend: marcar como lida `PATCH /api/v2/notifications/:id/read`
- App: badge numérico no sino (contagem de não lidas)
- App: tela de listagem de notificações
- App: push notification via Expo Notifications (futuro)
- Admin: painel para enviar notificações manuais por comunidade

## Fases sugeridas

1. Notificações locais (in-app, sem push) — lista simples
2. Badge no sino com contagem
3. Push notifications via Expo
4. Painel admin para envio manual
5. Notificações automáticas por eventos (créditos, compensações, etc.)
