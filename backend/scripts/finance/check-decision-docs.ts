/**
 * check-decision-docs.ts
 *
 * Deterministic check: generates all Markdown documents in a temp directory,
 * compares with the files on disk, and fails if any file is out of date.
 *
 * Run after editing decision-register.json to confirm that the generated
 * documents are in sync.
 *
 * Exits 0 when all files are up to date, 1 if any are stale.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function main(): void {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..', '..');
  const docsDir = path.join(repoRoot, 'docs', 'finance');
  const tmpDir = fs.mkdtempSync('/tmp/kaviar-decision-check-');

  try {
    // Copy JSON into tmp dir so the generator can find it via --out-dir
    const jsonSrc = path.join(docsDir, 'phase-3c-2d-2b-decision-register.json');
    const jsonDst = path.join(tmpDir, 'phase-3c-2d-2b-decision-register.json');
    fs.copyFileSync(jsonSrc, jsonDst);

    // Generate into tmp directory
    const generatorPath = path.join(scriptDir, 'generate-decision-docs.ts');
    execSync(
      `tsx "${generatorPath}" --out-dir "${tmpDir}"`,
      { stdio: 'inherit', cwd: repoRoot },
    );

    const expectedFiles = [
      'phase-3c-2d-2b-accountant-questions.md',
      'phase-3c-2d-2b-legal-questions.md',
      'phase-3c-2d-2b-admin-questions.md',
      'phase-3c-2d-2b-admin-decision.md',
      'phase-3c-2d-2b-decision-package.md',
      'phase-3c-2d-2b-bonus-policy.md',
    ];

    let stale = 0;
    for (const filename of expectedFiles) {
      const generated = path.join(tmpDir, filename);
      const versioned = path.join(docsDir, filename);

      if (!fs.existsSync(versioned)) {
        console.error(`[STALE] ${filename} — does not exist on disk. Run finance:decisions:generate.`);
        stale++;
        continue;
      }

      const generatedContent = fs.readFileSync(generated, 'utf8');
      const versionedContent = fs.readFileSync(versioned, 'utf8');

      if (generatedContent !== versionedContent) {
        console.error(`[STALE] ${filename} — out of date. Run finance:decisions:generate.`);
        stale++;
      } else {
        console.log(`[OK]   ${filename}`);
      }
    }

    if (stale > 0) {
      console.error(`\n[FAIL] ${stale} file(s) are out of date. Run: npm run finance:decisions:generate`);
      process.exit(1);
    }

    console.log('\n[PASS] All generated documents are up to date.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
