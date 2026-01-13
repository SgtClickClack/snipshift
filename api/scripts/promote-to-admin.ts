/**
 * Promote User to Admin Script
 * 
 * Promotes a user account to admin role by email address.
 * 
 * Usage:
 *   npx tsx api/scripts/promote-to-admin.ts <email>
 * 
 * Example:
 *   npx tsx api/scripts/promote-to-admin.ts admin@hospogo.com
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { getDb } from '../_src/db/index.js';
import { users } from '../_src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import * as usersRepo from '../_src/repositories/users.repository.js';

async function promoteToAdmin(email: string) {
  console.log(`\n🔧 Promoting user to admin: ${email}\n`);

  try {
    // Find user by email
    const user = await usersRepo.getUserByEmail(email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Make sure the user exists in the database first.');
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`✅ User ${email} is already an admin.`);
      return;
    }

    // Update user to admin role
    const updatedUser = await usersRepo.updateUser(user.id, {
      role: 'admin',
      roles: ['admin'],
    });

    if (updatedUser) {
      console.log(`✅ Successfully promoted ${email} to admin!`);
      console.log(`   User ID: ${updatedUser.id}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Role: ${updatedUser.role}`);
    } else {
      console.error(`❌ Failed to update user role.`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error promoting user to admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address is required');
  console.log('\nUsage:');
  console.log('  npx tsx api/scripts/promote-to-admin.ts <email>');
  console.log('\nExample:');
  console.log('  npx tsx api/scripts/promote-to-admin.ts admin@hospogo.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Run the promotion
promoteToAdmin(email)
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
