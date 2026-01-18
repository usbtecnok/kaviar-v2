import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function seedBairros() {
  console.log('🌱 Criando seeds dos 5 bairros...');

  // 1. Criar os 5 bairros
  const bairros = [
    { name: 'Mata Machado', description: 'Bairro Mata Machado' },
    { name: 'Furnas', description: 'Bairro Furnas' },
    { name: 'Agrícola', description: 'Bairro Agrícola' },
    { name: 'Butuí', description: 'Bairro Butuí' },
    { name: 'Tijuaçu', description: 'Bairro Tijuaçu' }
  ];

  const createdBairros = [];
  
  for (const bairro of bairros) {
    const existing = await prisma.communities.findFirst({
      where: { name: bairro.name }
    });

    if (!existing) {
      const created = await prisma.communities.create({
        data: {
          name: bairro.name,
          description: bairro.description,
          isActive: false, // Inicia inativo até ter motoristas suficientes
          minActiveDrivers: 3, // Critério mínimo
          centerLat: -12.9714, // Salvador, BA (exemplo)
          centerLng: -38.5014,
          radiusMeters: 5000
        }
      });
      createdBairros.push(created);
      console.log(`✅ Bairro criado: ${created.name}`);
    } else {
      createdBairros.push(existing);
      console.log(`ℹ️ Bairro já existe: ${existing.name}`);
    }
  }

  // 2. Para cada bairro, criar motoristas, passageiros e guias
  for (const bairro of createdBairros) {
    console.log(`\n🚗 Criando dados para ${bairro.name}...`);

    // Criar 5 motoristas (2 premium)
    for (let i = 1; i <= 5; i++) {
      const email = `motorista${i}.${bairro.name.toLowerCase().replace(' ', '')}@test.com`;
      
      const existing = await prisma.drivers.findUnique({ where: { email } });
      if (!existing) {
        const passwordHash = await bcrypt.hash('123456', 12);
        
        await prisma.drivers.create({
          data: {
            name: `Motorista ${i} - ${bairro.name}`,
            email,
            passwordHash,
            phone: `(71) 9999-${String(i).padStart(4, '0')}`,
            communityId: bairro.id,
            status: 'approved',
            isPremium: i <= 2, // Primeiros 2 são premium
            documentCpf: `000.000.00${i}-0${i}`,
            vehiclePlate: `ABC-${i}${i}${i}${i}`,
            vehicleModel: `Modelo ${i}`
          }
        });
        console.log(`  ✅ Motorista ${i} criado (${i <= 2 ? 'Premium' : 'Comum'})`);
      }
    }

    // Criar 10 passageiros
    for (let i = 1; i <= 10; i++) {
      const email = `passageiro${i}.${bairro.name.toLowerCase().replace(' ', '')}@test.com`;
      
      const existing = await prisma.passengers.findUnique({ where: { email } });
      if (!existing) {
        const passwordHash = await bcrypt.hash('123456', 12);
        
        await prisma.passengers.create({
          data: {
            name: `Passageiro ${i} - ${bairro.name}`,
            email,
            passwordHash,
            phone: `(71) 8888-${String(i).padStart(4, '0')}`,
            communityId: bairro.id,
            status: 'approved'
          }
        });
        console.log(`  ✅ Passageiro ${i} criado`);
      }
    }

    // Criar 1 guia turístico
    const guideEmail = `guia.${bairro.name.toLowerCase().replace(' ', '')}@test.com`;
    const existingGuide = await prisma.tourist_guides.findUnique({ where: { email: guideEmail } });
    
    if (!existingGuide) {
      await prisma.tourist_guides.create({
        data: {
          name: `Guia Turístico - ${bairro.name}`,
          email: guideEmail,
          phone: `(71) 7777-0001`,
          communityId: bairro.id,
          status: 'approved',
          isBilingual: true,
          languages: ['Português', 'Inglês'],
          alsoDriver: false
        }
      });
      console.log(`  ✅ Guia turístico criado`);
    }
  }

  // 3. Ativar bairros que atendem ao critério mínimo
  for (const bairro of createdBairros) {
    const activeDrivers = await prisma.drivers.count({
      where: {
        communityId: bairro.id,
        status: 'approved'
      }
    });

    if (activeDrivers >= bairro.minActiveDrivers && !bairro.isActive) {
      await prisma.communities.update({
        where: { id: bairro.id },
        data: { 
          isActive: true,
          lastEvaluatedAt: new Date()
        }
      });
      console.log(`✅ Bairro ${bairro.name} ativado (${activeDrivers} motoristas)`);
    } else {
      console.log(`⚠️ Bairro ${bairro.name} permanece inativo (${activeDrivers}/${bairro.minActiveDrivers} motoristas)`);
    }
  }

  console.log('\n🎉 Seeds dos bairros criados com sucesso!');
}

async function main() {
  try {
    await seedBairros();
  } catch (error) {
    console.error('❌ Erro ao criar seeds:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedBairros };
