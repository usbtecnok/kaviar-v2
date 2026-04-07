const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('📋 Lendo migration...');
    const sql = fs.readFileSync('prisma/migrations/20260117_driver_compliance_documents.sql', 'utf8');
    
    // Dividir em comandos individuais (preservando CREATE TABLE completo)
    const commands = [];
    let currentCommand = '';
    let inCreateTable = false;
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      
      // Ignorar comentários e linhas vazias
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue;
      }
      
      // Detectar início de CREATE TABLE
      if (trimmed.startsWith('CREATE TABLE')) {
        inCreateTable = true;
        currentCommand = line + '\n';
        continue;
      }
      
      // Acumular linhas do CREATE TABLE
      if (inCreateTable) {
        currentCommand += line + '\n';
        if (trimmed.endsWith(');')) {
          inCreateTable = false;
          commands.push(currentCommand.trim());
          currentCommand = '';
        }
        continue;
      }
      
      // Outros comandos (CREATE INDEX, COMMENT, etc)
      if (trimmed.length > 0) {
        currentCommand += line + '\n';
        if (trimmed.endsWith(';')) {
          commands.push(currentCommand.trim());
          currentCommand = '';
        }
      }
    }
    
    console.log(`📊 Executando ${commands.length} comandos...`);
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.length > 0) {
        const preview = cmd.substring(0, 60).replace(/\n/g, ' ');
        console.log(`  ${i + 1}/${commands.length}: ${preview}...`);
        await prisma.$executeRawUnsafe(cmd);
      }
    }
    
    console.log('✅ Migration executada com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration falhou:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
