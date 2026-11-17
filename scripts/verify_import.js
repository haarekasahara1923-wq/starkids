const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function verify() {
  try {
    const res1 = await pool.query('SELECT count(*) FROM "Student" WHERE "tenantId" = \'cmvxi2wdk000008l8urk1iziu\'');
    console.log('Total students in tenant cmvxi2wdk000008l8urk1iziu:', res1.rows[0].count);

    const res2 = await pool.query('SELECT count(*) FROM "Student" WHERE "tenantId" = \'tenant_starkids\'');
    console.log('Total students in tenant tenant_starkids:', res2.rows[0].count);

    const samples = await pool.query(`
      SELECT "scholarNo", "fullName", "fatherName", "motherName", phone, "parentPhone", caste, medium, address,
             to_char(dob, 'YYYY-MM-DD') as dob, "dobInWords", "firstAdmissionClass", "aadhaarNo", "samagraId", "penId", "bankName"
      FROM "Student"
      WHERE "tenantId" = 'cmvxi2wdk000008l8urk1iziu' AND "scholarNo" IN ('281', '284', '306')
    `);
    console.log('Sample rows:\n', JSON.stringify(samples.rows, null, 2));

    // Check class-wise count
    const classCounts = await pool.query(`
      SELECT c.name as class_name, count(s.id) as student_count
      FROM "Student" s
      JOIN "Course" c ON s."courseId" = c.id
      WHERE s."tenantId" = 'cmvxi2wdk000008l8urk1iziu'
      GROUP BY c.name
      ORDER BY c.name
    `);
    console.log('Class-wise distribution:\n', classCounts.rows);
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verify();
