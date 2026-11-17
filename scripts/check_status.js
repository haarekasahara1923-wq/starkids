const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const r = await pool.query('SELECT "tenantId", count(*) FROM "Student" GROUP BY "tenantId"');
    console.log('Student counts by tenant:', r.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

check();
