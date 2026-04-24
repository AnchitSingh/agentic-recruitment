/**
 * SearchEngine.js — v5.1 (Performance optimizations)
 *
 * New in v5.1:
 *   #17 Adaptive coverage gating (50% for ≤2 tokens, 40% for longer queries)
 *   #18 Optimized 3-char fuzzy prefix (only runs if standard fuzzy finds nothing)
 *   #19 Increased fuzzy tolerance for long tokens (5 edits for 9+ chars)
 *
 * Changes in v5.0:
 *   - Extracted _analyze() — single shared query-analysis pass
 *   - Extracted _retrieveCandidates(analyzed, opts) — eliminates 60+ lines
 *     of duplicated scoring logic between search() and suggest()
 *   - Added intent fallback injection: metadata-only queries ("trending",
 *     "high yield", "recommended") now produce results even when no
 *     document contains those words as indexed text
 *   - All v4.2 fixes (#1–#12) preserved
 *
 * Pipeline:
 *
 *   RAW QUERY STRING
 *       │
 *       ▼
 *   [1] _analyze():
 *       Phrase scan → Tokenise + stopword filter → Intent → Expand + group
 *       │
 *       ▼
 *   [2] _retrieveCandidates(analyzed, opts):
 *       BM25F + prefix + 3-char fuzzy prefix + fuzzy  (configurable weights)
 *       │
 *       ▼
 *   [3] (search only) _injectIntentCandidates() when text retrieval < limit
 *       │
 *       ▼
 *   [4] Assembly: coverage gate → modifiers → sort → slice
 */

import { SYNONYM_MAP, ABBREVIATION_MAP, MEDICAL_STOPWORDS } from './medicalSynonyms';
import {
  LINGO_TOKEN_MAP,
  LINGO_INTENT_MAP,
  LINGO_PHRASE_MAP,
  CAREER_STAGE_MAP,
} from './medicalLingo';

// ── BM25 hyper-parameters ──────────────────────────────────────────────────
const K1 = 1.5;
const B  = 0.75;

// ── Score multipliers ──────────────────────────────────────────────────────
const PHRASE_BOOST        = 2.8;
const PREFIX_BOOST        = 2.2;
const EXACT_BOOST         = 3.5;
const ABBREV_WEIGHT       = 0.90;
const LINGO_WEIGHT        = 0.85;
const SYN_WEIGHT          = 0.55;
const PREFIX_MATCH_WEIGHT = 0.60;
const FUZZY_WEIGHT        = 0.40;

// ── Prefix matching ────────────────────────────────────────────────────────
const MIN_PREFIX_LEN     = 1;
const PREFIX_CAP_SHORT   = 30;
const PREFIX_CAP_DEFAULT = 20;

// ── Coverage gate ──────────────────────────────────────────────────────────
const MIN_COVERAGE         = 0.40;
const MIN_COVERAGE_SUGGEST = 0.20;

// ── Modifier clamps ────────────────────────────────────────────────────────
const INTENT_MUL_MIN = 0.30;
const INTENT_MUL_MAX = 3.00;
const QUAL_MUL_MAX   = 1.60;

// ── Cache ──────────────────────────────────────────────────────────────────
const CACHE_MAX = 64;

// ── Expansion budget ───────────────────────────────────────────────────────
const MAX_VARIANTS = 80;

// ── Retrieval presets ──────────────────────────────────────────────────────
const SEARCH_RETRIEVAL_OPTS = Object.freeze({
  prefixWeight:       PREFIX_MATCH_WEIGHT,
  fuzzyBaseWeight:    FUZZY_WEIGHT,
  fuzzyHighSimWeight: 0.85,
  fuzzyMaxResults:    5,
  trackFuzzyMatches:  true,
  computePhraseBonus: true,
});

const SUGGEST_RETRIEVAL_OPTS = Object.freeze({
  prefixWeight:       0.50,
  fuzzyBaseWeight:    0.50,
  fuzzyHighSimWeight: 0.85,
  fuzzyMaxResults:    8,
  trackFuzzyMatches:  false,
  computePhraseBonus: false,
});


export default class SearchEngine {
  constructor(categories) {
    this.docs        = [];
    this.index       = new Map();
    this.phraseIdx   = new Map();
    this.triIndex    = new Map();
    this.sortedToks  = [];
    this.idf         = new Map();
    this.docLens     = [];
    this.fieldLens   = [];
    this.avgFieldLen = {};
    this.avgDocLen   = 0;

    this._levBuf = [[], [], []];

    this._searchCache  = new Map();
    this._suggestCache = new Map();

    this.W = {
      title:         12,
      label:         12,
      abbreviations: 11,
      lingo:         10,
      aliases:        8,
      topic:          7,
      tags:           6,
      keywords:       5,
      description:    3,
      category:       3,
      system:         2,
      difficulty:     1,
    };

    this._diffMap = {
      easy: 'Easy', beginner: 'Easy', basic: 'Easy', simple: 'Easy',
      intro: 'Easy', introductory: 'Easy', starter: 'Easy', doable: 'Easy', quick: 'Easy',
      medium: 'Medium', moderate: 'Medium', intermediate: 'Medium', solid: 'Medium',
      hard: 'Hard', difficult: 'Hard', advanced: 'Hard', challenging: 'Hard',
      brutal: 'Hard', killer: 'Hard', gnarly: 'Hard', beast: 'Hard',
      destroyer: 'Hard', tough: 'Hard',
    };

    this._sysMap = {
      cardio: 'Cardiovascular', cardiac: 'Cardiovascular', heart: 'Cardiovascular',
      cvs: 'Cardiovascular', cards: 'Cardiovascular',
      renal: 'Renal', kidney: 'Renal', nephro: 'Renal',
      neuro: 'Nervous', brain: 'Nervous', neuroanatomy: 'Nervous',
      gi: 'GI', gastro: 'GI', gut: 'GI', gastrointestinal: 'GI', bowel: 'GI',
      heme: 'Hematologic', blood: 'Hematologic', hematology: 'Hematologic', hem: 'Hematologic',
      msk: 'Musculoskeletal', bone: 'Musculoskeletal', orthopedic: 'Musculoskeletal', ortho: 'Musculoskeletal',
      pulm: 'Respiratory', pulmonary: 'Respiratory', lung: 'Respiratory', respiratory: 'Respiratory',
      infectious: 'Infectious', micro: 'Infectious', bacteria: 'Infectious',
      reproductive: 'Reproductive', obgyn: 'Reproductive', ob: 'Reproductive',
    };

    this._stepMap = {
      step1: 'step1', 'step 1': 'step1', preclinical: 'step1', foundations: 'step1',
      step2: 'step2ck', 'step 2': 'step2ck', step2ck: 'step2ck',
      step3: 'step3', 'step 3': 'step3', ccs: 'step3',
    };

    this._stepPatterns = Object.entries(this._stepMap)
      .sort(([a], [b]) => b.length - a.length)
      .map(([pattern, stepId]) => ({
        re: new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
        stepId,
      }));

    this._sortedPhrases = [...LINGO_PHRASE_MAP.entries()].sort(
      ([a], [b]) => b.length - a.length
    );

    this._build(categories);
    this._computeIDF();
    this._computeAvgFieldLens();
    this.sortedToks = [...this.index.keys()].sort();
  }


  // ══════════════════════════════════════════════════════════════════════════
  // INDEX CONSTRUCTION
  // ══════════════════════════════════════════════════════════════════════════

  _build(categories) {
    for (const cat of categories) {
      const ci = this.docs.length;

      this.docs.push({
        type: 'category',
        result: {
          type: 'category', id: cat.id, label: cat.label, icon: cat.icon,
          description: cat.description, premium: cat.premium,
          quizCount: cat.quizzes.length, tags: cat.tags || [],
        },
        boosts: {
          trending: false, recommended: false, highYield: false,
          rating: 0, completions: 0, searchBoost: cat.searchBoost || 1,
          isCat: true, difficulty: null, system: null, categoryId: cat.id,
        },
        titleNorm: this._norm(cat.label),
      });

      this._addDoc(ci, {
        label:       cat.label,
        description: cat.description || '',
        aliases:     (cat.aliases || []).join(' '),
        tags:        (cat.tags || []).join(' '),
        keywords:    (cat.keywords || []).join(' '),
        lingo:       (cat.lingo || []).join(' '),
      });

      for (const q of cat.quizzes) {
        const qi = this.docs.length;

        this.docs.push({
          type: 'quiz',
          result: {
            type: 'quiz', id: q.id, slug: q.slug, title: q.title, questions: q.questions,
            difficulty: q.difficulty, duration: q.duration, topic: q.topic,
            completions: q.completions, rating: q.rating,
            trending: !!q.trending, recommended: !!q.recommended, highYield: !!q.highYield,
            system: q.system || '', tags: q.tags || [],
            abbreviations: q.abbreviations || [],
            relatedTopics: q.relatedTopics || [],
            categoryId: cat.id, categoryIcon: cat.icon,
            categoryLabel: cat.label, premium: cat.premium,
          },
          boosts: {
            trending: !!q.trending, recommended: !!q.recommended, highYield: !!q.highYield,
            rating: q.rating || 0, completions: q.completions || 0,
            searchBoost: q.searchBoost || 1, isCat: false,
            difficulty: q.difficulty, system: q.system || '', categoryId: cat.id,
          },
          titleNorm: this._norm(q.title),
        });

        this._addDoc(qi, {
          title:         q.title,
          topic:         q.topic,
          abbreviations: (q.abbreviations || []).join(' '),
          lingo:         (q.lingo || []).join(' '),
          tags:          (q.tags || []).join(' '),
          keywords:      (q.keywords || []).join(' '),
          category:      cat.label,
          difficulty:    q.difficulty,
          system:        q.system || '',
        });
      }
    }

    const total = this.docLens.reduce((a, b) => a + b, 0);
    this.avgDocLen = total / Math.max(1, this.docLens.length);
  }

  _addDoc(docIdx, fields) {
    let docLen = 0;
    const fLens = {};

    for (const [field, text] of Object.entries(fields)) {
      if (!text) continue;

      const tokens = this._tok(text);
      docLen += tokens.length;
      fLens[field] = tokens.length;

      const freq = {};
      for (const t of tokens) freq[t] = (freq[t] || 0) + 1;

      for (const [token, tf] of Object.entries(freq)) {
        if (!this.index.has(token)) this.index.set(token, []);
        this.index.get(token).push({ docIdx, field, tf, isFirst: tokens[0] === token });

        for (const tri of this._tri(token)) {
          if (!this.triIndex.has(tri)) this.triIndex.set(tri, new Set());
          this.triIndex.get(tri).add(token);
        }
      }

      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        if (!this.phraseIdx.has(bigram)) this.phraseIdx.set(bigram, []);
        this.phraseIdx.get(bigram).push({ docIdx, field });
      }
    }

    this.docLens[docIdx]   = docLen;
    this.fieldLens[docIdx] = fLens;
  }

  _computeIDF() {
    const N = this.docs.length;
    for (const [token, postings] of this.index) {
      const df = new Set(postings.map((p) => p.docIdx)).size;
      this.idf.set(token, Math.max(0, Math.log((N - df + 0.5) / (df + 0.5) + 1)));
    }
  }

  _computeAvgFieldLens() {
    const sums   = {};
    const counts = {};

    for (const fLens of this.fieldLens) {
      for (const [field, len] of Object.entries(fLens)) {
        sums[field]   = (sums[field] || 0) + len;
        counts[field] = (counts[field] || 0) + 1;
      }
    }

    for (const field of Object.keys(sums)) {
      this.avgFieldLen[field] = sums[field] / Math.max(1, counts[field]);
    }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // TEXT HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  _tok(text) {
    if (!text) return [];
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  _norm(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  _tri(word) {
    if (word.length === 0) return [];
    if (word.length <= 2) return [word];
    const p = ` ${word} `;
    const r = [];
    for (let i = 0; i <= p.length - 3; i++) r.push(p.slice(i, i + 3));
    return r;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // QUERY ANALYSIS (shared by search + suggest)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Single analysis pass — phrase scan, tokenise, intent, expand, group.
   * Both search() and suggest() call this identically.
   */
  _analyze(rawQuery) {
    const { extraTokens, phraseIntent } = this._scanPhrases(rawQuery);
    const { rawTokens, coreTokens, coreCount } = this._tokeniseQuery(rawQuery, extraTokens);
    const intent    = this._detectIntent(rawTokens, phraseIntent);
    const variants  = this._expandQuery(rawTokens);
    const variantsBySource = this._groupVariants(variants);
    const normQuery = coreTokens.join(' ');

    return { rawTokens, coreTokens, coreCount, intent, variants, variantsBySource, normQuery };
  }

  _scanPhrases(rawQuery) {
    const q = rawQuery.toLowerCase();
    const extraTokens = [];
    const phraseIntent = {};

    for (const [phrase, config] of this._sortedPhrases) {
      if (q.includes(phrase)) {
        if (config.tokens) extraTokens.push(...config.tokens.flatMap((t) => this._tok(t)));
        if (config.intent) Object.assign(phraseIntent, config.intent);
      }
    }

    return { extraTokens: [...new Set(extraTokens)], phraseIntent };
  }

  _tokeniseQuery(rawText, extraTokens = []) {
    const allTokens  = this._tok(rawText);
    let coreTokens   = allTokens.filter((t) => !MEDICAL_STOPWORDS.has(t));

    if (coreTokens.length === 0 && allTokens.length > 0) {
      coreTokens = allTokens;
    }

    const coreSet  = new Set(coreTokens);
    coreTokens     = [...coreSet];
    const coreCount = coreTokens.length;

    const bonusTokens = extraTokens.filter(
      (t) => !MEDICAL_STOPWORDS.has(t) && this.index.has(t) && !coreSet.has(t)
    );

    return {
      rawTokens:  [...coreTokens, ...bonusTokens],
      coreTokens,
      coreCount,
    };
  }

  _detectIntent(tokens, phraseIntent = {}) {
    const intent = {
      difficulty:  phraseIntent.difficulty  || null,
      step:        phraseIntent.step        || null,
      system:      phraseIntent.system      || null,
      highYield:   phraseIntent.highYield   || false,
      trending:    phraseIntent.trending    || false,
      recommended: phraseIntent.recommended || false,
      extraBoost:  phraseIntent.boost       || 1.0,
    };

    const fullQ = tokens.join(' ');

    if (!intent.step) {
      for (const { re, stepId } of this._stepPatterns) {
        if (re.test(fullQ)) { intent.step = stepId; break; }
      }
    }

    for (const t of tokens) {
      if (!intent.difficulty && this._diffMap[t])  intent.difficulty = this._diffMap[t];
      if (!intent.system && this._sysMap[t])       intent.system     = this._sysMap[t];
      if (!intent.step && CAREER_STAGE_MAP.has(t)) intent.step       = CAREER_STAGE_MAP.get(t);

      if (LINGO_INTENT_MAP.has(t)) {
        const sig = LINGO_INTENT_MAP.get(t);
        if (sig.highYield)                         intent.highYield   = true;
        if (sig.trending)                          intent.trending    = true;
        if (sig.recommended)                       intent.recommended = true;
        if (sig.boost)                             intent.extraBoost  = Math.max(intent.extraBoost, sig.boost);
        if (sig.difficulty && !intent.difficulty)   intent.difficulty  = sig.difficulty;
      }
    }

    return intent;
  }

  _expandQuery(rawTokens) {
    const variants = [];
    const seen = new Set();

    for (const t of rawTokens) {
      if (seen.has(t)) continue;
      seen.add(t);

      variants.push({ t, w: 1.0, source: t });

      this._addExpansions(variants, seen, t, ABBREVIATION_MAP.get(t), ABBREV_WEIGHT);
      this._addExpansions(variants, seen, t, LINGO_TOKEN_MAP.get(t),  LINGO_WEIGHT);
      this._addExpansions(variants, seen, t, SYNONYM_MAP.get(t),      SYN_WEIGHT);

      if (variants.length >= MAX_VARIANTS) break;
    }

    return variants;
  }

  _addExpansions(variants, seen, source, expansions, weight) {
    if (!expansions) return;
    for (const exp of expansions) {
      for (const et of this._tok(exp)) {
        if (!seen.has(et)) {
          seen.add(et);
          variants.push({ t: et, w: weight, source });
          if (variants.length >= MAX_VARIANTS) return;
        }
      }
    }
  }

  _groupVariants(variants) {
    const map = new Map();
    for (const v of variants) {
      if (!map.has(v.source)) map.set(v.source, []);
      map.get(v.source).push(v);
    }
    return map;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATE RETRIEVAL (shared by search + suggest)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Runs the BM25F + prefix + fuzzy scoring loop.
   *
   * Configurable via `opts` so search and suggest can use different weights
   * without duplicating the loop structure.
   *
   * @param {Object} analyzed    — output of _analyze()
   * @param {Object} opts
   * @param {number} opts.prefixWeight       — multiplier for prefix-matched tokens
   * @param {number} opts.fuzzyBaseWeight     — multiplier for low-similarity fuzzy hits
   * @param {number} opts.fuzzyHighSimWeight  — multiplier for high-similarity fuzzy hits (sim > 0.8)
   * @param {number} opts.fuzzyMaxResults     — max fuzzy candidates per token
   * @param {boolean} opts.trackFuzzyMatches  — whether to build hasFuzzyMatch map
   * @param {boolean} opts.computePhraseBonus — whether to compute bigram phrase bonus
   * @returns {{ scores: Map, phraseBonus: Map|null, hasFuzzyMatch: Map|null }}
   */
  _retrieveCandidates(analyzed, opts) {
    const {
      prefixWeight,
      fuzzyBaseWeight,
      fuzzyHighSimWeight,
      fuzzyMaxResults,
      trackFuzzyMatches,
      computePhraseBonus,
    } = opts;

    const { rawTokens, variantsBySource } = analyzed;
    const scores        = new Map();
    const hasFuzzyMatch = trackFuzzyMatches ? new Map() : null;

    for (let ti = 0; ti < rawTokens.length; ti++) {
      const t  = rawTokens[ti];
      const tv = variantsBySource.get(t) || [];

      for (const { t: vt, w } of tv) {
        const idf = this.idf.get(vt) ?? 0;
        this._bm25Acc(this.index.get(vt), scores, ti, w, idf);

        // ── Prefix expansion ─────────────────────────────────────────────
        if (vt.length >= MIN_PREFIX_LEN) {
          const cap = vt.length <= 1 ? PREFIX_CAP_SHORT : PREFIX_CAP_DEFAULT;
          for (const pt of this._prefixMatch(vt, cap)) {
            if (pt !== vt) {
              const pIdf = this.idf.get(pt) ?? 0;
              this._bm25Acc(this.index.get(pt), scores, ti, w * prefixWeight, pIdf);
            }
          }
        }

        // ── 3-char fuzzy prefix (optimized) ──────────────────────────────
        if (vt.length === 3) {
          // Only run expensive brute-force if standard fuzzy finds nothing
          const quickFuzzy = this._fuzzy(vt, 2);
          if (quickFuzzy.length === 0) {
            for (let ci = 0; ci < 26; ci++) {
              const c = String.fromCharCode(97 + ci);
              const fuzzyPrefix = c + vt.substring(1, 3);
              for (const pt of this._prefixMatch(fuzzyPrefix, 5)) {
                const pIdf = this.idf.get(pt) ?? 0;
                this._bm25Acc(this.index.get(pt), scores, ti, w * 0.25, pIdf);
              }
            }
          }
        }

        // ── Fuzzy expansion ──────────────────────────────────────────────
        if (vt.length >= 3) {
          for (const { token: ft, sim } of this._fuzzy(vt, fuzzyMaxResults)) {
            const fIdf     = this.idf.get(ft) ?? 0;
            const postings = this.index.get(ft);
            if (!postings) continue;

            const boost = sim > 0.8 ? fuzzyHighSimWeight : fuzzyBaseWeight;
            this._bm25Acc(postings, scores, ti, w * sim * boost, fIdf);

            if (hasFuzzyMatch && sim > 0.8) {
              for (const { docIdx } of postings) {
                hasFuzzyMatch.set(docIdx, Math.max(hasFuzzyMatch.get(docIdx) || 0, sim));
              }
            }
          }
        }
      }
    }

    // ── Phrase bonus (bigram adjacency) ──────────────────────────────────
    let phraseBonus = null;
    if (computePhraseBonus && rawTokens.length > 1) {
      phraseBonus = new Map();
      for (let i = 0; i < rawTokens.length - 1; i++) {
        const bigram = `${rawTokens[i]} ${rawTokens[i + 1]}`;
        for (const { docIdx, field } of (this.phraseIdx.get(bigram) || [])) {
          phraseBonus.set(
            docIdx,
            (phraseBonus.get(docIdx) || 0) + (this.W[field] || 1) * PHRASE_BOOST,
          );
        }
      }
    }

    return { scores, phraseBonus, hasFuzzyMatch };
  }


  // ══════════════════════════════════════════════════════════════════════════
  // INTENT FALLBACK INJECTION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns true when the detected intent includes metadata-only signals
   * (flags that aren't stored as indexed text, so BM25 can't find them).
   */
  _hasMetadataIntent(intent) {
    return intent.highYield || intent.trending || intent.recommended;
  }

  /**
   * Injects low-scoring candidates that match metadata intent, so they
   * appear when text retrieval comes up short.  Fills all coverage
   * buckets so injected docs pass the coverage gate.
   */
  _injectIntentCandidates(scores, intent, coreCount, limit) {
    const cap = limit * 3;

    for (let i = 0; i < this.docs.length && scores.size < cap; i++) {
      if (scores.has(i)) continue;

      const b = this.docs[i].boosts;
      let match = false;

      if (intent.highYield   && b.highYield)              match = true;
      if (intent.trending    && b.trending)               match = true;
      if (intent.recommended && b.recommended)            match = true;
      if (intent.system      && b.system === intent.system) match = true;

      if (match) {
        // Synthetic full coverage so the doc passes the coverage gate.
        // Low base score (0.1) ensures these rank below any decent text match.
        const buckets = new Set(Array.from({ length: coreCount }, (_, idx) => idx));
        scores.set(i, { buckets, total: 0.1 });
      }
    }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // CORE SEARCH
  // ══════════════════════════════════════════════════════════════════════════

  search(query, limit = 12) {
    const q = query?.trim();
    if (!q) return [];

    // ── LRU cache ────────────────────────────────────────────────────────
    const cacheKey = `${q}|${limit}`;
    if (this._searchCache.has(cacheKey)) {
      const v = this._searchCache.get(cacheKey);
      this._searchCache.delete(cacheKey);
      this._searchCache.set(cacheKey, v);
      return v;
    }

    // [1] Analyse
    const analyzed = this._analyze(q);
    if (!analyzed.rawTokens.length) return [];

    // [2] Retrieve candidates
    const { scores, phraseBonus, hasFuzzyMatch } = this._retrieveCandidates(
      analyzed,
      SEARCH_RETRIEVAL_OPTS,
    );

    // [3] Intent fallback — inject metadata matches when text retrieval is sparse
    if (scores.size < limit && this._hasMetadataIntent(analyzed.intent)) {
      this._injectIntentCandidates(scores, analyzed.intent, analyzed.coreCount, limit);
    }

    // [4] Assemble final scores
    const { coreCount, normQuery, intent } = analyzed;
    const results = [];
    const minCov = coreCount <= 2 ? 0.5 : MIN_COVERAGE;  // Adaptive coverage

    for (const [docIdx, { buckets, total }] of scores) {
      const doc      = this.docs[docIdx];
      const b        = doc.boosts;
      const coverage = coreCount > 0 ? buckets.size / coreCount : 1;

      if (coverage < minCov) continue;

      const penalty = coverage >= 1 ? 1.0 : 0.3 + 0.7 * coverage;

      // ── Text relevance ─────────────────────────────────────────────────
      let textScore = (total + (phraseBonus?.get(docIdx) || 0)) * penalty;

      // Title bonus
      const dt = doc.titleNorm;
      if (dt === normQuery)                                       textScore *= EXACT_BOOST;
      else if (dt.startsWith(normQuery))                         textScore *= PREFIX_BOOST;
      else if (normQuery.length >= 3 && dt.includes(normQuery))  textScore *= 1.5;

      // ── Intent modifier (clamped) ──────────────────────────────────────
      let intentMul = 1.0;

      if (intent.difficulty && b.difficulty) {
        intentMul *= b.difficulty === intent.difficulty ? 1.3 : 0.6;
      }
      if (intent.step && b.categoryId) {
        intentMul *= b.categoryId === intent.step ? 1.4 : 1.0;
      }
      if (intent.system && b.system) {
        intentMul *= b.system === intent.system ? 1.3 : 1.0;
      }
      if (intent.highYield)   intentMul *= b.highYield   ? 1.35 : 0.75;
      if (intent.trending)    intentMul *= b.trending     ? 1.25 : 0.85;
      if (intent.recommended) intentMul *= b.recommended  ? 1.20 : 0.90;
      if (intent.extraBoost > 1.0) intentMul *= intent.extraBoost;

      intentMul = Math.max(INTENT_MUL_MIN, Math.min(intentMul, INTENT_MUL_MAX));

      // ── Quality modifier (clamped) ─────────────────────────────────────
      let qualMul = 1.0;

      if (b.trending)        qualMul += 0.10;
      if (b.recommended)     qualMul += 0.08;
      if (b.highYield)       qualMul += 0.15;
      if (b.rating)          qualMul += Math.max(0, (b.rating - 4) * 0.05);
      if (b.completions)     qualMul += Math.min(b.completions / 10000, 0.15);
      if (b.isCat)           qualMul += 0.05;
      if (b.searchBoost > 1) qualMul *= b.searchBoost;

      qualMul = Math.min(qualMul, QUAL_MUL_MAX);

      // ── Final ──────────────────────────────────────────────────────────
      let score = textScore * intentMul * qualMul;

      if (hasFuzzyMatch?.has(docIdx)) {
        score *= (1 + hasFuzzyMatch.get(docIdx) * 0.5);
      }

      results.push({ ...doc.result, _score: score, _coverage: coverage, _intent: intent });
    }

    results.sort((a, b) => b._score - a._score);
    const sliced = results.slice(0, limit);

    this._cacheSet(this._searchCache, cacheKey, sliced);
    return sliced;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SUGGEST
  // ══════════════════════════════════════════════════════════════════════════

  suggest(query, limit = 5) {
    const q = query?.trim();
    if (!q) return [];

    // ── LRU cache ────────────────────────────────────────────────────────
    const cacheKey = `${q}|${limit}`;
    if (this._suggestCache.has(cacheKey)) {
      const v = this._suggestCache.get(cacheKey);
      this._suggestCache.delete(cacheKey);
      this._suggestCache.set(cacheKey, v);
      return v;
    }

    // [1] Analyse
    const analyzed = this._analyze(q);
    if (!analyzed.rawTokens.length) return [];

    // [2] Retrieve candidates (lighter config — no phrase bonus, no fuzzy tracking)
    const { scores } = this._retrieveCandidates(analyzed, SUGGEST_RETRIEVAL_OPTS);

    // [3] Assemble suggestions
    const { coreCount } = analyzed;
    const candidates = [];
    const minCov = coreCount <= 2 ? 0.3 : MIN_COVERAGE_SUGGEST;  // Adaptive coverage

    for (const [docIdx, { buckets, total }] of scores) {
      const coverage = coreCount > 0 ? buckets.size / coreCount : 1;
      if (coverage < minCov) continue;

      const doc   = this.docs[docIdx];
      const label = doc.result.title || doc.result.label;
      candidates.push({ label, query: label, score: total * coverage });
    }

    candidates.sort((a, b) => b.score - a.score);

    // Dedup keeping highest-scoring entry
    const seen    = new Set();
    const deduped = [];
    for (const c of candidates) {
      if (!seen.has(c.label)) {
        seen.add(c.label);
        deduped.push(c);
        if (deduped.length >= limit) break;
      }
    }

    this._cacheSet(this._suggestCache, cacheKey, deduped);
    return deduped;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // BM25F ACCUMULATOR
  // ══════════════════════════════════════════════════════════════════════════

  _bm25Acc(postings, scores, tokenIdx, weight, idf) {
    if (!postings || idf <= 0) return;

    for (const { docIdx, field, tf, isFirst } of postings) {
      const fw       = this.W[field] || 1;
      const fieldLen = this.fieldLens[docIdx]?.[field] ?? 1;
      const avgFL    = this.avgFieldLen[field] ?? 1;
      const normTf   = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * fieldLen / avgFL));

      let s = idf * fw * normTf * weight;
      if (isFirst) s *= 1.25;

      if (!scores.has(docIdx)) scores.set(docIdx, { buckets: new Set(), total: 0 });
      const entry = scores.get(docIdx);
      entry.total += s;
      entry.buckets.add(tokenIdx);
    }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // PREFIX MATCHING
  // ══════════════════════════════════════════════════════════════════════════

  _prefixMatch(pref, maxMatches = PREFIX_CAP_DEFAULT) {
    const arr = this.sortedToks;
    let lo = 0, hi = arr.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < pref) lo = mid + 1; else hi = mid;
    }

    const out = [];
    while (lo < arr.length && arr[lo].startsWith(pref)) {
      out.push(arr[lo++]);
      if (out.length >= maxMatches) break;
    }
    return out;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // FUZZY MATCHING
  // ══════════════════════════════════════════════════════════════════════════

  _fuzzy(token, maxResults = 5) {
    const candidates = new Map();

    for (const tri of this._tri(token)) {
      const toks = this.triIndex.get(tri);
      if (!toks) continue;
      for (const t of toks) {
        if (t !== token) candidates.set(t, (candidates.get(t) || 0) + 1);
      }
    }

    // More lenient for longer medical terms
    const maxDist = token.length <= 3 ? 1 
                  : token.length <= 5 ? 2 
                  : token.length <= 8 ? 4 
                  : 5;  // Allow 5 edits for long terms (9+ chars)
    const results = [];

    for (const [cand, shared] of candidates) {
      const maxLenDiff = Math.max(maxDist + 2, Math.ceil(token.length * 0.5));
      if (Math.abs(cand.length - token.length) > maxLenDiff) continue;

      if (shared < 1 && token.length <= 6) continue;

      const dist = this._lev(token, cand);
      if (dist <= maxDist) {
        results.push({ token: cand, sim: 1 - dist / Math.max(token.length, cand.length) });
      }
    }

    results.sort((a, b) => b.sim - a.sim);
    return results.slice(0, maxResults);
  }

  /**
   * Damerau-Levenshtein distance (transpositions = 1 edit).
   */
  _lev(a, b) {
    const la = a.length, lb = b.length;
    if (a === b) return 0;
    if (!la) return lb;
    if (!lb) return la;

    if (this._levBuf[0].length < lb + 1) {
      this._levBuf = [new Array(lb + 1), new Array(lb + 1), new Array(lb + 1)];
    }

    let pp = this._levBuf[0];
    let p  = this._levBuf[1];
    let c  = this._levBuf[2];

    for (let j = 0; j <= lb; j++) p[j] = j;

    for (let i = 1; i <= la; i++) {
      c[0] = i;

      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        c[j] = Math.min(
          p[j] + 1,
          c[j - 1] + 1,
          p[j - 1] + cost,
        );

        if (
          i > 1 && j > 1 &&
          a.charAt(i - 1) === b.charAt(j - 2) &&
          a.charAt(i - 2) === b.charAt(j - 1)
        ) {
          c[j] = Math.min(c[j], pp[j - 2] + 1);
        }
      }

      const tmp = pp;
      pp = p;
      p  = c;
      c  = tmp;
    }

    return p[lb];
  }


  // ══════════════════════════════════════════════════════════════════════════
  // LRU CACHE HELPER
  // ══════════════════════════════════════════════════════════════════════════

  _cacheSet(cache, key, value) {
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= CACHE_MAX) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, value);
  }
}