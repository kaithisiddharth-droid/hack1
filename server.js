import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  baseURL: 'https://api.featherless.ai/v1',
  apiKey: process.env.FEATHERLESS_API_KEY,
});

// ── Deterministic JS Sort (always correct) ──────────────────────────────────
function deterministicSort(arr, sortBy, order) {
  const desc = order === 'descending';
  const copy = [...arr];

  copy.sort((a, b) => {
    let valA = sortBy ? (a?.[sortBy] ?? a) : a;
    let valB = sortBy ? (b?.[sortBy] ?? b) : b;

    // Date detection
    const isDate = (v) => typeof v === 'string' && !isNaN(Date.parse(v)) && /[-/]/.test(v);
    if (isDate(valA) && isDate(valB)) {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    // Numeric coercion
    if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && valA !== '' && valB !== '') {
      valA = Number(valA);
      valB = Number(valB);
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return desc ? valB - valA : valA - valB;
    }

    const cmp = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
    return desc ? -cmp : cmp;
  });

  return copy;
}

// ── Parse raw input string into a JS array ──────────────────────────────────
function parseData(raw) {
  const trimmed = raw.trim();

  // JSON array / object
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) return [parsed];
  } catch (_) {}

  // Comma-separated
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(s => {
      const t = s.trim();
      return t !== '' && !isNaN(Number(t)) ? Number(t) : t;
    });
  }

  // Newline-separated
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(s => {
      const t = s.trim();
      return t !== '' && !isNaN(Number(t)) ? Number(t) : t;
    });
  }

  return [trimmed];
}

// ── Detect data type label ──────────────────────────────────────────────────
function detectType(arr, sortBy) {
  if (!arr.length) return 'unknown';
  const sample = sortBy ? (arr[0]?.[sortBy] ?? arr[0]) : arr[0];
  if (typeof sample === 'object' && sample !== null) return 'objects';
  if (typeof sample === 'number') return 'numbers';
  if (typeof sample === 'string') {
    if (!isNaN(Date.parse(sample)) && /[-/]/.test(sample)) return 'dates';
    if (!isNaN(Number(sample))) return 'numbers';
  }
  return 'strings';
}

// ── POST /api/sort ───────────────────────────────────────────────────────────
app.post('/api/sort', async (req, res) => {
  const { data, sortBy, order } = req.body;
  if (!data) return res.status(400).json({ error: 'No data provided' });

  // Step 1 – Parse reliably with JS
  let parsed;
  try {
    parsed = parseData(data);
  } catch (e) {
    return res.status(400).json({ error: 'Could not parse input: ' + e.message });
  }

  // Step 2 – Sort reliably with JS (no hallucinations)
  const sorted = deterministicSort(parsed, sortBy || null, order || 'ascending');
  const dataType = detectType(parsed, sortBy);

  // Step 3 – Ask LLM only for explanation + steps (not for sorting)
  const systemPrompt = `You are a data analyst assistant. Given information about a sorting operation, return ONLY a JSON object — no markdown, no extra text:
{
  "explanation": "A clear 2-3 sentence explanation of what the data is and how it was sorted",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}`;

  const userPrompt = `A user sorted the following data:
- Data type: ${dataType}
- Sort order: ${order || 'ascending'}
- Sort field: ${sortBy || 'auto-detected'}
- Input sample (first 5): ${JSON.stringify(parsed.slice(0, 5))}
- Output sample (first 5): ${JSON.stringify(sorted.slice(0, 5))}

Write a 2-3 sentence explanation and 3 concise steps describing what happened.`;

  let aiMeta = {
    explanation: `The ${dataType} data (${parsed.length} items) was sorted in ${order || 'ascending'} order.`,
    steps: [
      `Step 1: Detected the data as ${dataType}.`,
      `Step 2: Applied ${order || 'ascending'} sort${sortBy ? ` by "${sortBy}"` : ''}.`,
      `Step 3: Returned ${sorted.length} correctly ordered items.`,
    ],
  };

  try {
    const completion = await openai.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed2 = JSON.parse(match[0]);
      if (parsed2.explanation) aiMeta = parsed2;
    }
  } catch (err) {
    console.error('LLM explanation error (non-fatal):', err.message);
    // aiMeta fallback already set above
  }

  res.json({
    success: true,
    sorted,
    dataType,
    sortField: sortBy || null,
    explanation: aiMeta.explanation,
    steps: Array.isArray(aiMeta.steps) ? aiMeta.steps : [],
    original: data,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Data Sorter running at http://localhost:${PORT}\n`);
});
