# Agentic Recruitment - AI-Powered Talent Scouting & Engagement

![Gemini API](https://img.shields.io/badge/Google-Gemini%20API-4285F4?style=flat&logo=google&logoColor=white)
![React](https://img.shields.io/badge/React-18.0-61DAFB?style=flat&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite&logoColor=white)

**AI-powered candidate discovery and engagement. Upload a job description, find matching candidates, run simulated conversations to assess genuine interest, and get a ranked shortlist scored on match and interest.**

---

## 🎯 The Problem

Recruiters spend hours sifting through profiles and chasing candidate interest. Traditional matching systems focus only on skills, missing the critical human element: **genuine interest**. A candidate with perfect skills but no motivation will ghost you, while a slightly less qualified but highly interested candidate could be your next hire.

**Agentic Recruitment solves this by:**
1. **Parsing JDs with visual context preservation** - Converting documents to images to capture layout, formatting, and visual hierarchy
2. **Hybrid semantic matching** - Combining lexical (BM25F) and semantic (embeddings) signals for accurate skill matching
3. **Simulated conversational outreach** - Two-LLM system that conducts screening calls to assess genuine interest
4. **Combined scoring** - Ranking candidates on both match (60%) and interest (40%) dimensions
5. **Serverless hybrid search engine** - Custom BM25 inverted index and Cosine Similarity vector math running entirely in-memory, no expensive Vector DBs or Search clusters required

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKFLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

JD Input (PDF/Image/Text)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: JD EXTRACTION (Visual Context Preservation)                      │
│  ───────────────────────────────────────────────────────────────────────────│
│  • PDF → Image conversion (PDF.js, 2x scale rendering)                     │
│  • Direct image uploads                                                    │
│  • Text input support                                                      │
│  • Gemini Vision API with structured JSON output                            │
│  • JSON sanitization & repair (jsonrepair)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
   Structured JD JSON
   (role, skills, experience, compensation, etc.)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: EMBEDDING GENERATION                                             │
│  ───────────────────────────────────────────────────────────────────────────│
│  • Gemini embedding-2 model                                                │
│  • Generates 768-dim vector from JD text                                  │
│  • Used for semantic similarity matching                                   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
   JD with Embedding Vector
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: CANDIDATE MATCHING (MatchEngine)                                 │
│  ───────────────────────────────────────────────────────────────────────────│
│  1. BM25F Lexical Matching (60% weight)                                    │
│     • Field-weighted scoring (skills, title, domain)                      │
│     • Skill synonym expansion (js→javascript, k8s→kubernetes)              │
│     • IDF normalization across candidate corpus                            │
│                                                                             │
│  2. Vector Semantic Similarity (25% weight)                               │
│     • Cosine similarity between JD and candidate embeddings                │
│                                                                             │
│  3. Bonus Scoring (15% weight)                                             │
│     • Experience proximity (within range, over/under qualified)            │
│     • Location compatibility (remote, city match, relocation)              │
│     • Salary alignment (within budget, negotiable)                         │
│     • Availability status (actively looking, notice period)                │
│                                                                             │
│  4. Must-Have Gate                                                         │
│     • Mathematical hard-gate: 0.35 + 0.65 × mustHaveRatio                  │
│     • Prevents false positives from nice-to-have skill matches            │
│                                                                             │
│  5. Deterministic Explainability                                          │
│     • Zero-latency, zero-hallucination explanations via set-diffing        │
│     • Pure mathematical comparison of JD vs candidate tokens               │
│     • Instant skill gaps, salary alignment, experience proximity            │
│     • Strength tags generated without LLM API calls                        │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
   Top 6 Ranked Candidates (Match Score 0-100)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: AGENTIC CONVERSATIONS (ConversationEngine)                       │
│  ───────────────────────────────────────────────────────────────────────────│
│  Parallel execution for all 6 candidates                                    │
│                                                                             │
│  For each candidate:                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Recruiter LLM (System Prompt)                                        │  │
│  │ • Role context, skills, compensation, location                        │  │
│  │ • Goal: Assess 4 dimensions (situation, interest, availability, salary)│  │
│  │ • Rules: 1 question per message, <80 words, warm & professional      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              ↕ 5-turn conversation loop                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Candidate LLM (System Prompt)                                         │  │
│  │ • Persona: name, title, skills, experience, salary expectations       │  │
│  │ • Personality: motivators, dealbreakers, communication style          │  │
│  │ • Attitude: based on domain match (genuinely interested or cautious)   │  │
│  │ • Rules: Stay in character, <100 words, natural responses            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              ↕                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Judge LLM (JSON Mode)                                                 │  │
│  │ • Analyzes full transcript                                            │  │
│  │ • Scores interest (0-100)                                            │  │
│  │ • Categorizes: high/medium/low/none                                   │  │
│  │ • Identifies blockers & positive signals                              │  │
│  │ • Generates human-readable summary                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
   Conversation Results (Interest Score 0-100)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: COMBINED SCORING & FINAL RANKING                                 │
│  ───────────────────────────────────────────────────────────────────────────│
│  Combined Score = (Match Score × 0.60) + (Interest Score × 0.40)           │
│                                                                             │
│  Re-rank candidates by combined score                                      │
│  Display both scores separately in UI                                        │
│  Show interest level badges (high/medium/low)                              │
│  Enable "View Chat" to see full conversation transcript                     │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
   Final Shortlist (Actionable for Recruiter)
```

---

## 🔑 Key Technical Decisions

### 1. Visual Context Preservation in JD Extraction

**Why convert PDFs to images?**
- Traditional text extraction loses formatting, layout, and visual hierarchy
- Job descriptions often use visual cues (bullet points, sections, emphasis) that convey meaning
- Gemini Vision API can understand both text and visual structure simultaneously

**Implementation:**
```javascript
// PDF.js renders each page at 2x scale for quality
const viewport = page.getViewport({ scale: 2.0 });
canvas.width = viewport.width;
canvas.height = viewport.height;
await page.render(renderContext).promise;
// Convert to PNG blob for Gemini Vision
```

**Benefits:**
- Preserves section headers, bullet points, formatting
- Captures tables, diagrams, or visual elements in JDs
- Better extraction accuracy for complex layouts

### 2. Hybrid Matching (BM25F + Vector Similarity)

**Why not just embeddings?**
- Pure semantic matching can miss exact skill matches (e.g., "React" vs "React.js")
- BM25F provides precise lexical matching with field weights
- Combination gives best of both: precision + semantic understanding

**Score Fusion Weights:**
- BM25F: 60% (primary signal - skills must match)
- Vector: 25% (semantic confirmation)
- Bonuses: 15% (experience, location, salary, availability)

**Field Weights (BM25F):**
```javascript
FIELD_W = {
  primary_skills:     15,  // Highest weight - must-have skills
  must_have_blob:     14,  // Normalized skill names
  job_title:          10,
  target_titles:       9,
  domain_knowledge:    9,
  secondary_skills:    7,
  nice_to_have_blob:   6,
  // ... lower weights for other fields
}
```

### 3. Two-LLM Agentic Conversations

**Why simulate conversations instead of asking candidates directly?**
- Instant screening without manual outreach
- Consistent evaluation criteria across all candidates
- Can scale to hundreds of candidates in parallel
- Identifies genuine interest before human time investment

**Conversation Design:**
- **5 turns** - Long enough to assess all dimensions, short enough to be efficient
- **Recruiter rules:** 1 question per message, <80 words, warm & professional
- **Candidate persona:** Based on actual candidate profile (skills, experience, salary expectations)
- **Attitude modeling:** Domain match determines genuine interest vs cautious curiosity

**Judge LLM with JSON Mode:**
```javascript
responseMimeType: "application/json"  // Reliable structured output
{
  "interest_score": 85,              // 0-100
  "interest_level": "high",          // high/medium/low/none
  "enthusiasm": "excited",
  "salary_signal": "well_aligned",
  "availability_signal": "immediate",
  "blockers": [],
  "positive_signals": ["asked follow-up questions", "showed domain enthusiasm"],
  "summary": "Strong candidate with genuine interest..."
}
```

### 4. Combined Scoring (60% Match + 40% Interest)

**Why this split?**
- Skills are necessary but not sufficient
- A perfect skill match with no interest = wasted effort
- Interest compensates for minor skill gaps
- Reflects real-world hiring decisions

**Formula:**
```javascript
combinedScore = (matchScore × 0.60) + (interestScore × 0.40)
```

**The Must-Have Gate:**
Semantic search often yields false positives (e.g., matching a candidate with 10 "nice-to-have" skills but missing the core "must-have" requirement). We implemented a mathematical hard-gate:
`mustHaveGate = 0.35 + 0.65 × (matchedMustHaves / totalMustHaves)`
If a candidate lacks core skills, their maximum possible fused score is clamped to 35%, ensuring recruiters only see genuinely qualified people at the top of the shortlist.

**Example:**
- Candidate A: Match 90, Interest 40 → Combined: 70
- Candidate B: Match 75, Interest 85 → Combined: 79
- **Result:** Candidate B ranks higher despite lower match score

### 5. Deterministic Explainability (Zero-Latency & Hallucination-Free)

**Problem:** Using LLMs to explain *why* a candidate matched is slow (high latency) and prone to hallucinations.
**Solution:** Our Match Engine generates human-readable summaries and "Strength Tags" purely deterministically. By performing mathematical set-diffing between the JD's normalized tokens and the Candidate's BM25 index, the engine instantly calculates exact skill gaps (`must_have_missing`), salary alignments, and experience proximity.
**Result:** 0ms latency explainability, 0 API cost, and 100% factual accuracy.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── landing/           # Landing page components
│   │   ├── Hero/         # Hero section with animations
│   │   ├── SocialProof/  # Trust indicators
│   │   └── Action/       # CTA buttons
│   └── ui/
│       ├── JDSearchModal.jsx      # 3-step JD extraction modal
│       ├── ChatViewModal.jsx     # Conversation transcript viewer
│       └── GlobalHeader.jsx      # Navigation header
│
├── pages/
│   ├── LandingPage.jsx   # Main landing page
│   └── ResultsPage.jsx   # Candidate results + negotiations
│
├── utils/
│   ├── buggu/             # JD extraction utilities
│   │   ├── geminiAI.js    # Gemini Vision API + structured output
│   │   ├── pdfProcessor.js # PDF → Image conversion
│   │   └── jsonUtils.js  # JSON sanitization & repair
│   ├── embeddingGenerator.js  # JD embedding generation
│   ├── MatchEngine.js         # Hybrid matching engine
│   └── ConversationEngine.js  # Two-LLM conversation system
│
├── data/
│   └── candidate_db_with_vectors.json  # Pre-computed candidate embeddings
│
└── hooks/
    ├── useDocumentProcessor.js  # File upload & processing
    └── useDocumentHead.js       # Dynamic page metadata
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/AnchitSingh/agentic-recruitment.git
cd agentic-recruitment

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Gemini API key: VITE_GEMINI_API_KEY=your_key_here
```

**Sample JDs:** For testing, sample job descriptions are available in the `sample_data/` directory.

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🔧 Configuration

### Environment Variables

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Key Parameters

**MatchEngine:**
```javascript
BM25_WEIGHT = 0.60      // Lexical matching weight
VECTOR_WEIGHT = 0.25    // Semantic similarity weight
BONUS_WEIGHT = 0.15    // Experience/location/salary/availability
K1 = 1.5               // BM25 term saturation parameter
B = 0.75               // BM25 length normalization
```

**ConversationEngine:**
```javascript
MAX_TURNS = 5           // Conversation turns per candidate
MAX_TOKENS_CHAT = 700    // Max tokens per conversation message
MAX_TOKENS_JUDGE = 1000  // Max tokens for judge reasoning
MAX_RETRIES = 3         // API retry attempts with exponential backoff
```

**Combined Scoring:**
```javascript
MATCH_WEIGHT = 0.60      // Match score contribution
INTEREST_WEIGHT = 0.40   // Interest score contribution
```

---

## 📊 Data Models

### Job Description (JD)
```json
{
  "jd_id": "jd_abc123",
  "parsed_at": "2026-04-25T10:00:00Z",
  "role": {
    "title": "Senior Frontend Engineer",
    "seniority": "senior",
    "location": { "type": "remote", "remote_allowed": true }
  },
  "experience": { "min_years": 5, "max_years": 10 },
  "skills": {
    "must_have": [
      { "name": "React", "normalized": "react", "weight": 1.0 }
    ],
    "nice_to_have": [
      { "name": "TypeScript", "normalized": "typescript", "weight": 0.5 }
    ],
    "domain_knowledge": [
      { "name": "fintech", "weight": 0.8 }
    ]
  },
  "compensation": { "min_lpa": 30, "max_lpa": 50, "currency": "INR" },
  "meta": {
    "embedding_text": "Full text for embedding generation...",
    "embedding_vector": [0.1, -0.2, ...]  // 768-dim vector
  }
}
```

### Candidate
```json
{
  "candidate_id": "cand_456",
  "personal": {
    "name": "John Doe",
    "location": { "city": "Bangalore", "open_to_remote": true }
  },
  "role": {
    "current_title": "Frontend Developer",
    "seniority": "mid",
    "target_titles": ["Senior Frontend Engineer"]
  },
  "skills": {
    "primary": [
      { "name": "React", "years": 4 },
      { "name": "TypeScript", "years": 3 }
    ],
    "domain_knowledge": [
      { "name": "fintech", "strength": "moderate" }
    ]
  },
  "experience": {
    "total_years": 6,
    "current_company": "TechCorp"
  },
  "compensation": {
    "expected_lpa": 35,
    "negotiable": true
  },
  "availability": {
    "status": "actively_looking",
    "notice_period_days": 30
  },
  "persona": {
    "motivators": ["technical challenges", "growth"],
    "dealbreakers": ["micromanagement"],
    "communication_style": "professional and direct"
  },
  "meta": {
    "embedding_vector": [0.05, -0.15, ...]  // Pre-computed
  }
}
```

### Match Result
```json
{
  "candidate": { ... },
  "matchScore": 85.5,
  "scoreBreakdown": {
    "bm25_raw": 12.34,
    "vector_similarity": 0.78,
    "experience_score": 0.95,
    "location_score": 1.0,
    "salary_score": 0.9,
    "availability_score": 0.85
  },
  "explanation": {
    "must_have_matched": ["React", "TypeScript"],
    "must_have_missing": [],
    "nice_to_have_matched": ["GraphQL"],
    "domain_matched": ["fintech"],
    "experience_note": "6 years — within range (5–10)",
    "salary_note": "Expects 35 INR — within budget (30–50)",
    "availability_note": "Actively looking · 30-day notice period",
    "strength_tags": [
      { "label": "Full Skills Match", "color": "green" },
      { "label": "Domain Expert", "color": "blue" }
    ],
    "summary": "John Doe matches all required skills with hands-on fintech domain experience..."
  }
}
```

### Conversation Result
```json
{
  "candidate_id": "cand_456",
  "candidate_name": "John Doe",
  "transcript": [
    { "role": "recruiter", "content": "Hi John, thanks for joining...", "turn": 0 },
    { "role": "candidate", "content": "Thanks for reaching out...", "turn": 0 },
    // ... 5 turns total
  ],
  "interest_score": 85,
  "interest_level": "high",
  "enthusiasm": "excited",
  "salary_signal": "well_aligned",
  "availability_signal": "short_notice",
  "blockers": [],
  "positive_signals": [
    "Asked follow-up questions about the tech stack",
    "Showed genuine enthusiasm for fintech domain"
  ],
  "summary": "Strong candidate with genuine interest in the role and domain alignment..."
}
```

### Final Shortlist Entry
```json
{
  "candidate": { ... },
  "matchScore": 85.5,
  "interestScore": 85,
  "combinedScore": 85.3,  // (85.5 × 0.60) + (85 × 0.40)
  "matchExplanation": { ... },
  "matchBreakdown": { ... },
  "interestLevel": "high",
  "enthusiasm": "excited",
  "salarySignal": "well_aligned",
  "availabilitySignal": "short_notice",
  "blockers": [],
  "positiveSignals": [...],
  "interestSummary": "...",
  "transcript": [...],
  "strengthTags": [...]
}
```

---

## 🎨 UI Features

### JD Search Modal (3-Step Process)
1. **Input**: Upload PDF/image or paste text
2. **Processing**: Visual progress with stage indicators
3. **Review**: Review extracted JD data before proceeding

### Results Page
- **Candidate Cards**: Display match score, skills, experience, location
- **Score Breakdown**: Expandable details showing BM25, vector, and bonus scores
- **Skill Badges**: Color-coded for must-have/nice-to-have/missing skills
- **Interest Level**: High/medium/low badges after conversations
- **Combined Score**: Shows both match and interest scores

### Agentic Negotiations
- **Progress Tracking**: Real-time status per candidate (running/done/error)
- **View Chat**: Modal to view full conversation transcript
- **Interest Summary**: Judge's assessment with blockers and positive signals
- **Retry Capability**: Automatic retry on API errors

---

## 🔬 Technical Deep Dives

### BM25F Implementation

**Why BM25F instead of standard BM25?**
- Standard BM25 treats all fields equally
- BM25F allows field-specific weights (skills > title > description)
- Better matches recruitment domain where certain fields matter more

**Formula:**
```
score(IDF, TF, fieldLen, avgFieldLen) = IDF × fieldWeight × TF × (K1 + 1) / (TF + K1 × (1 - B + B × fieldLen/avgFieldLen))
```

**Field Length Normalization:**
- Prevents longer profiles from dominating
- Each field has its own average length in the corpus
- B=0.75 balances length penalty

### Skill Synonym Expansion

**Problem:** "React" ≠ "React.js" ≠ "reactjs" in exact matching

**Solution:** Bidirectional synonym mapping
```javascript
SKILL_SYNONYMS = {
  react: ['reactjs', 'react.js'],
  javascript: ['js', 'nodejs', 'ecmascript'],
  k8s: ['kubernetes'],
  // ... 100+ mappings
}
```

**Expansion at 0.7× weight:**
- Original skill: weight 1.0
- Synonyms: weight 0.7
- Prevents synonym explosion while adding signal

### Must-Have Gate

**Problem:** Candidate with 0 must-have skills could still score high on other factors

**Solution:**
```javascript
mustHaveRatio = matchedMustHaves / totalMustHaves
mustHaveGate = 0.35 + 0.65 × mustHaveRatio
finalScore = fusedScore × mustHaveGate
```

**Effect:**
- 0 must-haves → 35% of original score
- 50% must-haves → 67.5% of original score
- 100% must-haves → 100% of original score

### Conversation Retry Logic

**Problem:** Gemini API rate limits (429 errors)

**Solution:** Exponential backoff
```javascript
for (attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    response = await fetch(url, options);
    if (response.status === 429) {
      waitTime = 2^attempt × 800ms;  // 800ms, 1.6s, 3.2s
      await sleep(waitTime);
      continue;
    }
    return response;
  } catch (err) {
    if (attempt === MAX_RETRIES - 1) throw err;
    await sleep(2^attempt × 500ms);
  }
}
```

### Self-Healing & Production Resilience


- **JSON Healing:** If the Judge LLM or Vision LLM forgets markdown blocks or hallucinates malformed JSON, the pipeline catches it and uses `jsonrepair` to reconstruct the AST and salvage the payload.
- **Exponential Backoff:** The Multi-Agent conversation loop explicitly catches `HTTP 429` (Rate Limit) errors from the Gemini API and dynamically pauses, preventing cascading failures during high-concurrency parallel Agent talks.

### JSON Mode for Judge LLM

**Problem:** LLMs sometimes return invalid JSON or add markdown

**Solution:**
```javascript
generationConfig: {
  responseMimeType: "application/json",  // Forces JSON output
  responseJsonSchema: judgeSchema        // Validates structure
}
```

**Fallback:**
```javascript
try {
  return JSON.parse(response);
} catch {
  const cleaned = sanitizeJSON(response);  // Remove markdown
  const repaired = jsonrepair(cleaned);    // Fix syntax errors
  return JSON.parse(repaired);
}
```

---

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for recruiters who want to hire smarter, not harder.**
