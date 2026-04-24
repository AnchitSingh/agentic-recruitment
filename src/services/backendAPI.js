/**
 * Backend API Service (Supabase Implementation)
 * Connects to real Supabase database
 *
 * ── Fixes applied ──────────────────────────────────────────
 * #1  N+1 query eliminated in fetchQuizzes (uses total_questions column)
 * #2  fetchAllQuestionSlugs now paginates past the 1 000-row cap
 * #3  checkSlugAvailability uses .maybeSingle() (no throw on 0 rows)
 * #4  getCategories / getSubjects return success:false on error
 * #5  User input sanitised before PostgREST .or() filters
 * #6  fetchTopicData disease scan reduced from 5 cols → 1 col + targeted fetch
 * #7  getCategories + getSubjects share a single cached query
 * #8  fetchQuizBySlug uses a join (1 query instead of 2)
 * #9  fetchStudyPackBySlug uses a join (2 queries instead of 3)
 * #10 Dead variable `wordFilters` removed from fetchTopicData
 * #11 Typo fixed: determinTopicName → determineTopicName
 * #13 fetchQuizBySlug selects only needed columns
 * #14 In-memory cache added for rarely-changing data
 * ───────────────────────────────────────────────────────────
 */

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

/** Simple in-memory cache with TTL for rarely-changing data (#14) */
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function withCache(key, fetcher) {
  return async (...args) => {
    const cacheKey = `${key}:${JSON.stringify(args)}`;
    const entry = _cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      return entry.value;
    }
    const result = await fetcher(...args);
    if (result.success) {
      _cache.set(cacheKey, { value: result, ts: Date.now() });
    }
    return result;
  };
}

/** Sanitise user-supplied strings before embedding in PostgREST filters (#5) */
function sanitizeForPostgrest(input) {
  if (!input) return '';
  return input
    .replace(/\\/g, '\\\\')    // escape backslashes first
    .replace(/%/g, '\\%')      // escape LIKE wildcard %
    .replace(/_/g, '\\_')      // escape LIKE wildcard _
    .replace(/[,.()"']/g, '')  // strip PostgREST syntax chars
    .trim();
}

/**
 * Paginated fetch — works around Supabase's default 1 000-row cap (#2).
 * @param {Function} buildQuery – must return a *fresh* Supabase query builder
 * @returns {Promise<Array>}
 */
async function fetchAllPaginated(buildQuery) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// ═══════════════════════════════════════════════════════════
// QUIZ FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch all quizzes (catalog view)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} - Response with quiz list
 *
 * FIX #1:  Uses total_questions column — eliminates N+1 COUNT queries
 * FIX #5:  Sanitises search input before .or()
 * FIX #13: Selects only needed columns
 */
export async function fetchQuizzes(filters = {}) {
  try {
    let query = supabase
      .from('quizzes')
      .select('id, slug, title, description, category, subject, difficulty, time_limit, total_questions, created_at')
      .eq('is_published', true);

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.search) {
      const safe = sanitizeForPostgrest(filters.search);
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Map directly — no extra queries needed (#1)
    const quizzesWithCount = (data || []).map(quiz => ({
      ...quiz,
      questionCount: quiz.total_questions || 0,
      timeLimit: quiz.time_limit,
    }));

    return {
      success: true,
      data: quizzesWithCount,
    };
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Fetch single quiz by slug with all questions
 * @param {string} slug - Quiz slug
 * @returns {Promise<Object>} - Response with full quiz data
 *
 * FIX #8:  Single join query instead of 2 serial queries
 * FIX #13: Selects only needed columns
 */
export async function fetchQuizBySlug(slug) {
  try {
    // Single query: quiz + embedded questions (#8)
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        id, slug, title, description, category, subject, difficulty, time_limit,
        questions (
          id, question_text, question_type, options, correct_answer,
          explanation, difficulty, subject, topic, tags, vignette,
          question_stem, distractor_explanations, learning_objective, key_concept
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    if (!quiz) {
      return {
        success: false,
        error: 'Quiz not found',
      };
    }

    // Sort questions by id client-side (original used .order('id'))
    const questions = (quiz.questions || []).sort((a, b) => a.id - b.id);

    // Transform to match frontend format (identical shape to original)
    const transformedQuiz = {
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      timeLimit: quiz.time_limit,
      questionCount: questions.length,
      source: 'backend',
      questions: questions.map(q => ({
        id: q.id.toString(),
        question: q.question_text,
        type: q.question_type,
        options: q.options || [],
        correct_answer: parseInt(q.correct_answer),
        explanation: q.explanation,
        difficulty: q.difficulty,
        subject: q.subject,
        topic: q.topic,
        tags: q.tags || [],
        vignette: q.vignette || null,
        questionStem: q.question_stem || null,
        distractorExplanations: q.distractor_explanations || null,
        learningObjective: q.learning_objective || null,
        keyConcept: q.key_concept || null,
      })),
    };

    return {
      success: true,
      data: transformedQuiz,
    };
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// EXAM / STEP FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch aggregated exam data (quiz/question counts per USMLE step)
 * (no changes — already uses static import)
 */
export async function fetchExamAggregates() {
  try {
    const { quizMetaData } = await import('../data/quizMetaData.js');

    const steps = {};
    for (const quiz of quizMetaData) {
      if (!steps[quiz.step]) {
        steps[quiz.step] = {
          step: quiz.step,
          quizCount: 0,
          questionCount: 0,
          subjects: new Set(),
        };
      }
      steps[quiz.step].quizCount++;
      steps[quiz.step].questionCount += quiz.total_questions || 0;
      if (quiz.subject) steps[quiz.step].subjects.add(quiz.subject);
    }

    const result = Object.values(steps).map(s => ({
      ...s,
      subjects: [...s.subjects].sort(),
    }));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Fetch a single study pack with its quizzes (ordered)
 *
 * FIX #9: Combined pack + junction-table fetch into 1 join query
 */
export async function fetchStudyPackBySlug(slug) {
  try {
    // 1. Get pack + quiz links in a single join (#9)
    const { data: rawPack, error: packError } = await supabase
      .from('study_packs')
      .select(`
        *,
        study_pack_quizzes (
          position,
          quiz:quizzes (
            id, slug, title, description, subject, difficulty,
            total_questions, time_limit, organ_system, step, category
          )
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (packError || !rawPack) {
      return { success: false, error: 'Study pack not found' };
    }

    // Separate junction data from pack fields so it doesn't leak into response
    const { study_pack_quizzes: rawLinks, ...pack } = rawPack;

    // Sort by position client-side (original used .order('position'))
    const links = (rawLinks || []).sort(
      (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity)
    );

    // 2. For each quiz, get question-level metadata (tags, topics)
    const quizIds = links.map(l => l.quiz?.id).filter(Boolean);

    let questionMeta = [];
    if (quizIds.length > 0) {
      const { data: qMeta } = await supabase
        .from('questions')
        .select('quiz_id, tags, disease, topic, difficulty')
        .in('quiz_id', quizIds);
      questionMeta = qMeta || [];
    }

    // Group question metadata by quiz
    const metaByQuiz = {};
    for (const q of questionMeta) {
      if (!metaByQuiz[q.quiz_id]) {
        metaByQuiz[q.quiz_id] = {
          tags: new Set(),
          diseases: new Set(),
          topics: new Set(),
          difficulties: { easy: 0, medium: 0, hard: 0 },
        };
      }
      const m = metaByQuiz[q.quiz_id];
      if (Array.isArray(q.tags)) q.tags.forEach(t => m.tags.add(t));
      if (q.disease) m.diseases.add(q.disease);
      if (q.topic) m.topics.add(q.topic);
      const d = (q.difficulty || 'medium').toLowerCase();
      m.difficulties[d] = (m.difficulties[d] || 0) + 1;
    }

    // 3. Shape the response
    const quizzes = links
      .filter(l => l.quiz)
      .map((l, index) => {
        const quiz = l.quiz;
        const meta = metaByQuiz[quiz.id];
        return {
          id: quiz.id,
          slug: quiz.slug,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          difficulty: quiz.difficulty,
          totalQuestions: quiz.total_questions || 0,
          timeLimit: quiz.time_limit,
          organSystem: quiz.organ_system,
          step: quiz.step,
          category: quiz.category,
          position: l.position ?? index,
          tags: meta ? [...meta.tags].slice(0, 8) : [],
          diseases: meta ? [...meta.diseases] : [],
          topics: meta ? [...meta.topics] : [],
        };
      });

    // 4. Aggregate stats
    const totalQuestions = quizzes.reduce((s, q) => s + q.totalQuestions, 0);
    const totalTime = quizzes.reduce(
      (s, q) => s + (q.timeLimit || q.totalQuestions * 90),
      0
    );
    const allTags = [...new Set(quizzes.flatMap(q => q.tags))];
    const allDiseases = [...new Set(quizzes.flatMap(q => q.diseases))];
    const organSystems = [
      ...new Set(quizzes.map(q => q.organSystem).filter(Boolean)),
    ];

    return {
      success: true,
      data: {
        ...pack,
        quizzes,
        stats: {
          totalQuizzes: quizzes.length,
          totalQuestions,
          totalTimeMinutes: Math.ceil(totalTime / 60),
          allTags: allTags.slice(0, 20),
          allDiseases,
          organSystems,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all data for a given USMLE step
 * (no major changes — already well-optimised with Promise.all)
 */
export async function fetchExamStepData(step) {
  try {
    const [quizRes, packRes] = await Promise.all([
      supabase
        .from('quizzes')
        .select(
          'id, slug, title, description, subject, difficulty, total_questions, time_limit, organ_system, step, category'
        )
        .eq('step', step)
        .eq('is_published', true)
        .order('organ_system')
        .order('title'),

      supabase
        .from('study_packs')
        .select('*')
        .eq('step', step)
        .eq('is_published', true)
        .order('title'),
    ]);

    if (quizRes.error) throw quizRes.error;
    if (packRes.error) throw packRes.error;

    const quizzes = quizRes.data || [];
    const studyPacks = packRes.data || [];
        // Group quizzes by organ system
    const groupedByOrgan = {};
    for (const quiz of quizzes) {
      const organ = quiz.organ_system || 'Other';
      if (!groupedByOrgan[organ]) {
        groupedByOrgan[organ] = [];
      }
      groupedByOrgan[organ].push({
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.total_questions || 0,
        timeLimit: quiz.time_limit,
        organSystem: quiz.organ_system,
        category: quiz.category,
      });
    }

    // Sort organ groups by quiz count (most quizzes first)
    const organGroups = Object.entries(groupedByOrgan)
      .map(([organ, quizList]) => ({
        organ,
        quizzes: quizList,
        totalQuestions: quizList.reduce((s, q) => s + q.totalQuestions, 0),
      }))
      .sort((a, b) => b.quizzes.length - a.quizzes.length);

    // Get unique subjects
    const subjects = [
      ...new Set(quizzes.map(q => q.subject).filter(Boolean)),
    ].sort();

    return {
      success: true,
      data: {
        step,
        organGroups,
        studyPacks,
        stats: {
          totalQuizzes: quizzes.length,
          totalQuestions: quizzes.reduce(
            (s, q) => s + (q.total_questions || 0),
            0
          ),
          totalOrganSystems: organGroups.length,
          subjects,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════
// CATEGORIES / SUBJECTS
// ═══════════════════════════════════════════════════════════

/**
 * Internal: fetch both categories + subjects in one query.
 * Wrapped with cache so repeated calls don't hit the DB. (#7, #14)
 */
const _fetchCategoriesAndSubjects = withCache(
  'cats-and-subs',
  async function () {
    const { data, error } = await supabase
      .from('quizzes')
      .select('category, subject')
      .eq('is_published', true);

    if (error) throw error;

    return {
      success: true,
      data: {
        categories: [...new Set((data || []).map(q => q.category).filter(Boolean))],
        subjects: [...new Set((data || []).map(q => q.subject).filter(Boolean))],
      },
    };
  }
);

/**
 * Get available categories
 * @returns {Promise<Object>} - List of categories
 *
 * FIX #4: Returns success:false on error (was success:true)
 * FIX #7: Shares a single cached query with getSubjects
 */
export async function getCategories() {
  try {
    const result = await _fetchCategoriesAndSubjects();
    if (!result.success) return { success: false, error: result.error, data: [] };
    return {
      success: true,
      data: result.data.categories,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false, // FIX #4: was `true`
      error: error.message,
      data: [],
    };
  }
}

/**
 * Get available subjects
 * @returns {Promise<Object>} - List of subjects
 *
 * FIX #4: Returns success:false on error (was success:true)
 * FIX #7: Shares a single cached query with getCategories
 */
export async function getSubjects() {
  try {
    const result = await _fetchCategoriesAndSubjects();
    if (!result.success) return { success: false, error: result.error, data: [] };
    return {
      success: true,
      data: result.data.subjects,
    };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return {
      success: false, // FIX #4: was `true`
      error: error.message,
      data: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════
// SLUG / AVAILABILITY
// ═══════════════════════════════════════════════════════════

/**
 * Check if slug is available
 * @param {string} slug - Slug to check
 * @returns {Promise<boolean>} - True if available
 *
 * FIX #3: Uses .maybeSingle() — .single() throws PGRST116 on 0 rows
 */
export async function checkSlugAvailability(slug) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle(); // FIX #3: was .single()

    if (error) throw error;
    return !data; // Available if no data found
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return true; // Assume available on error (original behaviour)
  }
}

// ═══════════════════════════════════════════════════════════
// QUESTION FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch a single question by slug with parent quiz info
 * and related questions — everything the SEO page needs.
 *
 * Minor: uses .maybeSingle() for cleaner "not found" handling
 */
export async function fetchQuestionBySlug(slug) {
  try {
    // ── Main question + parent quiz (single query with join) ──
    const { data: question, error } = await supabase
      .from('questions')
      .select(`
        *,
        quiz:quizzes!quiz_id (
          id,
          slug,
          title,
          subject,
          category,
          difficulty
        )
      `)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!question) {
      return { success: false, error: 'Question not found' };
    }

    // ── All three sub-queries in parallel ──
    const [{ data: related }, { data: prev }, { data: next }] = await Promise.all([
      supabase
        .from('questions')
        .select('id, slug, question_text, topic, difficulty')
        .eq('quiz_id', question.quiz_id)
        .neq('id', question.id)
        .limit(6),
      supabase
        .from('questions')
        .select('slug, question_text')
        .eq('quiz_id', question.quiz_id)
        .lt('id', question.id)
        .order('id', { ascending: false })
        .limit(1),
      supabase
        .from('questions')
        .select('slug, question_text')
        .eq('quiz_id', question.quiz_id)
        .gt('id', question.id)
        .order('id', { ascending: true })
        .limit(1),
    ]);

    return {
      success: true,
      data: {
        question: {
          id: question.id,
          slug: question.slug,
          questionText: question.question_text,
          questionType: question.question_type,
          options: question.options || [],
          correctAnswer: question.correct_answer,
          explanation: question.explanation,
          subject: question.subject,
          topic: question.topic,
          difficulty: question.difficulty,
          imageUrl: question.image_url,
        },
        quiz: question.quiz,
        related: (related || []).map(q => ({
          slug: q.slug,
          questionText: q.question_text,
          topic: q.topic,
          difficulty: q.difficulty,
        })),
        navigation: {
          prev:
            prev && prev.length > 0
              ? { slug: prev[0].slug, text: prev[0].question_text }
              : null,
          next:
            next && next.length > 0
              ? { slug: next[0].slug, text: next[0].question_text }
              : null,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all question slugs — for sitemap generation
 * Lightweight: only returns slug + timestamps
 *
 * FIX #2: Paginates past the 1 000-row default cap
 */
export async function fetchAllQuestionSlugs() {
  try {
    const data = await fetchAllPaginated(() =>
      supabase
        .from('questions')
        .select('slug, created_at, subject, topic')
        .order('created_at', { ascending: false })
    );

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════
// STUDY PACKS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch study packs for browse page
 * (no changes — already uses static import)
 */
export async function fetchStudyPacks(filters = {}) {
  try {
    const { studyPackMetaData } = await import('../data/studyPackMetaData.js');

    let data = studyPackMetaData;
    if (filters.step) data = data.filter(p => p.step === filters.step);
    if (filters.organ_system)
      data = data.filter(p => p.organ_system === filters.organ_system);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════
// TOPIC PAGE
// ═══════════════════════════════════════════════════════════

/**
 * Fetch all data for a topic page.
 *
 * Uses a cascading search strategy:
 *   1. Exact slug match on questions.disease / quizzes.organ_system
 *   2. Word-intersection search (all words must appear)
 *   3. Broadened partial search
 *
 * FIX #6:  Disease scan reduced — fetches only `disease` column first,
 *          then targeted fetch for the best match
 * FIX #5:  orFilter words sanitised
 * FIX #10: Dead `wordFilters` variable removed
 * FIX #11: Typo determinTopicName → determineTopicName
 */
export async function fetchTopicData(slug) {
  try {
    // ── Prepare search variants from the slug ──
    const words = slug
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(w => w.length > 1);

    const stopWords = new Set([
      'the', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'by', 'with', 'a', 'an',
    ]);
    const significantWords = words.filter(w => !stopWords.has(w.toLowerCase()));

    if (significantWords.length === 0) {
      return { success: false, error: 'Invalid topic' };
    }

    // ── Strategy 1: Find matching disease in questions table ──
    // FIX #6: Fetch only the `disease` column first, then do a targeted query
    let matchedDisease = null;
    let matchedQuizIds = [];

    try {
      const { data: diseaseRows } = await supabase
        .from('questions')
        .select('disease')
        .not('disease', 'is', null);

      if (diseaseRows && diseaseRows.length > 0) {
        // Deduplicate client-side
        const uniqueDiseases = [...new Set(diseaseRows.map(d => d.disease).filter(Boolean))];

        // Score each unique disease against the slug
        let bestScore = 0;
        let bestDiseaseName = null;

        for (const diseaseName of uniqueDiseases) {
          const score = slugMatchScore(slug, diseaseName);
          if (score > bestScore) {
            bestScore = score;
            bestDiseaseName = diseaseName;
          }
        }

        // Require a reasonable match threshold
        if (bestDiseaseName && bestScore >= 0.6) {
          // Now fetch quiz_ids + metadata for ONLY the matched disease
          const { data: diseaseQuestions } = await supabase
            .from('questions')
            .select('quiz_id, organ_system, subject')
            .eq('disease', bestDiseaseName);

          if (diseaseQuestions && diseaseQuestions.length > 0) {
            const quizIdSet = new Set();
            let organ = null;
            let subject = null;

            for (const q of diseaseQuestions) {
              if (q.quiz_id) quizIdSet.add(q.quiz_id);
              if (!organ && q.organ_system) organ = q.organ_system;
              if (!subject && q.subject) subject = q.subject;
            }

            matchedDisease = {
              name: bestDiseaseName,
              organ,
              subject,
              quizIds: quizIdSet,
            };
            matchedQuizIds = [...quizIdSet];
          }
        }
      }
    } catch (_diseaseErr) {
      // Strategy 1 failed — fall through to Strategy 2
    }

    // ── Strategy 2: Search quizzes table columns ──
    let quizzes = [];

    if (matchedQuizIds.length > 0) {
      const { data } = await supabase
        .from('quizzes')
        .select(
          'id, slug, title, description, subject, difficulty, total_questions, time_limit, organ_system, step, category'
        )
        .eq('is_published', true)
        .in('id', matchedQuizIds);

      quizzes = data || [];
    }

    // If no disease match, try quizzes table directly
    if (quizzes.length === 0) {
      // FIX #10: removed dead `wordFilters` variable

      const { data: allQuizzes } = await supabase
        .from('quizzes')
        .select(
          'id, slug, title, description, subject, difficulty, total_questions, time_limit, organ_system, step, category'
        )
        .eq('is_published', true);

      if (allQuizzes) {
        quizzes = allQuizzes.filter(quiz => {
          const searchable = [quiz.organ_system, quiz.category, quiz.subject, quiz.title]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return significantWords.every(w => searchable.includes(w));
        });
      }
    }

    // ── Strategy 3: Broader fallback — any word match in questions ──
    if (quizzes.length === 0 && significantWords.length > 0) {
      // FIX #5: sanitise words before embedding in orFilter
      const safeWords = significantWords
        .slice(0, 5)
        .map(w => sanitizeForPostgrest(w))
        .filter(w => w.length > 0);

      if (safeWords.length > 0) {
        const orFilter = safeWords
          .flatMap(w => [
            `disease.ilike.%${w}%`,
            `topic.ilike.%${w}%`,
            `organ_system.ilike.%${w}%`,
          ])
          .join(',');

        const { data: qMatches } = await supabase
          .from('questions')
          .select('quiz_id, disease, organ_system, subject')
          .or(orFilter);

        if (qMatches && qMatches.length > 0) {
          const quizScores = new Map();
          const threshold = Math.ceil(significantWords.length / 2);

          for (const q of qMatches) {
            const combined = [q.disease, q.organ_system, q.subject]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            const wordHits = significantWords.filter(w =>
              combined.includes(w)
            ).length;

            if (wordHits >= threshold && q.quiz_id) {
              quizScores.set(
                q.quiz_id,
                Math.max(quizScores.get(q.quiz_id) || 0, wordHits)
              );
            }
          }

          if (quizScores.size > 0) {
            const matchedIds = [...quizScores.keys()];

            const { data: fallbackQuizzes } = await supabase
              .from('quizzes')
              .select(
                'id, slug, title, description, subject, difficulty, total_questions, time_limit, organ_system, step, category'
              )
              .eq('is_published', true)
              .in('id', matchedIds);

            quizzes = fallbackQuizzes || [];

            // Infer topic metadata from first question match
            if (!matchedDisease && qMatches[0]) {
              matchedDisease = {
                name: qMatches[0].disease || qMatches[0].organ_system,
                organ: qMatches[0].organ_system,
                subject: qMatches[0].subject,
              };
            }
          }
        }
      }
    }

    if (quizzes.length === 0) {
      return { success: false, error: 'Topic not found' };
    }

    // ── Deduplicate ──
    const uniqueQuizzes = [];
    const seenIds = new Set();
    for (const q of quizzes) {
      if (!seenIds.has(q.id)) {
        seenIds.add(q.id);
        uniqueQuizzes.push(q);
      }
    }

    // ── Get question metadata ──
    const quizIds = uniqueQuizzes.map(q => q.id);

    const { data: questionMeta } = await supabase
      .from('questions')
      .select(
        'quiz_id, tags, disease, topic, organ_system, subject, difficulty, key_concept'
      )
      .in('quiz_id', quizIds);

    const allTags = new Set();
    const allDiseases = new Set();
    const allKeyConcepts = [];

    for (const q of questionMeta || []) {
      if (Array.isArray(q.tags)) q.tags.forEach(t => allTags.add(t));
      if (q.disease) allDiseases.add(q.disease);
      if (q.key_concept) allKeyConcepts.push(q.key_concept);
    }

    // ── Find related study packs ──
    const primaryOrgan =
      matchedDisease?.organ ||
      uniqueQuizzes[0]?.organ_system ||
      uniqueQuizzes[0]?.category;

    let studyPacks = [];
    if (primaryOrgan) {
      const safePrimaryOrgan = sanitizeForPostgrest(primaryOrgan);
      const { data: packs } = await supabase
        .from('study_packs')
        .select('*')
        .eq('is_published', true)
        .or(
          `organ_system.ilike.%${safePrimaryOrgan}%,title.ilike.%${safePrimaryOrgan}%`
        );
      studyPacks = packs || [];
    }

    if (studyPacks.length === 0 && quizIds.length > 0) {
      const { data: packLinks } = await supabase
        .from('study_pack_quizzes')
        .select('study_pack_id')
        .in('quiz_id', quizIds.slice(0, 50));

      if (packLinks && packLinks.length > 0) {
        const packIds = [...new Set(packLinks.map(l => l.study_pack_id))];
        const { data: packs } = await supabase
          .from('study_packs')
          .select('*')
          .eq('is_published', true)
          .in('id', packIds);
        studyPacks = packs || [];
      }
    }

    // ── Determine topic name ──
    // FIX #11: was `determinTopicName` (typo)
    const topicName =
      matchedDisease?.name ||
      determineTopicName(slug, significantWords.join(' '), uniqueQuizzes);

    const topicType = matchedDisease?.name
      ? allDiseases.has(matchedDisease.name)
        ? 'disease'
        : 'organ_system'
      : determineTopicType(uniqueQuizzes);

    // ── Group by step ──
    const byStep = {};
    for (const q of uniqueQuizzes) {
      const step = q.step || 'other';
      if (!byStep[step]) byStep[step] = [];
      byStep[step].push({
        id: q.id,
        slug: q.slug,
        title: q.title,
        description: q.description,
        subject: q.subject,
        difficulty: q.difficulty,
        totalQuestions: q.total_questions || 0,
        timeLimit: q.time_limit,
        organSystem: q.organ_system,
        step: q.step,
        category: q.category,
      });
    }

    const stepGroups = Object.entries(byStep)
      .map(([step, stepQuizzes]) => ({
        step,
        label: step === 'other' ? 'General' : step.replace('step', 'Step '),
        quizzes: stepQuizzes,
        totalQuestions: stepQuizzes.reduce((s, q) => s + q.totalQuestions, 0),
      }))
      .sort((a, b) => a.step.localeCompare(b.step));

    // ── Build related topics (only diseases that ACTUALLY have quizzes) ──
    const relatedOrgans = new Set(
      uniqueQuizzes.map(q => q.organ_system).filter(Boolean)
    );
    const relatedSubjects = new Set(
      uniqueQuizzes.map(q => q.subject).filter(Boolean)
    );

    const validDiseases = new Set();
    for (const q of questionMeta || []) {
      if (q.disease && q.quiz_id) validDiseases.add(q.disease);
    }

    const relatedTopics = buildRelatedTopics(
      slug,
      topicName,
      [...relatedOrgans],
      [...relatedSubjects],
      [...validDiseases]
    );

    return {
      success: true,
      data: {
        slug,
        name: topicName,
        type: topicType,
        organSystem: primaryOrgan,
        stepGroups,
        studyPacks,
        stats: {
          totalQuizzes: uniqueQuizzes.length,
          totalQuestions: uniqueQuizzes.reduce(
            (s, q) => s + (q.total_questions || 0),
            0
          ),
          steps: [
            ...new Set(uniqueQuizzes.map(q => q.step).filter(Boolean)),
          ],
          organSystems: [...relatedOrgans],
          subjects: [...relatedSubjects],
          tags: [...allTags].slice(0, 20),
          diseases: [...validDiseases],
          keyConcepts: allKeyConcepts.slice(0, 10),
        },
        relatedTopics,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════
// SLUG MATCHING HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Score how well a URL slug matches a disease/topic name.
 * Returns 0–1 (1 = perfect match)
 */
function slugMatchScore(slug, name) {
  const nameSlug = toTopicSlug(name);

  // Exact match
  if (nameSlug === slug) return 1.0;

  // Word overlap scoring
  const slugWords = new Set(slug.split('-').filter(w => w.length > 1));
  const nameWords = new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
  );

  if (slugWords.size === 0 || nameWords.size === 0) return 0;

  let hits = 0;
  for (const w of slugWords) {
    if (nameWords.has(w)) hits++;
  }

  let reverseHits = 0;
  for (const w of nameWords) {
    if (slugWords.has(w)) reverseHits++;
  }

  const precision = hits / slugWords.size;
  const recall = reverseHits / nameWords.size;

  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Generate a URL-safe slug from a topic/disease name.
 * Used both for generating links AND for matching.
 */
export function toTopicSlug(name) {
  return name
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// FIX #11: was `determinTopicName` (missing 'e')
function determineTopicName(slug, searchTerm, quizzes) {
  const organMatch = quizzes.find(q => {
    if (!q.organ_system) return false;
    return toTopicSlug(q.organ_system) === slug;
  });
  if (organMatch) return organMatch.organ_system;

  const subjectMatch = quizzes.find(q => {
    if (!q.subject) return false;
    return toTopicSlug(q.subject) === slug;
  });
  if (subjectMatch) return subjectMatch.subject;

  const catMatch = quizzes.find(q => {
    if (!q.category) return false;
    return toTopicSlug(q.category) === slug;
  });
  if (catMatch) return catMatch.category;

  // Fallback: title-case
  return searchTerm
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function determineTopicType(quizzes) {
  const organs = new Set(quizzes.map(q => q.organ_system).filter(Boolean));
  if (organs.size === 1) return 'organ_system';

  const subjects = new Set(quizzes.map(q => q.subject).filter(Boolean));
  if (subjects.size === 1) return 'subject';

  return 'topic';
}

function buildRelatedTopics(currentSlug, currentName, organs, subjects, diseases) {
  const related = [];
  const seen = new Set([currentSlug]);

  for (const organ of organs) {
    const s = toTopicSlug(organ);
    if (!seen.has(s)) {
      seen.add(s);
      related.push({ slug: s, name: organ, type: 'organ_system' });
    }
  }

  for (const subject of subjects) {
    const s = toTopicSlug(subject);
    if (!seen.has(s)) {
      seen.add(s);
      related.push({ slug: s, name: subject, type: 'subject' });
    }
  }

  for (const disease of diseases) {
    const s = toTopicSlug(disease);
    if (!seen.has(s) && disease !== currentName) {
      seen.add(s);
      related.push({ slug: s, name: disease, type: 'disease' });
    }
  }

  return related.slice(0, 12);
}

// ═══════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════

export default {
  fetchQuizzes,
  fetchQuizBySlug,
  fetchQuestionBySlug,
  fetchAllQuestionSlugs,
  fetchExamAggregates,
  fetchExamStepData,
  checkSlugAvailability,
  getCategories,
  getSubjects,
  fetchStudyPacks,
  fetchStudyPackBySlug,
  fetchTopicData,
};