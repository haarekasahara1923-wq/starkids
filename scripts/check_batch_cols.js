const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const cols = await pool.query(`
      SELECT table_name, column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE column_name = 'batchId'
      ORDER BY table_name
    `);
    console.log('batchId columns in database:');
    console.table(cols.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

check();
