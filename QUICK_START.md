# 🎯 Data Generation Pipeline - Quick Reference

## Your Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DUAL STORAGE STRATEGY                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Supabase (PostgreSQL)          Client Search Engine        │
│  ├─ quizzes table               ├─ BM25F ranking            │
│  ├─ questions table             ├─ Medical synonyms         │
│  ├─ user_attempts               ├─ Abbreviation expansion   │
│  └─ user_bookmarks              ├─ Student lingo matching   │
│                                 └─ Fuzzy + prefix search    │
│                                                              │
│  Source of Truth                Built from metadata JSON    │
│  SEO & Sharing                  Fast client-side filtering  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (3 Commands)

```bash
# 1. Enrich metadata (auto-extract abbreviations, keywords, lingo)
node scripts/enrich-metadata.js examples/sample-quiz.json

# 2. Import to Supabase (inserts to DB + saves metadata)
node scripts/import-to-supabase.js examples/sample-quiz-enriched.json

# 3. Test in your app - search should work immediately!
npm run dev
```

## 📊 What Gets Stored Where

### Supabase Tables (Simple Schema)
```sql
quizzes:
  - slug, title, description
  - category, subject, difficulty
  - time_limit, is_published

questions:
  - slug, quiz_id, question_text
  - options (JSONB), correct_answer
  - explanation, subject, topic
```

### Metadata JSON (Rich Search Data)
```json
{
  "abbreviations": ["ACE", "MI", "CHF"],
  "lingo": ["shelf", "high yield", "pathoma"],
  "keywords": ["heart failure", "ejection fraction"],
  "system": "Cardiovascular",
  "tags": ["cardiology", "clinical"],
  "trending": false,
  "highYield": true
}
```

## 🎨 Data Generation Workflow

```
┌──────────────┐
│  AI (GPT-4)  │  Generate quiz JSON
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Enrich     │  Auto-extract metadata
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Validate   │  Check structure
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Import     │  Supabase + metadata JSON
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Deploy     │  Search works instantly!
└──────────────┘
```

## 🔍 Why This Architecture?

### Your Search Engine is SOPHISTICATED
- **12 weighted fields** (title, abbreviations, lingo, etc.)
- **Medical synonym expansion** (MI → myocardial infarction)
- **Student slang** ("pathoma", "sketchy", "shelf")
- **BM25F ranking** with fuzzy matching

### Simple Supabase Schema
- Clean, normalized tables
- Easy to query and maintain
- Great for SEO (public URLs)
- Handles user data (attempts, bookmarks)

### Best of Both Worlds
- **Supabase**: Source of truth, user data, SEO
- **Client search**: Fast, rich metadata, offline-capable
- **Metadata JSON**: Bridge between the two

## 📝 Sample Quiz Structure

```json
{
  "quiz": {
    "slug": "cardiology-heart-failure",
    "title": "Cardiology: Heart Failure Management",
    "category": "Step 2 CK",
    "subject": "Cardiology",
    "difficulty": "medium",
    "metadata": {
      "abbreviations": ["CHF", "HFrEF", "ACE", "BNP"],
      "lingo": ["shelf", "high yield", "clinical"],
      "system": "Cardiovascular",
      "highYield": true
    }
  },
  "questions": [
    {
      "slug": "ace-inhibitor-pregnancy",
      "question_text": "A 32-year-old pregnant woman...",
      "options": [
        {"text": "Lisinopril", "isCorrect": false},
        {"text": "Labetalol", "isCorrect": true}
      ],
      "explanation": "ACE inhibitors are contraindicated..."
    }
  ]
}
```

## 🎯 Key Features of Your Scripts

### `enrich-metadata.js`
- ✅ Auto-extracts medical abbreviations (ACE, MI, CHF)
- ✅ Detects body system (Cardiovascular, Neuro, etc.)
- ✅ Adds student lingo by category (m1, m2, shelf)
- ✅ Extracts keywords from question text
- ✅ Sets sensible defaults

### `import-to-supabase.js`
- ✅ Validates quiz structure
- ✅ Inserts to Supabase tables
- ✅ Saves metadata JSON for search
- ✅ Handles batch imports
- ✅ Rate limiting built-in

## 🏗️ Scaling Strategy

### For 100 Quizzes (Current)
✅ Client-side search with all metadata
✅ Fetch quiz content from Supabase on demand
✅ Fast, simple, works great

### For 1,000 Quizzes
✅ Same approach, still performant
✅ Consider lazy-loading search index by category
✅ Add caching for popular quizzes

### For 10,000+ Quizzes
- Split search index by category
- Add Supabase full-text search (tsvector)
- Use CDN for static assets
- Implement server-side search API

## 💡 Pro Tips

1. **Generate in batches**: 50 quizzes at a time
2. **Medical review**: Have students validate content
3. **Version control**: Keep generated JSON in Git
4. **A/B test difficulty**: Calibrate based on user performance
5. **Monitor search queries**: See what students actually search for

## 📚 Files Created

```
exam-buddy-main/
├── DATA_GENERATION_PIPELINE.md    # Comprehensive guide
├── scripts/
│   ├── README.md                  # Usage instructions
│   ├── enrich-metadata.js         # Auto-enrich metadata
│   └── import-to-supabase.js      # Import to database
├── examples/
│   └── sample-quiz.json           # Template to follow
└── src/data/quiz-metadata/        # Generated metadata (gitignore)
```

## 🚦 Next Steps

1. **Test the sample**: Run the 3 commands above
2. **Generate 10 quizzes**: Use GPT-4 with the prompt template
3. **Import and validate**: Check search functionality
4. **Scale gradually**: 10 → 50 → 100 → 1000 quizzes
5. **Gather feedback**: Monitor user engagement and search patterns

## 🎓 Why This Works

Your search engine expects **rich metadata** (abbreviations, lingo, keywords).
Your Supabase schema is **simple and clean** (just the essentials).

The metadata JSON files bridge the gap:
- Generated during import
- Loaded by client for search
- Not stored in database (keeps it clean)
- Easy to regenerate if needed

This gives you:
- ✅ Fast, sophisticated client-side search
- ✅ Clean, maintainable database
- ✅ Easy to scale and update
- ✅ Great SEO with public URLs

---

**You're ready to generate your quiz bank! Start with the sample quiz and scale from there.** 🚀
