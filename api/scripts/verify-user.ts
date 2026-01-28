/**
 * Verify User in DB
 *
 * Checks whether a user exists in the `users` table by email.
 * Use this to debug onboarding loops when Firebase UID exists but profile fetch fails.
 *
 * Usage (from repo root):
 *   npx tsx api/scripts/verify-user.ts <email>
 *
 * Example:
 *   npx tsx api/scripts/verify-user.ts julian.g.roberts@gmail.com
 *
 * If the user is missing:
 * - POST /api/register may be failing (check API logs for REGISTER ERROR).
 * - Frontend may not be sending Authorization: Bearer <token> or body { email, name }.
 * - Auth middleware auto-creates on /api/me when token is valid; if /api/me returns 401
 *   before that, the user never gets created.
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const apiDir = path.resolve(__dirname, '..');

// Load env: api/.env first (Neon/production DB), then repo root .env. Prefer api DATABASE_URL so
// verify works against the same DB the API uses when run from api/ or when api/.env exists.
dotenv.config({ path: path.resolve(apiDir, '.env') });
dotenv.config({ path: path.resolve(repoRoot, '.env') });

const LOCAL_DB_DEFAULT = 'postgresql://postgres:postgres@localhost:5432/hospogo';
const dbUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
const looksPlaceholder =
  !dbUrl ||
  /your_actual_db_connection_string|placeholder|your.*connection.*string/i.test(dbUrl) ||
  (dbUrl.includes('user:password@localhost') && dbUrl.includes('hospogo'));

if (looksPlaceholder) {
  process.env.DATABASE_URL = LOCAL_DB_DEFAULT;
  console.log(`[verify-user] Using local DB default: ${LOCAL_DB_DEFAULT.replace(/:[^:@]+@/, ':****@')}\n`);
}

import * as usersRepo from '../_src/repositories/users.repository.js';

async function verifyUser(email: string) {
  console.log(`\n🔍 Checking users table for: ${email}\n`);

  try {
    const user = await usersRepo.getUserByEmail(email);

    if (!user) {
      console.log(`❌ User NOT found in DB: ${email}`);
      console.log('\n💡 Next steps:');
      console.log('   1. Check API logs for [REGISTER ERROR] or [GET /api/me DEBUG] when this user signs in.');
      console.log('   2. Ensure POST /api/register is called with Authorization: Bearer <firebase-id-token> and body { email, name }.');
      console.log('   3. Auth middleware auto-creates users on GET /api/me when token is valid and user missing; verify token and FIREBASE_PROJECT_ID.');
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   id: ${user.id}`);
    console.log(`   email: ${user.email}`);
    console.log(`   name: ${user.name}`);
    console.log(`   role: ${user.role}`);
    console.log(`   firebase_uid: ${(user as any).firebaseUid ?? (user as any).firebase_uid ?? 'null'}`);
    console.log(`   is_onboarded: ${(user as any).isOnboarded ?? 'n/a'}`);
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    const cause = error?.cause?.message ?? error?.cause;
    const detail = cause ? ` (cause: ${cause})` : '';
    console.error('❌ Error looking up user:', msg + detail);
    if (error?.stack && process.env.DEBUG) console.error(error.stack);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Email required');
  console.log('\nUsage: npx tsx api/scripts/verify-user.ts <email>');
  console.log('Example: npx tsx api/scripts/verify-user.ts julian.g.roberts@gmail.com');
  process.exit(1);
}

verifyUser(email)
  .then(() => {
    console.log('\n✨ Done\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
