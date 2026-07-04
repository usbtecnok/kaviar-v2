import LegalMarkdownPage from './LegalMarkdownPage';

const publicTermsDriverMarkdown = `# Termos de Uso — Motorista Parceiro KAVIAR

**Versão:** v1.0  
**Data:** Maio/2026

## 1. Sobre a Plataforma

O KAVIAR conecta motoristas parceiros independentes a passageiros para corridas privadas em territórios ativos da plataforma.

## 2. Natureza da Relação

- O motorista atua como parceiro independente.
- Não há vínculo empregatício com a plataforma.
- O motorista define sua disponibilidade e pode aceitar ou recusar corridas.

## 3. Requisitos de Cadastro

Para operar na plataforma, o motorista deve:
- manter documentação pessoal válida;
- manter documentação do veículo regular;
- cumprir requisitos de segurança e conformidade operacional.

## 4. Responsabilidades do Motorista

O motorista se compromete a:
- conduzir com segurança e respeito às leis de trânsito;
- tratar passageiros com cordialidade e sem discriminação;
- manter dados e documentos atualizados;
- cumprir regras operacionais da plataforma e do território.

## 5. Remuneração e Regras Financeiras

- Os ganhos decorrem de corridas concluídas.
- Taxas e repasses seguem regras operacionais vigentes.
- Não há garantia de corridas mínimas ou rendimento fixo.

## 6. Dados Pessoais e Privacidade

O tratamento de dados pessoais segue a Política de Privacidade disponível em **/privacidade**.

## 7. Suspensão ou Desativação

A plataforma pode restringir ou desativar contas em caso de:
- descumprimento dos termos;
- fraude;
- documentação irregular;
- risco à segurança operacional.

## 8. Atendimento

- E-mail: suporte@kaviar.com.br
- WhatsApp: +55 21 96864-8777
- Site: https://kaviar.com.br
`;

export default function TermsDriverPage() {
  return (
    <LegalMarkdownPage
      title="Termos de Uso — Motorista"
      subtitle="Condições de uso, responsabilidades e regras de operação para motoristas parceiros KAVIAR."
      markdown={publicTermsDriverMarkdown}
    />
  );
}
