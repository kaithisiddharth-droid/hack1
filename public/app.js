/* ───────────────────────────────────────────────
   SortAI — Frontend Logic
─────────────────────────────────────────────── */

// ── Particles ──────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('particles');
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#a78bfa', '#34d399'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 5 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 18 + 12}s;
      animation-delay:${Math.random() * 10}s;
      filter:blur(${Math.random() > 0.5 ? '1px' : '0'});
    `;
    container.appendChild(p);
  }
}
spawnParticles();

// ── Example Data ────────────────────────────────
const EXAMPLES = {
  numbers: '42, 7, 99, 3, 55, 21, 88, 14, 67, 30, 5, 73',
  names: 'Zara, Alice, Mia, Bob, Charlie, Diana, Oscar, Ethan, Sophia, Liam',
  dates: '2023-11-20, 2021-03-05, 2024-01-15, 2019-07-22, 2022-09-10, 2020-04-18',
  objects: JSON.stringify([
    { name: 'Alice', age: 30, score: 88 },
    { name: 'Bob', age: 24, score: 95 },
    { name: 'Charlie', age: 35, score: 72 },
    { name: 'Diana', age: 28, score: 91 },
    { name: 'Ethan', age: 22, score: 85 }
  ], null, 2),
};

document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.example;
    document.getElementById('data-input').value = EXAMPLES[key];
    if (key === 'objects') {
      document.getElementById('sort-by-input').value = 'age';
    } else {
      document.getElementById('sort-by-input').value = '';
    }
  });
});

// ── Toggle Order ────────────────────────────────
let sortOrder = 'ascending';
document.getElementById('btn-asc').addEventListener('click', () => {
  sortOrder = 'ascending';
  document.getElementById('btn-asc').classList.add('active');
  document.getElementById('btn-desc').classList.remove('active');
});
document.getElementById('btn-desc').addEventListener('click', () => {
  sortOrder = 'descending';
  document.getElementById('btn-desc').classList.add('active');
  document.getElementById('btn-asc').classList.remove('active');
});

// ── Section Helpers ─────────────────────────────
function showSection(id) {
  ['loading-section', 'results-section', 'error-section'].forEach(s => {
    document.getElementById(s).style.display = 'none';
  });
  if (id) document.getElementById(id).style.display = 'flex';
}

// ── Loading Steps Animation ─────────────────────
let loadingInterval = null;
function startLoadingSteps() {
  const steps = ['ls1', 'ls2', 'ls3', 'ls4'];
  let current = 0;
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'loading-step';
  });
  document.getElementById(steps[0]).classList.add('active');

  loadingInterval = setInterval(() => {
    if (current < steps.length - 1) {
      document.getElementById(steps[current]).classList.remove('active');
      document.getElementById(steps[current]).classList.add('done');
      current++;
      document.getElementById(steps[current]).classList.add('active');
    }
  }, 1200);
}
function stopLoadingSteps() {
  if (loadingInterval) { clearInterval(loadingInterval); loadingInterval = null; }
  ['ls1','ls2','ls3','ls4'].forEach(id => {
    document.getElementById(id).classList.remove('active');
    document.getElementById(id).classList.add('done');
  });
}

// ── Typewriter Effect ───────────────────────────
function typewriter(el, text, speed = 18) {
  el.textContent = '';
  let i = 0;
  const t = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(t);
  }, speed);
}

// ── Format Display ──────────────────────────────
function formatForDisplay(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    if (typeof data[0] === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return data.join('\n');
  }
  return String(data);
}

// ── Main Sort Function ──────────────────────────
async function doSort() {
  const rawData = document.getElementById('data-input').value.trim();
  if (!rawData) {
    document.getElementById('data-input').style.borderColor = 'rgba(244,63,94,0.6)';
    setTimeout(() => {
      document.getElementById('data-input').style.borderColor = '';
    }, 1500);
    return;
  }

  const sortBy = document.getElementById('sort-by-input').value.trim();

  // Disable button
  const btn = document.getElementById('sort-btn');
  btn.disabled = true;
  btn.querySelector('.sort-btn-text').textContent = 'Sorting…';

  showSection('loading-section');
  startLoadingSteps();

  try {
    const resp = await fetch('/api/sort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rawData, sortBy, order: sortOrder }),
    });

    const result = await resp.json();
    stopLoadingSteps();

    if (!resp.ok || result.error) {
      throw new Error(result.error || 'Unexpected server error');
    }

    // ── Render Results ──────────────────────────
    // Before
    document.getElementById('before-display').textContent = rawData;

    // Data type badge
    const badge = document.getElementById('data-type-badge');
    badge.textContent = result.dataType || 'data';

    // After
    const afterDisplay = document.getElementById('after-display');
    afterDisplay.textContent = formatForDisplay(result.sorted);

    // Explanation
    typewriter(document.getElementById('exp-text'), result.explanation || 'Data sorted successfully.', 14);

    // Steps
    const stepsList = document.getElementById('steps-list');
    stepsList.innerHTML = '';
    const steps = result.steps || [];
    steps.forEach((step, i) => {
      const el = document.createElement('div');
      el.className = 'step-item';
      el.style.animationDelay = `${i * 0.12}s`;
      el.innerHTML = `
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${step}</div>
      `;
      stepsList.appendChild(el);
    });

    showSection('results-section');

  } catch (err) {
    stopLoadingSteps();
    document.getElementById('error-msg').textContent = err.message || 'Something went wrong. Please try again.';
    showSection('error-section');
  } finally {
    btn.disabled = false;
    btn.querySelector('.sort-btn-text').textContent = 'Sort with AI';
  }
}

// ── Copy Button ─────────────────────────────────
document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.getElementById('after-display').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
});

// ── Sort Again ───────────────────────────────────
document.getElementById('sort-again-btn').addEventListener('click', () => {
  showSection(null);
  document.getElementById('data-input').value = '';
  document.getElementById('sort-by-input').value = '';
  document.getElementById('data-input').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Retry ────────────────────────────────────────
document.getElementById('retry-btn').addEventListener('click', () => {
  showSection(null);
});

// ── Sort Button ──────────────────────────────────
document.getElementById('sort-btn').addEventListener('click', doSort);

// ── Enter Key ────────────────────────────────────
document.getElementById('data-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doSort();
});
