/**
 * Data Seeding Script
 * 
 * Pre-fills the database with sample shifts and jobs for new users
 * to ensure they don't see empty calendars on first login.
 * 
 * Usage:
 *   tsx scripts/seed-data.ts [userId]
 * 
 * If userId is not provided, seeds data for all business users.
 */

// Load environment variables first
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file from current directory (api/.env)
dotenv.config();
// Also try loading from parent directory (root .env) if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

import { getDb } from '../_src/db/index.js';
import { users } from '../_src/db/schema/users.js';
import { shifts } from '../_src/db/schema/shifts.js';
import { jobs } from '../_src/db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

interface SeedOptions {
  userId?: string;
  daysAhead?: number;
  shiftsPerWeek?: number;
}

/**
 * Generate sample shifts for a business user
 */
async function seedShiftsForUser(
  userId: string,
  options: SeedOptions = {}
): Promise<number> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { daysAhead = 30, shiftsPerWeek = 3 } = options;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shiftsToCreate: Array<{
    employerId: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    hourlyRate: string;
    status: 'draft' | 'open' | 'filled';
    location?: string;
  }> = [];

    // Generate shifts for the next N days
  for (let day = 0; day < daysAhead; day++) {
    const shiftDate = new Date(today);
    shiftDate.setDate(today.getDate() + day);
    shiftDate.setHours(0, 0, 0, 0);

    // Skip Sundays (day 0)
    if (shiftDate.getDay() === 0) continue;

    // Create shifts on specific days (e.g., Tuesday, Thursday, Saturday)
    const dayOfWeek = shiftDate.getDay();
    const shouldCreateShift = 
      dayOfWeek === 2 || // Tuesday
      dayOfWeek === 4 || // Thursday
      dayOfWeek === 6;   // Saturday

    if (shouldCreateShift) {
      // Morning shift: 9 AM - 1 PM
      const morningStart = new Date(shiftDate);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(shiftDate);
      morningEnd.setHours(13, 0, 0, 0);

      shiftsToCreate.push({
        employerId: userId,
        title: 'Morning Shift',
        description: 'Looking for an experienced barber for morning shift. Great opportunity to build client relationships.',
        startTime: morningStart,
        endTime: morningEnd,
        hourlyRate: '25.00',
        status: dayOfWeek === 6 ? 'open' : 'draft', // Saturday shifts are open, others are draft
        location: '123 Main Street, Melbourne VIC 3000',
      });

      // Afternoon shift: 2 PM - 6 PM (only on Saturday)
      if (dayOfWeek === 6) {
        const afternoonStart = new Date(shiftDate);
        afternoonStart.setHours(14, 0, 0, 0);
        const afternoonEnd = new Date(shiftDate);
        afternoonEnd.setHours(18, 0, 0, 0);

        shiftsToCreate.push({
          employerId: userId,
          title: 'Weekend Afternoon Shift',
          description: 'Weekend afternoon shift. High foot traffic expected.',
          startTime: afternoonStart,
          endTime: afternoonEnd,
          hourlyRate: '28.00',
          status: 'open',
          location: '123 Main Street, Melbourne VIC 3000',
        });
      }
    }
  }

  // Insert shifts
  if (shiftsToCreate.length > 0) {
    await db.insert(shifts).values(shiftsToCreate);
    console.log(`✅ Created ${shiftsToCreate.length} shifts for user ${userId}`);
    return shiftsToCreate.length;
  }

  return 0;
}

/**
 * Generate sample jobs for a business user
 */
async function seedJobsForUser(
  userId: string,
  options: SeedOptions = {}
): Promise<number> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { daysAhead = 30 } = options;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobsToCreate: Array<{
    businessId: string;
    title: string;
    payRate: string;
    description: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: 'open' | 'filled';
    role: 'barber' | 'stylist' | 'colorist';
    shopName?: string;
    address?: string;
    city?: string;
    state?: string;
  }> = [];

  // Generate jobs for next few Saturdays
  for (let week = 0; week < 4; week++) {
    const jobDate = new Date(today);
    // Find next Saturday
    const daysUntilSaturday = (6 - jobDate.getDay() + 7) % 7 || 7;
    jobDate.setDate(today.getDate() + daysUntilSaturday + (week * 7));
    jobDate.setHours(0, 0, 0, 0);

    jobsToCreate.push({
      businessId: userId,
      title: 'Weekend Barber Needed',
      payRate: '30.00',
      description: 'Looking for an experienced barber for Saturday shift. Must have 2+ years experience. Great team environment.',
      date: jobDate,
      startTime: '09:00:00',
      endTime: '17:00:00',
      status: 'open',
      role: 'barber',
      shopName: 'Elite Barbershop',
      address: '123 Main Street',
      city: 'Melbourne',
      state: 'VIC',
    });
  }

  // Insert jobs
  if (jobsToCreate.length > 0) {
    await db.insert(jobs).values(jobsToCreate);
    console.log(`✅ Created ${jobsToCreate.length} jobs for user ${userId}`);
    return jobsToCreate.length;
  }

  return 0;
}

/**
 * Main seeding function
 */
async function seedData(options: SeedOptions = {}) {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  console.log('🌱 Starting data seeding...\n');

  try {
    let businessUsers;

    if (options.userId) {
      // Seed for specific user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, options.userId))
        .limit(1);

      if (!user) {
        throw new Error(`User ${options.userId} not found`);
      }

      // Check if user has business role (roles is a string array in PostgreSQL)
      const userRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
      if (!userRoles.includes('business')) {
        throw new Error(`User ${options.userId} is not a business user`);
      }

      businessUsers = [user];
    } else {
      // Seed for all business users (roles is an array, so we use SQL to check)
      businessUsers = await db
        .select()
        .from(users)
        .where(sql`'business' = ANY(${users.roles})`);

      if (businessUsers.length === 0) {
        console.log('⚠️  No business users found. Skipping seeding.');
        return;
      }
    }

    console.log(`📊 Found ${businessUsers.length} business user(s)\n`);

    let totalShifts = 0;
    let totalJobs = 0;

    for (const user of businessUsers) {
      console.log(`👤 Seeding data for: ${user.email} (${user.id})`);

      // Check if user already has shifts/jobs
      const existingShifts = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.employerId, user.id),
            gte(shifts.startTime, new Date())
          )
        )
        .limit(1);

      const existingJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.businessId, user.id),
            gte(jobs.date, new Date())
          )
        )
        .limit(1);

      if (existingShifts.length > 0 || existingJobs.length > 0) {
        console.log(`   ⏭️  User already has data. Skipping...\n`);
        continue;
      }

      // Seed shifts
      const shiftsCreated = await seedShiftsForUser(user.id, options);
      totalShifts += shiftsCreated;

      // Seed jobs
      const jobsCreated = await seedJobsForUser(user.id, options);
      totalJobs += jobsCreated;

      console.log('');
    }

    console.log('✅ Seeding complete!');
    console.log(`   📅 Created ${totalShifts} shifts`);
    console.log(`   💼 Created ${totalJobs} jobs`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed-data')) {
  const userId = process.argv[2];
  const daysAhead = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  const shiftsPerWeek = process.argv[4] ? parseInt(process.argv[4]) : undefined;

  seedData({
    userId,
    daysAhead,
    shiftsPerWeek,
  })
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedData, seedShiftsForUser, seedJobsForUser };

