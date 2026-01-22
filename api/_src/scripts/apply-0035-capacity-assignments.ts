/**
 * Apply 0035_add_shift_capacity_and_assignments.sql
 * Run from api/: npx tsx _src/scripts/apply-0035-capacity-assignments.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../db/connection.js';

dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

const FILE = '0035_add_shift_capacity_and_assignments.sql';

async function main() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed. Check DATABASE_URL or POSTGRES_URL.');
    process.exit(1);
  }

  const p = path.resolve(process.cwd(), `_src/db/migrations/${FILE}`);
  if (!fs.existsSync(p)) {
    console.error('❌ Not found:', p);
    process.exit(1);
  }

  const sql = fs.readFileSync(p, 'utf-8');
  const statements: string[] = [];
  let current = '';
  for (const line of sql.split('\n')) {
    if (line.trim().startsWith('--')) continue;
    current += line + '\n';
    if (line.trim().endsWith(';')) {
      const s = current.trim();
      if (s) statements.push(s);
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  console.log(`📦 Applying ${FILE} (${statements.length} statements)\n`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    const first = stmt.split(/\s+/)[0]?.toUpperCase() || '?';
    try {
      await pool.query(stmt);
      console.log(`   ✓ [${i + 1}/${statements.length}] ${first}`);
    } catch (e: any) {
      if (e?.code === '42P07' || e?.code === '42710' || e?.message?.includes('already exists')) {
        console.log(`   ⚠ [${i + 1}/${statements.length}] ${first} - already exists`);
      } else {
        console.error(`   ❌ [${i + 1}/${statements.length}] ${first}:`, e?.message || e);
        process.exit(1);
      }
    }
  }
  console.log('\n✅ 0035 migration applied.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
