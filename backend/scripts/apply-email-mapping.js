#!/usr/bin/env node
/**
 * Script para aplicar mapping de emails no SQL de migração
 * Uso: node apply-email-mapping.js
 */

const fs = require('fs');
const path = require('path');

const MAPPING_FILE = path.join(__dirname, 'email-mapping.csv');
const SQL_TEMPLATE = path.join(__dirname, 'migrate-investor-emails.sql');
const SQL_OUTPUT = path.join(__dirname, 'migrate-investor-emails-READY.sql');

console.log('🔄 Aplicando mapping de emails...\n');

// Ler mapping
const mappingContent = fs.readFileSync(MAPPING_FILE, 'utf8');
const lines = mappingContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));

const mapping = {};
lines.forEach(line => {
  const [oldEmail, newEmail] = line.split(',').map(s => s.trim());
  if (oldEmail && newEmail && !newEmail.startsWith('<')) {
    mapping[oldEmail] = newEmail;
  }
});

console.log(`✅ ${Object.keys(mapping).length} emails mapeados\n`);

// Ler SQL template
let sql = fs.readFileSync(SQL_TEMPLATE, 'utf8');

// Aplicar substituições
let replacements = 0;
Object.entries(mapping).forEach(([oldEmail, newEmail]) => {
  const placeholder = oldEmail.replace('@kaviar.com', '').toUpperCase().replace(/(\d+)/, '_$1');
  const searchPattern = `<EMAIL_REAL_${placeholder}>`;
  
  if (sql.includes(searchPattern)) {
    sql = sql.replace(new RegExp(searchPattern, 'g'), newEmail);
    replacements++;
    console.log(`  ${oldEmail} → ${newEmail}`);
  }
});

console.log(`\n✅ ${replacements} substituições aplicadas`);

// Verificar se ainda há placeholders
const remainingPlaceholders = (sql.match(/<EMAIL_REAL_[^>]+>/g) || []);
if (remainingPlaceholders.length > 0) {
  console.error(`\n⚠️  ATENÇÃO: ${remainingPlaceholders.length} placeholders não preenchidos:`);
  remainingPlaceholders.forEach(p => console.error(`  - ${p}`));
  console.error('\n❌ Preencha todos os emails no arquivo email-mapping.csv antes de continuar.\n');
  process.exit(1);
}

// Salvar SQL pronto
fs.writeFileSync(SQL_OUTPUT, sql);
console.log(`\n✅ SQL pronto salvo em: ${SQL_OUTPUT}`);
console.log('\n📋 Próximos passos:');
console.log('  1. Revisar o arquivo migrate-investor-emails-READY.sql');
console.log('  2. Executar: psql $DATABASE_URL -f backend/scripts/migrate-investor-emails-READY.sql');
console.log('  3. Validar com os testes do INVESTOR_EMAIL_MIGRATION.md\n');
