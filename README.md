# Build a Sentence — TOEFL Practice App

A React app for practicing the TOEFL Writing **Build a Sentence** task.

## Quick Start

```bash
npm install
cp .env.example .env.local
```

Add your MongoDB Atlas connection string to `.env.local`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=building_sentence_app
```

Start the app (frontend + API together):

```bash
npm run dev
```

Open **http://localhost:5173**

> **Important:** Do not use `vite` alone — the `/api` routes will 404. Always use `npm run dev`.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in **Project Settings → Environment Variables**:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` = `building_sentence_app`
4. Redeploy after saving env vars

### MongoDB Atlas checklist

- Database user with read/write access
- **Network Access** → allow `0.0.0.0/0`
- Password URL-encoded in connection string if it contains special characters

### Test production API

```
https://YOUR-APP.vercel.app/api/health
```

Should return: `{"ok":true,"database":"connected"}`

## Adding Questions

Edit `src/data/questions.json`. Each question:

```json
{
  "id": 1,
  "prompt": "How do you stay in touch with friends?",
  "sentenceStart": "I",
  "sentenceEnd": ".",
  "options": ["video", "use", "mostly", "messaging apps"],
  "correctAnswer": ["mostly", "use", "messaging apps", "and", "video", "calls"]
}
```

## How to Practice

1. Enter your name — progress saves to MongoDB Atlas
2. Choose a practice test (10 questions, 6-minute timer)
3. Build sentences from the word bank
4. Review results and reopen completed tests anytime
