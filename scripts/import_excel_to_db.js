const { Client } = require('pg');
const xlsx = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const EXCEL_PATH = 'C:/Users/baba/.gemini/antigravity/brain/a124be96-c06b-444d-a4bf-212c9253a4a6/.user_uploaded/media_1794895541106_28dabce0.xlsx';

function generateCuid() {
  return 'c' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
}

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000);
  }
  const s = String(val).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? (Number(y) > 50 ? 1900 + Number(y) : 2000 + Number(y)) : Number(y);
    return new Date(Date.UTC(year, Number(mo) - 1, Number(d)));
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const daysWords = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second', 'Twenty Third', 'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh', 'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First'];
const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function convertDateToWords(date) {
  if (!date || isNaN(date.getTime())) return null;
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();

  let yearWord = '';
  if (y < 2000) {
    const f = Math.floor(y / 100);
    const s = y % 100;
    yearWord = (f < 20 ? ones[f] : tens[Math.floor(f / 10)] + (f % 10 ? ' ' + ones[f % 10] : '')) + ' Hundred';
    if (s > 0) yearWord += ' ' + (s < 20 ? ones[s] : tens[Math.floor(s / 10)] + (s % 10 ? ' ' + ones[s % 10] : ''));
  } else {
    const thousands = Math.floor(y / 1000);
    const rem = y % 1000;
    yearWord = ones[thousands] + ' Thousand';
    if (rem > 0) {
      if (rem < 20) yearWord += ' ' + ones[rem];
      else if (rem < 100) yearWord += ' ' + tens[Math.floor(rem / 10)] + (rem % 10 ? ' ' + ones[rem % 10] : '');
      else {
        const h = Math.floor(rem / 100);
        const r2 = rem % 100;
        yearWord += ' ' + ones[h] + ' Hundred';
        if (r2 > 0) yearWord += ' ' + (r2 < 20 ? ones[r2] : tens[Math.floor(r2 / 10)] + (r2 % 10 ? ' ' + ones[r2 % 10] : ''));
      }
    }
  }
  return `${daysWords[d] || d} ${months[m] || ''} ${yearWord}`.trim();
}

function cleanId(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).replace(/[-\s]/g, '').trim();
  return s || null;
}

function cleanText(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s || null;
}

function cleanPhone(val) {
  if (!val) return '0000000000';
  const s = String(val).replace(/[-\s]/g, '').trim();
  return s || '0000000000';
}

async function run() {
  // Use UNPOOLED direct connection for reliable bulk writes without idle timeouts
  const connStr = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Connected to Neon PostgreSQL directly!');

    // 1. Get tenants
    const tenantsRes = await client.query('SELECT id, name FROM "Tenant"');
    console.log('Tenants:', tenantsRes.rows);
    const targetTenants = tenantsRes.rows.map(t => t.id);

    // 2. Read Excel
    const wb = xlsx.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Excel loaded: ${rawData.length} rows.`);

    // Classes needed
    const classList = ['Nursery', 'L.K.G', 'U.K.G', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

    // 3. Ensure courses exist
    const courseMapByTenant = {};
    for (const tenantId of targetTenants) {
      courseMapByTenant[tenantId] = {};
      const existingCourses = await client.query('SELECT id, name FROM "Course" WHERE "tenantId" = $1', [tenantId]);
      for (const row of existingCourses.rows) {
        courseMapByTenant[tenantId][row.name.toLowerCase().trim()] = row.id;
      }

      for (const cls of classList) {
        const key = cls.toLowerCase().trim();
        if (!courseMapByTenant[tenantId][key]) {
          const cid = generateCuid();
          await client.query(
            `INSERT INTO "Course" (id, "tenantId", name, fees, subjects, "installmentCount", "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 0, ARRAY[]::text[], 1, true, NOW(), NOW())`,
            [cid, tenantId, cls]
          );
          courseMapByTenant[tenantId][key] = cid;
        }
      }
    }

    // 4. Parse students
    const parsedStudents = [];
    for (let i = 1; i < rawData.length; i++) {
      const r = rawData[i];
      if (!r || !r[0] || !r[1]) continue;

      const scholarNo = cleanText(r[0]);
      const fullName = cleanText(r[1]);
      const fatherName = cleanText(r[2]);
      const motherName = cleanText(r[3]);
      const phone = cleanPhone(r[4]);
      const caste = cleanText(r[5]);
      const medium = cleanText(r[6]);
      const address = cleanText(r[7]);
      const dobDate = parseExcelDate(r[8]);
      const className = cleanText(r[9]) || 'Nursery';
      const admDate = parseExcelDate(r[10]) || new Date();
      const aadharNo = cleanId(r[11]);
      const samagraId = cleanId(r[12]);
      const penId = cleanId(r[13]);
      const aparId = cleanId(r[14]);
      const bankName = cleanText(r[15]);
      const bankAccountNo = cleanText(r[16]);
      const ifsc = cleanText(r[17]);

      const dobInWords = dobDate ? convertDateToWords(dobDate) : null;

      parsedStudents.push({
        scholarNo,
        fullName,
        fatherName,
        motherName,
        phone,
        parentPhone: phone,
        caste,
        medium,
        address,
        dobDate,
        dobInWords,
        className,
        admDate,
        aadharNo,
        samagraId,
        penId,
        aparId,
        bankName,
        bankAccountNo,
        ifsc
      });
    }

    console.log(`Parsed ${parsedStudents.length} students from Excel.`);

    // 5. Bulk insert for each tenant
    for (const tenantId of targetTenants) {
      console.log(`\nProcessing Tenant: ${tenantId}...`);

      // Fetch existing students in this tenant
      const existing = await client.query(
        'SELECT "scholarNo", LOWER("fullName") as fname FROM "Student" WHERE "tenantId" = $1',
        [tenantId]
      );
      const existingSet = new Set(existing.rows.map(x => `${x.scholarNo}:::${x.fname}`));

      // Filter only new students
      const toInsert = [];
      let countRes = await client.query('SELECT count(*) FROM "Student" WHERE "tenantId" = $1', [tenantId]);
      let currentIdx = parseInt(countRes.rows[0].count, 10);

      for (const st of parsedStudents) {
        const key = `${st.scholarNo}:::${st.fullName.toLowerCase()}`;
        if (existingSet.has(key)) {
          continue;
        }

        currentIdx++;
        const studentId = `STU${String(currentIdx).padStart(3, '0')}`;
        const recordId = generateCuid();
        const courseKey = st.className.toLowerCase().trim();
        const courseId = courseMapByTenant[tenantId][courseKey] || Object.values(courseMapByTenant[tenantId])[0];

        toInsert.push({
          id: recordId,
          tenantId,
          courseId,
          studentId,
          scholarNo: st.scholarNo,
          fullName: st.fullName,
          fatherName: st.fatherName,
          motherName: st.motherName,
          phone: st.phone,
          parentPhone: st.parentPhone,
          caste: st.caste,
          medium: st.medium,
          address: st.address,
          dob: st.dobDate,
          dobInWords: st.dobInWords,
          firstAdmissionClass: st.className,
          firstAdmissionDate: st.admDate,
          admissionDate: st.admDate,
          aadhaarNo: st.aadharNo,
          samagraId: st.samagraId,
          penId: st.penId,
          aparId: st.aparId,
          bankName: st.bankName,
          bankAccountNo: st.bankAccountNo,
          ifsc: st.ifsc
        });
      }

      console.log(`Tenant ${tenantId}: toInsert count = ${toInsert.length}`);

      // Batch insert in chunks of 50
      const CHUNK_SIZE = 50;
      let totalInserted = 0;

      for (let c = 0; c < toInsert.length; c += CHUNK_SIZE) {
        const chunk = toInsert.slice(c, c + CHUNK_SIZE);
        const values = [];
        const placeholders = [];

        chunk.forEach((st, idx) => {
          const offset = idx * 25;
          const ph = [];
          for (let p = 1; p <= 25; p++) {
            ph.push(`$${offset + p}`);
          }
          placeholders.push(`(${ph.join(', ')}, 'MALE', 'ACTIVE', NOW(), NOW())`);

          values.push(
            st.id, st.tenantId, st.courseId, st.studentId, st.scholarNo, st.fullName,
            st.fatherName, st.motherName, st.phone, st.parentPhone, st.caste, st.medium,
            st.address, st.dob, st.dobInWords, st.firstAdmissionClass, st.firstAdmissionDate,
            st.admissionDate, st.aadhaarNo, st.samagraId, st.penId, st.aparId,
            st.bankName, st.bankAccountNo, st.ifsc
          );
        });

        const queryText = `
          INSERT INTO "Student" (
            id, "tenantId", "courseId", "studentId", "scholarNo", "fullName",
            "fatherName", "motherName", phone, "parentPhone", caste, medium,
            address, dob, "dobInWords", "firstAdmissionClass", "firstAdmissionDate",
            "admissionDate", "aadhaarNo", "samagraId", "penId", "aparId",
            "bankName", "bankAccountNo", ifsc, gender, status, "createdAt", "updatedAt"
          ) VALUES ${placeholders.join(', ')}
        `;

        await client.query(queryText, values);
        totalInserted += chunk.length;
        console.log(`Inserted ${totalInserted} / ${toInsert.length} students...`);
      }

      console.log(`Tenant ${tenantId} finished! Total inserted: ${totalInserted}`);
    }

    console.log('\n=============================================');
    console.log('✅ ALL STUDENTS UPLOADED TO NEON DATABASE!');
    console.log('=============================================');
  } catch (err) {
    console.error('Fatal error during bulk import:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
