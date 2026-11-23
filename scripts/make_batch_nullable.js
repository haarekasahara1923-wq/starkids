const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log('Altering tables to make batchId nullable...');
    await pool.query('ALTER TABLE "Exam" ALTER COLUMN "batchId" DROP NOT NULL;');
    console.log('Exam.batchId is now nullable!');
    await pool.query('ALTER TABLE "AdmitCardEvent" ALTER COLUMN "batchId" DROP NOT NULL;');
    console.log('AdmitCardEvent.batchId is now nullable!');
    await pool.query('ALTER TABLE "Homework" ALTER COLUMN "batchId" DROP NOT NULL;');
    console.log('Homework.batchId is now nullable!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
