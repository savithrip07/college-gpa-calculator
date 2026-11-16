/* ═══════════════════════════════════════════════════════
   app.js
   - Sem 1–4: 3 fixed subject rows | Sem 5–6: 5 fixed rows
   - calculateGPA() auto-pushes into CGPA and recalculates
   - CGPA updates automatically, no separate button needed
═══════════════════════════════════════════════════════ */

const SUBJECT_COUNT = { 1:3, 2:3, 3:3, 4:3, 5:5, 6:5 };

let lastGPA = null;
const cgpaData = Array.from({ length: 6 }, () => ({ gpa: null, credits: null, source: null }));

/* ── Truncate without rounding ── */
function trunc(val, n) {
  const factor = Math.pow(10, n);
  return Math.trunc(val * factor) / factor;
}
function fmt(val) { return trunc(val, 3).toFixed(3); }

function gradeLabel(v) {
  if (v >= 9.0) return '🏆 Outstanding';
  if (v >= 8.0) return '⭐ Excellent';
  if (v >= 7.0) return '✅ Very Good';
  if (v >= 6.0) return '👍 Good';
  if (v >= 5.0) return '📘 Average';
  return '⚠️ Needs Improvement';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ── Build subject rows when semester is selected ── */
document.getElementById('gpa-semester').addEventListener('change', function () {
  const semVal = parseInt(this.value);
  const container = document.getElementById('gpa-subjects');
  const header    = document.getElementById('subject-header');

  container.innerHTML = '';
  document.getElementById('gpa-result').classList.add('hidden');
  document.getElementById('gpa-error').classList.add('hidden');
  lastGPA = null;

  if (!semVal) { header.style.display = 'none'; return; }

  header.style.display = 'grid';
  const count = SUBJECT_COUNT[semVal] || 3;

  for (let i = 1; i <= count; i++) {
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.id = `row-${i}`;
    row.innerHTML = `
      <div><input type="text" id="name-${i}" placeholder="Subject ${i}" /></div>
      <div><input type="number" id="marks-${i}" min="0" max="100" step="0.01"
             placeholder="e.g. 87" oninput="liveGP(${i})" /></div>
      <div><input type="number" id="credits-${i}" min="0.5" step="0.5" placeholder="e.g. 4" /></div>
      <div><div class="gp-pill" id="gp-${i}">—</div></div>
    `;
    container.appendChild(row);
  }
});

function liveGP(i) {
  const marks = parseFloat(document.getElementById(`marks-${i}`)?.value);
  const el    = document.getElementById(`gp-${i}`);
  if (!el) return;
  el.textContent = (!isNaN(marks) && marks >= 0 && marks <= 100) ? fmt(marks / 10) : '—';
}

/* ── Calculate GPA → auto-push → auto-update CGPA ── */
function calculateGPA() {
  document.getElementById('gpa-error').classList.add('hidden');
  const semVal = parseInt(document.getElementById('gpa-semester').value);

  if (!semVal) { showError('gpa-error', 'Please select a semester first.'); return; }

  const count = SUBJECT_COUNT[semVal];
  const subjects = [];

  for (let i = 1; i <= count; i++) {
    const name    = document.getElementById(`name-${i}`)?.value.trim() || `Subject ${i}`;
    const marks   = parseFloat(document.getElementById(`marks-${i}`)?.value);
    const credits = parseFloat(document.getElementById(`credits-${i}`)?.value);
    subjects.push({ name, marks, credits });
  }

  for (const s of subjects) {
    if (isNaN(s.marks))                { showError('gpa-error', `Enter valid marks for "${s.name}".`); return; }
    if (s.marks < 0 || s.marks > 100)  { showError('gpa-error', `Marks must be 0–100 for "${s.name}".`); return; }
    if (isNaN(s.credits) || s.credits <= 0) { showError('gpa-error', `Enter valid credits for "${s.name}".`); return; }
  }

  let weighted = 0, totalCr = 0;
  const rows = subjects.map(s => {
    const gp = s.marks / 10;
    weighted += gp * s.credits;
    totalCr  += s.credits;
    return { ...s, gp };
  });

  const gpa = weighted / totalCr;
  lastGPA = { gpa, totalCredits: totalCr, semIndex: semVal - 1, rows };

  // Show GPA result
  document.getElementById('gpa-score').textContent = fmt(gpa);
  document.getElementById('gpa-perf').textContent  = gradeLabel(gpa);
  document.getElementById('gpa-stats').innerHTML = `
    <div class="stat-chip"><span class="stat-val">${rows.length}</span><span class="stat-lbl">Subjects</span></div>
    <div class="stat-chip"><span class="stat-val">${totalCr}</span><span class="stat-lbl">Credits</span></div>
  `;
  document.getElementById('gpa-result').classList.remove('hidden');
  document.getElementById('gpa-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Auto-push into CGPA
  const idx = semVal - 1;
  cgpaData[idx] = { gpa, credits: totalCr, source: 'auto' };

  const gpaInput     = document.getElementById(`cgpa-gpa-${idx}`);
  const creditsInput = document.getElementById(`cgpa-credits-${idx}`);
  if (gpaInput)     gpaInput.value     = fmt(gpa);
  if (creditsInput) creditsInput.value = totalCr;

  updateCGPARowStatus(idx);
  updateCGPA();
  localStorage.setItem('gradecalc_cgpa', JSON.stringify(cgpaData));
}


/* ── Build CGPA table (3 columns: Semester, GPA, Credits, Status) ── */
function buildCGPATable() {
  const tbody = document.getElementById('cgpa-rows');
  for (let i = 0; i < 6; i++) {
    const tr = document.createElement('tr');
    tr.id = `cgpa-tr-${i}`;
    tr.innerHTML = `
      <td><span class="sem-label">Semester ${i + 1}</span></td>
      <td><input type="number" id="cgpa-gpa-${i}" min="0" max="10" step="0.001"
                 placeholder="0.000 – 10.000" oninput="onCGPAInput(${i})" /></td>
      <td><input type="number" id="cgpa-credits-${i}" min="1" step="1"
                 placeholder="e.g. 22" oninput="onCGPAInput(${i})" /></td>
      <td><span class="status-badge badge-empty" id="cgpa-status-${i}">Empty</span></td>
    `;
    tbody.appendChild(tr);
  }
}

function updateCGPARowStatus(i) {
  const d = cgpaData[i];
  const statusEl = document.getElementById(`cgpa-status-${i}`);
  if (!statusEl) return;
  if (d.gpa !== null && d.credits !== null) {
    statusEl.textContent = d.source === 'auto' ? 'Auto-filled' : 'Manual';
    statusEl.className   = `status-badge ${d.source === 'auto' ? 'badge-filled' : 'badge-manual'}`;
  } else {
    statusEl.textContent = 'Empty';
    statusEl.className   = 'status-badge badge-empty';
  }
}

/* ── Auto-recalculate CGPA whenever any data changes ── */
function updateCGPA() {
  const filled = cgpaData.filter(d => d.gpa !== null && d.credits !== null);

  if (filled.length === 0) {
    document.getElementById('cgpa-result').classList.add('hidden');
    document.getElementById('cgpa-foot').innerHTML = '';
    return;
  }

  const grandWeighted = filled.reduce((s, d) => s + d.gpa * d.credits, 0);
  const grandCredits  = filled.reduce((s, d) => s + d.credits, 0);
  const cgpa = grandWeighted / grandCredits;

  document.getElementById('cgpa-foot').innerHTML = `
    <tr>
      <td>Overall CGPA</td>
      <td style="font-size:1.05rem;font-weight:800;color:var(--primary)">${fmt(cgpa)}</td>
      <td>${grandCredits}</td>
      <td>${filled.length} / 6 sems</td>
    </tr>
  `;

  document.getElementById('cgpa-score').textContent = fmt(cgpa);
  document.getElementById('cgpa-perf').textContent  = gradeLabel(cgpa);
  document.getElementById('cgpa-stats').innerHTML = `
    <div class="stat-chip"><span class="stat-val">${filled.length}</span><span class="stat-lbl">Semesters</span></div>
    <div class="stat-chip"><span class="stat-val">${grandCredits}</span><span class="stat-lbl">Total Credits</span></div>
  `;
  document.getElementById('cgpa-result').classList.remove('hidden');
}

/* ── Manual CGPA input ── */
function onCGPAInput(i) {
  const gpa     = parseFloat(document.getElementById(`cgpa-gpa-${i}`)?.value);
  const credits = parseFloat(document.getElementById(`cgpa-credits-${i}`)?.value);
  cgpaData[i] = (!isNaN(gpa) && !isNaN(credits) && credits > 0)
    ? { gpa, credits, source: cgpaData[i].source === 'auto' ? 'auto' : 'manual' }
    : { gpa: null, credits: null, source: null };
  updateCGPARowStatus(i);
  updateCGPA();
  localStorage.setItem('gradecalc_cgpa', JSON.stringify(cgpaData));
}

/* ── Load / Auto-save ── */
function loadCGPA() {
  try {
    const stored = JSON.parse(localStorage.getItem('gradecalc_cgpa'));
    if (!stored || !Array.isArray(stored)) return;
    let hasData = false;
    stored.forEach((d, i) => {
      if (i >= 6 || d.gpa === null) return;
      cgpaData[i] = d;
      hasData = true;
      const g = document.getElementById(`cgpa-gpa-${i}`);
      const c = document.getElementById(`cgpa-credits-${i}`);
      if (g) g.value = d.gpa;
      if (c) c.value = d.credits;
      updateCGPARowStatus(i);
    });
    if (hasData) {
      updateCGPA();
      const ind = document.getElementById('saved-indicator');
      if (ind) ind.innerHTML = '🟢 Progress restored';
    }
  } catch { /* ignore */ }
}


/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  buildCGPATable();
  loadCGPA();
});
