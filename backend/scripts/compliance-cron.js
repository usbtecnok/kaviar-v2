#!/usr/bin/env node

/**
 * Cron Job - Bloqueio Automático de Motoristas
 * Sistema de Compliance - Revalidação de Antecedentes
 * 
 * Executa diariamente às 00:00 UTC
 * Bloqueia motoristas com documentos vencidos há mais de 7 dias
 */

const path = require('path');
const fs = require('fs');

// Configurar diretório de trabalho
const BACKEND_DIR = path.join(__dirname, '..');
process.chdir(BACKEND_DIR);

// Carregar variáveis de ambiente
require('dotenv').config();

// Importar serviço de compliance (caminho relativo ao backend)
const { complianceService } = require('../dist/services/compliance.service.js');

async function runComplianceCron() {
  const startTime = new Date();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[${startTime.toISOString()}] Iniciando cron job de compliance`);
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Executar bloqueio automático
    const result = await complianceService.applyAutomaticBlocks();
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log('\n✅ Cron job executado com sucesso');
    console.log(`⏱️  Duração: ${duration}ms`);
    console.log(`📊 Motoristas bloqueados: ${result.totalBlocked}`);
    
    if (result.totalBlocked > 0) {
      console.log('\n📋 Detalhes dos bloqueios:');
      result.blocked.forEach((block, index) => {
        console.log(`  ${index + 1}. Driver: ${block.driverId}`);
        console.log(`     Documento: ${block.documentId}`);
        console.log(`     Vencido em: ${block.validUntil}`);
        console.log(`     Bloqueado em: ${block.blockedAt}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[${endTime.toISOString()}] Cron job finalizado`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    const endTime = new Date();
    
    console.error('\n❌ Erro no cron job de compliance');
    console.error(`⏱️  Duração até falha: ${endTime - startTime}ms`);
    console.error(`🔴 Erro: ${error.message}`);
    console.error(`📍 Stack: ${error.stack}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[${endTime.toISOString()}] Cron job FALHOU`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(1);
  }
}

// Executar
runComplianceCron();
