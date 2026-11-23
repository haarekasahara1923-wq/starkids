const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const tenants = await pool.query('SELECT id, name, slug FROM "Tenant"');
    console.log('Tenants:', tenants.rows);

    const courses = await pool.query('SELECT id, name, fees, subjects, "tenantId", "isActive", "createdAt", "updatedAt" FROM "Course" ORDER BY "tenantId", "name"');
    console.log('Courses count:', courses.rows.length);
    console.log('Courses:', JSON.stringify(courses.rows, null, 2));

    const students = await pool.query('SELECT "tenantId", count(*) FROM "Student" GROUP BY "tenantId"');
    console.log('Students by tenant:', students.rows);

    const studentClasses = await pool.query(`
      SELECT "tenantId", "firstAdmissionClass", count(*) 
      FROM "Student" 
      GROUP BY "tenantId", "firstAdmissionClass" 
      ORDER BY "tenantId", "firstAdmissionClass"
    `);
    console.log('Student classes breakdown:', studentClasses.rows);

    const studentCourseIds = await pool.query(`
      SELECT s."tenantId", s."courseId", c.name as course_name, c.fees, count(*)
      FROM "Student" s
      LEFT JOIN "Course" c ON s."courseId" = c.id
      GROUP BY s."tenantId", s."courseId", c.name, c.fees
      ORDER BY s."tenantId", c.name
    `);
    console.log('Student current courseId mapping:', studentCourseIds.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
