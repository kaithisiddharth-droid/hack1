# ◈ StructAI — Unstructured to Structured Data

> Paste any messy text. Get a perfectly sorted, structured table instantly — powered by **Qwen 2.5** via Featherless AI with a deterministic JS sorting engine for 100% accuracy.

![StructAI](https://img.shields.io/badge/AI-Qwen%202.5%207B-6366f1?style=flat-square) ![Node](https://img.shields.io/badge/Node.js-Express-10b981?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-06b6d4?style=flat-square)

---

## ✨ Features

- **AI Extraction** — Qwen 2.5 (via Featherless AI) reads raw text and identifies fields & records automatically
- **Deterministic Sorting** — All sorting is done in JavaScript, never by the LLM — perfect numeric, date, and alphabetical ordering every time
- **Sort Controls UI** — Pick any column, toggle Ascending/Descending, or click any table header to sort instantly
- **Multi-format Output** — View as Table, JSON, or CSV
- **Copy & Download** — One-click copy or download as `.json` / `.csv`
- **Glassmorphism Dark UI** — Modern, animated interface with particle effects

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- A [Featherless AI](https://featherless.ai) API key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/kaithisiddharth-droid/hack1.git
cd hack1

# 2. Install dependencies
npm install

# 3. Add your API key
echo "FEATHERLESS_API_KEY=your_key_here" > .env

# 4. Start the server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML, Vanilla CSS, Vanilla JS |
| Backend | Node.js + Express |
| AI Model | Qwen/Qwen2.5-7B-Instruct via Featherless AI |
| Fonts | Syne, Outfit, Fira Code (Google Fonts) |

---

## 📂 Project Structure

```
hack1/
├── public/
│   ├── index.html      # UI layout
│   ├── style.css       # Glassmorphism dark theme
│   ├── app.js          # Frontend logic + sort controls
│   └── favicon.ico
├── server.js           # Express API + deterministic sort engine
├── package.json
└── .env                # FEATHERLESS_API_KEY (not committed)
```

---

## ⚡ How the Sort Engine Works

The LLM is only used for **data extraction** — never for sorting. After extraction, a deterministic JS engine:

1. **Detects column type** — number, date, or string (majority-wins per column)
2. **Strips symbols** — removes `$`, `€`, `£`, `%`, commas before numeric comparison
3. **Sorts accurately** — uses `localeCompare` for strings, numeric subtraction for numbers, `Date.getTime()` for dates
4. **Pushes empty values to the bottom** — regardless of sort direction

This guarantees **100% accurate sorting** with no hallucinations.

---

## 📝 License

MIT