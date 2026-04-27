interface InvestorInviteParams {
  name?: string;
  accessLink: string;
}

const greeting = (name?: string) =>
  name?.trim() ? `Olá, ${name.trim()}.` : 'Olá.';

export function investorInviteText({ name, accessLink }: InvestorInviteParams): string {
  return `${greeting(name)}

O KAVIAR é um projeto brasileiro de mobilidade com proposta territorial, operação local e visão de escala.

Ele foi desenvolvido a partir da base da USB Tecnok Manutenção e Instalação de Computadores Ltda, em um processo de reposicionamento estratégico voltado à criação de soluções mais aderentes aos desafios reais de mobilidade, segurança e confiança urbana.

A inspiração inicial veio da realidade do Rio de Janeiro, onde esses desafios aparecem de forma mais aguda. Mas o KAVIAR não foi pensado como uma solução restrita ao Rio: sua lógica de operação foi estruturada para permitir crescimento e expansão territorial, com adaptação a diferentes cidades, regiões e contextos operacionais.

Estamos, neste momento, apresentando o projeto a pessoas que possam ter interesse em conhecê-lo mais de perto, seja sob a ótica de parceria, visão estratégica ou eventual investimento.

Caso tenha interesse, você pode acessar a plataforma pelo link abaixo e criar sua senha:

${accessLink}

O link é pessoal e válido por 2 horas.

Se fizer sentido, teremos prazer em apresentar o projeto com mais profundidade, incluindo proposta, visão operacional e potencial de expansão.

Atenciosamente,
Equipe KAVIAR

Base institucional do projeto: USB Tecnok Manutenção e Instalação de Computadores Ltda
CNPJ: 07.710.691/0001-66`;
}

export function investorInviteHtml({ name, accessLink }: InvestorInviteParams): string {
  const body = `<p>${greeting(name)}</p>

<p>O KAVIAR é um projeto brasileiro de mobilidade com proposta territorial, operação local e visão de escala.</p>

<p>Ele foi desenvolvido a partir da base da USB Tecnok Manutenção e Instalação de Computadores Ltda, em um processo de reposicionamento estratégico voltado à criação de soluções mais aderentes aos desafios reais de mobilidade, segurança e confiança urbana.</p>

<p>A inspiração inicial veio da realidade do Rio de Janeiro, onde esses desafios aparecem de forma mais aguda. Mas o KAVIAR não foi pensado como uma solução restrita ao Rio: sua lógica de operação foi estruturada para permitir crescimento e expansão territorial, com adaptação a diferentes cidades, regiões e contextos operacionais.</p>

<p>Estamos, neste momento, apresentando o projeto a pessoas que possam ter interesse em conhecê-lo mais de perto, seja sob a ótica de parceria, visão estratégica ou eventual investimento.</p>

<p>Caso tenha interesse, você pode acessar a plataforma pelo link abaixo e criar sua senha:</p>

<p><a href="${accessLink}" style="background-color:#D4AF37;color:#000;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:700;">Acessar Plataforma</a></p>

<p style="font-size:13px;color:#666;">Ou copie e cole: ${accessLink}</p>

<p>O link é pessoal e válido por 2 horas.</p>

<p>Se fizer sentido, teremos prazer em apresentar o projeto com mais profundidade, incluindo proposta, visão operacional e potencial de expansão.</p>

<p>Atenciosamente,<br>Equipe KAVIAR</p>

<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:12px;color:#999;">Base institucional do projeto: USB Tecnok Manutenção e Instalação de Computadores Ltda<br>CNPJ: 07.710.691/0001-66</p>`;

  return body;
}
