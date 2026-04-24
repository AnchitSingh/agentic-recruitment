# Recruitment Search Engine - Implementation Plan

**Project**: AI-Powered Talent Scouting & Engagement Agent  
**Focus**: Adapt USMLE SearchEngine.js to recruitment matching (Layers 1-3)  
**Timeline**: Hackathon sprint  
**Status**: Planning phase

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ JD Input (JSON)                                             │
│ { title, skills_required, skills_preferred, experience,    │
│   domain, responsibilities, location, remote }              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Lexical Matching (BM25F + Fuzzy)                  │
│ - Reuse existing SearchEngine.js core                       │
│ - Adapt field weights for recruitment                       │
│ - Build tech synonym dictionary                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Semantic Matching (Embeddings)                    │
│ - Generate embeddings for JD and profiles                   │
│ - Compute cosine similarity                                 │
│ - Cache embeddings for performance                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Score Fusion                                       │
│ - Combine: 0.4 × BM25 + 0.6 × Semantic                     │
│ - Apply experience/domain boosters                          │
│ - Output: Match Score (0-100)                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Ranked Candidate List                                       │
│ [{ profile, matchScore, explanation }]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Schema & Setup (2-3 hours)

### 1.1 Define JD Schema
```javascript
{
  id: string,
  title: string,                    // "Senior Backend Engineer"
  skills_required: string[],        // ["Python", "PostgreSQL", "AWS"]
  skills_preferred: string[],       // ["Docker", "Kubernetes"]
  experience_min: number,           // 5
  experience_max: number,           // 10
  domain: string[],                 // ["fintech", "payments"]
  responsibilities: string,         // Free text description
  location: string,                 // "San Francisco" or "Remote"
  remote: boolean,
  salary_range: { min, max },
  education: string[]               // ["BS Computer Science"]
}
```

### 1.2 Define Candidate Profile Schema
```javascript
{
  id: string,
  name: string,
  title: string,                    // "Backend Engineer"
  skills: string[],                 // ["Python", "Django", "PostgreSQL"]
  experience_years: number,         // 6
  domain_experience: string[],      // ["fintech", "e-commerce"]
  work_history: [
    {
      company: string,
      role: string,
      duration_months: number,
      description: string
    }
  ],
  education: string[],
  location: string,
  remote_preference: boolean,
  salary_expectation: { min, max }
}
```

### 1.3 Create Dummy Dataset
- Generate 50-100 synthetic candidate profiles
- Cover diverse skill combinations (frontend, backend, fullstack, ML, DevOps)
- Vary experience levels (junior, mid, senior, staff)
- Mix domains (fintech, healthcare, e-commerce, SaaS)

**File**: `data/candidates.json`

---

## Phase 2: Layer 1 - Lexical Matching (4-5 hours)

### 2.1 Adapt SearchEngine.js Core

**File**: `src/search/RecruitmentSearchEngine.js`

#### Changes Required:

1. **Field Weights** (replace medical weights):
```javascript
this.W = {
  skills_required:   15,  // Must-have skills (highest priority)
  title:             12,  // Job title match
  skills_preferred:   8,  // Nice-to-have skills
  domain:             6,  // Industry experience
  work_history:       5,  // Past roles/companies
  responsibilities:   3,  // JD description
  education:          2,  // Degree requirements
  location:           2   // Geographic match
}
```

2. **Remove Medical-Specific Logic**:
- Delete `_diffMap` (Easy/Medium/Hard)
- Delete `_sysMap` (Cardiovascular/Renal/etc)
- Delete `_stepMap` (Step1/Step2/Step3)
- Delete `CAREER_STAGE_MAP`

3. **Add Recruitment Intent Detection**:
```javascript
_detectIntent(tokens) {
  return {
    seniority: null,      // "junior", "mid", "senior", "staff"
    remote: false,        // "remote", "hybrid"
    domain: null,         // "fintech", "healthcare"
    urgency: 1.0          // "urgent", "immediate" → boost
  }
}
```

4. **Simplify Phrase Detection**:
- Remove `LINGO_PHRASE_MAP` (medical lingo)
- Add tech phrases: "full stack", "machine learning", "data science"

### 2.2 Build Tech Synonym Dictionary

**File**: `src/search/techSynonyms.js`

```javascript
export const TECH_SYNONYMS = {
  // Languages
  "js": ["javascript", "node.js", "nodejs", "ecmascript"],
  "ts": ["typescript"],
  "py": ["python"],
  
  // Frameworks
  "react": ["reactjs", "react.js"],
  "vue": ["vuejs", "vue.js"],
  "angular": ["angularjs"],
  
  // Databases
  "postgres": ["postgresql", "psql"],
  "mongo": ["mongodb"],
  
  // Cloud
  "aws": ["amazon web services"],
  "gcp": ["google cloud platform"],
  "azure": ["microsoft azure"],
  
  // DevOps
  "k8s": ["kubernetes"],
  "docker": ["containerization"],
  "ci/cd": ["continuous integration", "continuous deployment"],
  
  // ML/AI
  "ml": ["machine learning", "artificial intelligence", "ai"],
  "dl": ["deep learning"],
  "nlp": ["natural language processing"],
  
  // Roles
  "swe": ["software engineer", "developer"],
  "sde": ["software development engineer"],
  "fullstack": ["full stack", "full-stack"]
}

export const TECH_ABBREVIATIONS = {
  "api": ["application programming interface"],
  "rest": ["restful api"],
  "sql": ["structured query language"],
  "nosql": ["non-relational database"],
  "orm": ["object relational mapping"],
  "mvc": ["model view controller"]
}

export const TECH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "should", "could", "may", "might", "must", "can"
])
```

**Effort**: 1-2 hours of research + data entry

### 2.3 Index Builder Adaptation

Modify `_build()` to index candidate profiles:

```javascript
_build(candidates) {
  for (const candidate of candidates) {
    const docIdx = this.docs.length
    
    this.docs.push({
      type: 'candidate',
      result: candidate,
      boosts: {
        experience: candidate.experience_years,
        remote: candidate.remote_preference,
        searchBoost: 1.0
      },
      titleNorm: this._norm(candidate.title)
    })
    
    this._addDoc(docIdx, {
      skills_required: candidate.skills.join(' '),
      title: candidate.title,
      domain: candidate.domain_experience.join(' '),
      work_history: candidate.work_history
        .map(w => `${w.role} ${w.description}`).join(' '),
      education: candidate.education.join(' '),
      location: candidate.location
    })
  }
}
```

### 2.4 Search Method Adaptation

Modify `search()` to accept JD object instead of text query:

```javascript
search(jobDescription, limit = 20) {
  // Convert JD to searchable query string
  const queryParts = [
    jobDescription.title,
    ...jobDescription.skills_required,
    ...jobDescription.skills_preferred,
    ...jobDescription.domain,
    jobDescription.responsibilities
  ]
  
  const query = queryParts.filter(Boolean).join(' ')
  
  // Run existing search logic
  const analyzed = this._analyze(query)
  const { scores, phraseBonus } = this._retrieveCandidates(analyzed, {...})
  
  // Apply recruitment-specific boosters
  for (const [docIdx, scoreData] of scores) {
    const candidate = this.docs[docIdx].result
    
    // Experience match
    if (candidate.experience_years >= jobDescription.experience_min &&
        candidate.experience_years <= jobDescription.experience_max) {
      scoreData.total *= 1.3
    }
    
    // Remote preference match
    if (jobDescription.remote && candidate.remote_preference) {
      scoreData.total *= 1.2
    }
    
    // Domain overlap
    const domainOverlap = candidate.domain_experience.filter(d =>
      jobDescription.domain.includes(d)
    ).length
    if (domainOverlap > 0) {
      scoreData.total *= (1 + domainOverlap * 0.15)
    }
  }
  
  // Return results with normalized scores
  return results.map(r => ({
    ...r,
    lexicalScore: r._score  // Preserve for Layer 3 fusion
  }))
}
```

---

## Phase 3: Layer 2 - Semantic Matching (3-4 hours)

### 3.1 Embedding Service Setup

**File**: `src/search/EmbeddingService.js`

```javascript
import OpenAI from 'openai'

export class EmbeddingService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey })
    this.cache = new Map()  // LRU cache for embeddings
    this.model = 'text-embedding-3-small'  // Cheaper, faster
  }
  
  async embed(text) {
    const cacheKey = text.slice(0, 100)  // Cache by prefix
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text
    })
    
    const embedding = response.data[0].embedding
    this._cacheSet(cacheKey, embedding)
    return embedding
  }
  
  async embedBatch(texts) {
    // Batch API call for efficiency
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts
    })
    return response.data.map(d => d.embedding)
  }
  
  cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i]
      magA += vecA[i] * vecA[i]
      magB += vecB[i] * vecB[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB))
  }
  
  _cacheSet(key, value) {
    if (this.cache.size >= 200) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
}
```

### 3.2 Profile Embedding Generator

**File**: `src/search/ProfileEmbedder.js`

```javascript
export class ProfileEmbedder {
  constructor(embeddingService) {
    this.embedder = embeddingService
  }
  
  // Convert JD to embedding-friendly text
  jdToText(jd) {
    return [
      `Job Title: ${jd.title}`,
      `Required Skills: ${jd.skills_required.join(', ')}`,
      `Preferred Skills: ${jd.skills_preferred.join(', ')}`,
      `Experience: ${jd.experience_min}-${jd.experience_max} years`,
      `Domain: ${jd.domain.join(', ')}`,
      `Responsibilities: ${jd.responsibilities}`
    ].join('\n')
  }
  
  // Convert candidate profile to embedding-friendly text
  candidateToText(candidate) {
    return [
      `Title: ${candidate.title}`,
      `Skills: ${candidate.skills.join(', ')}`,
      `Experience: ${candidate.experience_years} years`,
      `Domain: ${candidate.domain_experience.join(', ')}`,
      `Work History: ${candidate.work_history.map(w => 
        `${w.role} at ${w.company}: ${w.description}`
      ).join('. ')}`
    ].join('\n')
  }
  
  async embedJD(jd) {
    const text = this.jdToText(jd)
    return await this.embedder.embed(text)
  }
  
  async embedCandidate(candidate) {
    const text = this.candidateToText(candidate)
    return await this.embedder.embed(text)
  }
  
  // Pre-compute embeddings for all candidates (run once at startup)
  async embedAllCandidates(candidates) {
    const texts = candidates.map(c => this.candidateToText(c))
    const embeddings = await this.embedder.embedBatch(texts)
    
    // Store in a map for quick lookup
    const embeddingMap = new Map()
    candidates.forEach((c, i) => {
      embeddingMap.set(c.id, embeddings[i])
    })
    
    return embeddingMap
  }
}
```

### 3.3 Semantic Search Layer

**File**: `src/search/SemanticMatcher.js`

```javascript
export class SemanticMatcher {
  constructor(embeddingService, candidateEmbeddings) {
    this.embedder = embeddingService
    this.candidateEmbeddings = candidateEmbeddings  // Pre-computed
  }
  
  async matchCandidates(jdEmbedding, candidateIds) {
    const scores = new Map()
    
    for (const candidateId of candidateIds) {
      const candidateEmb = this.candidateEmbeddings.get(candidateId)
      if (!candidateEmb) continue
      
      const similarity = this.embedder.cosineSimilarity(
        jdEmbedding,
        candidateEmb
      )
      
      // Normalize to 0-100 scale
      scores.set(candidateId, similarity * 100)
    }
    
    return scores
  }
}
```

---

## Phase 4: Layer 3 - Score Fusion (2 hours)

### 4.1 Hybrid Search Engine

**File**: `src/search/HybridRecruitmentSearch.js`

```javascript
export class HybridRecruitmentSearch {
  constructor(lexicalEngine, semanticMatcher, profileEmbedder) {
    this.lexical = lexicalEngine
    this.semantic = semanticMatcher
    this.embedder = profileEmbedder
    
    // Fusion weights (tunable)
    this.LEXICAL_WEIGHT = 0.4
    this.SEMANTIC_WEIGHT = 0.6
  }
  
  async search(jobDescription, limit = 20) {
    // Layer 1: Lexical search
    const lexicalResults = this.lexical.search(jobDescription, limit * 2)
    
    // Layer 2: Semantic search
    const jdEmbedding = await this.embedder.embedJD(jobDescription)
    const candidateIds = lexicalResults.map(r => r.id)
    const semanticScores = await this.semantic.matchCandidates(
      jdEmbedding,
      candidateIds
    )
    
    // Layer 3: Fusion
    const fusedResults = lexicalResults.map(result => {
      const lexScore = this._normalizeScore(result.lexicalScore, lexicalResults)
      const semScore = semanticScores.get(result.id) || 0
      
      const matchScore = (
        this.LEXICAL_WEIGHT * lexScore +
        this.SEMANTIC_WEIGHT * semScore
      )
      
      return {
        candidate: result,
        matchScore: Math.round(matchScore),
        breakdown: {
          lexical: Math.round(lexScore),
          semantic: Math.round(semScore)
        }
      }
    })
    
    // Sort by fused score
    fusedResults.sort((a, b) => b.matchScore - a.matchScore)
    
    return fusedResults.slice(0, limit)
  }
  
  _normalizeScore(score, allResults) {
    const scores = allResults.map(r => r.lexicalScore)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    
    if (max === min) return 50
    return ((score - min) / (max - min)) * 100
  }
  
  // Generate explainability for top matches
  explainMatch(jd, candidate, breakdown) {
    const reasons = []
    
    // Skill overlap
    const requiredMatch = jd.skills_required.filter(s =>
      candidate.skills.some(cs => 
        cs.toLowerCase().includes(s.toLowerCase())
      )
    )
    if (requiredMatch.length > 0) {
      reasons.push(`Matches ${requiredMatch.length}/${jd.skills_required.length} required skills: ${requiredMatch.join(', ')}`)
    }
    
    // Experience fit
    if (candidate.experience_years >= jd.experience_min &&
        candidate.experience_years <= jd.experience_max) {
      reasons.push(`${candidate.experience_years} years experience (fits ${jd.experience_min}-${jd.experience_max} range)`)
    }
    
    // Domain overlap
    const domainMatch = candidate.domain_experience.filter(d =>
      jd.domain.includes(d)
    )
    if (domainMatch.length > 0) {
      reasons.push(`${domainMatch.join(', ')} domain experience`)
    }
    
    // Semantic similarity
    if (breakdown.semantic > 70) {
      reasons.push(`Strong semantic match (${breakdown.semantic}/100)`)
    }
    
    return reasons
  }
}
```

---

## Phase 5: Integration & Testing (2-3 hours)

### 5.1 Main Entry Point

**File**: `src/index.js`

```javascript
import RecruitmentSearchEngine from './search/RecruitmentSearchEngine.js'
import { EmbeddingService } from './search/EmbeddingService.js'
import { ProfileEmbedder } from './search/ProfileEmbedder.js'
import { SemanticMatcher } from './search/SemanticMatcher.js'
import { HybridRecruitmentSearch } from './search/HybridRecruitmentSearch.js'
import candidates from '../data/candidates.json'

async function initializeSearchEngine() {
  // Layer 1: Lexical
  const lexicalEngine = new RecruitmentSearchEngine(candidates)
  
  // Layer 2: Semantic
  const embeddingService = new EmbeddingService(process.env.OPENAI_API_KEY)
  const profileEmbedder = new ProfileEmbedder(embeddingService)
  
  console.log('Pre-computing candidate embeddings...')
  const candidateEmbeddings = await profileEmbedder.embedAllCandidates(candidates)
  
  const semanticMatcher = new SemanticMatcher(embeddingService, candidateEmbeddings)
  
  // Layer 3: Hybrid
  const hybridSearch = new HybridRecruitmentSearch(
    lexicalEngine,
    semanticMatcher,
    profileEmbedder
  )
  
  return hybridSearch
}

// Example usage
async function main() {
  const searchEngine = await initializeSearchEngine()
  
  const jobDescription = {
    title: "Senior Backend Engineer",
    skills_required: ["Python", "PostgreSQL", "AWS"],
    skills_preferred: ["Docker", "Kubernetes"],
    experience_min: 5,
    experience_max: 10,
    domain: ["fintech", "payments"],
    responsibilities: "Build scalable payment processing systems",
    remote: true
  }
  
  const results = await searchEngine.search(jobDescription, 10)
  
  console.log('\n=== Top Matches ===\n')
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.candidate.name} (Match: ${result.matchScore}/100)`)
    console.log(`   Title: ${result.candidate.title}`)
    console.log(`   Breakdown: Lexical ${result.breakdown.lexical} | Semantic ${result.breakdown.semantic}`)
    
    const explanation = searchEngine.explainMatch(
      jobDescription,
      result.candidate,
      result.breakdown
    )
    console.log(`   Why: ${explanation.join('; ')}`)
    console.log()
  })
}

main()
```

### 5.2 Test Cases

**File**: `tests/search.test.js`

```javascript
describe('Recruitment Search Engine', () => {
  test('Exact skill match ranks highest', async () => {
    const jd = {
      title: "Python Developer",
      skills_required: ["Python", "Django"],
      skills_preferred: [],
      experience_min: 3,
      experience_max: 5,
      domain: [],
      responsibilities: ""
    }
    
    const results = await searchEngine.search(jd, 5)
    
    // Top result should have Python + Django
    expect(results[0].candidate.skills).toContain('Python')
    expect(results[0].candidate.skills).toContain('Django')
  })
  
  test('Synonym matching works', async () => {
    const jd = {
      title: "JS Developer",
      skills_required: ["JavaScript"],
      // ... rest
    }
    
    const results = await searchEngine.search(jd, 10)
    
    // Should match candidates with "Node.js", "React", etc.
    const hasJSVariant = results.some(r =>
      r.candidate.skills.some(s => 
        ['nodejs', 'react', 'vue'].includes(s.toLowerCase())
      )
    )
    expect(hasJSVariant).toBe(true)
  })
  
  test('Experience filter works', async () => {
    const jd = {
      title: "Senior Engineer",
      skills_required: [],
      experience_min: 7,
      experience_max: 10,
      // ... rest
    }
    
    const results = await searchEngine.search(jd, 10)
    
    // Top results should be in experience range
    results.slice(0, 3).forEach(r => {
      expect(r.candidate.experience_years).toBeGreaterThanOrEqual(7)
      expect(r.candidate.experience_years).toBeLessThanOrEqual(10)
    })
  })
  
  test('Semantic matching catches paraphrases', async () => {
    const jd = {
      title: "ML Engineer",
      skills_required: ["machine learning", "neural networks"],
      responsibilities: "Build recommendation systems",
      // ... rest
    }
    
    const results = await searchEngine.search(jd, 10)
    
    // Should match candidates with "AI", "deep learning", "recommender systems"
    const topResult = results[0]
    expect(topResult.breakdown.semantic).toBeGreaterThan(60)
  })
})
```

---

## Phase 6: Optimization & Tuning (2 hours)

### 6.1 Performance Benchmarks

- Lexical search: < 50ms for 1000 candidates
- Embedding generation: ~200ms per JD (cached)
- Semantic matching: < 100ms for 20 candidates
- Total search time: < 400ms

### 6.2 Tuning Parameters

**Fusion weights** (adjust based on test results):
```javascript
// Start with 40/60, tune based on precision/recall
LEXICAL_WEIGHT = 0.4
SEMANTIC_WEIGHT = 0.6

// If lexical is too noisy, increase semantic
LEXICAL_WEIGHT = 0.3
SEMANTIC_WEIGHT = 0.7

// If semantic misses exact skill matches, increase lexical
LEXICAL_WEIGHT = 0.5
SEMANTIC_WEIGHT = 0.5
```

**BM25 field weights** (tune based on recruiter feedback):
```javascript
// Initial
skills_required: 15
title: 12

// If title matches are too dominant
skills_required: 18
title: 10
```

### 6.3 Edge Cases to Handle

1. **Empty skill lists** - Fallback to semantic-only matching
2. **Typos in JD** - Fuzzy matching should handle
3. **Rare skills** - Semantic layer catches related skills
4. **Over-qualified candidates** - Add penalty for experience >> max
5. **Location mismatch** - Add filter option for strict location matching

---

## Deliverables Checklist

- [ ] `src/search/RecruitmentSearchEngine.js` - Adapted lexical engine
- [ ] `src/search/techSynonyms.js` - Tech abbreviation dictionary
- [ ] `src/search/EmbeddingService.js` - OpenAI embedding wrapper
- [ ] `src/search/ProfileEmbedder.js` - JD/candidate text converter
- [ ] `src/search/SemanticMatcher.js` - Cosine similarity matcher
- [ ] `src/search/HybridRecruitmentSearch.js` - Fusion layer
- [ ] `data/candidates.json` - 50-100 dummy profiles
- [ ] `src/index.js` - Main entry point with example
- [ ] `tests/search.test.js` - Unit tests
- [ ] `.env` - OpenAI API key configuration

---

## Timeline Estimate

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Data Schema | 2-3 | Critical |
| Phase 2: Layer 1 (Lexical) | 4-5 | Critical |
| Phase 3: Layer 2 (Semantic) | 3-4 | Critical |
| Phase 4: Layer 3 (Fusion) | 2 | Critical |
| Phase 5: Integration | 2-3 | Critical |
| Phase 6: Optimization | 2 | Nice-to-have |
| **Total** | **15-19 hours** | |

**Hackathon-friendly**: Can be split across 2-3 team members working in parallel.

---

## Next Steps

1. Create dummy candidate dataset (Phase 1.3)
2. Start with Layer 1 adaptation (Phase 2) - works standalone
3. Add Layer 2 once Layer 1 is validated
4. Integrate Layer 3 for final fusion
5. Test with real JD examples from hackathon organizers

---

## Notes

- **Layer 4 (LLM Re-ranking)** deferred - can be added post-hackathon
- **Interest Score** (conversational engagement) is separate pipeline
- Focus on **Match Score** accuracy first
- Keep explainability simple for demo purposes
