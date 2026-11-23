const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function syncAndMap() {
  try {
    console.log('Connecting to database...');

    const MAIN_TENANT = 'cmvxi2wdk000008l8urk1iziu';
    const TEMPLATE_TENANT = 'tenant_starkids';

    // 1. Fetch updated courses from main school tenant
    const mainCoursesRes = await pool.query(
      `SELECT id, name, fees, subjects, "installmentCount" 
       FROM "Course" 
       WHERE "tenantId" = $1 
       ORDER BY name`,
      [MAIN_TENANT]
    );

    console.log(`Found ${mainCoursesRes.rows.length} updated courses in main tenant:`);
    mainCoursesRes.rows.forEach(c => {
      console.log(` - ${c.name}: Fee ₹${c.fees}, Subjects: [${c.subjects?.join(', ')}]`);
    });

    // 2. Synchronize fees & subjects to template tenant (tenant_starkids)
    console.log('\nSynchronizing template tenant courses...');
    const templateCoursesRes = await pool.query(
      `SELECT id, name FROM "Course" WHERE "tenantId" = $1`,
      [TEMPLATE_TENANT]
    );

    // Map helper
    function normalize(name) {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/class/g, '')
        .replace(/\./g, '')
        .replace(/st|nd|rd|th/g, '')
        .replace(/\s+/g, '')
        .trim();
    }

    for (const tC of templateCoursesRes.rows) {
      const tNorm = normalize(tC.name);
      const matchedMain = mainCoursesRes.rows.find(m => normalize(m.name) === tNorm);
      if (matchedMain) {
        await pool.query(
          `UPDATE "Course" 
           SET fees = $1, subjects = $2, "installmentCount" = $3, "updatedAt" = NOW() 
           WHERE id = $4`,
          [matchedMain.fees, matchedMain.subjects, matchedMain.installmentCount, tC.id]
        );
        console.log(`Updated template course "${tC.name}" -> Fee: ₹${matchedMain.fees}, Subjects: ${matchedMain.subjects?.length}`);
      }
    }

    // 3. Update all students' totalFee based on their mapped course fees
    console.log('\nUpdating student totalFee across all tenants...');

    // Main tenant update
    const updateMainRes = await pool.query(`
      UPDATE "Student" s
      SET "totalFee" = c.fees + COALESCE(s."previousDueFee", 0),
          "updatedAt" = NOW()
      FROM "Course" c
      WHERE s."courseId" = c.id
        AND s."tenantId" = $1
    `, [MAIN_TENANT]);
    console.log(`Updated totalFee for students in main tenant: ${updateMainRes.rowCount} records`);

    // Template tenant update
    const updateTemplateRes = await pool.query(`
      UPDATE "Student" s
      SET "totalFee" = c.fees + COALESCE(s."previousDueFee", 0),
          "updatedAt" = NOW()
      FROM "Course" c
      WHERE s."courseId" = c.id
        AND s."tenantId" = $1
    `, [TEMPLATE_TENANT]);
    console.log(`Updated totalFee for students in template tenant: ${updateTemplateRes.rowCount} records`);

    // 4. Update any pending Fee installment records that were 0
    console.log('\nUpdating Fee installments for students...');
    const updateFeesRes = await pool.query(`
      UPDATE "Fee" f
      SET amount = ROUND(c.fees / GREATEST(1, c."installmentCount")),
          "updatedAt" = NOW()
      FROM "Student" s
      JOIN "Course" c ON s."courseId" = c.id
      WHERE f."studentId" = s.id
        AND f.status = 'PENDING'
        AND f.amount = 0
        AND c.fees > 0
    `);
    console.log(`Updated pending Fee records: ${updateFeesRes.rowCount} rows`);

    // 5. Verification: Check fee distribution and course subjects for students
    console.log('\n--- VERIFICATION REPORT ---');
    const verifyFees = await pool.query(`
      SELECT c.name as class_name, c.fees as course_fee, array_length(c.subjects, 1) as subjects_count,
             count(s.id) as student_count, AVG(s."totalFee") as avg_student_fee
      FROM "Student" s
      JOIN "Course" c ON s."courseId" = c.id
      WHERE s."tenantId" = $1
      GROUP BY c.name, c.fees, c.subjects
      ORDER BY c.fees, c.name
    `, [MAIN_TENANT]);

    console.log('Main School Tenant Students & Fees by Class:');
    console.table(verifyFees.rows);

  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

syncAndMap();
