/**
 * validate-decision-register.ts
 *
 * Validates the phase-3c-2d-2b-decision-register.json against structural rules:
 * - Exactly 25 decisions
 * - No duplicate codes or decision_ids
 * - Correct counts by responsible (15 ACCOUNTANT, 4 LEGAL, 6 ADMIN)
 * - Correct decided/open split (6 / 19)
 * - All 6 admin decisions have required fields filled
 * - No open decision has an answer
 * - materialization_authorized = false on all decisions
 * - database_write_authorized = false on all decisions
 * - business_policies.bonus is present and frozen
 *
 * Exits 0 on success, 1 on failure.
 */

import fs from 'fs';
import path from 'path';

interface Decision {
  decision_id: string;
  responsible: string;
  code: string;
  answer: string | null;
  rationale: string | null;
  decided_by: string | null;
  evidence_reference: string | null;
  resulting_blueprint_status: string | null;
  operational_rule: string | null;
  materialization_authorized: boolean;
  database_write_authorized: boolean;
}

interface Register {
  decisions: Decision[];
  business_policies?: { bonus?: { frozen?: boolean; rules?: unknown[] } };
  materialization_authorized: boolean;
  database_write_authorized: boolean;
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`[OK]   ${msg}`);
}

function main(): void {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..', '..');
  const jsonPath = path.join(repoRoot, 'docs', 'finance', 'phase-3c-2d-2b-decision-register.json');

  if (!fs.existsSync(jsonPath)) {
    fail(`decision-register.json not found at: ${jsonPath}`);
  }

  const register: Register = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const { decisions } = register;

  // 1. Total count
  if (decisions.length !== 25) fail(`Expected 25 decisions, found ${decisions.length}.`);
  ok('Total decisions = 25');

  // 2. No duplicate codes
  const codes = decisions.map(d => d.code);
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    const dups = codes.filter((c, i) => codes.indexOf(c) !== i);
    fail(`Duplicate codes: ${dups.join(', ')}`);
  }
  ok('No duplicate codes');

  // 3. No duplicate decision_ids
  const ids = decisions.map(d => d.decision_id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    fail(`Duplicate decision_ids: ${dups.join(', ')}`);
  }
  ok('No duplicate decision_ids');

  // 4. Counts by responsible
  const byResp: Record<string, number> = {};
  decisions.forEach(d => { byResp[d.responsible] = (byResp[d.responsible] ?? 0) + 1; });
  if ((byResp['ACCOUNTANT'] ?? 0) !== 15) fail(`Expected 15 ACCOUNTANT, found ${byResp['ACCOUNTANT'] ?? 0}`);
  ok('ACCOUNTANT count = 15');
  if ((byResp['LEGAL'] ?? 0) !== 4) fail(`Expected 4 LEGAL, found ${byResp['LEGAL'] ?? 0}`);
  ok('LEGAL count = 4');
  if ((byResp['ADMIN'] ?? 0) !== 6) fail(`Expected 6 ADMIN, found ${byResp['ADMIN'] ?? 0}`);
  ok('ADMIN count = 6');

  // 5. Decided / open split
  const decided = decisions.filter(d => d.answer !== null);
  const open = decisions.filter(d => d.answer === null);
  if (decided.length !== 6) fail(`Expected 6 decided, found ${decided.length}`);
  ok('Decided count = 6');
  if (open.length !== 19) fail(`Expected 19 open, found ${open.length}`);
  ok('Open count = 19');

  // 6. All 6 decided have required admin fields
  for (const d of decided) {
    if (!d.rationale) fail(`Decision ${d.decision_id} is decided but has no rationale`);
    if (!d.decided_by) fail(`Decision ${d.decision_id} is decided but has no decided_by`);
    if (!d.evidence_reference) fail(`Decision ${d.decision_id} is decided but has no evidence_reference`);
    if (!d.resulting_blueprint_status) fail(`Decision ${d.decision_id} is decided but has no resulting_blueprint_status`);
    if (!d.operational_rule) fail(`Decision ${d.decision_id} is decided but has no operational_rule`);
  }
  ok('All 6 decided decisions have required fields');

  // 7. Open decisions have no answer
  for (const d of open) {
    if (d.answer !== null) fail(`Decision ${d.decision_id} is marked open but has answer: ${d.answer}`);
  }
  ok('All 19 open decisions have answer=null');

  // 8. materialization_authorized and database_write_authorized are false on all decisions
  for (const d of decisions) {
    if (d.materialization_authorized !== false) fail(`Decision ${d.decision_id}: materialization_authorized must be false`);
    if (d.database_write_authorized !== false) fail(`Decision ${d.decision_id}: database_write_authorized must be false`);
  }
  ok('materialization_authorized=false and database_write_authorized=false on all decisions');

  // 9. Root-level flags
  if (register.materialization_authorized !== false) fail('Root materialization_authorized must be false');
  if (register.database_write_authorized !== false) fail('Root database_write_authorized must be false');
  ok('Root-level safety flags are false');

  // 10. bonus policy present and frozen
  const bonus = register.business_policies?.bonus;
  if (!bonus) fail('business_policies.bonus is missing');
  if (bonus.frozen !== true) fail('business_policies.bonus.frozen must be true');
  if (!Array.isArray(bonus.rules) || bonus.rules.length === 0) fail('business_policies.bonus.rules must be a non-empty array');
  ok('business_policies.bonus is present, frozen, and has rules');

  console.log('\n[PASS] All validations passed.');
}

main();
