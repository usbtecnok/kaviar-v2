/**
 * Seed: 12 leads iniciais de associações para CRM de prospecção
 * Fonte: pesquisa/IA (Gemini) — dados NÃO verificados
 * 
 * Uso: cd backend && npx tsx scripts/seed-local-operators-crm.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const leads = [
  {
    organization_name: 'AMIT — Associação de Moradores e Amigos do Itanhangá',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 3139-3990',
    city: 'Rio de Janeiro',
    neighborhood: 'Itanhangá',
    address: 'Estrada Velha de Jacarepaguá, 140',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Focada em segurança e mobilidade na região da Estrada da Barra da Tijuca. Verificar contato antes de abordagem.',
  },
  {
    organization_name: 'Associação de Moradores do Morro do Banco',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 97034-4545',
    city: 'Rio de Janeiro',
    neighborhood: 'Itanhangá',
    community: 'Morro do Banco',
    address: 'Rua da Paz, nº 02',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'Associação de Moradores da Muzema',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 98222-7744',
    city: 'Rio de Janeiro',
    neighborhood: 'Muzema',
    address: 'Estrada de Jacarepaguá, 574',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'AMAR — Associação de Moradores do Jardim Oceânico e Tijucamar',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 2493-4903',
    email: 'secretaria@amarrio.org.br',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    community: 'Jardim Oceânico / Tijucamar',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'AMABA — Associação de Moradores e Amigos da Barra Antiga / Barrinha',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    email: 'amaba.barrinha@gmail.com',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    community: 'Barrinha',
    address: 'Rua Calheiros Gomes, s/n, Barrinha, Barra da Tijuca',
    website: '@amaba.barrinha',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'Associação de Moradores da Floresta da Barra',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    city: 'Rio de Janeiro',
    neighborhood: 'Itanhangá',
    community: 'Floresta da Barra',
    address: 'Rua Paz da Floresta, 4',
    status: 'researching',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'Associação de Moradores do Jardim Oceânico',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    community: 'Jardim Oceânico',
    status: 'researching',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Reuniões em locais rotativos na região entre Av. Olegário Maciel e Av. Sernambetiba. Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'AMOR — Associação dos Moradores do Recreio dos Bandeirantes',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 2437-6518',
    email: 'amorrecreio@gmail.com',
    city: 'Rio de Janeiro',
    neighborhood: 'Recreio dos Bandeirantes',
    address: 'Av. Genaro de Carvalho, 1878',
    website: 'www.amorrecreio.org.br',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'ADAR — Associação dos Amigos do Recreio',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 3411-1051',
    city: 'Rio de Janeiro',
    neighborhood: 'Recreio dos Bandeirantes',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'Associação do Terreirão',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    city: 'Rio de Janeiro',
    neighborhood: 'Recreio dos Bandeirantes',
    community: 'Terreirão',
    address: 'Rua HW, nº 19',
    status: 'researching',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'AMA ALTO — Associação de Moradores e Amigos do Alto da Boa Vista',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 99852-3211',
    email: 'amaalto@amaalto.org.br',
    city: 'Rio de Janeiro',
    neighborhood: 'Alto da Boa Vista',
    address: 'Rua João Batista Siqueira, s/n',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Dados de pesquisa IA — verificar antes de contato oficial.',
  },
  {
    organization_name: 'FAMERJ — Federação de Associações de Moradores do Estado do Rio de Janeiro',
    responsible_name: 'Desconhecido',
    responsible_role: 'Desconhecido',
    phone: '(21) 2262-6323',
    city: 'Rio de Janeiro',
    status: 'contact_found',
    verified: false,
    source: 'Gemini / pesquisa IA',
    notes: 'Usar como fonte futura para buscar contatos de associações menores. Dados de pesquisa IA — verificar antes de contato oficial.',
  },
];

async function main() {
  console.log('🌱 Inserindo 12 leads de associações (CRM prospecção)...\n');

  let created = 0;
  for (const lead of leads) {
    const existing = await prisma.local_operators.findFirst({
      where: { organization_name: lead.organization_name },
    });
    if (existing) {
      console.log(`⏭️  Já existe: ${lead.organization_name}`);
      continue;
    }
    await prisma.local_operators.create({ data: lead });
    console.log(`✅ ${lead.organization_name} (${lead.status})`);
    created++;
  }

  console.log(`\n📊 Resultado: ${created} leads criados, ${leads.length - created} já existiam`);
  console.log('⚠️  Todos inseridos com verified=false');
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
