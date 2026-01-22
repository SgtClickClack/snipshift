/**
 * List Users Script
 * 
 * Run with: npx tsx list-users.ts
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load DATABASE_URL from api/.env
dotenv.config({ path: path.join(__dirname, 'api', '.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL?.trim().replace(/\\n/g, '');
  
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // First, get the distinct roles to understand the enum
    const rolesResult = await client.query(`
      SELECT DISTINCT role::text FROM users ORDER BY role
    `);
    console.log('\n🔑 Available roles:', rolesResult.rows.map(r => r.role).join(', '));
    
    const proResult = await client.query(`
      SELECT email, name, role::text FROM users 
      WHERE role::text = 'professional'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Professional Users (Workers):');
    if (proResult.rows.length === 0) {
      console.log('   (No professional users found)');
    } else {
      proResult.rows.forEach((u, i) => 
        console.log(`   ${i+1}. ${u.email} (${u.name || 'No name'})`)
      );
    }
    
    const bizResult = await client.query(`
      SELECT email, name, role::text FROM users 
      WHERE role::text IN ('business', 'hub')
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n🏢 Business Users (Venues):');
    if (bizResult.rows.length === 0) {
      console.log('   (No business users found)');
    } else {
      bizResult.rows.forEach((u, i) => 
        console.log(`   ${i+1}. ${u.email} (${u.name || 'No name'})`)
      );
    }
    
    console.log('\n✅ To verify a user as Productivity Ready, run:');
    console.log('   npx tsx verify-test-user.ts <email>\n');
    
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
