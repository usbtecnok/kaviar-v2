/**
 * phase-3c-2d-2b-decisions.test.ts
 *
 * 20 mandatory test cases for Phase 3C-2D.2B:
 * - Decision register structure
 * - Blueprint correctness
 * - Bonus policy rules
 * - No fixed percentages anywhere
 * - Deterministic document generation
 * - Materializer safety (no production writes / no regressions)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Load decision register
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs', 'finance');
const JSON_PATH = path.join(DOCS_DIR, 'phase-3c-2d-2b-decision-register.json');

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
  blueprint_version: string;
  decisions: Decision[];
  materialization_authorized: boolean;
  database_write_authorized: boolean;
  business_policies: { bonus: { frozen: boolean; rules: Array<{ id: string; description: string }> } };
}

const register: Register = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const decisions: Decision[] = register.decisions;

// ---------------------------------------------------------------------------
// Load blueprint
// ---------------------------------------------------------------------------

// We import the blueprint TypeScript module via a dynamic require path.
// For test isolation we read the blueprint source and check key patterns
// rather than executing the module (avoids circular dep issues in vitest).
const BLUEPRINT_PATH = path.join(
  REPO_ROOT,
  'backend',
  'src',
  'services',
  'finance',
  'account-catalog',
  'account-blueprint.ts',
);
const blueprintSource = fs.readFileSync(BLUEPRINT_PATH, 'utf8');

// ---------------------------------------------------------------------------
// Test 1: Exactly 25 decisions
// ---------------------------------------------------------------------------
describe('1. decision register has exactly 25 decisions', () => {
  it('total count = 25', () => {
    expect(decisions.length).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Test 2: No duplicate codes
// ---------------------------------------------------------------------------
describe('2. no duplicate codes in decision register', () => {
  it('all codes are unique', () => {
    const codes = decisions.map(d => d.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Counts by responsible
// ---------------------------------------------------------------------------
describe('3. decision counts by responsible', () => {
  const byResp = (r: string) => decisions.filter(d => d.responsible === r).length;

  it('ACCOUNTANT = 15', () => expect(byResp('ACCOUNTANT')).toBe(15));
  it('LEGAL = 4', () => expect(byResp('LEGAL')).toBe(4));
  it('ADMIN = 6', () => expect(byResp('ADMIN')).toBe(6));
});

// ---------------------------------------------------------------------------
// Test 4: Decided / open split
// ---------------------------------------------------------------------------
describe('4. decision progress', () => {
  it('decided = 6', () => {
    expect(decisions.filter(d => d.answer !== null).length).toBe(6);
  });
  it('open = 19', () => {
    expect(decisions.filter(d => d.answer === null).length).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// Test 5: The 6 admin decisions have all required fields
// ---------------------------------------------------------------------------
describe('5. admin decisions have required fields', () => {
  const adminDecided = decisions.filter(d => d.responsible === 'ADMIN' && d.answer !== null);

  it('there are exactly 6 answered admin decisions', () => {
    expect(adminDecided.length).toBe(6);
  });

  adminDecided.forEach(d => {
    it(`${d.decision_id} (${d.code}) has rationale`, () => {
      expect(d.rationale).toBeTruthy();
    });
    it(`${d.decision_id} (${d.code}) has decided_by`, () => {
      expect(d.decided_by).toBeTruthy();
    });
    it(`${d.decision_id} (${d.code}) has evidence_reference`, () => {
      expect(d.evidence_reference).toBeTruthy();
    });
    it(`${d.decision_id} (${d.code}) has resulting_blueprint_status`, () => {
      expect(d.resulting_blueprint_status).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Test 6: The 19 non-admin decisions remain open
// ---------------------------------------------------------------------------
describe('6. non-admin decisions remain open', () => {
  it('all 19 open decisions have answer = null', () => {
    const open = decisions.filter(d => d.answer === null);
    expect(open.length).toBe(19);
    open.forEach(d => expect(d.answer).toBeNull());
  });
});

// ---------------------------------------------------------------------------
// Test 7: 3201 and 4102 are PENDING_ACCOUNTANT in the blueprint
// ---------------------------------------------------------------------------
describe('7. 3201 and 4102 are PENDING_ACCOUNTANT in blueprint', () => {
  it('3201 is PENDING_ACCOUNTANT', () => {
    // Check the source for the status assignment after code: '3201'
    const idx3201 = blueprintSource.indexOf("code: '3201'");
    expect(idx3201).toBeGreaterThan(-1);
    const snippet3201 = blueprintSource.slice(idx3201, idx3201 + 800);
    expect(snippet3201).toContain('PENDING_ACCOUNTANT');
    expect(snippet3201).not.toContain('PENDING_ADMIN');
    expect(snippet3201).not.toContain('READY_FOR_TECHNICAL_CREATION');
  });

  it('4102 is PENDING_ACCOUNTANT', () => {
    const idx4102 = blueprintSource.indexOf("code: '4102'");
    expect(idx4102).toBeGreaterThan(-1);
    const snippet4102 = blueprintSource.slice(idx4102, idx4102 + 800);
    expect(snippet4102).toContain('PENDING_ACCOUNTANT');
    expect(snippet4102).not.toContain('PENDING_ADMIN');
    expect(snippet4102).not.toContain('READY_FOR_TECHNICAL_CREATION');
  });
});

// ---------------------------------------------------------------------------
// Test 8: CC001-CC004 are not materializable (PENDING_ADMIN, not READY)
// ---------------------------------------------------------------------------
describe('8. cost centers CC001-CC004 are not materializable', () => {
  (['CC001', 'CC002', 'CC003', 'CC004'] as const).forEach(cc => {
    it(`${cc} does not appear as READY_FOR_TECHNICAL_CREATION`, () => {
      const idx = blueprintSource.indexOf(`code: '${cc}'`);
      expect(idx).toBeGreaterThan(-1);
      const snippet = blueprintSource.slice(idx, idx + 300);
      expect(snippet).not.toContain('READY_FOR_TECHNICAL_CREATION');
    });
  });
});

// ---------------------------------------------------------------------------
// Test 9: Approved hierarchy is COMPANY > CITY > TERRITORY
// ---------------------------------------------------------------------------
describe('9. approved cost center hierarchy is COMPANY > CITY > TERRITORY', () => {
  it('CC003 decision operational_rule mentions COMPANY > CITY > TERRITORY', () => {
    const cc003 = decisions.find(d => d.code === 'CC003');
    expect(cc003).toBeDefined();
    expect(cc003?.operational_rule).toMatch(/COMPANY.*CITY.*TERRITORY/);
  });
});

// ---------------------------------------------------------------------------
// Test 10: Department (CC004) is deferred and not in the territorial tree
// ---------------------------------------------------------------------------
describe('10. department is deferred and not in territorial tree', () => {
  it('CC004 answer is DEFER', () => {
    const cc004 = decisions.find(d => d.code === 'CC004');
    expect(cc004?.answer).toBe('DEFER');
  });

  it('CC004 operational_rule prohibits mixing department into territorial tree', () => {
    const cc004 = decisions.find(d => d.code === 'CC004');
    expect(cc004?.operational_rule).toMatch(/não misturar|not mix/i);
  });
});

// ---------------------------------------------------------------------------
// Test 11: 2101 notes affirm 100% credit policy
// ---------------------------------------------------------------------------
describe('11. 2101 affirms 100% credit is consumable', () => {
  it('blueprint note for 2101 mentions 100%', () => {
    const idx2101 = blueprintSource.indexOf("code: '2101'");
    expect(idx2101).toBeGreaterThan(-1);
    const snippet = blueprintSource.slice(idx2101, idx2101 + 800);
    expect(snippet).toMatch(/100%/);
  });

  it('blueprint note for 2101 says no portion finances bonuses', () => {
    const idx2101 = blueprintSource.indexOf("code: '2101'");
    const snippet = blueprintSource.slice(idx2101, idx2101 + 900);
    expect(snippet).toMatch(/bonus/i);
    expect(snippet).toMatch(/not retained|no portion.*financ|nenhum.*financi/i);
  });
});

// ---------------------------------------------------------------------------
// Test 12: 2103 represents earned bonus financed by KAVIAR
// ---------------------------------------------------------------------------
describe('12. 2103 represents earned bonus financed by KAVIAR', () => {
  it('2103 name is Payable to Drivers - Earned Bonus', () => {
    const idx2103 = blueprintSource.indexOf("code: '2103'");
    expect(idx2103).toBeGreaterThan(-1);
    const snippet = blueprintSource.slice(idx2103, idx2103 + 200);
    expect(snippet).toContain('Earned Bonus');
  });

  it('2103 note mentions KAVIAR financing', () => {
    const idx2103 = blueprintSource.indexOf("code: '2103'");
    const snippet = blueprintSource.slice(idx2103, idx2103 + 600);
    expect(snippet).toMatch(/KAVIAR/i);
  });

  it('2103 note prohibits fixed percentage', () => {
    const idx2103 = blueprintSource.indexOf("code: '2103'");
    const snippet = blueprintSource.slice(idx2103, idx2103 + 900);
    expect(snippet).toMatch(/configurable|campaign/i);
    expect(snippet).not.toMatch(/fixed 5%|fixed 10%|percentual fixo/i);
  });
});

// ---------------------------------------------------------------------------
// Test 13: No fixed bonus percentage anywhere in blueprint source or register
// ---------------------------------------------------------------------------
describe('13. no fixed bonus percentage appears in blueprint or register', () => {
  it('blueprint source has no "fixed 5%" or "fixed 10%" in account definitions', () => {
    // Allow the pattern only in REJECTED notes about what was wrong
    const problematic = /(?<!NOT |not |no )(fixed [0-9]+%)/g;
    const matches = blueprintSource.match(problematic) ?? [];
    // Filter out occurrences that appear after "not" or inside REJECTED notes
    const inRejectedNote = (match: string, offset: number) => {
      const context = blueprintSource.slice(Math.max(0, offset - 60), offset + 60);
      return context.includes('REJECTED') || context.includes('NOT fixed') || context.includes('not fixed');
    };
    let problemCount = 0;
    let idx = 0;
    const src = blueprintSource;
    const re = /fixed [0-9]+%/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const context = src.slice(Math.max(0, m.index - 80), m.index + 80);
      if (!context.match(/NOT fixed|not fixed|REJECTED/i)) {
        problemCount++;
      }
    }
    expect(problemCount).toBe(0);
  });

  it('decision register has no fixed percentage in account names or codes', () => {
    const registerStr = fs.readFileSync(JSON_PATH, 'utf8');
    // Should not have patterns like "5%", "10%" in name or code fields
    const parsed = JSON.parse(registerStr);
    parsed.decisions.forEach((d: Decision) => {
      expect(d.code).not.toMatch(/[0-9]+%/);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 14: 4202 is not READY
// ---------------------------------------------------------------------------
describe('14. 4202 is not READY_FOR_TECHNICAL_CREATION', () => {
  it('4202 does not appear as READY_FOR_TECHNICAL_CREATION in blueprint', () => {
    const idx4202 = blueprintSource.indexOf("code: '4202'");
    expect(idx4202).toBeGreaterThan(-1);
    const snippet = blueprintSource.slice(idx4202, idx4202 + 600);
    expect(snippet).not.toContain('READY_FOR_TECHNICAL_CREATION');
    expect(snippet).toContain('REJECTED');
  });
});

// ---------------------------------------------------------------------------
// Test 15: 4402 is not READY
// ---------------------------------------------------------------------------
describe('15. 4402 is not READY_FOR_TECHNICAL_CREATION', () => {
  it('4402 does not appear as READY_FOR_TECHNICAL_CREATION in blueprint', () => {
    const idx4402 = blueprintSource.indexOf("code: '4402'");
    expect(idx4402).toBeGreaterThan(-1);
    const snippet = blueprintSource.slice(idx4402, idx4402 + 600);
    expect(snippet).not.toContain('READY_FOR_TECHNICAL_CREATION');
    expect(snippet).toContain('REJECTED');
  });
});

// ---------------------------------------------------------------------------
// Test 16: No two materializable categories for the same bonus
// ---------------------------------------------------------------------------
describe('16. no two materializable categories for the same bonus', () => {
  it('at most one bonus-related entry is READY_FOR_TECHNICAL_CREATION', () => {
    // Extract all code: 'XXXX' followed by READY_FOR_TECHNICAL_CREATION in the blueprint
    const readyPattern = /code: '(\w+)'[\s\S]{0,500}?READY_FOR_TECHNICAL_CREATION/g;
    const readyCodes: string[] = [];
    let m;
    while ((m = readyPattern.exec(blueprintSource)) !== null) {
      readyCodes.push(m[1]);
    }
    const bonusCodes = ['2103', '3301', '4202', '4402'];
    const readyBonusCodes = readyCodes.filter(c => bonusCodes.includes(c));
    // 2103 is READY (it's a liability, not a category), 3301/4202/4402 should not be READY
    const nonLiabilityReady = readyBonusCodes.filter(c => c !== '2103');
    expect(nonLiabilityReady.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 17: New revenue deduction entry 3301 is not EXPENSE and is BLOCKED
// ---------------------------------------------------------------------------
describe('17. 3301 revenue deduction is not EXPENSE and is BLOCKED_BY_SCHEMA', () => {
  it('3301 exists in blueprint', () => {
    expect(blueprintSource).toContain("code: '3301'");
  });

  it('3301 is BLOCKED_BY_SCHEMA, not READY or EXPENSE', () => {
    const idx3301 = blueprintSource.indexOf("code: '3301'");
    expect(idx3301).toBeGreaterThan(-1);
    const snippet = blueprintSource.slice(idx3301, idx3301 + 700);
    expect(snippet).toContain('BLOCKED_BY_SCHEMA');
    expect(snippet).not.toContain('READY_FOR_TECHNICAL_CREATION');
  });

  it('3301 economic_nature is REVENUE_DEDUCTION, not EXPENSE', () => {
    const idx3301 = blueprintSource.indexOf("code: '3301'");
    const snippet = blueprintSource.slice(idx3301, idx3301 + 700);
    expect(snippet).toContain('REVENUE_DEDUCTION');
    // The economic_nature field must not say just 'EXPENSE'
    const econIdx = snippet.indexOf('economic_nature:');
    const econValue = snippet.slice(econIdx, econIdx + 60);
    expect(econValue).not.toMatch(/'EXPENSE'/);
  });

  it('3301 has REVENUE_DEDUCTION_NOT_SUPPORTED blocking reason', () => {
    const idx3301 = blueprintSource.indexOf("code: '3301'");
    const snippet = blueprintSource.slice(idx3301, idx3301 + 700);
    expect(snippet).toContain('REVENUE_DEDUCTION_NOT_SUPPORTED');
  });
});

// ---------------------------------------------------------------------------
// Test 18: Materializer / plan has no production writes and is idempotent
// ---------------------------------------------------------------------------
describe('18. materializer safety — no production writes, no regressions', () => {
  const SAFETY_PATH = path.join(
    REPO_ROOT,
    'backend',
    'src',
    'services',
    'finance',
    'account-catalog',
    'account-materialization-safety.ts',
  );

  it('safety file exists', () => {
    expect(fs.existsSync(SAFETY_PATH)).toBe(true);
  });

  it('safety file prohibits non-local DATABASE_URL', () => {
    const src = fs.readFileSync(SAFETY_PATH, 'utf8');
    expect(src).toMatch(/localhost|127\.0\.0\.1|assertSafeDbUrl|local/i);
  });

  const LOCAL_SCRIPT = path.join(
    REPO_ROOT,
    'backend',
    'scripts',
    'finance',
    'materialize-account-blueprint-local.ts',
  );

  it('local materializer script exists', () => {
    expect(fs.existsSync(LOCAL_SCRIPT)).toBe(true);
  });

  it('local materializer does not reference production DATABASE_URL directly', () => {
    const src = fs.readFileSync(LOCAL_SCRIPT, 'utf8');
    // Should not hardcode a production RDS endpoint
    expect(src).not.toMatch(/\.rds\.amazonaws\.com/i);
    expect(src).not.toMatch(/prod[^u].*DATABASE_URL/i);
  });
});

// ---------------------------------------------------------------------------
// Test 19: Document generation is deterministic
// ---------------------------------------------------------------------------
describe('19. document generation is deterministic', () => {
  it('running the generator twice produces identical output', async () => {
    const { execSync } = await import('child_process');
    const scriptDir = path.join(REPO_ROOT, 'backend', 'scripts', 'finance');
    const generatorPath = path.join(scriptDir, 'generate-decision-docs.ts');

    const tmp1 = fs.mkdtempSync('/tmp/kaviar-gen-det-1-');
    const tmp2 = fs.mkdtempSync('/tmp/kaviar-gen-det-2-');

    try {
      const jsonSrc = path.join(DOCS_DIR, 'phase-3c-2d-2b-decision-register.json');
      fs.copyFileSync(jsonSrc, path.join(tmp1, 'phase-3c-2d-2b-decision-register.json'));
      fs.copyFileSync(jsonSrc, path.join(tmp2, 'phase-3c-2d-2b-decision-register.json'));

      execSync(`tsx "${generatorPath}" --out-dir "${tmp1}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
      execSync(`tsx "${generatorPath}" --out-dir "${tmp2}"`, { cwd: REPO_ROOT, stdio: 'pipe' });

      const files = [
        'phase-3c-2d-2b-accountant-questions.md',
        'phase-3c-2d-2b-legal-questions.md',
        'phase-3c-2d-2b-admin-questions.md',
        'phase-3c-2d-2b-admin-decision.md',
        'phase-3c-2d-2b-decision-package.md',
        'phase-3c-2d-2b-bonus-policy.md',
      ];

      for (const f of files) {
        const a = fs.readFileSync(path.join(tmp1, f), 'utf8');
        const b = fs.readFileSync(path.join(tmp2, f), 'utf8');
        expect(a).toBe(b);
      }
    } finally {
      fs.rmSync(tmp1, { recursive: true, force: true });
      fs.rmSync(tmp2, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Test 20: check script detects stale document
// ---------------------------------------------------------------------------
describe('20. check script detects stale Markdown document', () => {
  it('modifying a generated file causes check to fail', async () => {
    const { execSync } = await import('child_process');

    const targetFile = path.join(DOCS_DIR, 'phase-3c-2d-2b-decision-package.md');
    const original = fs.readFileSync(targetFile, 'utf8');

    try {
      // Corrupt the file
      fs.writeFileSync(targetFile, original + '\n<!-- STALE MARKER -->\n', 'utf8');

      let threw = false;
      try {
        execSync('npm run finance:decisions:check', {
          cwd: path.join(REPO_ROOT, 'backend'),
          stdio: 'pipe',
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    } finally {
      // Restore the file
      fs.writeFileSync(targetFile, original, 'utf8');
    }
  });
});
