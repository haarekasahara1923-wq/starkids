/**
 * Shared helpers for Admit Cards & Exam Time Table:
 * - Class-wise sequential roll number generation
 * - A4 Printable / PDF Admit Card HTML (Upper Half: Admit Card, Lower Half: Time Table)
 */

export function generateClassRollNo(courseName: string, index: number): string {
  const n = index + 1
  const normalized = (courseName || '').toLowerCase().trim()

  if (normalized.includes('nursery') || normalized.includes('nursary')) {
    return `N${String(n).padStart(2, '0')}`
  }
  if (normalized.includes('lkg') || normalized.includes('l.k.g')) {
    return `L${String(n).padStart(2, '0')}`
  }
  if (normalized.includes('ukg') || normalized.includes('u.k.g')) {
    return `U${String(n).padStart(2, '0')}`
  }

  // Match class numbers 1..12 (e.g. "Class 1", "Class 1st", "10th", "Class 12")
  const match = normalized.match(/(\d+)/)
  if (match) {
    const classNum = parseInt(match[1], 10)
    if (classNum >= 1 && classNum <= 12) {
      return String(classNum * 100 + n)
    }
  }

  return String(n).padStart(3, '0')
}

export function fmtAdmitDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtAdmitTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function computeExamDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = eh * 60 + em - (sh * 60 + sm)
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

/**
 * Generates printable/PDF-ready A4 HTML for one or more admit cards.
 * Layout:
 *  - Upper Half: School Header + Exam Banner + Student Photo + Details from Admission Form / Student Records + Roll No
 *  - Lower Half: Examination Time Table + Instructions + Signatures
 */
export function buildAdmitCardsPrintHTML(eventDetails: any, tenant: any, singleCard?: any): string {
  const schoolName = tenant?.name || 'STAR KIDS Public School'
  const schoolLogo = tenant?.logo || ''
  const schoolAddress = tenant?.address || ''
  const schoolPhone = tenant?.phone || ''
  const schoolEmail = tenant?.email || ''
  const schoolCode = tenant?.schoolCode || ''
  const directorSign = tenant?.directorSign || ''

  const cardsToPrint = singleCard ? [singleCard] : (eventDetails?.admitCards || [])
  const timeTable = Array.isArray(eventDetails?.timeTable) ? eventDetails.timeTable : []

  const cardsHtml = cardsToPrint.map((card: any) => {
    const stu = card.student || {}
    const rollNo = card.rollNo || stu.scholarNo || 'N/A'
    const classSection = [eventDetails?.course?.name, eventDetails?.batch?.name].filter(Boolean).join(' - ')

    return `
    <div class="admit-card-page">
      <div class="card-border">
        <div class="top-strip"></div>

        <!-- ═══════════ UPPER HALF: ADMIT CARD ═══════════ -->
        <div class="upper-half">
          <!-- School Header -->
          <div class="header">
            <div class="logo-box">
              ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '<span style="font-size:30px;">🏫</span>'}
            </div>
            <div class="header-text">
              <h1 class="school-name">${schoolName}</h1>
              ${schoolAddress ? `<p class="school-sub">${schoolAddress}</p>` : ''}
              <p class="school-contact">
                ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
                ${schoolCode ? ` &nbsp;|&nbsp; Code: <strong>${schoolCode}</strong>` : ''}
              </p>
            </div>
            <div class="header-tag">
              <div class="tag-sub">HALL TICKET</div>
              <div class="tag-main">ADMIT CARD</div>
            </div>
          </div>

          <!-- Exam Title Banner -->
          <div class="exam-banner">
            ✦ &nbsp; ${eventDetails?.examName || 'Examination'} &nbsp; ✦
            <div style="font-size:11px;font-weight:700;margin-top:2px;letter-spacing:0.5px;opacity:0.9;">
              ${classSection}
            </div>
          </div>

          <!-- Student Info & Photo Section -->
          <div class="student-info-section">
            <div class="student-details-grid">
              <div class="detail-item">
                <span class="detail-label">ROLL NO.</span>
                <span class="detail-value roll-badge">${rollNo}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">SCHOLAR NO.</span>
                <span class="detail-value">${stu.scholarNo || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">STUDENT'S NAME</span>
                <span class="detail-value highlight">${stu.fullName || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">CLASS &amp; SECTION</span>
                <span class="detail-value">${classSection || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">FATHER'S NAME</span>
                <span class="detail-value">${stu.fatherName || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">MOTHER'S NAME</span>
                <span class="detail-value">${stu.motherName || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">DATE OF BIRTH</span>
                <span class="detail-value">${stu.dob ? fmtAdmitDate(stu.dob) : 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">EXAMINATION DATES</span>
                <span class="detail-value">${fmtAdmitDate(eventDetails?.startDate)} → ${fmtAdmitDate(eventDetails?.endDate)}</span>
              </div>
            </div>

            <div class="photo-container">
              <div class="photo-box">
                ${stu.photo ? `<img src="${stu.photo}" alt="Student Photo" />` : '<div style="font-size:34px;">👤</div><div style="font-size:9px;color:#64748b;margin-top:4px;">Student Photo</div>'}
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════ LOWER HALF: TIME TABLE & INSTRUCTIONS ═══════════ -->
        <div class="lower-half">
          <div class="section-divider">
            <span>EXAMINATION TIME TABLE / SCHEDULE</span>
          </div>

          <table class="timetable-table">
            <thead>
              <tr>
                <th style="width:18%;">Date</th>
                <th style="width:40%;">Subject / Paper</th>
                <th style="width:24%;">Exam Time</th>
                <th style="width:18%;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${timeTable.length === 0 ? `
                <tr>
                  <td colspan="4" style="text-align:center;padding:12px;color:#64748b;">Schedule will be notified separately.</td>
                </tr>
              ` : timeTable.map((t: any) => `
                <tr>
                  <td style="font-weight:700;color:#1a237e;">${fmtAdmitDate(t.date)}</td>
                  <td style="font-weight:600;color:#0f172a;">${t.subject || '—'}</td>
                  <td>${fmtAdmitTime(t.startTime)} — ${fmtAdmitTime(t.endTime)}</td>
                  <td style="color:#64748b;">${t.duration || computeExamDuration(t.startTime, t.endTime) || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Instructions -->
          <div class="instructions-box">
            <div class="instructions-title">IMPORTANT CANDIDATE INSTRUCTIONS:</div>
            <ol class="instructions-list">
              <li>Candidate must carry this Admit Card &amp; School ID Card to the examination hall for all papers.</li>
              <li>Report strictly 20 minutes before the scheduled exam commencement time.</li>
              <li>Mobile phones, smartwatches, calculators, and unfair means material are strictly prohibited.</li>
              <li>Maintain silence and strict discipline inside the examination hall.</li>
            </ol>
          </div>

          <!-- Signatures -->
          <div class="signatures-row">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-text">Candidate's Signature</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-text">Class Teacher's Signature</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">
                ${directorSign ? `<img src="${directorSign}" alt="Principal Signature" style="max-height:38px;max-width:140px;object-fit:contain;"/>` : ''}
              </div>
              <div class="sig-text">Principal / Controller of Exams</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admit Cards – ${eventDetails?.examName || 'Examination'}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f1f5f9;margin:0;padding:16px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.admit-card-page{width:210mm;min-height:280mm;margin:0 auto 24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);page-break-after:always;display:flex;flex-direction:column;}
.card-border{border:2.5px solid #1a237e;border-radius:8px;margin:8px;padding:14px 18px;position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-between;}
.top-strip{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#1a237e,#2563eb,#fbbf24);}
.upper-half{display:flex;flex-direction:column;}
.lower-half{display:flex;flex-direction:column;margin-top:8px;padding-top:8px;border-top:2px dashed #cbd5e1;}
.header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #1a237e;padding-bottom:10px;margin-top:4px;}
.logo-box{width:64px;height:64px;border-radius:10px;border:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8fafc;flex-shrink:0;}
.logo-box img{width:100%;height:100%;object-fit:contain;}
.header-text{flex:1;}
.school-name{font-size:18px;font-weight:900;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin:0;}
.school-sub{font-size:10.5px;color:#475569;margin-top:2px;line-height:1.35;}
.school-contact{font-size:10px;color:#64748b;margin-top:2px;}
.header-tag{text-align:right;flex-shrink:0;}
.tag-sub{font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;}
.tag-main{font-size:16px;font-weight:900;color:#b45309;background:#fef3c7;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;margin-top:2px;letter-spacing:0.5px;}

.exam-banner{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a237e;font-weight:900;text-align:center;padding:6px 12px;margin:10px 0;border-radius:6px;font-size:13px;text-transform:uppercase;letter-spacing:1.2px;}

.student-info-section{display:flex;gap:16px;align-items:flex-start;margin-bottom:6px;}
.student-details-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:7px 14px;}
.detail-item{border-bottom:1px solid #e2e8f0;padding-bottom:3px;}
.detail-label{display:block;font-size:8.5px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;}
.detail-value{font-size:12px;font-weight:700;color:#0f172a;}
.detail-value.highlight{color:#1a237e;font-size:13px;font-weight:800;}
.detail-value.roll-badge{color:#b45309;font-size:14px;font-weight:900;letter-spacing:0.5px;}
.photo-container{width:92px;flex-shrink:0;text-align:center;}
.photo-box{width:92px;height:112px;border:1.5px solid #1a237e;border-radius:6px;background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.photo-box img{width:100%;height:100%;object-fit:cover;}

.section-divider{display:flex;align-items:center;margin:4px 0 8px 0;text-align:center;}
.section-divider::before,.section-divider::after{content:'';flex:1;border-bottom:1.5px solid #cbd5e1;}
.section-divider span{padding:0 10px;font-size:11px;font-weight:800;color:#1a237e;letter-spacing:1px;text-transform:uppercase;}

.timetable-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;border-radius:6px;overflow:hidden;border:1px solid #cbd5e1;}
.timetable-table th{background:#1a237e;color:#fff;padding:6px 10px;text-align:left;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;font-size:9.5px;}
.timetable-table td{border-bottom:1px solid #e2e8f0;padding:5.5px 10px;text-align:left;}
.timetable-table tr:nth-child(even){background:#f8fafc;}

.instructions-box{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 12px;margin-bottom:12px;}
.instructions-title{font-size:9.5px;font-weight:800;color:#92400e;letter-spacing:0.5px;}
.instructions-list{margin:3px 0 0;padding-left:16px;font-size:9px;color:#78350f;line-height:1.45;}

.signatures-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding:8px 10px 0;}
.sig-block{text-align:center;width:150px;}
.sig-line{height:38px;border-bottom:1.5px solid #1e293b;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;}
.sig-text{font-size:9.5px;font-weight:700;color:#475569;}

@media print{
  body{background:#fff;padding:0;}
  .admit-card-page{width:100%;min-height:275mm;margin:0;box-shadow:none;page-break-after:always;}
  .card-border{border:2px solid #1a237e;margin:0;padding:14px 16px;}
  @page{size:A4 portrait;margin:8mm;}
}
</style>
</head>
<body>
  ${cardsHtml}
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`
}

export function openAdmitCardsPrintWindow(eventDetails: any, tenant: any, singleCard?: any) {
  const html = buildAdmitCardsPrintHTML(eventDetails, tenant, singleCard)
  const win = window.open('', '_blank', 'width=950,height=780')
  if (!win) {
    alert('Please allow popups to print/download Admit Cards.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
