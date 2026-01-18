import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function seedElderlyDemo() {
  console.log('🌱 Seeding Elderly Demo Data...');

  try {
    // 1. Criar admin se não existir
    const adminEmail = 'admin@kaviar.com';
    let admin = await prisma.admins.findUnique({ where: { email: adminEmail } });
    
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.admins.create({
        data: {
          email: adminEmail,
          name: 'Admin KAVIAR',
          passwordHash: hashedPassword,
          roleId: 'default-role-id' // Simplified for demo
        }
      });
      console.log('✅ Admin criado:', admin.email);
    }

    // 2. Buscar bairros existentes
    const communities = await prisma.communities.findMany({
      take: 3,
      where: { isActive: true }
    });

    if (communities.length === 0) {
      console.log('❌ Nenhum bairro ativo encontrado. Execute seed-bairros primeiro.');
      return;
    }

    // 3. Criar passageiros idosos
    const elderlyPassengers = [];
    const elderlyData = [
      {
        name: 'Maria Silva Santos',
        email: 'maria.santos@email.com',
        phone: '11987654321',
        careLevel: 'basic',
        emergencyContact: 'João Santos - 11999888777',
        medicalNotes: 'Hipertensão controlada, medicação diária às 8h',
        communityId: communities[0].id
      },
      {
        name: 'José Oliveira Lima',
        email: 'jose.lima@email.com', 
        phone: '11876543210',
        careLevel: 'intensive',
        emergencyContact: 'Ana Lima - 11888777666',
        medicalNotes: 'Diabetes tipo 2, insulina 3x ao dia, mobilidade reduzida',
        communityId: communities[1].id
      },
      {
        name: 'Helena Costa Ferreira',
        email: 'helena.ferreira@email.com',
        phone: '11765432109',
        careLevel: 'medical',
        emergencyContact: 'Dr. Carlos Ferreira - 11777666555',
        medicalNotes: 'Pós-operatório cardíaco, acompanhamento médico semanal',
        communityId: communities[2] ? communities[2].id : communities[0].id
      }
    ];

    for (const elderly of elderlyData) {
      // Criar ou buscar passageiro
      const hashedPassword = await bcrypt.hash('elderly123', 10);
      const passenger = await prisma.passengers.upsert({
        where: { email: elderly.email },
        update: {},
        create: {
          name: elderly.name,
          email: elderly.email,
          phone: elderly.phone,
          passwordHash: hashedPassword,
          status: 'APPROVED',
          communityId: elderly.communityId
        }
      });

      // Criar ou buscar perfil elderly
      const elderlyProfile = await prisma.elderly_profiles.upsert({
        where: { passengerId: passenger.id },
        update: {
          careLevel: elderly.careLevel as any,
          emergencyContact: elderly.emergencyContact,
          medicalNotes: elderly.medicalNotes
        },
        create: {
          passengerId: passenger.id,
          careLevel: elderly.careLevel as any,
          emergencyContact: elderly.emergencyContact,
          medicalNotes: elderly.medicalNotes
        }
      });

      elderlyPassengers.push({ passenger, elderlyProfile });
      console.log(`✅ Idoso criado: ${elderly.name} (${elderly.careLevel})`);
    }

    // 4. Criar contratos de acompanhamento
    const contracts = [
      {
        elderlyProfileId: elderlyPassengers[0].elderlyProfile.id,
        communityId: elderlyPassengers[0].passenger.communityId,
        status: 'ACTIVE',
        startsAt: new Date('2026-01-01'),
        endsAt: new Date('2026-06-30'),
        notes: 'Acompanhamento para consultas médicas semanais e compras mensais'
      },
      {
        elderlyProfileId: elderlyPassengers[1].elderlyProfile.id,
        communityId: elderlyPassengers[1].passenger.communityId,
        status: 'ACTIVE',
        startsAt: new Date('2026-01-01'),
        endsAt: null, // Contrato indefinido
        notes: 'Acompanhamento intensivo - 3 saídas por semana para tratamento'
      },
      {
        elderlyProfileId: elderlyPassengers[2].elderlyProfile.id,
        communityId: elderlyPassengers[2].passenger.communityId,
        status: 'INACTIVE',
        startsAt: new Date('2025-12-01'),
        endsAt: new Date('2025-12-31'),
        notes: 'Contrato temporário pós-cirúrgico - FINALIZADO'
      }
    ];

    for (const contractData of contracts) {
      const contract = await prisma.elderly_contracts.create({
        data: contractData as any
      });
      console.log(`✅ Contrato criado: ${contract.status} (${contract.id})`);
    }

    // 5. Estatísticas finais
    const stats = {
      elderlyProfiles: await prisma.elderly_profiles.count(),
      activeContracts: await prisma.elderly_contracts.count({ where: { status: 'ACTIVE' } }),
      totalContracts: await prisma.elderly_contracts.count(),
      communities: communities.length
    };

    console.log('\n📊 ESTATÍSTICAS ELDERLY DEMO:');
    console.log(`   👥 Perfis de Idosos: ${stats.elderlyProfiles}`);
    console.log(`   📋 Contratos Ativos: ${stats.activeContracts}`);
    console.log(`   📄 Total Contratos: ${stats.totalContracts}`);
    console.log(`   🏘️  Bairros: ${stats.communities}`);
    console.log('\n✅ Seed Elderly Demo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no seed elderly demo:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedElderlyDemo()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedElderlyDemo };
