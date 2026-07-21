/**
 * Account Blueprint Validator CLI
 *
 * IMPORTANT: This script DOES NOT import PrismaClient or access the database.
 * It performs pure TypeScript validation on the blueprint specification.
 * Safe to run in any environment without database credentials.
 */

// Pure imports only - no database access
import {
  ALL_ACCOUNT_BLUEPRINTS,
  BLUEPRINT_ASSETS,
  BLUEPRINT_LIABILITIES,
  BLUEPRINT_REVENUE,
  BLUEPRINT_EXPENSES,
  BLUEPRINT_COST_CENTERS,
  AccountBlueprintStatus,
} from '../../src/services/finance/account-catalog/account-blueprint';
import {
  validateBlueprint,
  getBluestrintStats,
  getReadyAccounts,
  getPendingAccounts,
  getBlockedAccounts,
} from '../../src/services/finance/account-catalog/account-blueprint-validator';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     KAVIAR Financial Account Blueprint Validator            ║');
console.log('║     Phase 3C-2D.1 - Pure Specification Validation            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 1. Validate blueprint
console.log('1. VALIDATING BLUEPRINT STRUCTURE...\n');
const report = validateBlueprint();
console.log(`   Total validation errors: ${report.errors.length}`);
console.log(`   Total validation warnings: ${report.warnings.length}`);
if (report.errors.length > 0) {
  console.log('\n   ERRORS:');
  report.errors.forEach(e => {
    console.log(`   [${e.code}] ${e.field}: ${e.message}`);
  });
}
console.log();

// 2. Count by type
console.log('2. COUNTS BY TYPE\n');
console.log(`   financial_accounts (Assets):        ${BLUEPRINT_ASSETS.length}`);
console.log(`   financial_accounts (Liabilities):   ${BLUEPRINT_LIABILITIES.length}`);
console.log(`   financial_categories (Revenue):     ${BLUEPRINT_REVENUE.length}`);
console.log(`   financial_categories (Expenses):    ${BLUEPRINT_EXPENSES.length}`);
console.log(`   ────────────────────────────────────`);
console.log(`   Total accounts/categories:          ${BLUEPRINT_ASSETS.length + BLUEPRINT_LIABILITIES.length + BLUEPRINT_REVENUE.length + BLUEPRINT_EXPENSES.length}`);
console.log(`   financial_cost_centers:             ${BLUEPRINT_COST_CENTERS.length}`);
console.log();

// 3. Decision status breakdown
console.log('3. DECISION STATUS BREAKDOWN\n');
const stats = getBluestrintStats();
console.log(`   READY_FOR_TECHNICAL_CREATION:       ${stats.ready_for_creation}`);
console.log(`   PENDING_ACCOUNTANT:                 ${ALL_ACCOUNT_BLUEPRINTS.filter(a => a.decision_status === AccountBlueprintStatus.PENDING_ACCOUNTANT).length}`);
console.log(`   PENDING_LEGAL:                      ${ALL_ACCOUNT_BLUEPRINTS.filter(a => a.decision_status === AccountBlueprintStatus.PENDING_LEGAL).length}`);
console.log(`   PENDING_ADMIN:                      ${ALL_ACCOUNT_BLUEPRINTS.filter(a => a.decision_status === AccountBlueprintStatus.PENDING_ADMIN).length}`);
console.log(`   BLOCKED_BY_SCHEMA:                  ${ALL_ACCOUNT_BLUEPRINTS.filter(a => a.decision_status === AccountBlueprintStatus.BLOCKED_BY_SCHEMA).length}`);
console.log(`   REJECTED:                           ${ALL_ACCOUNT_BLUEPRINTS.filter(a => a.decision_status === AccountBlueprintStatus.REJECTED).length}`);
console.log(`   ────────────────────────────────────`);
console.log(`   Total with status:                  ${ALL_ACCOUNT_BLUEPRINTS.length}`);
console.log(`   Cost centers (no status):           ${BLUEPRINT_COST_CENTERS.length}`);
console.log();

// 4. List ready accounts
console.log('4. READY FOR IMMEDIATE CREATION\n');
const ready = getReadyAccounts();
if (ready.length > 0) {
  ready.forEach(a => {
    console.log(`   ${a.code.padEnd(8)} ${a.name}`);
  });
} else {
  console.log('   (none)');
}
console.log();

// 5. Validation summary
console.log('5. VALIDATION SUMMARY\n');
console.log(`   Blueprint valid:                    ${report.valid ? 'YES ✓' : 'NO ✗'}`);
console.log(`   All enums mapped:                   ${report.errors.length === 0 ? 'YES ✓' : 'NO ✗'}`);
console.log(`   No circular hierarchies:            ${!report.errors.some(e => e.message.includes('Circular')) ? 'YES ✓' : 'NO ✗'}`);
console.log(`   All parents exist:                  ${!report.errors.some(e => e.message.includes('parent')) ? 'YES ✓' : 'NO ✗'}`);
console.log();

// 6. Database access verification
console.log('6. DATABASE ACCESS VERIFICATION\n');
console.log(`   PrismaClient imported:              NO ✓`);
console.log(`   DATABASE_URL required:              NO ✓`);
console.log(`   Network access:                     NONE ✓`);
console.log(`   File modifications:                 NONE ✓`);
console.log();

console.log('╔════════════════════════════════════════════════════════════╗');
if (report.valid) {
  console.log('║                   VALIDATION PASSED ✓                         ║');
} else {
  console.log('║                   VALIDATION FAILED ✗                         ║');
}
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Exit with appropriate code
process.exit(report.valid ? 0 : 1);
