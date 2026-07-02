# Plano de Proteção de Propriedade Intelectual — KAVIAR

**Versão:** v1.0
**Data:** Maio/2026
**Status:** Planejamento interno
**Empresa titular:** KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA (CNPJ: 67.783.601/0001-99)

---

## 1. Objetivo

Mapear e proteger os ativos intelectuais da plataforma KAVIAR, garantindo que marca, código, modelo de negócio, base de dados e know-how territorial permaneçam sob controle exclusivo da KAVIAR.

---

## 2. Marca KAVIAR

### Status atual
- [ ] Verificar se a marca KAVIAR está registrada no INPI.
- [ ] Se não registrada, iniciar processo de registro.
- [ ] Definir classes de registro (tecnologia, transporte, aplicativos).

### Proteção
- A marca KAVIAR é de uso exclusivo da KAVIAR.
- Nenhum operador, parceiro ou terceiro pode registrar marca similar.
- Uso da marca por terceiros requer autorização expressa da matriz.
- Variações territoriais (KAVIAR SP, KAVIAR RJ, KAVIAR [cidade]) são de propriedade da KAVIAR.

---

## 3. Registro de Software

### Ativos de software
- Código-fonte do backend (Node.js/TypeScript/Prisma).
- Código-fonte do frontend admin (React/Vite).
- Código-fonte do app mobile (Expo/React Native).
- Algoritmos de precificação, matching e dispatch.
- Infraestrutura como código (AWS/ECS/RDS).

### Proteção
- [ ] Avaliar registro de software no INPI (programa de computador).
- Código-fonte mantido em repositório privado (GitHub).
- Acesso restrito a pessoal autorizado.
- Nenhum operador, parceiro ou terceiro tem acesso ao código-fonte.
- Contribuições de terceiros (se houver) devem ter cessão de direitos.

---

## 4. Segredo de Negócio

### Ativos protegidos como segredo
- Modelo territorial de operação.
- Regras financeiras por território (percentuais, splits, repasses).
- Base de dados de motoristas, passageiros e parceiros.
- Algoritmos de precificação e matching.
- Estratégia de expansão territorial.
- Dados financeiros e métricas operacionais.
- Know-how de operação comunitária.

### Proteção
- Cláusulas de confidencialidade em todos os termos (operador, parceiro, consultor).
- Acesso a dados sensíveis restrito por role (SUPER_ADMIN, ANGEL_VIEWER).
- Proibição de exportação de dados por operadores/parceiros.
- Auditoria de acessos.

---

## 5. Proteção contra Cópia por Operador/Parceiro

### Riscos identificados
- Operador territorial que sai da plataforma e cria serviço concorrente usando know-how adquirido.
- Parceiro/associação que replica o modelo com outra plataforma.
- Motorista que migra base de passageiros para concorrente.
- Terceiro que copia interface, fluxo ou modelo de negócio.

### Mitigações
- Cláusula de não-concorrência nos termos do operador territorial (verificar validade jurídica).
- Cláusula de confidencialidade com prazo pós-desligamento.
- Proibição de uso de dados da plataforma para fins próprios (já nos termos).
- Proibição de criação de listas/cadastros paralelos (já nos termos).
- Não entregar acesso ao código-fonte, banco de dados ou infraestrutura a terceiros.
- Operador não tem acesso direto ao banco de dados — apenas via painel read-only.

---

## 6. Nomes Territoriais

### Regra
- Nomes como "KAVIAR SP", "KAVIAR RJ", "KAVIAR Niterói", "KAVIAR [cidade]" são de uso exclusivo da KAVIAR.
- Operadores territoriais não podem registrar domínios, marcas ou perfis com esses nomes sem autorização.
- Perfis em redes sociais com a marca KAVIAR devem ser controlados pela matriz.

### Ações
- [ ] Verificar se existem domínios/perfis não autorizados usando a marca.
- [ ] Registrar domínios estratégicos (kaviar.com.br já registrado).
- [ ] Monitorar uso indevido da marca.

---

## 7. Cláusulas nos Termos Existentes

### Já implementado
- Termo do Operador Territorial: confidencialidade, proibição de uso indevido de dados, proibição de promessas.
- Termos do Motorista: propriedade intelectual da KAVIAR (seção 11).
- Política de Relacionamento: uso da marca controlado pela matriz.

### A implementar (futuro)
- [ ] Cláusula explícita de não-concorrência (verificar validade legal).
- [ ] Cláusula de cessão de direitos sobre contribuições.
- [ ] Cláusula de devolução de materiais/acessos ao encerrar relação.
- [ ] Termo de confidencialidade separado para consultores/desenvolvedores.

---

## 8. Proteção de Base de Dados

- A base de dados (motoristas, passageiros, corridas, parceiros) é propriedade da KAVIAR.
- Nenhum operador, parceiro ou terceiro pode extrair, copiar ou exportar dados.
- Dados mascarados em interfaces (CPF, Pix) — acesso completo apenas SUPER_ADMIN.
- Backups e infraestrutura sob controle exclusivo da KAVIAR (AWS).
- Em caso de encerramento de parceria, o parceiro/operador perde acesso imediatamente.

---

## 9. Cuidados Operacionais

- **Não entregar** credenciais de AWS, banco de dados ou repositório a terceiros.
- **Não compartilhar** código-fonte com operadores, parceiros ou investidores sem NDA.
- **Não permitir** que operadores criem sistemas paralelos usando dados do KAVIAR.
- **Não permitir** que terceiros registrem marca, domínio ou perfil com nome KAVIAR.
- **Não delegar** controle de infraestrutura a operadores territoriais.
- **Manter** logs de auditoria de todos os acessos administrativos.

---

## 10. Próximos Passos

| Ação | Prioridade | Responsável |
|------|-----------|-------------|
| Verificar registro de marca INPI | Alta | Matriz |
| Avaliar registro de software | Média | Matriz |
| Revisar cláusulas de não-concorrência com advogado | Média | Jurídico |
| Monitorar uso indevido da marca | Baixa | Matriz |
| Registrar domínios estratégicos | Baixa | Matriz |

---

## 11. Aviso

Este documento é um plano operacional interno. Não constitui parecer jurídico sobre propriedade intelectual. Para registro de marca, software ou questões de concorrência, consultar advogado especializado em PI.

---

*KAVIAR / KAVIAR — Proteção de Propriedade Intelectual — v1.0 — Maio/2026*
