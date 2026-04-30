# Guardrail — Mapa do Passageiro

Versão estável atual validada em aparelho real:
Kaviar Passageiro v1.10.24

Arquivo protegido:
app/(passenger)/map.tsx

Regra:
Este arquivo é zona protegida. Não alterar sem necessidade real.

Motivo:
A v1.10.23 quebrou o mapa ao alterar a lógica de renderização do MapView.
A v1.10.24 restaurou o comportamento funcional:
- mapa aparece;
- radar aparece por cima;
- mapa fica visível por baixo do radar;
- sem overlay/debug vermelho/verde;
- sem GPS OK/FALLBACK visível;
- sem coordenadas visíveis.

Proibição operacional:
Melhorias visuais de frontend web/admin, cards, landing page ou painel administrativo não devem tocar em app/(passenger)/map.tsx.

Antes de qualquer alteração nesse arquivo:
1. justificar a necessidade;
2. mostrar diff antes do build;
3. gerar versão de teste;
4. validar em aparelho real antes de publicar.
