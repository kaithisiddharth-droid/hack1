/* ───────────────────────────────────────────────
   StructAI — Frontend App Logic
─────────────────────────────────────────────── */

// ── Particles ─────────────────────────────────
(function spawnParticles() {
  const c = document.getElementById('particles');
  const cols = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#a78bfa','#38bdf8'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = Math.random() * 5 + 2;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;`
      + `background:${cols[Math.floor(Math.random()*cols.length)]};`
      + `animation-duration:${Math.random()*18+10}s;animation-delay:${Math.random()*12}s;`
      + (Math.random()>0.5 ? 'filter:blur(1px);' : '');
    c.appendChild(p);
  }
})();

// ── Example Data ───────────────────────────────
const EXAMPLES = {
  people: `John Smith, 34, Male, Software Engineer, New York, $110,000, 8 years experience
Alice Johnson, 28, Female, UX Designer, San Francisco, $95,000, 5 years experience
Bob Chen, 42, Male, Product Manager, Austin, $130,000, 15 years experience
Diana Patel, 31, Female, Data Scientist, Seattle, $120,000, 7 years experience
Marcus Lee, 25, Male, Frontend Dev, Chicago, $85,000, 2 years experience`,

  products: `MacBook Pro 16" | Apple | $2,499 | Laptop | 4.8 stars | In Stock: 23
Dell XPS 15 | Dell | $1,799 | Laptop | 4.5 stars | In Stock: 41
Sony WH-1000XM5 | Sony | $349 | Headphones | 4.7 stars | In Stock: 156
iPad Air | Apple | $749 | Tablet | 4.6 stars | In Stock: 88
Samsung Galaxy S24 | Samsung | $999 | Smartphone | 4.4 stars | In Stock: 210`,

  events: `Tech Summit 2024 — March 15, San Francisco, CA. Keynote by Sundar Pichai. 5000 attendees expected. Registration open.
AI & ML Conference — April 3-5, New York. Dr. Fei-Fei Li speaking. 3200 seats. Tickets $299.
Web Dev Workshop — April 22, Austin TX. Beginner friendly. 80 seats. Free entry.
Startup Pitch Night — May 10, Chicago. 50 startups. Investors present. RSVP required.
Data Science Day — June 1, Seattle. Online + In-person. 2000 registered.`,

  freetext: `Got a message from Sarah yesterday - she's 29, a nurse from Boston earning around 72k a year. Her colleague Mike is older, 45, a doctor, makes about $190,000 and he's from Portland. Then there was Emily, 36 years old, works as a teacher in Denver with a salary of $58,000 per year. Finally, James - 52 year old lawyer in Miami, pulls in $210,000 annually.`,
};

document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('data-input').value = EXAMPLES[btn.dataset.example] || '';
  });
});

// ── Format Selection ───────────────────────────
let activeFormat = 'table';

function setFormat(fmt) {
  activeFormat = fmt;
  // Main tabs
  document.querySelectorAll('.format-tab').forEach(b => b.classList.toggle('active', b.dataset.format === fmt));
  // Mini tabs
  document.querySelectorAll('.fmt-mini').forEach(b => b.classList.toggle('active', b.dataset.format === fmt));
  // Show/hide views
  ['table','json','csv'].forEach(f => {
    document.getElementById(`${f}-view`).style.display = f === fmt ? 'block' : 'none';
  });
}

document.querySelectorAll('.format-tab').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));
document.querySelectorAll('.fmt-mini').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));

// ── Section Helpers ────────────────────────────
function showSection(id) {
  ['loading-section','results-section','error-section'].forEach(s => {
    document.getElementById(s).style.display = 'none';
  });
  if (id) {
    const el = document.getElementById(id);
    el.style.display = id === 'results-section' ? 'flex' : id === 'loading-section' ? 'flex' : 'flex';
  }
}

// ── Loading Steps ──────────────────────────────
let loadingTimer = null;
function startSteps() {
  const ids = ['ls1','ls2','ls3','ls4'];
  ids.forEach(i => { document.getElementById(i).className = 'loading-step'; });
  document.getElementById(ids[0]).classList.add('active');
  let cur = 0;
  loadingTimer = setInterval(() => {
    if (cur < ids.length - 1) {
      document.getElementById(ids[cur]).classList.replace('active','done');
      document.getElementById(ids[++cur]).classList.add('active');
    }
  }, 1500);
}
function stopSteps() {
  clearInterval(loadingTimer);
  ['ls1','ls2','ls3','ls4'].forEach(i => {
    const el = document.getElementById(i);
    el.classList.remove('active');
    el.classList.add('done');
  });
}

// ── Typewriter ─────────────────────────────────
function typewrite(el, text, speed = 15) {
  el.textContent = ''; let i = 0;
  const t = setInterval(() => { el.textContent += text[i++]; if (i >= text.length) clearInterval(t); }, speed);
}

// ── Build Table ────────────────────────────────
function buildTable(fields, rows) {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Header row
  const trh = document.createElement('tr');
  const thIdx = document.createElement('th');
  thIdx.textContent = '#'; thIdx.style.width = '40px';
  trh.appendChild(thIdx);
  fields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  // Body rows
  rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    const tdIdx = document.createElement('td');
    tdIdx.className = 'row-idx'; tdIdx.textContent = ri + 1;
    tr.appendChild(tdIdx);
    fields.forEach((_, fi) => {
      const td = document.createElement('td');
      td.textContent = row[fi] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ── Build JSON ─────────────────────────────────
function buildJSON(fields, rows) {
  const arr = rows.map(row => {
    const obj = {};
    fields.forEach((f, i) => { obj[f] = row[i] ?? ''; });
    return obj;
  });
  document.getElementById('json-output').textContent = JSON.stringify(arr, null, 2);
}

// ── Build CSV ──────────────────────────────────
function buildCSV(fields, rows) {
  const escape = v => `"${String(v).replace(/"/g,'""')}"`;
  const lines = [fields.map(escape).join(',')];
  rows.forEach(row => lines.push(fields.map((_,i) => escape(row[i] ?? '')).join(',')));
  const csv = lines.join('\n');
  document.getElementById('csv-output').textContent = csv;
  return csv;
}

// ── State ──────────────────────────────────────
let currentResult = null;

// ── Main: Structure ────────────────────────────
async function doStructure() {
  const raw = document.getElementById('data-input').value.trim();
  if (!raw) {
    const ta = document.getElementById('data-input');
    ta.style.borderColor = 'rgba(244,63,94,0.6)';
    setTimeout(() => { ta.style.borderColor = ''; }, 1500);
    return;
  }

  const btn = document.getElementById('struct-btn');
  btn.disabled = true;
  btn.querySelector('.struct-btn-text').textContent = 'Analyzing…';

  showSection('loading-section');
  startSteps();

  try {
    const resp = await fetch('/api/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: raw }),
    });

    const result = await resp.json();
    stopSteps();

    if (!resp.ok || result.error) throw new Error(result.error || 'Unknown error');
    if (!result.fields || !result.rows) throw new Error('Invalid response structure');

    currentResult = result;

    // Render meta
    document.getElementById('dataset-title').textContent = result.title || 'Structured Data';
    document.getElementById('dataset-stats').textContent =
      `${result.rows.length} record${result.rows.length !== 1 ? 's' : ''} · ${result.fields.length} field${result.fields.length !== 1 ? 's' : ''}`;

    // Build all formats
    buildTable(result.fields, result.rows);
    buildJSON(result.fields, result.rows);
    buildCSV(result.fields, result.rows);

    // Default view
    setFormat(activeFormat);

    // Explanation
    typewrite(document.getElementById('exp-text'), result.explanation || 'Data structured successfully.', 13);

    const stepsList = document.getElementById('steps-list');
    stepsList.innerHTML = '';
    (result.steps || []).forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'step-item';
      el.style.animationDelay = `${i * 0.1}s`;
      el.innerHTML = `<div class="step-num">${i+1}</div><div class="step-text">${s}</div>`;
      stepsList.appendChild(el);
    });

    showSection('results-section');

  } catch (err) {
    stopSteps();
    document.getElementById('error-msg').textContent = err.message || 'Failed to structure data. Please try again.';
    showSection('error-section');
  } finally {
    btn.disabled = false;
    btn.querySelector('.struct-btn-text').textContent = 'Structure with AI';
  }
}

// ── Copy ───────────────────────────────────────
document.getElementById('copy-btn').addEventListener('click', () => {
  let text = '';
  if (activeFormat === 'table') text = document.getElementById('csv-output').textContent; // copy as CSV
  else if (activeFormat === 'json') text = document.getElementById('json-output').textContent;
  else text = document.getElementById('csv-output').textContent;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '⎘ Copy'; }, 2000);
  });
});

// ── Download ───────────────────────────────────
document.getElementById('download-btn').addEventListener('click', () => {
  if (!currentResult) return;
  let content, filename, type;
  if (activeFormat === 'json') {
    content = document.getElementById('json-output').textContent;
    filename = 'structured_data.json'; type = 'application/json';
  } else {
    content = document.getElementById('csv-output').textContent;
    filename = 'structured_data.csv'; type = 'text/csv';
  }
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
});

// ── Reset ──────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  showSection(null);
  document.getElementById('data-input').value = '';
  currentResult = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Retry ──────────────────────────────────────
document.getElementById('retry-btn').addEventListener('click', () => showSection(null));

// ── Button ─────────────────────────────────────
document.getElementById('struct-btn').addEventListener('click', doStructure);

// Ctrl/Cmd + Enter
document.getElementById('data-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doStructure();
});
