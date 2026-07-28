# Build a Sentence — TOEFL Practice App

A React app for practicing the TOEFL Writing **Build a Sentence** task.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

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

**Tips:**
- Include extra words in `options` as distractors (words not used in `correctAnswer`)
- Duplicate words in `options` are supported if the sentence uses the same word twice
- Update `timeLimitSeconds` at the top level to change the timer (default: 340 = 5:40)

## How to Practice

1. Read the prompt
2. Click words from the word bank to fill the blanks in order
3. Click a filled blank to remove that word
4. Click **Check Answer** to see if you're correct
5. Use **Next Question** to move on (you can skip without checking)
6. View your score on the results screen when done or when time runs out
