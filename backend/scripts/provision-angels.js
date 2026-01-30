#!/usr/bin/env node

/**
 * RBAC Angel Provisioning Script
 * Creates angel2-10 ANGEL_VIEWER users with secure random passwords
 * Idempotent: skips existing users
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Generate secure random password (12 chars: letters + numbers)
function generateSecurePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function provisionAngels() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  RBAC ANGEL PROVISIONING                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = {
    existing: [],
    created: [],
    errors: []
  };

  // Check and create angel1-10
  for (let i = 1; i <= 10; i++) {
    const email = `angel${i}@kaviar.com`;
    const name = `Angel Investor ${i}`;

    try {
      // Check if exists
      const existing = await prisma.admins.findUnique({
        where: { email }
      });

      if (existing) {
        results.existing.push(email);
        console.log(`✓ ${email} - Already exists (skipped)`);
        continue;
      }

      // Generate secure password
      const plainPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Create user
      await prisma.admins.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ANGEL_VIEWER',
          must_change_password: true,
          is_active: true
        }
      });

      results.created.push({ email, password: plainPassword });
      console.log(`✓ ${email} - Created`);

    } catch (error) {
      results.errors.push({ email, error: error.message });
      console.error(`✗ ${email} - Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PROVISIONING SUMMARY                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Existing: ${results.existing.length}`);
  console.log(`Created:  ${results.created.length}`);
  console.log(`Errors:   ${results.errors.length}\n`);

  // Show initial passwords ONLY for newly created users
  if (results.created.length > 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  INITIAL PASSWORDS (COPY NOW - SHOWN ONCE)            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    results.created.forEach(({ email, password }) => {
      console.log(`${email}: ${password}`);
    });

    console.log('\n⚠️  Save these passwords securely!');
    console.log('⚠️  Users must change password on first login.\n');
  }

  await prisma.$disconnect();
  
  return results;
}

// Run
provisionAngels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
