const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const s = await pool.query('SELECT "totalFee", count(*) FROM "Student" WHERE "tenantId" = \'cmvxi2wdk000008l8urk1iziu\' GROUP BY "totalFee"');
    console.log('Students totalFee distribution in cmvxi2wdk000008l8urk1iziu:', s.rows);

    const sTemplate = await pool.query('SELECT "totalFee", count(*) FROM "Student" WHERE "tenantId" = \'tenant_starkids\' GROUP BY "totalFee"');
    console.log('Students totalFee distribution in tenant_starkids:', sTemplate.rows);

    const allC = await pool.query('SELECT id, name, fees, subjects, "tenantId" FROM "Course" ORDER BY "tenantId", name');
    console.log('\nAll courses in database:');
    allC.rows.forEach(c => console.log(`[${c.tenantId}] ${c.id} | ${c.name} | Fees: ${c.fees} | Subjects (${c.subjects?.length}): ${c.subjects?.join(', ')}`));

    // Also check Fee records if any exist for students
    const feeRecords = await pool.query('SELECT count(*), status FROM "Fee" GROUP BY status');
    console.log('\nExisting Fee records:', feeRecords.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
