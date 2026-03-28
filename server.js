import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

/* ─────────────────────────────────────────────────────────
   Deterministic Sorting Engine
   Never lets the LLM decide order — 100% JS, 100% accurate.
───────────────────────────────────────────────────────── */

/**
 * Parse a cell value into the most specific type possible.
 * Priority: number > date > string
 */
function parseValue(raw) {
  if (raw === null || raw === undefined) return { type: 'string', v: '' };
  const s = String(raw).trim();

  // Strip common currency / percentage symbols and thousands separators
  const stripped = s.replace(/[$€£¥₹,]/g, '').replace(/%$/, '').trim();

  // Pure number (int or float, including negatives)
  if (stripped !== '' && !isNaN(Number(stripped))) {
    return { type: 'number', v: Number(stripped) };
  }

  // Date / year patterns
  const dateAttempt = new Date(s);
  if (!isNaN(dateAttempt.getTime()) && /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(s)) {
    return { type: 'date', v: dateAttempt.getTime() };
  }

  return { type: 'string', v: s.toLowerCase() };
}

/**
 * Sort rows by a specific column index.
 * @param {string[][]} rows
 * @param {number} colIndex
 * @param {'asc'|'desc'} direction
 * @returns {string[][]}
 */
function sortRows(rows, colIndex, direction = 'asc') {
  const dir = direction === 'desc' ? -1 : 1;

  // Determine dominant type for the column (majority wins)
  const types = rows.map(r => parseValue(r[colIndex]).type);
  const typeCount = types.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0];

  return [...rows].sort((a, b) => {
    const av = parseValue(a[colIndex]);
    const bv = parseValue(b[colIndex]);

    // Empty values always go to the bottom regardless of direction
    if (a[colIndex] === '' && b[colIndex] !== '') return 1;
    if (b[colIndex] === '' && a[colIndex] !== '') return -1;

    let cmp = 0;
    if (dominantType === 'number') {
      const an = av.type === 'number' ? av.v : parseFloat(String(a[colIndex]).replace(/[$€£¥₹,%,]/g, '')) || 0;
      const bn = bv.type === 'number' ? bv.v : parseFloat(String(b[colIndex]).replace(/[$€£¥₹,%,]/g, '')) || 0;
      cmp = an - bn;
    } else if (dominantType === 'date') {
      cmp = av.v - bv.v;
    } else {
      cmp = String(a[colIndex]).localeCompare(String(b[colIndex]), undefined, { numeric: true, sensitivity: 'base' });
    }

    return cmp * dir;
  });
}

/**
 * Auto-detect the best default sort column.
 * Prefers a numeric column (salary, age, price, count, year, amount).
 * Falls back to the first column.
 */
function detectDefaultSort(fields) {
  const numericKeywords = /salary|price|cost|amount|age|year|count|stock|rating|experience|revenue|total|score|rank|number|qty|quantity/i;
  const idx = fields.findIndex(f => numericKeywords.test(f));
  return idx >= 0 ? idx : 0;
}

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

// POST /api/structure — convert unstructured text to structured data using LLM
app.post('/api/structure', async (req, res) => {
  const { data } = req.body;
  if (!data || !data.trim()) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const systemPrompt = `You are a data extraction expert. Your job is to read unstructured or messy text and convert it into clean structured data.

Return ONLY a valid JSON object in EXACTLY this format — no markdown, no explanation outside the JSON:
{
  "fields": ["field1", "field2", "field3"],
  "rows": [
    ["value1", "value2", "value3"],
    ["value1", "value2", "value3"]
  ],
  "title": "A short title describing the dataset (e.g. 'Employee Records')",
  "explanation": "2-3 sentences explaining what data was found and how it was structured.",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ]
}

Rules:
- fields: array of column header strings (snake_case or Title Case, consistent)
- rows: 2D array where each inner array corresponds to one record, values aligned with fields
- All values should be strings
- If a value is missing for a record, use an empty string ""
- Detect and normalize data types but keep values as strings
- title: concise label for the dataset
- explanation and steps: always include`;

  const userPrompt = `Convert the following unstructured data into a structured table:

"""
${data.trim()}
"""

Identify all fields/columns automatically. Extract every record as a row. Return only the JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      max_tokens: 2048,
      timeout: 25000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();

    // Extract JSON from the response (handles markdown code blocks too)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not extract JSON from AI response');

    const result = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!Array.isArray(result.fields) || !Array.isArray(result.rows)) {
      throw new Error('Invalid structure returned by AI');
    }

    // ── Deterministic sort after LLM extraction ──
    const defaultSortCol = detectDefaultSort(result.fields);
    const sortedRows = sortRows(result.rows, defaultSortCol, 'asc');

    res.json({
      success: true,
      ...result,
      rows: sortedRows,
      sortedBy: { colIndex: defaultSortCol, field: result.fields[defaultSortCol], direction: 'asc' },
    });
  } catch (err) {
    console.error('Structure error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to structure data' });
  }
});

// POST /api/sort — re-sort already-structured data (pure JS, no LLM)
app.post('/api/sort', (req, res) => {
  try {
    const { rows, colIndex, direction } = req.body;
    if (!Array.isArray(rows) || typeof colIndex !== 'number') {
      return res.status(400).json({ error: 'Invalid sort request' });
    }
    const sorted = sortRows(rows, colIndex, direction || 'asc');
    res.json({ success: true, rows: sorted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 StructAI running at http://localhost:${PORT}\n`);
});
