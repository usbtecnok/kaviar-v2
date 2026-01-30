/**
 * Seed script for Community Reputation System
 * Creates sample leaders and drivers with different reputation levels
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Helper function to generate hash
function generateHash(data) {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ ...data, timestamp });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function main() {
  console.log('🌱 Starting reputation system seed...\n');

  // Get existing communities
  const communities = await prisma.$queryRaw`
    SELECT id, name FROM communities WHERE is_active = true LIMIT 2
  `;

  if (!communities || communities.length === 0) {
    console.error('❌ No active communities found. Please seed communities first.');
    return;
  }

  const [community1, community2] = communities;
  console.log(`✅ Found communities: ${community1.name}, ${community2.name}\n`);

  // 1. Create Community Leaders
  console.log('👥 Creating community leaders...');

  const leader1Id = crypto.randomUUID();
  const leader2Id = crypto.randomUUID();

  await prisma.$executeRaw`
    INSERT INTO community_leaders (
      id, user_id, community_id, name, role, 
      validation_weight, is_active, created_at, updated_at
    )
    VALUES 
      (
        ${leader1Id},
        ${crypto.randomUUID()},
        ${community1.id},
        'Dona Maria Silva',
        'PRESIDENTE_ASSOCIACAO',
        10,
        true,
        NOW(),
        NOW()
      ),
      (
        ${leader2Id},
        ${crypto.randomUUID()},
        ${community2.id},
        'Sr. João Santos',
        'LIDER_RELIGIOSO',
        10,
        true,
        NOW(),
        NOW()
      )
    ON CONFLICT (user_id, community_id) DO NOTHING
  `;

  console.log(`  ✓ Dona Maria Silva (${community1.name})`);
  console.log(`  ✓ Sr. João Santos (${community2.name})\n`);

  // 2. Create Sample Drivers with Different Reputation Levels
  console.log('🚗 Creating sample drivers...');

  const drivers = [
    {
      id: crypto.randomUUID(),
      name: 'Carlos Novato',
      email: `carlos.novato.${Date.now()}@example.com`,
      community_id: community1.id,
      total_rides: 2,
      avg_rating: 4.5,
      level: 'NEW',
      badge: 'YELLOW',
    },
    {
      id: crypto.randomUUID(),
      name: 'Ana Ativa',
      email: `ana.ativa.${Date.now()}@example.com`,
      community_id: community1.id,
      total_rides: 15,
      avg_rating: 4.6,
      level: 'ACTIVE',
      badge: 'GREEN',
    },
    {
      id: crypto.randomUUID(),
      name: 'Pedro Experiente',
      email: `pedro.exp.${Date.now()}@example.com`,
      community_id: community1.id,
      total_rides: 30,
      avg_rating: 4.7,
      level: 'ACTIVE',
      badge: 'GREEN',
    },
    {
      id: crypto.randomUUID(),
      name: 'Maria Verificada',
      email: `maria.ver.${Date.now()}@example.com`,
      community_id: community1.id,
      total_rides: 60,
      avg_rating: 4.8,
      level: 'VERIFIED',
      badge: 'GOLD',
    },
    {
      id: crypto.randomUUID(),
      name: 'José Guardião',
      email: `jose.guard.${Date.now()}@example.com`,
      community_id: community1.id,
      total_rides: 250,
      avg_rating: 4.95,
      level: 'GUARDIAN',
      badge: 'DIAMOND',
    },
  ];

  // Insert drivers
  for (const driver of drivers) {
    await prisma.$executeRaw`
      INSERT INTO drivers (
        id, name, email, password_hash, status, 
        community_id, created_at, updated_at
      )
      VALUES (
        ${driver.id},
        ${driver.name},
        ${driver.email},
        'hashed_password_placeholder',
        'active',
        ${driver.community_id},
        NOW() - INTERVAL '6 months',
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `;

    console.log(`  ✓ ${driver.name} (${driver.level})`);
  }

  console.log('');

  // 3. Create Reputation Stats
  console.log('📊 Creating reputation stats...');

  for (const driver of drivers) {
    const firstRideDate = new Date();
    firstRideDate.setMonth(firstRideDate.getMonth() - 6);

    await prisma.$executeRaw`
      INSERT INTO driver_reputation_stats (
        id, driver_id, community_id, total_rides, avg_rating,
        validation_score, reputation_level, badge_type,
        first_ride_at, last_ride_at, incidents_count, updated_at
      )
      VALUES (
        ${crypto.randomUUID()},
        ${driver.id},
        ${driver.community_id},
        ${driver.total_rides},
        ${driver.avg_rating},
        0,
        ${driver.level},
        ${driver.badge},
        ${firstRideDate.toISOString()},
        NOW(),
        0,
        NOW()
      )
      ON CONFLICT (driver_id, community_id) DO NOTHING
    `;
  }

  console.log(`  ✓ Created stats for ${drivers.length} drivers\n`);

  // 4. Create Ledger Entries (Historical Rides)
  console.log('📝 Creating ledger entries...');

  let totalLedgerEntries = 0;

  for (const driver of drivers) {
    // Create ride completion events
    for (let i = 0; i < Math.min(driver.total_rides, 10); i++) {
      const eventData = {
        driverId: driver.id,
        communityId: driver.community_id,
        eventType: 'RIDE_COMPLETED',
        rating: Math.floor(driver.avg_rating),
      };

      const hash = generateHash(eventData);

      await prisma.$executeRaw`
        INSERT INTO community_reputation_ledger (
          id, driver_id, community_id, event_type, event_data,
          rating, hash, created_at
        )
        VALUES (
          ${crypto.randomUUID()},
          ${driver.id},
          ${driver.community_id},
          'RIDE_COMPLETED',
          ${JSON.stringify({ ride_number: i + 1 })}::jsonb,
          ${Math.floor(driver.avg_rating)},
          ${hash},
          NOW() - INTERVAL '${Math.floor(Math.random() * 180)} days'
        )
      `;

      totalLedgerEntries++;
    }
  }

  console.log(`  ✓ Created ${totalLedgerEntries} ledger entries\n`);

  // 5. Create Leader Validations for VERIFIED and GUARDIAN drivers
  console.log('✅ Creating leader validations...');

  const verifiedDriver = drivers.find((d) => d.level === 'VERIFIED');
  const guardianDriver = drivers.find((d) => d.level === 'GUARDIAN');

  if (verifiedDriver) {
    await prisma.$executeRaw`
      INSERT INTO driver_validations (
        id, driver_id, community_id, validator_id,
        validator_type, validation_weight, notes, created_at
      )
      VALUES (
        ${crypto.randomUUID()},
        ${verifiedDriver.id},
        ${verifiedDriver.community_id},
        ${leader1Id},
        'COMMUNITY_LEADER',
        10,
        'Conheço pessoalmente, mora na comunidade há 3 anos',
        NOW() - INTERVAL '30 days'
      )
      ON CONFLICT (driver_id, community_id, validator_id) DO NOTHING
    `;

    // Update validation score
    await prisma.$executeRaw`
      UPDATE driver_reputation_stats
      SET validation_score = 10
      WHERE driver_id = ${verifiedDriver.id} AND community_id = ${verifiedDriver.community_id}
    `;

    console.log(`  ✓ Validated ${verifiedDriver.name} by Dona Maria`);
  }

  if (guardianDriver) {
    await prisma.$executeRaw`
      INSERT INTO driver_validations (
        id, driver_id, community_id, validator_id,
        validator_type, validation_weight, notes, created_at
      )
      VALUES (
        ${crypto.randomUUID()},
        ${guardianDriver.id},
        ${guardianDriver.community_id},
        ${leader1Id},
        'COMMUNITY_LEADER',
        10,
        'Motorista exemplar, referência na comunidade',
        NOW() - INTERVAL '90 days'
      )
      ON CONFLICT (driver_id, community_id, validator_id) DO NOTHING
    `;

    // Update validation score
    await prisma.$executeRaw`
      UPDATE driver_reputation_stats
      SET validation_score = 10
      WHERE driver_id = ${guardianDriver.id} AND community_id = ${guardianDriver.community_id}
    `;

    console.log(`  ✓ Validated ${guardianDriver.name} by Dona Maria`);
  }

  console.log('\n✨ Reputation system seed completed successfully!\n');

  // Summary
  console.log('📋 Summary:');
  console.log(`  • 2 community leaders created`);
  console.log(`  • 5 drivers created with different reputation levels`);
  console.log(`  • ${totalLedgerEntries} ledger entries (immutable history)`);
  console.log(`  • 2 leader validations created`);
  console.log('\n🎯 You can now test the reputation system!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding reputation system:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
