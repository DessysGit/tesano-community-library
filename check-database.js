#!/usr/bin/env node

/**
 * Database Connection Checker
 * 
 * Run this to diagnose your database connection issue:
 * node check-database.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Database Connection Checker\n');
console.log('='.repeat(50));

// Check if DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.log('❌ ERROR: DATABASE_URL not found in .env file');
  console.log('\nPlease add to your .env file:');
  console.log('DATABASE_URL=postgresql://user:password@host:port/database\n');
  process.exit(1);
}

// Show DATABASE_URL format (hide password)
const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
console.log('✓ DATABASE_URL found:', maskedUrl);

// Parse connection details
try {
  const url = new URL(process.env.DATABASE_URL.replace('postgres://', 'postgresql://'));
  console.log('\n📋 Connection Details:');
  console.log('   Protocol:', url.protocol);
  console.log('   Host:', url.hostname);
  console.log('   Port:', url.port || '5432');
  console.log('   Database:', url.pathname.slice(1));
  console.log('   Username:', url.username);
} catch (err) {
  console.log('❌ ERROR: Invalid DATABASE_URL format');
  console.log('   Format should be: postgresql://user:password@host:port/database\n');
  process.exit(1);
}

// Test connection
console.log('\n🔌 Testing connection...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  // Keepalive to prevent ECONNRESET
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

async function testConnection() {
  let client;
  try {
    console.log('   Attempting to connect...');
    client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful!');
    console.log('   Server time:', result.rows[0].now);
    
    client.release();
    
    console.log('\n✅ Your database connection is working!');
    console.log('   You can now start your server with: node server.js\n');
    process.exit(0);
    
  } catch (err) {
    if (client) {
      try { client.release(); } catch (e) {}
    }
    
    console.log('❌ Connection failed!');
    console.log('\n🔍 Error details:');
    console.log('   Code:', err.code);
    console.log('   Message:', err.message);
    
    console.log('\n💡 Possible solutions:');
    
    if (err.code === 'ECONNREFUSED') {
      console.log('   - PostgreSQL is not running');
      console.log('   - Check if service is started (services.msc on Windows)');
      console.log('   - Verify port 5432 is correct');
    } else if (err.code === 'ENOTFOUND') {
      console.log('   - Host name is incorrect in DATABASE_URL');
      console.log('   - Check network connection');
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      console.log('   - Connection is timing out or being reset');
      console.log('   - PostgreSQL may be overloaded');
      console.log('   - Try a cloud database (Neon, Supabase)');
      console.log('   - Check firewall settings');
    } else if (err.message.includes('authentication failed')) {
      console.log('   - Username or password is incorrect');
      console.log('   - Check credentials in DATABASE_URL');
    } else if (err.message.includes('database') && err.message.includes('does not exist')) {
      console.log('   - Database name is incorrect');
      console.log('   - Create database first: createdb your_db_name');
    } else {
      console.log('   - Check DATABASE_URL format');
      console.log('   - Ensure PostgreSQL is running');
      console.log('   - See DATABASE_TROUBLESHOOTING.md for more help');
    }
    
    console.log('\n📖 Read DATABASE_TROUBLESHOOTING.md for detailed solutions\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
