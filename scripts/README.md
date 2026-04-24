# Quiz Data Generation Scripts

## Quick Start

### 1. Enrich Quiz Metadata
```bash
node scripts/enrich-metadata.js examples/sample-quiz.json
```

This will:
- Auto-extract medical abbreviations (ACE, MI, CHF, etc.)
- Detect body system (Cardiovascular, Respiratory, etc.)
- Add student lingo based on category
- Extract keywords from question text
- Output: `examples/sample-quiz-enriched.json`

### 2. Import to Supabase
```bash
node scripts/import-to-supabase.js examples/sample-quiz-enriched.json
```

This will:
- Validate quiz structure
- Insert quiz into `quizzes` table
- Insert questions into `questions` table
- Save metadata to `src/data/quiz-metadata/{slug}.json`

### 3. Test the Quiz
Open your app and search for the quiz title. The rich metadata ensures it's discoverable!

---

## Workflow for Large-Scale Generation

### Step 1: Generate with AI (GPT-4/Claude)

Use this prompt template:

```
Generate a USMLE Step 2 CK quiz on Cardiology - Acute Coronary Syndrome with 10 questions.

Requirements:
- Board-style clinical vignettes
- 4 answer options per question
- Detailed explanations with mechanisms
- Realistic patient scenarios
- High-yield concepts

Output as JSON matching this schema:
{
  "quiz": {
    "slug": "cardiology-acute-coronary-syndrome",
    "title": "Cardiology: Acute Coronary Syndrome",
    "description": "...",
    "category": "Step 2 CK",
    "subject": "Cardiology",
    "difficulty": "medium",
    "time_limit": 45
  },
  "questions": [
    {
      "slug": "stemi-management-primary-pci",
      "question_text": "A 58-year-old man presents...",
      "question_type": "MCQ",
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "...",
      "subject": "Cardiology",
      "topic": "STEMI Management",
      "difficulty": "medium"
    }
  ]
}
```

Save output to `generated/cardiology-acs.json`

### Step 2: Enrich Metadata
```bash
node scripts/enrich-metadata.js generated/cardiology-acs.json enriched/cardiology-acs.json
```

### Step 3: Manual Review
- Check medical accuracy
- Verify explanations
- Adjust difficulty ratings
- Add high-yield flags

### Step 4: Import to Supabase
```bash
node scripts/import-to-supabase.js enriched/cardiology-acs.json
```

### Step 5: Rebuild Search Index (if needed)
If you're using static search data, rebuild the index:
```bash
node scripts/build-search-index.js
```

---

## Batch Processing

### Import Multiple Quizzes
```bash
# Combine multiple quizzes into array
cat enriched/*.json | jq -s '.' > batch.json

# Import all at once
node scripts/import-to-supabase.js batch.json
```

---

## Quality Checklist

Before importing, ensure each quiz has:

- ✅ Unique slug (kebab-case)
- ✅ Descriptive title (50-100 chars)
- ✅ Clear description (100-200 chars)
- ✅ Valid category (Step 1, Step 2 CK, Step 3)
- ✅ 5-50 questions
- ✅ Each question has exactly 4 options
- ✅ Exactly 1 correct answer per question
- ✅ Explanation >50 characters
- ✅ Medical abbreviations extracted
- ✅ Student lingo added
- ✅ Body system classified

---

## Troubleshooting

### "Invalid slug format"
Slugs must be lowercase with hyphens only: `cardiology-heart-failure`

### "Must have exactly 1 correct answer"
Check that only one option has `"isCorrect": true`

### "Supabase connection failed"
Verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Duplicate slug"
Each quiz and question must have a unique slug. Add a suffix: `cardiology-hf-2`

---

## Advanced: AI Generation Script

Create `scripts/generate-with-ai.js`:

```javascript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateQuiz(category, subject, topic, count = 10) {
  const prompt = `Generate a USMLE ${category} quiz on ${subject} - ${topic} with ${count} questions...`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  const quiz = JSON.parse(response.choices[0].message.content);
  
  const filename = `generated/${subject.toLowerCase()}-${topic.toLowerCase().replace(/\s+/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(quiz, null, 2));
  
  console.log(`✅ Generated: ${filename}`);
}

// Usage: node scripts/generate-with-ai.js
generateQuiz('Step 2 CK', 'Cardiology', 'Heart Failure', 10);
```

---

## Tips for Scale

### For 1,000+ Questions

1. **Batch by subject**: Generate 50 quizzes at a time
2. **Use rate limits**: Add delays between API calls
3. **Version control**: Keep generated JSON in Git
4. **Medical review**: Have medical students validate content
5. **A/B test difficulty**: Calibrate based on user performance

### For 10,000+ Questions

1. **Lazy load search index**: Split by category
2. **Use Supabase full-text search**: Add `tsvector` column
3. **CDN for images**: Store question images in S3/Cloudflare
4. **Cache quiz data**: Use Redis for frequently accessed quizzes
5. **Incremental updates**: Only rebuild changed quizzes

---

## Next Steps

1. Generate 10 sample quizzes across different subjects
2. Import and test search functionality
3. Gather user feedback on question quality
4. Scale to 100 quizzes
5. Implement analytics to track popular topics
6. Continuously improve based on user performance data
