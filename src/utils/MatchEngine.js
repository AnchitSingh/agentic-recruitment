/**
 * MatchEngine.js — v1.0
 *
 * Hybrid recruiter matching engine: BM25F (lexical) + Cosine Similarity (semantic).
 *
 * Architecture:
 *   JD JSON + JD Embedding Vector
 *       │
 *       ▼
 *   [1] buildIndex(candidates)
 *       Tokenise candidate fields → inverted index → IDF computation
 *       │
 *       ▼
 *   [2] scoreBM25F(jd, candidateIdx)
 *       JD skills/domain → query tokens with per-token weights → BM25F accumulation
 *       │
 *       ▼
 *   [3] scoreVector(jdVector, candidateVector)
 *       Cosine similarity between Gemini embedding vectors
 *       │
 *       ▼
 *   [4] scoreBonuses(jd, candidate)
 *       Experience proximity + location compatibility + salary alignment + availability
 *       │
 *       ▼
 *   [5] fuseScores(bm25, vector, bonuses) → matchScore (0–100)
 *       │
 *       ▼
 *   [6] buildExplanation(jd, candidate, scores)
 *       Which skills matched/missed, domain alignment, experience gap, summary
 *       │
 *       ▼
 *   Ranked shortlist: [{ candidate, matchScore, scoreBreakdown, explanation }]
 */

// ─── BM25 Hyper-parameters ────────────────────────────────────────────────────
const K1 = 1.5;
const B  = 0.75;

// ─── Score Fusion Weights ─────────────────────────────────────────────────────
// Tuned for recruitment: BM25 dominates more, vector is semantic confirmation not primary signal.
const BM25_WEIGHT        = 0.60;
const VECTOR_WEIGHT      = 0.25;
const BONUS_WEIGHT       = 0.15;  // experience + location + salary + availability

// ─── BM25F Field Weights (candidate profile fields) ──────────────────────────
// Primary skills carry the most signal — must-have matching is the core gate.
const FIELD_W = {
  primary_skills:     15,
  must_have_blob:     14,   // normalised skill names only — high precision target
  secondary_skills:    7,
  nice_to_have_blob:   6,
  job_title:          10,
  target_titles:       9,
  domain_knowledge:    9,
  seniority:           5,
  responsibilities:    4,
  search_blob:         3,
};

// ─── JD Query Token Weights (importance of each JD field in matching) ─────────
const JD_FIELD_W = {
  must_have:     1.00,
  nice_to_have:  0.55,
  domain:        0.75,
  title:         0.65,
  seniority:     0.60,
};

// ─── Tech Skill Synonyms ──────────────────────────────────────────────────────
// Bidirectional normalisation. Extend this as your dummy data grows.
const SKILL_SYNONYMS = {
  js:           ['javascript', 'nodejs', 'node'],
  javascript:   ['js', 'node', 'nodejs', 'ecmascript'],
  nodejs:       ['node', 'node.js', 'js', 'javascript'],
  'node.js':    ['nodejs', 'node', 'js', 'javascript'],
  ts:           ['typescript'],
  typescript:   ['ts'],
  py:           ['python'],
  python:       ['py'],
  postgresql:   ['postgres', 'pg', 'psql'],
  postgres:     ['postgresql', 'pg', 'psql'],
  mongo:        ['mongodb'],
  mongodb:      ['mongo'],
  k8s:          ['kubernetes'],
  kubernetes:   ['k8s'],
  react:        ['reactjs', 'react.js'],
  reactjs:      ['react', 'react.js'],
  aws:          ['amazon web services', 'cloud', 'ec2', 's3'],
  gcp:          ['google cloud platform', 'google cloud', 'cloud'],
  azure:        ['microsoft azure', 'cloud'],
  ml:           ['machine learning', 'deep learning'],
  'machine learning': ['ml', 'ai', 'deep learning'],
  ai:           ['artificial intelligence', 'ml', 'machine learning'],
  rest:         ['rest api', 'restful', 'rest apis', 'api'],
  graphql:      ['gql', 'graph ql'],
  docker:       ['containerization', 'containers'],
  sql:          ['mysql', 'postgresql', 'sqlite', 'database', 'relational'],
  nosql:        ['mongodb', 'dynamodb', 'cassandra', 'redis'],
  devops:       ['ci/cd', 'cicd', 'pipeline', 'deployment'],
  microservices: ['distributed systems', 'service mesh', 'soa'],
  fintech:      ['financial technology', 'payments', 'banking'],
  payments:     ['fintech', 'payment gateway', 'stripe', 'razorpay'],
};

// ─── Module-level index (built once per session) ──────────────────────────────
let _index        = null;   // Map<token, [{candidateIdx, field, tf}]>
let _idf          = null;   // Map<token, number>
let _fieldLens    = null;   // Array<{field: number}>
let _avgFieldLen  = null;   // {field: number}
let _candidates   = null;   // reference to the candidates array


// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API  — defined below after all helpers are declared
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// INDEX CONSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

function _buildIndex(candidates) {
  _candidates  = candidates;
  _index       = new Map();
  _fieldLens   = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const fields = _getCandidateFields(candidates[idx]);
    const fLens  = {};

    for (const [field, text] of Object.entries(fields)) {
      if (!text) continue;

      const tokens = _tokenize(text);
      fLens[field] = tokens.length;

      const freq = {};
      for (const t of tokens) freq[t] = (freq[t] || 0) + 1;

      for (const [token, tf] of Object.entries(freq)) {
        if (!_index.has(token)) _index.set(token, []);
        _index.get(token).push({ candidateIdx: idx, field, tf });
      }
    }

    _fieldLens[idx] = fLens;
  }

  _computeIDF(candidates.length);
  _computeAvgFieldLens(candidates.length);
}

/**
 * Flatten a candidate profile into indexable text fields.
 * Each key maps to a FIELD_W entry above.
 */
function _getCandidateFields(c) {
  const primarySkills    = c.skills?.primary?.map(s => s.normalized || _norm(s.name)).join(' ') || '';
  const secondarySkills  = c.skills?.secondary?.map(s => s.normalized || _norm(s.name)).join(' ') || '';
  const mustHaveBlob     = c.skills?.primary?.map(s => s.name).join(' ') || '';
  const niceToHaveBlob   = c.skills?.secondary?.map(s => s.name).join(' ') || '';
  const targetTitles     = (c.role?.target_titles || []).join(' ');
  const jobTitle         = [c.role?.current_title || '', targetTitles].join(' ');
  const domain           = c.skills?.domain_knowledge?.map(d => d.name).join(' ') || '';
  const seniority        = c.role?.seniority || '';
  const responsibilities = c.experience?.positions
    ?.flatMap(p => p.responsibilities || []).join(' ') || '';

  return {
    primary_skills:    primarySkills,
    must_have_blob:    mustHaveBlob,
    secondary_skills:  secondarySkills,
    nice_to_have_blob: niceToHaveBlob,
    job_title:         jobTitle,
    target_titles:     targetTitles,
    domain_knowledge:  domain,
    seniority,
    responsibilities,
    search_blob:       c.meta?.search_blob || '',
  };
}

function _computeIDF(N) {
  _idf = new Map();
  for (const [token, postings] of _index) {
    const df = new Set(postings.map(p => p.candidateIdx)).size;
    _idf.set(token, Math.max(0, Math.log((N - df + 0.5) / (df + 0.5) + 1)));
  }
}

function _computeAvgFieldLens(N) {
  const sums   = {};
  const counts = {};

  for (const fLens of _fieldLens) {
    for (const [field, len] of Object.entries(fLens)) {
      sums[field]   = (sums[field] || 0) + len;
      counts[field] = (counts[field] || 0) + 1;
    }
  }

  _avgFieldLen = {};
  for (const field of Object.keys(sums)) {
    _avgFieldLen[field] = sums[field] / Math.max(1, counts[field]);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — BM25F SCORING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build a list of weighted query tokens from the JD JSON.
 * Each token has a weight reflecting how important it is in the JD.
 * Synonyms are added at a discount (0.7× the original weight).
 */
function _buildQueryTokens(jd) {
  const tokens = [];   // [{token, weight, sourceField, sourceTerm}]
  const seen   = new Set();

  function addToken(token, weight, field, sourceTerm) {
    const t = _norm(token);
    if (!t || seen.has(t)) return;
    seen.add(t);
    tokens.push({ token: t, weight, sourceField: field, sourceTerm });

    // Synonym expansion at 0.7× weight, non-deduplicated (synonyms can still add signal)
    const synonyms = SKILL_SYNONYMS[t] || [];
    for (const syn of synonyms) {
      for (const st of _tokenize(syn)) {
        if (!seen.has(st)) {
          seen.add(st);
          tokens.push({ token: st, weight: weight * 0.70, sourceField: field, sourceTerm });
        }
      }
    }
  }

  // Must-have skills — highest query weight
  for (const skill of jd.skills?.must_have || []) {
    for (const t of _tokenize(skill.normalized || skill.name)) {
      addToken(t, JD_FIELD_W.must_have * (skill.weight || 1.0), 'must_have', skill.name);
    }
  }

  // Nice-to-have skills
  for (const skill of jd.skills?.nice_to_have || []) {
    for (const t of _tokenize(skill.normalized || skill.name)) {
      addToken(t, JD_FIELD_W.nice_to_have * (skill.weight || 0.5), 'nice_to_have', skill.name);
    }
  }

  // Domain knowledge
  for (const domain of jd.skills?.domain_knowledge || []) {
    for (const t of _tokenize(domain.name)) {
      addToken(t, JD_FIELD_W.domain * (domain.weight || 0.8), 'domain', domain.name);
    }
  }

  // Job title
  for (const t of _tokenize(jd.role?.title || '')) {
    addToken(t, JD_FIELD_W.title, 'title', jd.role?.title);
  }

  // Seniority
  for (const t of _tokenize(jd.role?.seniority || '')) {
    addToken(t, JD_FIELD_W.seniority, 'seniority', jd.role?.seniority);
  }

  return tokens;
}

/**
 * BM25F score for one candidate given the JD query tokens.
 * Returns a raw score (not yet normalised to 0–1).
 */
function _scoreBM25F(jd, candidateIdx) {
  const queryTokens = _buildQueryTokens(jd);
  const fLens       = _fieldLens[candidateIdx] || {};

  let total = 0;

  for (const { token, weight } of queryTokens) {
    const idf      = _idf.get(token) ?? 0;
    if (idf <= 0) continue;

    const postings = _index.get(token) || [];
    const relevant = postings.filter(p => p.candidateIdx === candidateIdx);

    for (const { field, tf } of relevant) {
      const fw     = FIELD_W[field] || 1;
      const fLen   = fLens[field]        ?? 1;
      const avgFL  = _avgFieldLen?.[field] ?? 1;

      // Standard BM25F normalised TF with field length normalisation
      const normTf = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (fLen / avgFL)));

      total += idf * fw * normTf * weight;
    }
  }

  return total;
}

/**
 * Normalise BM25 scores across the full corpus to [0, 1].
 * Called after scoring all candidates so we know the max.
 */
function _normaliseBM25(rawScores) {
  const max = Math.max(...rawScores, 1);
  return rawScores.map(s => s / max);
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — VECTOR (COSINE) SIMILARITY
// ══════════════════════════════════════════════════════════════════════════════

function _scoreVector(vecA, vecB) {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
  // Already in [0, 1] for normalised embedding models like Gemini embedding-2
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — BONUS SCORING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns a bonus object with each sub-score in [0, 1].
 * These are structural signals BM25 and vectors can't capture precisely.
 */
function _scoreBonuses(jd, candidate) {
  return {
    experience:   _experienceScore(jd, candidate),
    location:     _locationScore(jd, candidate),
    salary:       _salaryScore(jd, candidate),
    availability: _availabilityScore(candidate),
  };
}

function _experienceScore(jd, candidate) {
  const candidateYears = candidate.experience?.total_years ?? 0;
  const minYears       = jd.experience?.min_years ?? 0;
  const maxYears       = jd.experience?.max_years ?? 99;
  const preferred      = jd.experience?.preferred_years ?? ((minYears + maxYears) / 2);

  if (candidateYears >= minYears && candidateYears <= maxYears) {
    // Inside the range — score by proximity to preferred
    const range = maxYears - minYears || 1;
    const dist  = Math.abs(candidateYears - preferred) / range;
    return 1 - dist * 0.3;   // max 30% penalty for being at the edge
  }

  // Outside the range — penalise proportionally
  if (candidateYears < minYears) {
    const gap = minYears - candidateYears;
    return Math.max(0, 1 - gap * 0.15);
  }

  // Over-experienced — mild penalty (senior applying to junior role)
  const gap = candidateYears - maxYears;
  return Math.max(0.4, 1 - gap * 0.08);
}

function _locationScore(jd, candidate) {
  const jdRemote     = jd.role?.location?.remote_allowed ?? false;
  const jdType       = jd.role?.location?.type ?? '';          // remote | hybrid | onsite
  const candRemote   = candidate.personal?.location?.open_to_remote ?? false;
  const candRelocate = candidate.personal?.location?.open_to_relocate ?? false;
  const jdCity       = (jd.role?.location?.city ?? '').toLowerCase();
  const candCity     = (candidate.personal?.location?.city ?? '').toLowerCase();

  if (jdType === 'remote')  return 1.0;                      // always compatible
  if (candRemote && jdRemote) return 1.0;
  if (jdCity && candCity && jdCity === candCity) return 1.0;  // same city
  if (candRelocate) return 0.85;
  if (jdRemote)     return 0.90;

  return 0.60;  // location mismatch, no flexibility on either side
}

function _salaryScore(jd, candidate) {
  const jdMin    = jd.compensation?.min_lpa;
  const jdMax    = jd.compensation?.max_lpa;
  const candExp  = candidate.compensation?.expected_lpa;
  const negot    = candidate.compensation?.negotiable ?? false;

  if (!jdMin || !jdMax || !candExp) return 0.75;  // unknown — neutral

  if (candExp >= jdMin && candExp <= jdMax) return 1.0;  // perfect fit

  if (candExp < jdMin) {
    // Candidate cheaper than budget — usually fine
    const delta = (jdMin - candExp) / jdMin;
    return Math.max(0.7, 1 - delta * 0.2);
  }

  // Candidate more expensive
  const overshoot = (candExp - jdMax) / jdMax;
  if (negot) return Math.max(0.5, 1 - overshoot * 0.4);
  return Math.max(0.3, 1 - overshoot * 0.6);
}

function _availabilityScore(candidate) {
  const statusMap = {
    actively_looking:  1.00,
    open_to_offers:    0.85,
    passively_looking: 0.65,
    not_looking:       0.30,
  };

  const status  = candidate.availability?.status ?? 'passively_looking';
  const base    = statusMap[status] ?? 0.65;

  // Short notice period boosts score slightly
  const notice  = candidate.availability?.notice_period_days ?? 60;
  const noticeBonus = notice <= 15 ? 0.10
                    : notice <= 30 ? 0.05
                    : notice <= 60 ? 0.00
                    : -0.05;          // long notice is a mild negative

  return Math.min(1.0, Math.max(0, base + noticeBonus));
}

/**
 * Collapse bonuses into a single [0,1] composite bonus score.
 */
function _bonusComposite(bonuses) {
  return (
    bonuses.experience   * 0.45 +
    bonuses.location     * 0.30 +
    bonuses.salary       * 0.15 +
    bonuses.availability * 0.10
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — SCORE FUSION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fuse normalised component scores into a single 0–100 matchScore.
 * BM25 raw score is passed here; normalisation happens at corpus level in getTopCandidates.
 * This function receives already-normalised values.
 */
function _fuseScores(bm25Norm, vectorSim, bonuses, mustHaveRatio) {
  const bonusComposite = _bonusComposite(bonuses);

  // Hard gate: penalise heavily for missing must-haves
  // 0 must-haves matched → multiply final score by 0.35
  // 50% matched → 0.72, 100% matched → 1.0
  const mustHaveGate = 0.35 + 0.65 * mustHaveRatio;

  const fused =
    bm25Norm     * BM25_WEIGHT   +
    vectorSim    * VECTOR_WEIGHT +
    bonusComposite * BONUS_WEIGHT;

  // Scale to 0–100 and apply must-have gate
  return fused * 100 * mustHaveGate;
}


// ══════════════════════════════════════════════════════════════════════════════
// MUST-HAVE RATIO UTILITY
// ══════════════════════════════════════════════════════════════════════════════

function _mustHaveRatio(jd, candidate) {
  const mustHaves = jd.skills?.must_have || [];
  if (mustHaves.length === 0) return 1;

  const allCandidateSkills = new Set([
    ...(candidate.skills?.primary?.flatMap(s => _expandSkillNames(s)) || []),
    ...(candidate.skills?.secondary?.flatMap(s => _expandSkillNames(s)) || []),
  ]);

  const matched = mustHaves.filter(skill =>
    _expandSkillNames(skill).some(e => allCandidateSkills.has(e))
  ).length;

  return matched / mustHaves.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — EXPLANATION BUILDER
// ══════════════════════════════════════════════════════════════════════════════

function _buildScoreBreakdown(jd, candidate, candidateIdx, bm25Raw, vectorSim, bonuses, matchScore) {
  return {
    bm25_raw:          bm25Raw,
    vector_similarity: parseFloat(vectorSim.toFixed(3)),
    experience_score:  parseFloat(bonuses.experience.toFixed(2)),
    location_score:    parseFloat(bonuses.location.toFixed(2)),
    salary_score:      parseFloat(bonuses.salary.toFixed(2)),
    availability_score: parseFloat(bonuses.availability.toFixed(2)),
    match_score:       Math.round(matchScore),
  };
}

/**
 * Build human-readable explanation by diffing JD requirements against candidate profile.
 */
function _buildExplanation(jd, candidate) {
  const mustHaveSkills     = jd.skills?.must_have     || [];
  const niceToHaveSkills   = jd.skills?.nice_to_have  || [];
  const domainRequirements = jd.skills?.domain_knowledge || [];

  const candidatePrimary    = new Set(
    candidate.skills?.primary?.flatMap(s => _expandSkillNames(s)) || []
  );
  const candidateSecondary  = new Set(
    candidate.skills?.secondary?.flatMap(s => _expandSkillNames(s)) || []
  );
  const allCandidateSkills  = new Set([...candidatePrimary, ...candidateSecondary]);

  // Must-have matching
  const mustHaveMatched  = [];
  const mustHaveMissing  = [];
  for (const skill of mustHaveSkills) {
    const expanded = _expandSkillNames(skill);
    if (expanded.some(e => allCandidateSkills.has(e))) {
      mustHaveMatched.push(skill.name);
    } else {
      mustHaveMissing.push(skill.name);
    }
  }

  // Nice-to-have matching
  const niceToHaveMatched = [];
  const niceToHaveMissing = [];
  for (const skill of niceToHaveSkills) {
    const expanded = _expandSkillNames(skill);
    if (expanded.some(e => allCandidateSkills.has(e))) {
      niceToHaveMatched.push(skill.name);
    } else {
      niceToHaveMissing.push(skill.name);
    }
  }

  // Domain matching
  const candidateDomains = new Set(
    candidate.skills?.domain_knowledge?.map(d => _norm(d.name)) || []
  );
  const domainMatched = domainRequirements.filter(d => {
    const key = _norm(d.name);
    const syns = SKILL_SYNONYMS[key] || [];
    return candidateDomains.has(key) || syns.some(s => candidateDomains.has(_norm(s)));
  }).map(d => d.name);

  // Experience gap
  const candidateYears = candidate.experience?.total_years ?? 0;
  const minYears       = jd.experience?.min_years ?? 0;
  const maxYears       = jd.experience?.max_years ?? 99;
  let experienceNote   = '';

  if (candidateYears < minYears) {
    experienceNote = `${minYears - candidateYears} year(s) under minimum`;
  } else if (candidateYears > maxYears && maxYears < 99) {
    experienceNote = `${candidateYears - maxYears} year(s) above maximum (over-experienced)`;
  } else {
    experienceNote = `${candidateYears} years — within range (${minYears}–${maxYears})`;
  }

  // Salary note
  let salaryNote = '';
  const jdMin   = jd.compensation?.min_lpa;
  const jdMax   = jd.compensation?.max_lpa;
  const candExp = candidate.compensation?.expected_lpa;
  if (jdMin && jdMax && candExp) {
    const currency = jd.compensation?.currency || 'INR';
    if (candExp < jdMin) {
      salaryNote = `Expects ${candExp} ${currency} — below budget (${jdMin}–${jdMax})`;
    } else if (candExp > jdMax) {
      salaryNote = `Expects ${candExp} ${currency} — above budget (${jdMin}–${jdMax})${candidate.compensation?.negotiable ? ', open to negotiation' : ''}`;
    } else {
      salaryNote = `Expects ${candExp} ${currency} — within budget (${jdMin}–${jdMax})`;
    }
  }

  // Availability note
  const statusLabels = {
    actively_looking:  'Actively looking',
    open_to_offers:    'Open to offers',
    passively_looking: 'Passively looking',
    not_looking:       'Not actively looking',
  };
  const availNote = [
    statusLabels[candidate.availability?.status] || 'Status unknown',
    candidate.availability?.notice_period_days
      ? `${candidate.availability.notice_period_days}-day notice period`
      : null,
  ].filter(Boolean).join(' · ');

  // Summary sentence
  const mustHaveRatio  = mustHaveSkills.length > 0
    ? mustHaveMatched.length / mustHaveSkills.length : 1;

  const summary = _composeSummary({
    mustHaveRatio,
    mustHaveMatched,
    mustHaveMissing,
    niceToHaveMatched,
    domainMatched,
    candidateYears,
    minYears,
    maxYears,
    candidateName: candidate.personal?.name || 'Candidate',
  });

  return {
    must_have_matched:   mustHaveMatched,
    must_have_missing:   mustHaveMissing,
    nice_to_have_matched: niceToHaveMatched,
    nice_to_have_missing: niceToHaveMissing,
    domain_matched:      domainMatched,
    experience_note:     experienceNote,
    salary_note:         salaryNote,
    availability_note:   availNote,
    strength_tags:       _buildStrengthTags(mustHaveRatio, niceToHaveMatched, domainMatched, candidate),
    summary,
  };
}

/**
 * Build a set of short UI tags like "Strong Skills Match", "Domain Expert", etc.
 */
function _buildStrengthTags(mustHaveRatio, niceToHaveMatched, domainMatched, candidate) {
  const tags = [];

  if (mustHaveRatio === 1)    tags.push({ label: 'Full Skills Match', color: 'green' });
  else if (mustHaveRatio >= 0.75) tags.push({ label: 'Strong Skills Match', color: 'green' });
  else if (mustHaveRatio >= 0.5)  tags.push({ label: 'Partial Skills Match', color: 'yellow' });
  else                             tags.push({ label: 'Skills Gap', color: 'red' });

  if (domainMatched.length > 0) tags.push({ label: 'Domain Expert', color: 'blue' });
  if (niceToHaveMatched.length > 0) tags.push({ label: `+${niceToHaveMatched.length} Bonus Skills`, color: 'purple' });

  const status = candidate.availability?.status;
  if (status === 'actively_looking') tags.push({ label: 'Actively Looking', color: 'green' });
  if (status === 'not_looking')      tags.push({ label: 'Not Looking', color: 'red' });

  const notice = candidate.availability?.notice_period_days;
  if (notice && notice <= 15) tags.push({ label: 'Immediate Joiner', color: 'green' });
  if (notice && notice > 90)  tags.push({ label: 'Long Notice Period', color: 'yellow' });

  return tags;
}

function _composeSummary({ mustHaveRatio, mustHaveMatched, mustHaveMissing, niceToHaveMatched,
  domainMatched, candidateYears, minYears, maxYears, candidateName }) {
  const parts = [];

  if (mustHaveRatio === 1) {
    parts.push(`${candidateName} matches all required skills`);
  } else if (mustHaveRatio >= 0.75) {
    parts.push(`${candidateName} covers most required skills (missing: ${mustHaveMissing.join(', ')})`);
  } else if (mustHaveRatio >= 0.5) {
    parts.push(`${candidateName} has partial skill coverage (missing: ${mustHaveMissing.join(', ')})`);
  } else {
    parts.push(`${candidateName} has significant skill gaps (matched: ${mustHaveMatched.join(', ')})`);
  }

  if (domainMatched.length > 0) {
    parts.push(`with hands-on ${domainMatched.join(' & ')} domain experience`);
  }

  if (niceToHaveMatched.length > 0) {
    parts.push(`and bonus skills in ${niceToHaveMatched.slice(0, 2).join(', ')}`);
  }

  const inRange = candidateYears >= minYears && candidateYears <= maxYears;
  if (!inRange) {
    if (candidateYears < minYears) {
      parts.push(`Experience at ${candidateYears} yrs is below the ${minYears}-yr minimum`);
    } else {
      parts.push(`At ${candidateYears} yrs may be over-experienced for this role`);
    }
  }

  return parts.join(', ') + '.';
}


// ══════════════════════════════════════════════════════════════════════════════
// OVERRIDDEN PUBLIC API — handles BM25 normalisation at corpus level
// ══════════════════════════════════════════════════════════════════════════════

// Override getTopCandidates to do corpus-level BM25 normalisation
export function getTopCandidates(jd, jdVector, candidates, topN = 10) {
  // Rebuild index if candidate set changed
  if (_candidates !== candidates) {
    _buildIndex(candidates);
  }

  // Phase 1: Score all candidates
  const rawBM25Scores = candidates.map((_, idx) => _scoreBM25F(jd, idx));

  // Phase 2: Normalise BM25 scores to [0, 1] across the full corpus
  const maxBM25 = Math.max(...rawBM25Scores, 1);
  const normBM25 = rawBM25Scores.map(s => s / maxBM25);

  // Phase 3: Compute all scores and build results
  const results = candidates.map((candidate, idx) => {
    const bm25Norm   = normBM25[idx];
    const vectorSim  = _scoreVector(jdVector, candidate.meta?.embedding_vector);
    const bonuses    = _scoreBonuses(jd, candidate);
    const mustHaveRatio = _mustHaveRatio(jd, candidate);
    const matchScore = _fuseScores(bm25Norm, vectorSim, bonuses, mustHaveRatio);

    const breakdown  = _buildScoreBreakdown(jd, candidate, idx, rawBM25Scores[idx], vectorSim, bonuses, matchScore);
    const explanation = _buildExplanation(jd, candidate);

    return {
      candidate,
      matchScore: parseFloat(matchScore.toFixed(1)),
      scoreBreakdown: breakdown,
      explanation,
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, topN);
}


// ══════════════════════════════════════════════════════════════════════════════
// TEXT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function _norm(text) {
  return (text || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _tokenize(text) {
  return _norm(text).split(' ').filter(Boolean);
}

/**
 * Get all normalised name variants for a skill object.
 * Used for explanation matching — must handle synonyms.
 */
function _expandSkillNames(skill) {
  const primary = _norm(skill.normalized || skill.name || '');
  const tokens  = _tokenize(primary);
  const expanded = [...tokens];

  for (const t of tokens) {
    const syns = SKILL_SYNONYMS[t] || [];
    for (const syn of syns) {
      expanded.push(..._tokenize(syn));
    }
  }

  return [...new Set(expanded)];
}