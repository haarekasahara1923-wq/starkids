const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function verify() {
  try {
    const mismatch = await pool.query(`
      SELECT s.id, s."fullName", s."scholarNo", s."firstAdmissionClass", c.name as course_name, c.fees, s."totalFee", s."tenantId"
      FROM "Student" s
      JOIN "Course" c ON s."courseId" = c.id
      WHERE s."tenantId" = 'cmvxi2wdk000008l8urk1iziu'
      ORDER BY s.id
    `);
    console.log('Total students checked in main tenant:', mismatch.rows.length);
    
    // Check if any student firstAdmissionClass doesn't align with course_name
    let mismatchCount = 0;
    mismatch.rows.forEach(r => {
      const adm = (r.firstAdmissionClass || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const crs = (r.course_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = adm.includes(crs) || crs.includes(adm) || 
                    (adm === '1st' && crs === 'class1') ||
                    (adm === '2nd' && crs === 'class2') ||
                    (adm === '3rd' && crs === 'class3') ||
                    (adm === '4th' && crs === 'class4') ||
                    (adm === '5th' && crs === 'class5') ||
                    (adm === '6th' && crs === 'class6') ||
                    (adm === '7th' && crs === 'class7') ||
                    (adm === '8th' && crs === 'class8') ||
                    (adm === 'lkg' && crs === 'lkg') ||
                    (adm === 'ukg' && crs === 'ukg') ||
                    (adm === 'nursery' && crs === 'nursery');
      if (!match) {
        console.log('MISMATCH:', r);
        mismatchCount++;
      }
    });
    console.log('Mismatches found:', mismatchCount);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verify();
