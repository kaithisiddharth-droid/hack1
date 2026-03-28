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

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Structure error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to structure data' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 StructAI running at http://localhost:${PORT}\n`);
});
