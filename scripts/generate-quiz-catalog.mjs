// scripts/generate-quiz-catalog.mjs
//
// Pulls quiz data from Supabase and generates quizCategories.js
// for the client-side search engine.
//
// Usage:
//   node scripts/generate-quiz-catalog.mjs
//
// Output:
//   src/data/quizCategories.js

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();
import {
  ORGAN_SYSTEM_META,
  STEP_META,
  DIFFICULTY_DURATIONS,
} from './medical-knowledge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/quizCategories.js');

const supabase = createClient(
  process.env.SUPABASE_URL    || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);


// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(' Quiz Catalog Generator');
  console.log('═══════════════════════════════════════════\n');

  // ── 1. Fetch all data from Supabase ──
  console.log('📥 Fetching data from Supabase...');

  const [quizzes, questionMeta, studyPacks] = await Promise.all([
    fetchAllQuizzes(),
    fetchQuestionMetadata(),
    fetchStudyPacks(),
  ]);

  console.log(`   ${quizzes.length} quizzes`);
  console.log(`   ${questionMeta.length} question metadata records`);
  console.log(`   ${studyPacks.length} study packs\n`);

  // ── 2. Build per-quiz metadata from questions ──
  console.log('🔍 Extracting search metadata from questions...');
  const quizMeta = buildQuizMetadata(questionMeta);

  // ── 3. Generate categories ──
  console.log('📦 Generating categories...\n');

  const categories = [];

  // ── Category Group A: By Organ System ──
  const organGroups = groupBy(quizzes, 'organ_system');
  for (const [organ, orgQuizzes] of Object.entries(organGroups)) {
    if (!organ || organ === 'null') continue;
    const cat = buildOrganCategory(organ, orgQuizzes, quizMeta, studyPacks);
    categories.push(cat);
    console.log(`   ${cat.icon} ${cat.label}: ${cat.quizzes.length} quizzes`);
  }

  // ── Category Group B: By Step (aggregate) ──
  const stepGroups = groupBy(quizzes, 'step');
  for (const [step, stepQuizzes] of Object.entries(stepGroups)) {
    if (!step || step === 'null') continue;
    const cat = buildStepCategory(step, stepQuizzes, quizMeta, studyPacks);
    categories.push(cat);
    console.log(`   ${cat.icon} ${cat.label}: ${cat.quizzes.length} quizzes`);
  }

  // ── Category Group C: Study Packs as browsable category ──
  if (studyPacks.length > 0) {
    const packCat = buildStudyPackCategory(studyPacks);
    categories.push(packCat);
    console.log(`   ${packCat.icon} ${packCat.label}: ${packCat.quizzes.length} packs`);
  }

  // ── 4. Write output file ──
  console.log(`\n📄 Writing to ${OUTPUT_PATH}...`);
  writeOutput(categories);

  // ── 5. Summary ──
  const totalQuizEntries = categories.reduce((sum, c) => sum + c.quizzes.length, 0);
  console.log(`\n✓ Generated ${categories.length} categories with ${totalQuizEntries} total entries`);
  console.log('═══════════════════════════════════════════\n');
}


// ═══════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════

async function fetchAllQuizzes() {
  const all = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, slug, title, description, category, subject, difficulty, time_limit, step, organ_system, total_questions, created_at')
      .eq('is_published', true)
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    from += PAGE;
    if (data.length < PAGE) break;
  }

  return all;
}

async function fetchQuestionMetadata() {
  // Only fetch the columns we need for search metadata
  const all = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('quiz_id, tags, disease, organ_system, subject, topic, difficulty, key_concept, clinical_category')
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    from += PAGE;
    if (data.length < PAGE) break;
  }

  return all;
}

async function fetchStudyPacks() {
  const { data, error } = await supabase
    .from('study_packs')
    .select(`
      *,
      study_pack_quizzes (
        quiz_id,
        position
      )
    `)
    .eq('is_published', true)
    .order('step')
    .order('title');

  if (error) throw error;
  return data || [];
}


// ═══════════════════════════════════════════════════════════
// METADATA EXTRACTION
// ═══════════════════════════════════════════════════════════

function buildQuizMetadata(questionMeta) {
  // Group question metadata by quiz_id
  const byQuiz = new Map();

  for (const q of questionMeta) {
    if (!q.quiz_id) continue;
    if (!byQuiz.has(q.quiz_id)) {
      byQuiz.set(q.quiz_id, {
        tags: new Set(),
        diseases: new Set(),
        topics: new Set(),
        subjects: new Set(),
        keyConcepts: [],
        clinicalCategories: new Set(),
        difficulties: { easy: 0, medium: 0, hard: 0 },
      });
    }

    const meta = byQuiz.get(q.quiz_id);

    // Collect tags
    if (Array.isArray(q.tags)) {
      q.tags.forEach(t => meta.tags.add(t.toLowerCase()));
    }

    // Collect diseases, topics, subjects
    if (q.disease) meta.diseases.add(q.disease);
    if (q.topic) meta.topics.add(q.topic);
    if (q.subject) meta.subjects.add(q.subject);
    if (q.key_concept) meta.keyConcepts.push(q.key_concept);
    if (q.clinical_category) meta.clinicalCategories.add(q.clinical_category);

    // Count difficulties
    const diff = q.difficulty || 'medium';
    meta.difficulties[diff] = (meta.difficulties[diff] || 0) + 1;
  }

  return byQuiz;
}


// ═══════════════════════════════════════════════════════════
// CATEGORY BUILDERS
// ═══════════════════════════════════════════════════════════

function buildOrganCategory(organ, quizzes, quizMeta, studyPacks) {
  const meta = ORGAN_SYSTEM_META[organ] || {};

  // Collect all tags and keywords from this category's quizzes
  const allTags = new Set();
  const allDiseases = new Set();
  const allTopics = new Set();
  const allConcepts = [];

  for (const quiz of quizzes) {
    const qm = quizMeta.get(quiz.id);
    if (qm) {
      qm.tags.forEach(t => allTags.add(t));
      qm.diseases.forEach(d => allDiseases.add(d));
      qm.topics.forEach(t => allTopics.add(t));
      allConcepts.push(...qm.keyConcepts);
    }
  }

  // Find study packs for this organ system
  const relatedPacks = studyPacks.filter(sp =>
    sp.organ_system === organ ||
    sp.title?.toLowerCase().includes(organ.toLowerCase())
  );

  // Build quiz entries
  const quizEntries = quizzes.map(q =>
    buildQuizEntry(q, quizMeta.get(q.id), quizzes)
  );

  // Sort: recommended first, then by question count
  quizEntries.sort((a, b) => {
    if (a.recommended !== b.recommended) return b.recommended ? 1 : -1;
    if (a.highYield !== b.highYield) return b.highYield ? 1 : -1;
    return b.questions - a.questions;
  });

  const categoryId = organ.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: categoryId,
    label: organ,
    icon: meta.icon || '📚',
    premium: false,
    searchBoost: 1,
    description: `${organ} questions for USMLE preparation`,
    aliases: meta.aliases || [organ.toLowerCase()],
    tags: [
      categoryId,
      ...Array.from(allTags).slice(0, 20),
    ],
    keywords: [
      ...(meta.keywords || []),
      ...Array.from(allDiseases).map(d => d.toLowerCase()),
      ...Array.from(allTopics).map(t => t.toLowerCase()),
      // Extract short key concepts as keywords
      ...extractKeywords(allConcepts),
    ],
    abbreviations: meta.abbreviations || [],
    lingo: meta.lingo || ['high yield', 'HY', 'boards'],
    quizzes: quizEntries,
    studyPacks: relatedPacks.map(sp => ({
      id: sp.id,
      slug: sp.slug,
      title: sp.title,
      totalQuizzes: sp.total_quizzes,
      totalQuestions: sp.total_questions,
      difficulty: sp.difficulty || 'mixed',
      emoji: sp.cover_emoji || '📚',
    })),
  };
}

function buildStepCategory(step, quizzes, quizMeta, studyPacks) {
  const meta = STEP_META[step] || {};

  // Collect unique organs and subjects in this step
  const organs = new Set();
  const subjects = new Set();
  const allTags = new Set();

  for (const quiz of quizzes) {
    if (quiz.organ_system) organs.add(quiz.organ_system);
    if (quiz.subject) subjects.add(quiz.subject);

    const qm = quizMeta.get(quiz.id);
    if (qm) qm.tags.forEach(t => allTags.add(t));
  }

  const quizEntries = quizzes.map(q =>
    buildQuizEntry(q, quizMeta.get(q.id), quizzes)
  );

  quizEntries.sort((a, b) => {
    if (a.recommended !== b.recommended) return b.recommended ? 1 : -1;
    return b.questions - a.questions;
  });

  const relatedPacks = studyPacks.filter(sp => sp.step === step);

  return {
    id: step,
    label: meta.label || step,
    icon: meta.icon || '📋',
    premium: false,
    searchBoost: 1.2,  // boost step categories slightly
    description: meta.description || `${step} review questions`,
    aliases: meta.aliases || [step],
    tags: [
      step,
      ...Array.from(allTags).slice(0, 30),
    ],
    keywords: [
      ...(meta.keywords || []),
      ...Array.from(organs).map(o => o.toLowerCase()),
      ...Array.from(subjects).map(s => s.toLowerCase()),
    ],
    abbreviations: [],  // step-level doesn't need specific abbreviations
    lingo: meta.lingo || [],
    quizzes: quizEntries,
    studyPacks: relatedPacks.map(sp => ({
      id: sp.id,
      slug: sp.slug,
      title: sp.title,
      totalQuizzes: sp.total_quizzes,
      totalQuestions: sp.total_questions,
      difficulty: sp.difficulty || 'mixed',
      emoji: sp.cover_emoji || '📚',
    })),
  };
}

function buildStudyPackCategory(studyPacks) {
  return {
    id: 'study-packs',
    label: 'Study Packs',
    icon: '📚',
    premium: false,
    searchBoost: 1.1,
    description: 'Curated collections of quizzes organized by topic and step',
    aliases: ['study pack', 'collection', 'review', 'bundle', 'module', 'course'],
    tags: ['study-pack', 'review', 'collection', 'comprehensive'],
    keywords: ['complete review', 'full review', 'all questions', 'study plan', 'organized', 'structured'],
    abbreviations: [],
    lingo: ['dedicated', 'study plan', 'review', 'comprehensive', 'all-in-one'],
    quizzes: studyPacks.map(sp => ({
      id: sp.id,
      slug: sp.slug,
      title: sp.title,
      questions: sp.total_questions || 0,
      difficulty: sp.difficulty || 'mixed',
      duration: `${sp.total_quizzes || 0} quizzes`,
      topic: sp.organ_system || sp.subject || 'Mixed',
      completions: 0,
      rating: 0,
      trending: false,
      recommended: sp.total_quizzes >= 5,
      highYield: sp.total_quizzes >= 3,
      searchBoost: 1,
      system: sp.organ_system || 'General',
      isStudyPack: true,  // flag for the UI
      step: sp.step,
      tags: [
        sp.step, sp.organ_system, sp.subject,
        'study-pack', 'review', 'collection',
      ].filter(Boolean).map(t => t.toLowerCase()),
      keywords: [sp.title?.toLowerCase(), sp.description?.toLowerCase()].filter(Boolean),
      abbreviations: [],
      lingo: [],
      relatedTopics: [],
    })),
    studyPacks: [],
  };
}


// ═══════════════════════════════════════════════════════════
// QUIZ ENTRY BUILDER
// ═══════════════════════════════════════════════════════════

function buildQuizEntry(quiz, meta, allQuizzesInCategory) {
  const organMeta = ORGAN_SYSTEM_META[quiz.organ_system] || {};

  // Calculate duration from time_limit or question count
  const perQuestion = DIFFICULTY_DURATIONS[quiz.difficulty] || 90;
  const totalSeconds = quiz.time_limit || (quiz.total_questions * perQuestion);
  const durationMin = Math.ceil(totalSeconds / 60);

  // Determine flags
  const isHard = quiz.difficulty === 'hard';
  const hasEnoughQuestions = quiz.total_questions >= 5;
  const highYield = hasEnoughQuestions && !quiz.title?.includes('Mixed Review');

  // Extract tags from question metadata
  const tags = meta ? Array.from(meta.tags) : [];
  const diseases = meta ? Array.from(meta.diseases) : [];
  const topics = meta ? Array.from(meta.topics) : [];
  const clinicalCats = meta ? Array.from(meta.clinicalCategories) : [];

  // Build keywords from multiple sources
  const keywords = [
    ...diseases.map(d => d.toLowerCase()),
    ...topics.map(t => t.toLowerCase()),
    ...clinicalCats.map(c => c.toLowerCase().replace(/_/g, ' ')),
    ...(meta?.keyConcepts || [])
      .slice(0, 5)
      .map(c => c.toLowerCase().slice(0, 60)),
    quiz.description?.toLowerCase(),
  ].filter(Boolean);

  // Find related quizzes (same organ system, different disease)
  const related = allQuizzesInCategory
    .filter(q => q.id !== quiz.id && q.organ_system === quiz.organ_system)
    .slice(0, 4)
    .map(q => q.title);

  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    questions: quiz.total_questions || 0,
    difficulty: capitalize(quiz.difficulty || 'medium'),
    duration: `${durationMin} min`,
    topic: quiz.category || quiz.organ_system || quiz.subject || 'General',
    completions: 0,     // TODO: update from analytics later
    rating: 0,          // TODO: update from user ratings later
    trending: false,    // TODO: update from analytics later
    recommended: highYield && hasEnoughQuestions,
    highYield,
    searchBoost: highYield ? 1.1 : 1,
    system: quiz.organ_system || 'General',
    step: quiz.step || null,
    tags: [
      ...tags.slice(0, 15),
      quiz.organ_system?.toLowerCase(),
      quiz.subject?.toLowerCase(),
      quiz.step,
    ].filter(Boolean),
    keywords: dedupeArray(keywords).slice(0, 20),
    abbreviations: organMeta.abbreviations?.slice(0, 15) || [],
    lingo: organMeta.lingo?.slice(0, 10) || [],
    relatedTopics: related,
  };
}


// ═══════════════════════════════════════════════════════════
// OUTPUT WRITER
// ═══════════════════════════════════════════════════════════

function writeOutput(categories) {
  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  const timestamp = new Date().toISOString();
  const totalQuizzes = categories.reduce((sum, c) => sum + c.quizzes.length, 0);

  const fileContent = `// ═══════════════════════════════════════════════════════════
// AUTO-GENERATED — DO NOT EDIT MANUALLY
//
// Generated: ${timestamp}
// Source: Supabase (${totalQuizzes} quizzes across ${categories.length} categories)
//
// Regenerate: npm run generate-catalog
// ═══════════════════════════════════════════════════════════

export const quizCategories = ${JSON.stringify(categories, null, 2)};

// For convenience: flat list of all quizzes across categories
export const allQuizzes = quizCategories.flatMap(cat =>
  cat.quizzes.map(q => ({ ...q, categoryId: cat.id, categoryLabel: cat.label }))
);

// Quick lookup by slug
export const quizBySlug = Object.fromEntries(
  allQuizzes.map(q => [q.slug, q])
);

// Quick lookup by ID
export const quizById = Object.fromEntries(
  allQuizzes.map(q => [q.id, q])
);

// Category lookup
export const categoryById = Object.fromEntries(
  quizCategories.map(c => [c.id, c])
);

// All unique steps
export const availableSteps = [...new Set(
  allQuizzes.map(q => q.step).filter(Boolean)
)].sort();

// All unique organ systems
export const availableSystems = [...new Set(
  allQuizzes.map(q => q.system).filter(s => s && s !== 'General')
)].sort();

export default quizCategories;
`;

  writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
}


// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const val = item[key] || 'Other';
    if (!groups[val]) groups[val] = [];
    groups[val].push(item);
    return groups;
  }, {});
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function dedupeArray(arr) {
  return [...new Set(arr)];
}

function extractKeywords(concepts) {
  // Pull short, meaningful phrases from key concepts
  const keywords = new Set();

  for (const concept of concepts) {
    if (!concept) continue;

    // Split on common delimiters
    const parts = concept
      .split(/[;,()–—]/)
      .map(p => p.trim().toLowerCase())
      .filter(p => p.length > 3 && p.length < 50);

    parts.forEach(p => keywords.add(p));
  }

  return Array.from(keywords).slice(0, 30);
}


// ═══════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});