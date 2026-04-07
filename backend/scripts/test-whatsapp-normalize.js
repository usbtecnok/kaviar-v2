#!/usr/bin/env node
// Teste unitário da normalização WhatsApp

function normalizeWhatsAppTo(to) {
  const raw = (to || "").trim();
  
  // Se já tem prefixo whatsapp:, extrair número
  const phoneOnly = raw.startsWith("whatsapp:") ? raw.substring(9) : raw;
  
  // Limpar: manter apenas + e dígitos
  const cleaned = phoneOnly.replace(/[^\d+]/g, "");
  
  // Validar formato E.164 (deve começar com +)
  if (!cleaned.startsWith("+")) {
    throw new Error(`[whatsapp] Invalid To phone (missing +): ${to}`);
  }
  
  // Validar comprimento mínimo (+ e pelo menos 10 dígitos)
  if (cleaned.length < 11) {
    throw new Error(`[whatsapp] Invalid To phone (too short): ${to}`);
  }
  
  return `whatsapp:${cleaned}`;
}

const tests = [
  // [input, expected]
  ['+5521980669989', 'whatsapp:+5521980669989'],
  ['whatsapp:+5521980669989', 'whatsapp:+5521980669989'],
  ['+55 21 98066-9989', 'whatsapp:+5521980669989'],
  ['+55 (21) 98066-9989', 'whatsapp:+5521980669989'],
  ['+1 413 475 9634', 'whatsapp:+14134759634'],
  ['  +5521980669989  ', 'whatsapp:+5521980669989'],
];

const errorTests = [
  '5521980669989',      // Missing +
  '980669989',          // Too short
  '+55',                // Too short
  '',                   // Empty
  'invalid',            // No digits
];

console.log('=== Testes de Normalização WhatsApp ===\n');

let passed = 0;
let failed = 0;

// Testes de sucesso
console.log('Testes de Sucesso:');
tests.forEach(([input, expected]) => {
  try {
    const result = normalizeWhatsAppTo(input);
    if (result === expected) {
      console.log(`✅ "${input}" → "${result}"`);
      passed++;
    } else {
      console.log(`❌ "${input}" → "${result}" (esperado: "${expected}")`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ "${input}" → ERRO: ${err.message}`);
    failed++;
  }
});

console.log('\nTestes de Erro (devem falhar):');
errorTests.forEach((input) => {
  try {
    const result = normalizeWhatsAppTo(input);
    console.log(`❌ "${input}" → "${result}" (deveria ter falhado)`);
    failed++;
  } catch (err) {
    console.log(`✅ "${input}" → ERRO (esperado): ${err.message}`);
    passed++;
  }
});

console.log(`\n=== Resultado: ${passed} passou, ${failed} falhou ===`);
process.exit(failed > 0 ? 1 : 0);
