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
  const leftovers = new Map(); // step::organ → [questions]

  for (const [_key, group] of groups) {
    const { step, disease, organ, subject, questions: qs } = group;

    if (qs.length >= QUIZ_SIZE.MIN && qs.length <= QUIZ_SIZE.MAX) {
      // Perfect size — one quiz
      quizzes.push(createQuizGroup(step, disease, organ, subject, qs));

    } else if (qs.length > QUIZ_SIZE.MAX) {
      // Too many — split into chunks
      const chunks = chunkArray(qs, QUIZ_SIZE.IDEAL);

      // If last chunk is too small, merge it with the previous one
      if (chunks.length > 1 && chunks[chunks.length - 1].length < QUIZ_SIZE.MIN) {
        const lastChunk = chunks.pop();
        chunks[chunks.length - 1].push(...lastChunk);
      }

      chunks.forEach((chunk, i) => {
        const part = chunks.length > 1 ? ` (Part ${i + 1})` : '';
        quizzes.push(
          createQuizGroup(step, `${disease}${part}`, organ, subject, chunk)
        );
      });

    } else {
      // Too few — collect as leftovers, group by step + organ later
      const leftoverKey = `${step}::${organ}`;
      if (!leftovers.has(leftoverKey)) {
        leftovers.set(leftoverKey, {
          step, organ, subject, questions: [],
        });
      }
      leftovers.get(leftoverKey).questions.push(...qs);
    }
  }

  // ── Merge leftovers into "Mixed Review" quizzes ──
  for (const [_key, group] of leftovers) {
    if (group.questions.length === 0) continue;

    const chunks = chunkArray(group.questions, QUIZ_SIZE.IDEAL);

    // Merge last small chunk into previous
    if (chunks.length > 1 && chunks[chunks.length - 1].length < QUIZ_SIZE.MIN) {
      const lastChunk = chunks.pop();
      chunks[chunks.length - 1].push(...lastChunk);
    }

    // If there's only one tiny chunk left, still create it
    // (better a 3-question quiz than losing questions)
    chunks.forEach((chunk, i) => {
      const part = chunks.length > 1 ? ` (Part ${i + 1})` : '';
      quizzes.push(
        createQuizGroup(
          group.step,
          `${group.organ} Mixed Review${part}`,
          group.organ,
          group.subject,
          chunk
        )
      );
    });
  }

  return quizzes;
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

  if (quizError) {
    throw new Error(`Quiz upsert failed for "${group.title}": ${quizError.message}`);
  }

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

    if (error) {
      throw new Error(
        `Question upsert failed for "${group.title}" ` +
        `(batch ${i}-${i + batch.length}): ${error.message}`
      );
    }
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