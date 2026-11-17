/**
 * StarKids Student Bulk Import Script
 * Uploads all students from students_data.json to the live app via API
 * 
 * Usage: node scripts/upload_students.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG - Update token before running
// ============================================================
const BASE_URL = 'https://starkids-tau.vercel.app';
const TOKEN_FILE = path.join(__dirname, 'auth_token.txt');

// Read token from file (will be set by login step below)
let TOKEN = '';
if (fs.existsSync(TOKEN_FILE)) {
  TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

const BATCH_SIZE = 20; // Upload in batches to avoid timeout

// ============================================================
// HELPERS
// ============================================================
async function fetchJson(url, options = {}) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: { error: text } };
  }
}

async function login(email, password) {
  console.log('Logging in as Super Admin...');
  const { status, data } = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (status !== 200 || !data.token) {
    console.error('Login failed:', JSON.stringify(data));
    process.exit(1);
  }
  TOKEN = data.token;
  fs.writeFileSync(TOKEN_FILE, TOKEN);
  console.log('Login successful! Token saved.');
  return TOKEN;
}

async function uploadBatch(students) {
  const { status, data } = await fetchJson(`${BASE_URL}/api/students/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ students })
  });
  return { status, data };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  // Step 1: Login if no token
  if (!TOKEN) {
    // Default super admin credentials - update if different
    const email = process.argv[2] || 'admin@starkids.school';
    const password = process.argv[3] || 'admin123';
    await login(email, password);
  } else {
    console.log('Using saved token from auth_token.txt');
  }

  // Step 2: Load students data
  const dataFile = path.join(__dirname, 'students_data.json');
  if (!fs.existsSync(dataFile)) {
    console.error('students_data.json not found! Run the Excel conversion script first.');
    process.exit(1);
  }
  const students = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  console.log(`\nTotal students to upload: ${students.length}`);

  // Step 3: Upload in batches
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const allResults = [];

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(students.length / BATCH_SIZE);
    
    process.stdout.write(`Uploading batch ${batchNum}/${totalBatches} (students ${i + 1}-${Math.min(i + BATCH_SIZE, students.length)})... `);
    
    try {
      const { status, data } = await uploadBatch(batch);
      
      if (status === 200 && data.success) {
        const { imported, skipped, errors } = data.summary;
        totalImported += imported;
        totalSkipped += skipped;
        totalErrors += errors;
        allResults.push(...(data.results || []));
        console.log(`✓ Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);
      } else {
        console.log(`✗ Failed! Status: ${status}, Error: ${data.error || JSON.stringify(data)}`);
        // If unauthorized, try re-login
        if (status === 401) {
          console.error('Token expired. Delete auth_token.txt and run again with credentials.');
          process.exit(1);
        }
      }
    } catch (err) {
      console.log(`✗ Network error: ${err.message}`);
    }
    
    // Small delay between batches
    await new Promise(r => setTimeout(r, 500));
  }

  // Step 4: Summary
  console.log('\n========================================');
  console.log('IMPORT SUMMARY');
  console.log('========================================');
  console.log(`✅ Successfully Imported: ${totalImported}`);
  console.log(`⚠️  Skipped (duplicates): ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`📊 Total Processed: ${students.length}`);

  // Save detailed results
  const resultsFile = path.join(__dirname, 'import_results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    summary: { imported: totalImported, skipped: totalSkipped, errors: totalErrors, total: students.length },
    details: allResults.filter(r => r.status !== 'imported')
  }, null, 2));
  console.log(`\nDetailed results saved to: ${resultsFile}`);

  if (totalErrors > 0) {
    console.log('\nError details:');
    allResults.filter(r => r.status === 'error').forEach(r => {
      console.log(`  - Scholar ${r.scholarNo} (${r.fullName}): ${r.reason}`);
    });
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
