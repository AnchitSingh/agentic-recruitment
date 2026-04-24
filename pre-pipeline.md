

# Pipeline → Supabase → Quiz App: Complete Upload Guide

## The Transformation

```
YOUR PIPELINE OUTPUT                    SUPABASE DB                         APP FRAMEWORK
─────────────────────                   ──────────                          ─────────────

{                                       questions table                     {
  "vignette": "A 22-yr...",  ──────►   question_text: "A 22-yr             "question": "A 22-yr
  "question_stem": "Which..  ──────►     old...\n\nWhich of...",              old...\n\nWhich of..",
                                        vignette: "A 22-yr...",
                                        question_stem: "Which..",

  "answer_choices": {        ──────►   options: [                           "options": [
    "A": "Reduction of..",              {text:"Reduction..",                   {text:"Reduction..",
    "B": "Mitochondrial..",              isCorrect: false},                     isCorrect: false},
    "C": "Cessation of..",              {text:"Cessation..",                   {text:"Cessation..",
    "D": "Infiltration..",               isCorrect: true},                      isCorrect: true},
    "E": "Significant.."                ...                                    ...
  },                                   ],                                   ],

  "correct_answer": "C",    ──────►   correct_answer: "2",    ──────►     "correct_answer": 2,
   (letter)                             (string index)           parseInt()  (integer)

  "explanation": "...",      ──────►   explanation: "...",                  "explanation": "...",
  "distractor_explanations"  ──────►   distractor_explanations: {jsonb}
  
  "question_type":           ──────►   question_type: "MCQ",               "type": "MCQ",
    "pathophysiology"                  clinical_category:
                                         "pathophysiology"

  "tags": [...],             ──────►   tags: [...],
  "step": "step1",           ──────►   step: "step1",
  "organ_system": "Cardio",  ──────►   organ_system: "Cardiovascular",
  "disease": "MI (STEMI)",   ──────►   disease: "MI (STEMI)",
  "subject": "Pathology",    ──────►   subject: "Pathology",
  "difficulty": "hard",      ──────►   difficulty: "hard",
  "id": "step1_MI_8387.."    ──────►   source_id: "step1_MI_8387.."
                                       slug: "cellular-changes-
                                         first-60-seconds-
                                         coronary-occlusion-8387"
  
  quiz_id: null              ──────►   quiz_id: 42
                                        ↑
                                        └── auto-generated quiz:
                                            "STEMI - Step 1"
}
```

---

## Step 1: Schema Migration

```sql
-- ═══════════════════════════════════════════════════════════
-- ADD COLUMNS TO EXISTING QUESTIONS TABLE
-- (your pipeline gives us rich data — store all of it)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE questions ADD COLUMN IF NOT EXISTS vignette TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_stem TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS distractor_explanations JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS learning_objective TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS key_concept TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS organ_system TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS disease TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS step TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS clinical_category TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Source ID must be unique (prevents duplicate uploads)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_id
  ON questions(source_id) WHERE source_id IS NOT NULL;

-- These power quiz generation + filtering
CREATE INDEX IF NOT EXISTS idx_questions_step ON questions(step);
CREATE INDEX IF NOT EXISTS idx_questions_organ_system ON questions(organ_system);
CREATE INDEX IF NOT EXISTS idx_questions_disease ON questions(disease);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);


-- ═══════════════════════════════════════════════════════════
-- STUDY PACKS — ordered collections of quizzes
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS study_packs (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  step            TEXT,
  organ_system    TEXT,
  subject         TEXT,
  total_quizzes   INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  difficulty      TEXT DEFAULT 'mixed',
  cover_emoji     TEXT DEFAULT '📚',
  is_published    BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_pack_quizzes (
  study_pack_id   INTEGER REFERENCES study_packs(id) ON DELETE CASCADE,
  quiz_id         INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY     (study_pack_id, quiz_id)
);

-- RLS
ALTER TABLE study_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pack_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published study packs"
  ON study_packs FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can view study pack quizzes"
  ON study_pack_quizzes FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_sp_step ON study_packs(step);
CREATE INDEX IF NOT EXISTS idx_sp_organ ON study_packs(organ_system);


-- ═══════════════════════════════════════════════════════════
-- ADD step AND organ_system TO QUIZZES TABLE TOO
-- (so we can filter quizzes by step on browse page)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS step TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS organ_system TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_quizzes_step ON quizzes(step);
CREATE INDEX IF NOT EXISTS idx_quizzes_organ ON quizzes(organ_system);
```

---

## Step 2: The Upload + Quiz Generation Script

```js
// scripts/upload-questions.mjs
//
// Usage:
//   node scripts/upload-questions.mjs ./data/usmle-questions.json
//
// Requirements:
//   npm install @supabase/supabase-js
//
// Environment:
//   SUPABASE_URL=https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...  (service role — bypasses RLS)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ─── Config ──────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role for admin ops
);

const QUIZ_SIZE = { MIN: 5, IDEAL: 10, MAX: 20 };
const BATCH_SIZE = 100;  // supabase insert batch limit

// ─── Main ────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node upload-questions.mjs <path-to-json>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════');
  console.log(' USMLE Question Upload Pipeline');
  console.log('═══════════════════════════════════════════\n');

  // 1. Read and validate
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`📄 Loaded ${raw.length} questions from ${filePath}`);
  
  const validated = raw.filter(validateQuestion);
  console.log(`✓  ${validated.length} valid (${raw.length - validated.length} skipped)\n`);

  // 2. Check for duplicates already in DB
  const existing = await getExistingSourceIds();
  const newQuestions = validated.filter(q => !existing.has(q.id));
  console.log(`🔍 ${validated.length - newQuestions.length} already in DB, ${newQuestions.length} new\n`);

  if (newQuestions.length === 0) {
    console.log('Nothing to upload!');
    return;
  }

  // 3. Group into quizzes
  const quizGroups = groupIntoQuizzes(newQuestions);
  console.log(`📦 Generated ${quizGroups.length} quizzes:\n`);
  
  for (const g of quizGroups) {
    console.log(`   ${g.title} (${g.questions.length} questions)`);
  }
  console.log('');

  // 4. Upload quizzes + questions
  const stats = { quizzes: 0, questions: 0, errors: 0 };

  for (const group of quizGroups) {
    try {
      await uploadQuizWithQuestions(group, stats);
    } catch (err) {
      console.error(`   ✗ Failed: ${group.title}:`, err.message);
      stats.errors++;
    }
  }

  console.log(`\n✓ Uploaded ${stats.quizzes} quizzes, ${stats.questions} questions`);
  if (stats.errors > 0) console.log(`⚠ ${stats.errors} errors`);

  // 5. Generate study packs
  console.log('\n📚 Generating study packs...');
  await generateStudyPacks();

  // 6. Summary
  await printSummary();
}


// ─── Question Validation ─────────────────────────────────

function validateQuestion(q) {
  if (!q.id) { console.warn('  Skip: missing id'); return false; }
  if (!q.question_stem) { console.warn(`  Skip ${q.id}: missing question_stem`); return false; }
  if (!q.answer_choices || Object.keys(q.answer_choices).length < 2) {
    console.warn(`  Skip ${q.id}: insufficient answer_choices`);
    return false;
  }
  if (!q.correct_answer || !q.answer_choices[q.correct_answer]) {
    console.warn(`  Skip ${q.id}: invalid correct_answer "${q.correct_answer}"`);
    return false;
  }
  return true;
}


// ─── Duplicate Check ─────────────────────────────────────

async function getExistingSourceIds() {
  const ids = new Set();
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('source_id')
      .not('source_id', 'is', null)
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    data.forEach(r => ids.add(r.source_id));
    from += PAGE;
  }

  return ids;
}


// ─── Transform Pipeline Format → DB Format ──────────────

function transformQuestion(raw) {
  // Convert answer_choices object to options array
  const letters = Object.keys(raw.answer_choices).sort();
  const correctIndex = letters.indexOf(raw.correct_answer);

  const options = letters.map(letter => ({
    text: raw.answer_choices[letter],
    isCorrect: letter === raw.correct_answer,
  }));

  // Build per-option explanations
  const distractorExplanations = {};
  if (raw.distractor_explanations) {
    for (const [letter, expl] of Object.entries(raw.distractor_explanations)) {
      const idx = letters.indexOf(letter);
      if (idx >= 0) distractorExplanations[idx] = expl;
    }
  }

  // Combine vignette + stem for question_text
  const questionText = raw.vignette
    ? `${raw.vignette}\n\n${raw.question_stem}`
    : raw.question_stem;

  // Generate SEO slug from stem
  const slug = generateSlug(raw.question_stem, raw.id);

  return {
    slug,
    question_text: questionText,
    vignette: raw.vignette || null,
    question_stem: raw.question_stem,
    question_type: 'MCQ',  // all USMLE questions are MCQ for the app
    options,
    correct_answer: String(correctIndex),
    explanation: raw.explanation || '',
    distractor_explanations: distractorExplanations,
    learning_objective: raw.learning_objective || null,
    key_concept: raw.key_concept || null,
    subject: raw.subject || null,
    topic: raw.disease || raw.organ_system || null,
    difficulty: raw.difficulty || 'medium',
    organ_system: raw.organ_system || null,
    disease: raw.disease || null,
    step: raw.step || null,
    tags: raw.tags || [],
    clinical_category: raw.question_type || null,
    source_id: raw.id,
    image_url: null,

    // Keep these for grouping (not stored in DB)
    _raw_step: raw.step,
    _raw_organ: raw.organ_system,
    _raw_disease: raw.disease,
    _raw_subject: raw.subject,
    _raw_difficulty: raw.difficulty,
  };
}


// ─── Slug Generation ─────────────────────────────────────

function generateSlug(questionStem, sourceId) {
  // Take first ~70 chars of the stem
  const base = questionStem
    .slice(0, 70)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim hyphens

  // Append short hash from source_id for uniqueness
  const hash = sourceId
    .replace(/[^0-9]/g, '')          // extract numbers
    .slice(-6);                       // last 6 digits

  return `${base}-${hash}`;
}


// ─── Group Questions Into Quizzes ────────────────────────

function groupIntoQuizzes(questions) {
  const transformed = questions.map(transformQuestion);

  // Group by: step → disease
  const groups = new Map();

  for (const q of transformed) {
    const step = q._raw_step || 'general';
    const disease = q._raw_disease || q._raw_organ || 'mixed';
    const key = `${step}::${disease}`;

    if (!groups.has(key)) {
      groups.set(key, {
        step,
        disease,
        organ: q._raw_organ || 'General',
        subject: q._raw_subject || 'General',
        questions: [],
      });
    }
    groups.get(key).questions.push(q);
  }

  const quizzes = [];

  for (const [_key, group] of groups) {
    const { step, disease, organ, subject, questions: qs } = group;

    if (qs.length <= QUIZ_SIZE.MAX) {
      // ── Fits in one quiz ──
      if (qs.length >= QUIZ_SIZE.MIN) {
        quizzes.push(createQuizGroup(step, disease, organ, subject, qs));
      } else {
        // Too few — will be collected into "mixed" quiz below
        quizzes.push(createQuizGroup(step, disease, organ, subject, qs, true));
      }
    } else {
      // ── Too many — split into chunks ──
      const chunks = chunkArray(qs, QUIZ_SIZE.IDEAL);
      chunks.forEach((chunk, i) => {
        const part = chunks.length > 1 ? ` (Part ${i + 1})` : '';
        quizzes.push(
          createQuizGroup(step, `${disease}${part}`, organ, subject, chunk)
        );
      });
    }
  }

  // ── Merge tiny groups into "Mixed Review" quizzes ──
  const tinyGroups = quizzes.filter(q => q._isTiny);
  const normalGroups = quizzes.filter(q => !q._isTiny);

  // Group tiny ones by step + organ_system
  const tinyByStepOrgan = new Map();
  for (const tiny of tinyGroups) {
    const key = `${tiny.step}::${tiny.organ}`;
    if (!tinyByStepOrgan.has(key)) {
      tinyByStepOrgan.set(key, { step: tiny.step, organ: tiny.organ, subject: tiny.subject, questions: [] });
    }
    tinyByStepOrgan.get(key).questions.push(...tiny.questions);
  }

  for (const [_key, merged] of tinyByStepOrgan) {
    if (merged.questions.length === 0) continue;

    const chunks = chunkArray(merged.questions, QUIZ_SIZE.IDEAL);
    chunks.forEach((chunk, i) => {
      const part = chunks.length > 1 ? ` (Part ${i + 1})` : '';
      normalGroups.push(
        createQuizGroup(
          merged.step,
          `${merged.organ} Mixed Review${part}`,
          merged.organ,
          merged.subject,
          chunk
        )
      );
    });
  }

  return normalGroups;
}


function createQuizGroup(step, disease, organ, subject, questions, isTiny = false) {
  const stepLabel = step ? step.replace('step', 'Step ') : '';
  const title = `${disease} — ${stepLabel}`.trim();

  const slug = `${step || 'general'}-${disease}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Average difficulty
  const diffCounts = { easy: 0, medium: 0, hard: 0 };
  questions.forEach(q => { diffCounts[q._raw_difficulty || 'medium']++; });
  const difficulty = Object.entries(diffCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    title,
    slug: `${slug}-${Date.now().toString(36).slice(-4)}`, // ensure uniqueness
    description: `${questions.length} USMLE ${stepLabel} questions on ${disease}. Topics: ${organ}, ${subject}.`,
    category: organ,
    subject,
    difficulty,
    step: step || null,
    organ: organ || null,
    timeLimit: questions.length * 90,  // 90 seconds per question
    questions,
    _isTiny: isTiny,
  };
}


// ─── Upload to Supabase ──────────────────────────────────

async function uploadQuizWithQuestions(group, stats) {
  // 1. Insert quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .upsert({
      slug: group.slug,
      title: group.title,
      description: group.description,
      category: group.category,
      subject: group.subject,
      difficulty: group.difficulty,
      step: group.step,
      organ_system: group.organ,
      time_limit: group.timeLimit,
      total_questions: group.questions.length,
      is_published: true,
    }, { onConflict: 'slug' })
    .select('id')
    .single();

  if (quizError) throw quizError;
  const quizId = quiz.id;

  // 2. Prepare question rows
  const rows = group.questions.map(q => ({
    slug: q.slug,
    quiz_id: quizId,
    question_text: q.question_text,
    vignette: q.vignette,
    question_stem: q.question_stem,
    question_type: q.question_type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    distractor_explanations: q.distractor_explanations,
    learning_objective: q.learning_objective,
    key_concept: q.key_concept,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    organ_system: q.organ_system,
    disease: q.disease,
    step: q.step,
    tags: q.tags,
    clinical_category: q.clinical_category,
    source_id: q.source_id,
  }));

  // 3. Batch upsert questions
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('questions')
      .upsert(batch, { onConflict: 'source_id' });

    if (error) throw error;
  }

  stats.quizzes++;
  stats.questions += rows.length;
  console.log(`   ✓ ${group.title}: ${rows.length} questions → quiz #${quizId}`);
}


// ─── Study Pack Generation ───────────────────────────────

async function generateStudyPacks() {
  // Fetch all quizzes with their metadata
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('id, title, step, organ_system, subject, total_questions, difficulty')
    .eq('is_published', true)
    .order('step')
    .order('organ_system')
    .order('title');

  if (error) throw error;

  const packs = [];

  // ── Pack Type 1: By Step + Organ System ──
  // e.g., "Step 1 — Cardiovascular"
  const byStepOrgan = new Map();
  for (const q of quizzes) {
    if (!q.step || !q.organ_system) continue;
    const key = `${q.step}::${q.organ_system}`;
    if (!byStepOrgan.has(key)) {
      byStepOrgan.set(key, {
        step: q.step,
        organ: q.organ_system,
        quizzes: [],
        totalQuestions: 0,
      });
    }
    const group = byStepOrgan.get(key);
    group.quizzes.push(q);
    group.totalQuestions += q.total_questions || 0;
  }

  for (const [_key, group] of byStepOrgan) {
    if (group.quizzes.length < 2) continue; // need at least 2 quizzes for a pack

    const stepLabel = group.step.replace('step', 'Step ');
    packs.push({
      slug: `${group.step}-${group.organ.toLowerCase().replace(/\s+/g, '-')}`,
      title: `${stepLabel} — ${group.organ}`,
      description: `Complete ${group.organ} review for USMLE ${stepLabel}. ${group.quizzes.length} quizzes, ${group.totalQuestions} questions.`,
      step: group.step,
      organ_system: group.organ,
      subject: group.quizzes[0].subject,
      total_quizzes: group.quizzes.length,
      total_questions: group.totalQuestions,
      cover_emoji: getOrganEmoji(group.organ),
      quizIds: group.quizzes.map(q => q.id),
    });
  }

  // ── Pack Type 2: Full Step Review ──
  // e.g., "USMLE Step 1 — Complete Review"
  const byStep = new Map();
  for (const q of quizzes) {
    if (!q.step) continue;
    if (!byStep.has(q.step)) {
      byStep.set(q.step, { quizzes: [], totalQuestions: 0 });
    }
    byStep.get(q.step).quizzes.push(q);
    byStep.get(q.step).totalQuestions += q.total_questions || 0;
  }

  for (const [step, group] of byStep) {
    if (group.quizzes.length < 3) continue;

    const stepLabel = step.replace('step', 'Step ');
    packs.push({
      slug: `${step}-complete-review`,
      title: `USMLE ${stepLabel} — Complete Review`,
      description: `All ${group.quizzes.length} quizzes for USMLE ${stepLabel}. ${group.totalQuestions} practice questions.`,
      step,
      organ_system: null,
      subject: null,
      total_quizzes: group.quizzes.length,
      total_questions: group.totalQuestions,
      cover_emoji: '🎯',
      quizIds: group.quizzes.map(q => q.id),
    });
  }

  // ── Pack Type 3: By Subject Across Steps ──
  // e.g., "Pharmacology — All Steps"
  const bySubject = new Map();
  for (const q of quizzes) {
    if (!q.subject) continue;
    if (!bySubject.has(q.subject)) {
      bySubject.set(q.subject, { quizzes: [], totalQuestions: 0 });
    }
    bySubject.get(q.subject).quizzes.push(q);
    bySubject.get(q.subject).totalQuestions += q.total_questions || 0;
  }

  for (const [subject, group] of bySubject) {
    if (group.quizzes.length < 3) continue;

    packs.push({
      slug: `all-${subject.toLowerCase().replace(/\s+/g, '-')}`,
      title: `${subject} — All Steps`,
      description: `${group.quizzes.length} ${subject} quizzes across all USMLE Steps. ${group.totalQuestions} questions.`,
      step: null,
      organ_system: null,
      subject,
      total_quizzes: group.quizzes.length,
      total_questions: group.totalQuestions,
      cover_emoji: getSubjectEmoji(subject),
      quizIds: group.quizzes.map(q => q.id),
    });
  }

  // ── Upload packs ──
  for (const pack of packs) {
    const { quizIds, ...packData } = pack;

    const { data: inserted, error: packError } = await supabase
      .from('study_packs')
      .upsert(packData, { onConflict: 'slug' })
      .select('id')
      .single();

    if (packError) {
      console.error(`   ✗ Pack "${pack.title}":`, packError.message);
      continue;
    }

    // Clear existing quiz links for this pack
    await supabase
      .from('study_pack_quizzes')
      .delete()
      .eq('study_pack_id', inserted.id);

    // Insert quiz links with ordering
    const links = quizIds.map((qId, i) => ({
      study_pack_id: inserted.id,
      quiz_id: qId,
      position: i,
    }));

    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const { error } = await supabase
        .from('study_pack_quizzes')
        .insert(links.slice(i, i + BATCH_SIZE));
      if (error) console.error(`   ✗ Pack links:`, error.message);
    }

    console.log(`   ✓ ${pack.title}: ${quizIds.length} quizzes`);
  }

  console.log(`\n✓ Generated ${packs.length} study packs`);
}


// ─── Utilities ───────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getOrganEmoji(organ) {
  const map = {
    'Cardiovascular': '❤️', 'Respiratory': '🫁', 'Gastrointestinal': '🫄',
    'Renal': '🫘', 'Neurological': '🧠', 'Endocrine': '🦋',
    'Musculoskeletal': '🦴', 'Reproductive': '🧬', 'Hematologic': '🩸',
    'Immunology': '🛡️', 'Dermatology': '🧴', 'Psychiatry': '🧩',
  };
  return map[organ] || '📚';
}

function getSubjectEmoji(subject) {
  const map = {
    'Pharmacology': '💊', 'Pathology': '🔬', 'Anatomy': '🦴',
    'Physiology': '⚡', 'Biochemistry': '🧪', 'Microbiology': '🦠',
    'Immunology': '🛡️', 'Genetics': '🧬', 'Biostatistics': '📊',
  };
  return map[subject] || '📖';
}


// ─── Summary ─────────────────────────────────────────────

async function printSummary() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' DATABASE SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  const { count: qCount } = await supabase
    .from('questions').select('*', { count: 'exact', head: true });

  const { count: quizCount } = await supabase
    .from('quizzes').select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  const { count: packCount } = await supabase
    .from('study_packs').select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  // Questions by step
  const { data: byStep } = await supabase
    .from('questions')
    .select('step')
    .not('step', 'is', null);

  const stepCounts = {};
  byStep?.forEach(q => { stepCounts[q.step] = (stepCounts[q.step] || 0) + 1; });

  console.log(`  Total Questions:    ${qCount}`);
  console.log(`  Total Quizzes:      ${quizCount}`);
  console.log(`  Total Study Packs:  ${packCount}`);
  console.log('');
  for (const [step, count] of Object.entries(stepCounts).sort()) {
    console.log(`  ${step.replace('step', 'Step ')}: ${count} questions`);
  }
  console.log('\n═══════════════════════════════════════════\n');
}


// ─── Run ─────────────────────────────────────────────────
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## Step 3: Running the Script

```bash
# Install dependency
npm install @supabase/supabase-js

# Set environment variables
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # ← service role, not anon key

# Run the migration SQL first (in Supabase SQL editor)

# Then upload
node scripts/upload-questions.mjs ./data/usmle-step1.json

# Output:
# ═══════════════════════════════════════════
#  USMLE Question Upload Pipeline
# ═══════════════════════════════════════════
#
# 📄 Loaded 2847 questions from ./data/usmle-step1.json
# ✓  2841 valid (6 skipped)
# 🔍 0 already in DB, 2841 new
#
# 📦 Generated 186 quizzes:
#
#    Myocardial Infarction (STEMI) — Step 1 (15 questions)
#    Myocardial Infarction (STEMI) (Part 2) — Step 1 (12 questions)
#    Aortic Stenosis — Step 1 (8 questions)
#    Heart Failure — Step 1 (18 questions)
#    ...
#
#    ✓ Myocardial Infarction (STEMI) — Step 1: 15 questions → quiz #42
#    ✓ Aortic Stenosis — Step 1: 8 questions → quiz #43
#    ...
#
# ✓ Uploaded 186 quizzes, 2841 questions
#
# 📚 Generating study packs...
#    ✓ Step 1 — Cardiovascular: 12 quizzes
#    ✓ Step 1 — Respiratory: 8 quizzes
#    ✓ USMLE Step 1 — Complete Review: 186 quizzes
#    ✓ Pharmacology — All Steps: 34 quizzes
#    ...
#
# ✓ Generated 28 study packs
#
# ═══════════════════════════════════════════
#  DATABASE SUMMARY
# ═══════════════════════════════════════════
#
#   Total Questions:    2841
#   Total Quizzes:      186
#   Total Study Packs:  28
#
#   Step 1: 2841 questions
#
# ═══════════════════════════════════════════
```

Running it again with more data is safe — duplicates are skipped:

```bash
# Upload step 2 questions later
node scripts/upload-questions.mjs ./data/usmle-step2.json

# 🔍 0 already in DB, 3200 new   ← no duplicates from step 1
```

---

## Step 4: Update backendAPI.js

Add two things: (1) serve enriched question data, (2) fetch study packs.

```js
// Add to backendAPI.js

/**
 * Fetch study packs for browse page
 */
export async function fetchStudyPacks(filters = {}) {
  try {
    let query = supabase
      .from('study_packs')
      .select('*')
      .eq('is_published', true);

    if (filters.step) query = query.eq('step', filters.step);
    if (filters.organ_system) query = query.eq('organ_system', filters.organ_system);

    const { data, error } = await query.order('step').order('title');
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch quizzes within a study pack
 */
export async function fetchStudyPackBySlug(slug) {
  try {
    const { data: pack, error: packError } = await supabase
      .from('study_packs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (packError) throw packError;

    const { data: links, error: linkError } = await supabase
      .from('study_pack_quizzes')
      .select(`
        position,
        quiz:quizzes (
          id, slug, title, subject, difficulty,
          total_questions, time_limit, organ_system
        )
      `)
      .eq('study_pack_id', pack.id)
      .order('position');

    if (linkError) throw linkError;

    return {
      success: true,
      data: {
        ...pack,
        quizzes: (links || []).map(l => l.quiz),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

Also update `fetchQuizBySlug` to include the new fields:

```js
// In the existing fetchQuizBySlug, update the question transform:

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
  // ┌─── NEW: pass along enriched data ───┐
  tags: q.tags || [],
  vignette: q.vignette || null,
  questionStem: q.question_stem || null,
  distractorExplanations: q.distractor_explanations || null,
  learningObjective: q.learning_objective || null,
  keyConcept: q.key_concept || null,
  // └────────────────────────────────────────┘
}))
```

---

## Step 5: Update Question Page for Rich Data

```jsx
// In QuestionPage.jsx — update the explanation section
// to show distractor explanations per option:

{revealed && (
  <section className="explanation-section open">
    <h2>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h2>

    <div className="correct-answer">
      <strong>Correct Answer: </strong>
      {String.fromCharCode(65 + parseInt(question.correctAnswer))}
      {') '}
      {question.options[parseInt(question.correctAnswer)]?.text}
    </div>

    {question.explanation && (
      <div className="explanation-text">
        <h3>Explanation</h3>
        <p>{question.explanation}</p>
      </div>
    )}

    {/* Show WHY each wrong answer is wrong */}
    {question.distractorExplanations && (
      <div className="distractor-explanations">
        <h3>Why the other choices are wrong</h3>
        {question.options.map((opt, idx) => {
          const expl = question.distractorExplanations[String(idx)];
          if (!expl || idx === parseInt(question.correctAnswer)) return null;
          return (
            <div key={idx} className="distractor-item">
              <strong>{String.fromCharCode(65 + idx)}) {opt.text}</strong>
              <p>{expl}</p>
            </div>
          );
        })}
      </div>
    )}

    {question.keyConcept && (
      <div className="key-concept">
        <h3>🔑 Key Concept</h3>
        <p>{question.keyConcept}</p>
      </div>
    )}

    {question.learningObjective && (
      <div className="learning-objective">
        <h3>🎯 Learning Objective</h3>
        <p>{question.learningObjective}</p>
      </div>
    )}
  </section>
)}
```

---

## What The Generated Data Looks Like

```
DATABASE AFTER UPLOAD:
═══════════════════════════════════════════════════════

quizzes table (186 rows):
┌────┬──────────────────────────────────────┬───────┬────────────────┬───────┐
│ id │ title                                │ step  │ organ_system   │ total │
├────┼──────────────────────────────────────┼───────┼────────────────┼───────┤
│ 42 │ STEMI — Step 1                       │ step1 │ Cardiovascular │    15 │
│ 43 │ Aortic Stenosis — Step 1             │ step1 │ Cardiovascular │     8 │
│ 44 │ Heart Failure — Step 1               │ step1 │ Cardiovascular │    18 │
│ 45 │ Pneumonia — Step 2                   │ step2 │ Respiratory    │    12 │
│ .. │ ...                                  │ ...   │ ...            │   ... │
└────┴──────────────────────────────────────┴───────┴────────────────┴───────┘

questions table (2841 rows):
┌──────┬────────────────────────────────────────────┬─────────┬──────────┐
│ id   │ slug                                       │ quiz_id │ step     │
├──────┼────────────────────────────────────────────┼─────────┼──────────┤
│ 1001 │ cellular-changes-first-60-seconds-...      │ 42      │ step1    │
│ 1002 │ vessel-most-likely-occluded-ecg-v1v4-...   │ 42      │ step1    │
│ 1003 │ mechanism-of-action-medication-chew-...    │ 42      │ step1    │
│ ...  │ ...                                        │ ...     │ ...      │
└──────┴────────────────────────────────────────────┴─────────┴──────────┘

study_packs table (28 rows):
┌────┬───────────────────────────────────────┬───────┬────────────────┬─────────┐
│ id │ title                                 │ step  │ organ_system   │ quizzes │
├────┼───────────────────────────────────────┼───────┼────────────────┼─────────┤
│  1 │ Step 1 — Cardiovascular               │ step1 │ Cardiovascular │      12 │
│  2 │ Step 1 — Respiratory                  │ step1 │ Respiratory    │       8 │
│  3 │ USMLE Step 1 — Complete Review        │ step1 │ NULL           │     186 │
│  4 │ Pharmacology — All Steps              │ NULL  │ NULL           │      34 │
│ .. │ ...                                   │ ...   │ ...            │     ... │
└────┴───────────────────────────────────────┴───────┴────────────────┴─────────┘

study_pack_quizzes (junction):
┌───────────────┬─────────┬──────────┐
│ study_pack_id │ quiz_id │ position │
├───────────────┼─────────┼──────────┤
│             1 │      42 │        0 │
│             1 │      43 │        1 │
│             1 │      44 │        2 │
│ ...           │ ...     │ ...      │
└───────────────┴─────────┴──────────┘
```

---

## User Experience Flow

```
BROWSE PAGE (/browse)
━━━━━━━━━━━━━━━━━━━━

  ┌─ Filter: [Step 1 ▾] [Cardiovascular ▾] [All Difficulty ▾] ─┐
  │                                                              │
  │  📚 Study Packs                                              │
  │  ┌──────────────────┐ ┌──────────────────┐                  │
  │  │ ❤️ Step 1         │ │ 🫁 Step 1         │                  │
  │  │ Cardiovascular   │ │ Respiratory      │                  │
  │  │ 12 quizzes       │ │ 8 quizzes        │                  │
  │  │ 180 questions    │ │ 96 questions     │                  │
  │  └──────────────────┘ └──────────────────┘                  │
  │                                                              │
  │  📝 Individual Quizzes                                       │
  │  ┌──────────────────┐ ┌──────────────────┐                  │
  │  │ STEMI — Step 1   │ │ Aortic Stenosis  │                  │
  │  │ 15 questions     │ │ — Step 1         │                  │
  │  │ 🔴 Hard          │ │ 8 questions      │                  │
  │  │ [Start Quiz →]   │ │ 🟡 Medium        │                  │
  │  └──────────────────┘ │ [Start Quiz →]   │                  │
  │                       └──────────────────┘                  │
  └──────────────────────────────────────────────────────────────┘
       │                        │
       │ clicks "Start Quiz"    │ clicks study pack
       ▼                        ▼
  /quiz/step1-stemi-...    /study-pack/step1-cardiovascular
  (existing quiz page)     (shows ordered list of quizzes
   works as-is!)            user works through sequentially)
```

```
GOOGLE SEARCH → /question/:slug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Google: "mechanism of action metformin usmle"
       │
       ▼
  /question/mechanism-of-action-medication-chew-835612
       │
       │  Shows: vignette, question, options, answer,
       │         explanation, distractor explanations,
       │         key concept, learning objective,
       │         related questions, "Take Full Quiz" CTA
       │
       └──► user clicks "Take Full Quiz: STEMI — Step 1"
             └──► /quiz/step1-stemi-...
                   └──► prompted to sign up to save progress
```