/**
 * HospoGo Pre-Flight Checks
 *
 * Usage:
 *   npm run preflight
 *   node scripts/preflight.cjs --local
 *
 * Exit codes:
 *   0 = OK
 *   1 = Failed checks (deployment risky)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const isLocalMode = args.has('--local');
const isJson = args.has('--json');

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function loadEnvFile(filePath) {
  if (!exists(filePath)) return false;
  const raw = fs.readFileSync(filePath);
  const parsed = dotenv.parse(raw);
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return true;
}

function loadEnv() {
  const loaded = new Set();
  const candidates = [
    path.join(PROJECT_ROOT, '.env'),
    path.join(PROJECT_ROOT, '.env.local'),
    path.join(PROJECT_ROOT, '.env.production'),
    path.join(PROJECT_ROOT, '.env.production.local'),
    path.join(PROJECT_ROOT, 'api', '.env'),
    path.join(PROJECT_ROOT, 'api', '.env.local'),
    path.join(PROJECT_ROOT, 'api', '.env.production'),
    path.join(PROJECT_ROOT, 'api', '.env.production.local'),
    path.join(process.cwd(), '.env'),
  ];

  for (const fp of candidates) {
    if (loadEnvFile(fp)) loaded.add(path.relative(PROJECT_ROOT, fp));
  }
  return Array.from(loaded);
}

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.vercel',
  'playwright-report',
  'test-results',
]);

function walkFiles(rootDir, exts) {
  const out = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    let stat;
    try {
      stat = fs.statSync(current);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const baseName = path.basename(current);
      if (IGNORE_DIR_NAMES.has(baseName)) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const e of entries) {
        stack.push(path.join(current, e.name));
      }
      continue;
    }

    if (!stat.isFile()) continue;
    const ext = path.extname(current);
    if (!exts.has(ext)) continue;
    out.push(current);
  }

  return out;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function isTruthy(val) {
  if (!val) return false;
  const v = String(val).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function getDefinedEnvKeys() {
  return new Set(Object.keys(process.env).filter((k) => process.env[k] !== undefined));
}

function checkEnv(required, optional) {
  const missingRequired = [];
  const missingOptional = [];

  for (const key of required) {
    if (!process.env[key] || String(process.env[key]).trim() === '') missingRequired.push(key);
  }
  for (const key of optional) {
    if (!process.env[key] || String(process.env[key]).trim() === '') missingOptional.push(key);
  }

  return { missingRequired, missingOptional };
}

function extractEnvRefs(files) {
  const viteKeys = [];
  const nodeKeys = [];

  const viteRe = /import\.meta\.env\.([A-Z0-9_]+)/g;
  const nodeRe = /process\.env\.([A-Z0-9_]+)/g;

  for (const fp of files) {
    const txt = readText(fp);
    if (!txt) continue;

    let m;
    while ((m = viteRe.exec(txt))) viteKeys.push(m[1]);
    while ((m = nodeRe.exec(txt))) nodeKeys.push(m[1]);
  }

  return {
    viteKeys: uniqSorted(viteKeys),
    nodeKeys: uniqSorted(nodeKeys),
  };
}

function scanForPattern(files, pattern, { ignoreFiles = [] } = {}) {
  const hits = [];
  const ignoreAbs = new Set(ignoreFiles.map((p) => path.resolve(PROJECT_ROOT, p)));

  for (const fp of files) {
    if (ignoreAbs.has(fp)) continue;
    const txt = readText(fp);
    if (!txt) continue;
    if (pattern.test(txt)) {
      hits.push(path.relative(PROJECT_ROOT, fp));
    }
  }

  return hits;
}

function scanImgMissingAlt(files) {
  const hits = [];
  const imgTagRe = /<img\b[^>]*>/g;
  const hasAltRe = /\balt\s*=/i;

  for (const fp of files) {
    const txt = readText(fp);
    if (!txt) continue;
    const matches = txt.match(imgTagRe);
    if (!matches || !matches.length) continue;
    const hasAnyMissing = matches.some((tag) => !hasAltRe.test(tag));
    if (hasAnyMissing) hits.push(path.relative(PROJECT_ROOT, fp));
  }

  return hits;
}

function main() {
  const loadedEnvFiles = loadEnv();

  const srcDir = path.join(PROJECT_ROOT, 'src');
  const apiSrcDir = path.join(PROJECT_ROOT, 'api', '_src');

  const srcFiles = exists(srcDir)
    ? walkFiles(srcDir, new Set(['.ts', '.tsx', '.js', '.jsx']))
    : [];
  const apiFiles = exists(apiSrcDir)
    ? walkFiles(apiSrcDir, new Set(['.ts', '.js']))
    : [];

  const allScannedFiles = [...srcFiles, ...apiFiles];
  const refs = extractEnvRefs(allScannedFiles);

  // HospoGo-specific required keys for a real production deploy.
  // In --local mode, we still report these, but we don't fail the run on missing values.
  const prodRequiredEnv = [
    // Frontend Firebase (Vite)
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',

    // Payments
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY',

    // Maps
    'VITE_GOOGLE_MAPS_API_KEY',

    // Google sign-in (OAuth direct + demo)
    'VITE_GOOGLE_CLIENT_ID',
  ];

  const prodOptionalEnv = [
    'VITE_FIREBASE_MEASUREMENT_ID',
    'STRIPE_WEBHOOK_SECRET',
    'VITE_GOOGLE_REDIRECT_URI',
  ];

  const normalizedRequired = prodRequiredEnv;
  const dbOk = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

  const envCheck = checkEnv(normalizedRequired, prodOptionalEnv);
  if (!dbOk) envCheck.missingRequired.unshift('DATABASE_URL or POSTGRES_URL');

  // Detect suspicious production values.
  const suspicious = [];
  if (!isLocalMode) {
    if (isTruthy(process.env.VITE_E2E)) {
      suspicious.push('VITE_E2E is enabled (should never be on in production)');
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (stripeSecret && String(stripeSecret).startsWith('sk_test_')) {
      suspicious.push('STRIPE_SECRET_KEY is a test key (sk_test_...)');
    }

    const stripePub = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripePub && String(stripePub).startsWith('pk_test_')) {
      suspicious.push('VITE_STRIPE_PUBLISHABLE_KEY is a test key (pk_test_...)');
    }
  }

  // Backend Firebase Admin env sanity: Vercel typically needs explicit credentials.
  const hasFirebaseServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  const hasFirebaseSplitCreds =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY;

  if (!isLocalMode && !hasFirebaseServiceAccount && !hasFirebaseSplitCreds) {
    envCheck.missingRequired.push(
      'FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)'
    );
  }

  // Static scans
  const debuggerHits = scanForPattern(allScannedFiles, /\bdebugger\b/, {});

  const consoleLogHits = scanForPattern(
    srcFiles,
    /\bconsole\.log\s*\(/,
    {
      ignoreFiles: ['src/lib/logger.ts'],
    }
  );

  const hardcodedGoogleClientIdFallback = scanForPattern(
    [path.join(PROJECT_ROOT, 'src', 'lib', 'google-oauth-direct.ts')].filter(exists),
    /VITE_GOOGLE_CLIENT_ID\s*\|\|\s*['"][^'"]+\.apps\.googleusercontent\.com['"]/,
    {}
  );

  const imgMissingAltHits = scanImgMissingAlt(srcFiles);

  // “Referenced but unset” warnings: anything referenced via import.meta.env/process.env.
  const defined = getDefinedEnvKeys();
  const referencedButUnsetVite = refs.viteKeys.filter((k) => !defined.has(k));
  const referencedButUnsetNode = refs.nodeKeys.filter((k) => !defined.has(k));

  // Build report
  const failures = [];

  if (debuggerHits.length) {
    failures.push({ type: 'debugger_statements', items: debuggerHits });
  }

  if (!isLocalMode && suspicious.length) {
    failures.push({ type: 'suspicious_production_settings', items: suspicious });
  }

  const warnings = [];

  // In prod mode we fail on missing required env; in local mode we only warn.
  if (envCheck.missingRequired.length) {
    const bucket = isLocalMode ? warnings : failures;
    bucket.push({
      type: 'missing_required_env',
      items: envCheck.missingRequired,
    });
  }

  if (envCheck.missingOptional.length) {
    warnings.push({ type: 'missing_optional_env', items: envCheck.missingOptional });
  }

  if (consoleLogHits.length) {
    warnings.push({
      type: 'console_log_in_frontend',
      items: consoleLogHits,
    });
  }

  if (hardcodedGoogleClientIdFallback.length) {
    warnings.push({
      type: 'hardcoded_google_client_id_fallback',
      items: hardcodedGoogleClientIdFallback,
    });
  }

  if (imgMissingAltHits.length) {
    warnings.push({
      type: 'img_missing_alt',
      items: imgMissingAltHits,
    });
  }

  // Keep this as a warning because many envs are injected only in hosting.
  const referencedButUnset = {
    vite: referencedButUnsetVite,
    node: referencedButUnsetNode,
  };

  if (referencedButUnset.vite.length || referencedButUnset.node.length) {
    warnings.push({
      type: 'env_referenced_but_unset_in_this_shell',
      items: {
        vite: referencedButUnset.vite,
        node: referencedButUnset.node,
      },
    });
  }

  const report = {
    mode: isLocalMode ? 'local' : 'prod',
    loadedEnvFiles,
    scannedFileCounts: {
      src: srcFiles.length,
      api: apiFiles.length,
    },
    failures,
    warnings,
  };

  if (isJson) {
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\n');
  } else {
    console.log('HospoGo Pre-Flight');
    console.log(`Mode: ${report.mode}`);
    if (loadedEnvFiles.length) {
      console.log(`Loaded env files: ${loadedEnvFiles.join(', ')}`);
    } else {
      console.log('Loaded env files: (none)');
    }
    console.log(`Scanned files: src=${srcFiles.length}, api/_src=${apiFiles.length}`);

    if (failures.length) {
      console.log('\n❌ FAILURES');
      for (const f of failures) {
        console.log(`- ${f.type}`);
        if (Array.isArray(f.items)) {
          for (const it of f.items) console.log(`  - ${it}`);
        } else {
          console.log(`  - ${JSON.stringify(f.items)}`);
        }
      }
    }

    if (warnings.length) {
      console.log('\n⚠️  WARNINGS');
      for (const w of warnings) {
        console.log(`- ${w.type}`);
        if (Array.isArray(w.items)) {
          for (const it of w.items) console.log(`  - ${it}`);
        } else {
          console.log(`  - ${JSON.stringify(w.items)}`);
        }
      }
    }

    if (!failures.length) {
      console.log('\n✅ Pre-flight checks passed');
    }
  }

  process.exit(failures.length ? 1 : 0);
}

main();
