# Build a Sentence — TOEFL Practice App

A React app for practicing the TOEFL Writing **Build a Sentence** task.

## Quick Start

```bash
npm install
cp .env.example .env.local
```

Add your MongoDB Atlas connection string to `.env.local`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=building_sentence_app
```

Run the app locally (frontend + API):

```bash
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:3000`).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in **Project Settings → Environment Variables**:
   - `MONGODB_URI` — your Atlas connection string
   - `MONGODB_DB_NAME` — e.g. `building_sentence_app`
4. Deploy

### MongoDB Atlas setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write access
3. In **Network Access**, allow access from anywhere (`0.0.0.0/0`) so Vercel can connect
4. Copy the connection string into `MONGODB_URI`

User profiles and completed test results are stored in the `users` collection.

## Adding Your Own Questions

Edit `src/data/questions.json`. Each question follows this format:

```json
{
  "id": 1,
  "prompt": "How do you stay in touch with friends?",
  "sentenceStart": "I",
  "sentenceEnd": ".",
  "options": ["video", "use", "mostly", "messaging apps", "calls", "write letters", "and"],
  "correctAnswer": ["mostly", "use", "messaging apps", "and", "video", "calls"]
}
```

| Field | Description |
|---|---|
| `prompt` | The question shown by the pink avatar |
| `sentenceStart` | Text before the blanks (e.g. `"I"` or `"She wanted to know"`) |
| `sentenceEnd` | Punctuation or text after the blanks (usually `"."`) |
| `options` | All word chunks shown in the word bank (can include distractors) |
| `correctAnswer` | Words in the correct order — number of blanks = length of this array |

## How to Practice

1. Enter your name — progress syncs to the cloud per user
2. Choose a practice test (10 questions each, 6-minute timer)
3. Click words from the word bank to fill the blanks in order
4. Click a filled blank to remove that word
5. Click **Check Answer** to see if you're correct
6. View your score and answer review when done
7. Reopen completed tests to see previous results, or reset and try again
