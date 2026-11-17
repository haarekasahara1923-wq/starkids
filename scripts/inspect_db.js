const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const t = await pool.query('SELECT id, name, slug FROM "Tenant"');
    console.log('Tenants:', t.rows);
    const u = await pool.query('SELECT id, email, role, "tenantId", "updatedAt" FROM "User"');
    console.log('Users:', u.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
