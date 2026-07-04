import LegalMarkdownPage from './LegalMarkdownPage';

const publicTermsPassengerMarkdown = `# Termos de Uso — Passageiro KAVIAR

**Versão:** v1.0  
**Data:** Maio/2026

## 1. Sobre a Plataforma

O KAVIAR é uma plataforma tecnológica de intermediação de mobilidade urbana local, operada por **KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA**.

## 2. Natureza do Serviço

- O KAVIAR conecta passageiros e motoristas parceiros.
- O motorista parceiro é responsável pela execução do transporte privado.
- A plataforma não garante disponibilidade contínua em todos os horários e regiões.

## 3. Responsabilidades do Passageiro

Ao usar o app, o passageiro concorda em:
- fornecer dados corretos;
- informar origem e destino com precisão;
- respeitar motoristas e regras de convivência;
- não praticar condutas ilícitas;
- efetuar o pagamento conforme as regras vigentes.

## 4. Preço e Pagamento

- O valor da corrida é definido conforme critérios da plataforma.
- O passageiro visualiza o valor estimado antes de confirmar a corrida.
- Formas de pagamento podem variar por região e disponibilidade operacional.

## 5. Cancelamento

- Cancelamentos seguem as regras da plataforma em vigor.
- Cancelamentos abusivos podem gerar limitações de uso.

## 6. Privacidade e Dados

O tratamento de dados pessoais segue a Política de Privacidade disponível em **/privacidade**.

## 7. Suspensão de Conta

A plataforma pode limitar ou encerrar conta em casos de:
- violação destes termos;
- fraude;
- conduta abusiva;
- uso indevido da plataforma.

## 8. Atendimento

- E-mail: suporte@kaviar.com.br
- WhatsApp: +55 21 96864-8777
- Site: https://kaviar.com.br
`;

export default function TermsPassengerPage() {
  return (
    <LegalMarkdownPage
      title="Termos de Uso — Passageiro"
      subtitle="Condições de uso da plataforma KAVIAR para passageiros."
      markdown={publicTermsPassengerMarkdown}
    />
  );
}
