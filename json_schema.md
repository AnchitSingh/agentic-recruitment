We need **two schemas** that mirror each other by design — the search algo compares them field-by-field, so mismatched schemas break scoring. Let me design both together.

---

## Schema 1: Parsed JD Output

```json
{
  "jd_id": "jd_a1b2c3",
  "parsed_at": "2025-04-24T10:00:00Z",
  "raw_title": "Senior Backend Engineer - Payments",

  "role": {
    "title": "Backend Engineer",
    "seniority": "senior",
    "employment_type": "full-time",
    "location": {
      "type": "hybrid",
      "city": "Bangalore",
      "country": "India",
      "remote_allowed": true
    }
  },

  "experience": {
    "min_years": 4,
    "max_years": 7,
    "preferred_years": 5
  },

  "skills": {
    "must_have": [
      { "name": "Node.js", "normalized": "nodejs", "weight": 1.0 },
      { "name": "PostgreSQL", "normalized": "postgresql", "weight": 1.0 },
      { "name": "REST APIs", "normalized": "rest_api", "weight": 1.0 }
    ],
    "nice_to_have": [
      { "name": "Kubernetes", "normalized": "kubernetes", "weight": 0.5 },
      { "name": "Redis", "normalized": "redis", "weight": 0.5 }
    ],
    "domain_knowledge": [
      { "name": "fintech", "weight": 0.8 },
      { "name": "payments", "weight": 0.9 }
    ]
  },

  "responsibilities": [
    "design and own microservices architecture",
    "lead code reviews and mentor junior engineers",
    "integrate third-party payment gateways"
  ],

  "qualifications": {
    "education": {
      "degree": "B.Tech or equivalent",
      "required": false
    },
    "certifications": []
  },

  "company": {
    "name": "FinPay Inc.",
    "industry": "fintech",
    "size": "startup",
    "culture_tags": ["fast-paced", "ownership", "remote-friendly"]
  },

  "compensation": {
    "min_lpa": 20,
    "max_lpa": 32,
    "currency": "INR",
    "disclosed": true
  },

  "meta": {
    "search_blob": "senior backend engineer nodejs postgresql rest api kubernetes redis fintech payments microservices",
    "embedding_text": "Senior backend engineer with 4-7 years experience in Node.js PostgreSQL REST APIs fintech payments domain microservices architecture",
    "confidence_score": 0.91
  }
}
```

---

## Schema 2: Candidate Profile

```json
{
  "candidate_id": "cand_x9y8z7",
  "created_at": "2025-04-20T00:00:00Z",

  "personal": {
    "name": "Rahul Sharma",
    "location": {
      "city": "Pune",
      "country": "India",
      "open_to_relocate": true,
      "open_to_remote": true
    }
  },

  "role": {
    "current_title": "Software Engineer",
    "target_titles": ["Backend Engineer", "Senior Backend Engineer"],
    "seniority": "mid-senior",
    "employment_type_preference": ["full-time"]
  },

  "experience": {
    "total_years": 5,
    "current_company": "Swiggy",
    "current_tenure_years": 2,
    "positions": [
      {
        "title": "Software Engineer",
        "company": "Swiggy",
        "years": 2,
        "responsibilities": [
          "built payment microservices handling 10k TPS",
          "led migration from monolith to distributed systems"
        ]
      },
      {
        "title": "Junior Developer",
        "company": "Infosys",
        "years": 3,
        "responsibilities": [
          "developed REST APIs for banking clients",
          "maintained PostgreSQL databases"
        ]
      }
    ]
  },

  "skills": {
    "primary": [
      { "name": "Node.js", "normalized": "nodejs", "years": 4, "self_rating": 4 },
      { "name": "PostgreSQL", "normalized": "postgresql", "years": 3, "self_rating": 4 },
      { "name": "REST APIs", "normalized": "rest_api", "years": 5, "self_rating": 5 }
    ],
    "secondary": [
      { "name": "Redis", "normalized": "redis", "years": 1, "self_rating": 3 },
      { "name": "Docker", "normalized": "docker", "years": 2, "self_rating": 3 }
    ],
    "domain_knowledge": [
      { "name": "fintech", "strength": "strong" },
      { "name": "payments", "strength": "strong" },
      { "name": "logistics", "strength": "moderate" }
    ]
  },

  "availability": {
    "status": "passively_looking",
    "notice_period_days": 60,
    "available_from": "2025-06-24"
  },

  "compensation": {
    "current_lpa": 22,
    "expected_lpa": 28,
    "currency": "INR",
    "negotiable": true
  },

  "persona": {
    "communication_style": "analytical",
    "motivators": ["technical challenges", "ownership", "growth"],
    "dealbreakers": ["no remote", "micromanagement"],
    "personality_notes": "Asks detailed technical questions before committing. Responds well to specifics about tech stack and team structure."
  },

  "meta": {
    "search_blob": "nodejs postgresql rest api redis docker fintech payments microservices distributed systems backend engineer",
    "embedding_text": "Backend engineer 5 years Node.js PostgreSQL REST APIs fintech payments microservices distributed systems Swiggy",
    "profile_completeness": 0.95
  }
}
```

---

## Why These Fields Are Designed This Way

**`normalized` on every skill** — this is what BM25F and fuzzy matching actually compares against. "Node.js", "NodeJS", "node js" all normalize to `"nodejs"`. Without this, your BM25 scoring breaks on trivial spelling variation.

**`search_blob`** — a flat string concatenation of all important terms. BM25F scores against this for fast lexical matching. You construct it at insert time, not query time.

**`embedding_text`** — a human-readable prose summary. This is what you send to the embedding model for vector search. Prose embeds better than raw keyword lists.

**`weight` on JD skills** — this is how BM25F field weighting works in practice. A must-have skill with `weight: 1.0` vs nice-to-have `weight: 0.5` directly maps to your BM25F field multipliers.

**`persona` block on candidate** — this is exclusively for the Candidate LLM agent. When you instantiate the candidate agent, you feed this as its system prompt context. The `personality_notes` field makes the simulated conversation feel realistic and differentiated per candidate.

**`availability.status`** options should be an enum:
```
actively_looking | passively_looking | not_looking | open_to_offers
```
This feeds directly into Interest Score weighting — a `not_looking` candidate starts with a lower prior before the chat even begins.

---

## How Match Scoring Uses These Fields

```
Match Score = 
  BM25F(jd.skills.must_have vs candidate.skills.primary)      × 15  ← highest weight
  + BM25F(jd.skills.domain_knowledge vs candidate.domain)     × 10
  + BM25F(jd.skills.nice_to_have vs candidate.skills.secondary) × 6
  + experience_year_proximity(jd.experience vs candidate.experience) × 8
  + location_compatibility(jd.role.location vs candidate.personal.location) × 5
  + cosine_similarity(jd.meta.embedding_text, candidate.meta.embedding_text) × 12

  normalized to 0-100
```

