#!/usr/bin/env node

/**
 * Import Quiz Data to Supabase
 * Usage: node scripts/import-to-supabase.js <json-file>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validation
function validateQuiz(quiz) {
  const errors = [];
  
  if (!quiz.slug || !/^[a-z0-9-]+$/.test(quiz.slug)) {
    errors.push('Invalid slug format');
  }
  
  if (!quiz.title || quiz.title.length < 10) {
    errors.push('Title too short');
  }
  
  if (!['Step 1', 'Step 2 CK', 'Step 3'].includes(quiz.category)) {
    errors.push(`Invalid category: ${quiz.category}`);
  }
  
  quiz.questions?.forEach((q, idx) => {
    if (!q.slug || !/^[a-z0-9-]+$/.test(q.slug)) {
      errors.push(`Q${idx}: Invalid slug`);
    }
    
    if (!q.options || q.options.length !== 4) {
      errors.push(`Q${idx}: Must have 4 options`);
    }
    
    const correctCount = q.options.filter(o => o.isCorrect).length;
    if (correctCount !== 1) {
      errors.push(`Q${idx}: Must have exactly 1 correct answer`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// Import single quiz
async function importQuiz(quizData) {
  const validation = validateQuiz(quizData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  // Insert quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      slug: quizData.slug,
      title: quizData.title,
      description: quizData.description,
      category: quizData.category,
      subject: quizData.subject,
      difficulty: quizData.difficulty,
      time_limit: quizData.time_limit || 60,
      is_published: true
    })
    .select()
    .single();
  
  if (quizError) {
    return { success: false, error: quizError.message };
  }
  
  // Insert questions
  const questions = quizData.questions.map(q => ({
    slug: q.slug,
    quiz_id: quiz.id,
    question_text: q.question_text,
    question_type: q.question_type || 'MCQ',
    options: q.options,
    correct_answer: String(q.options.findIndex(o => o.isCorrect)),
    explanation: q.explanation,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    image_url: q.image_url || null
  }));
  
  const { error: questionsError } = await supabase
    .from('questions')
    .insert(questions);
  
  if (questionsError) {
    return { success: false, error: questionsError.message };
  }
  
  // Save metadata
  const metadataDir = path.join(__dirname, '../src/data/quiz-metadata');
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(metadataDir, `${quizData.slug}.json`),
    JSON.stringify({
      id: quiz.id,
      slug: quizData.slug,
      title: quizData.title,
      category: quizData.category,
      subject: quizData.subject,
      difficulty: quizData.difficulty,
      questionCount: questions.length,
      ...(quizData.metadata || {})
    }, null, 2)
  );
  
  return { success: true, quizId: quiz.id, questionCount: questions.length };
}

// Batch import
async function importBatch(jsonFile) {
  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ File not found: ${jsonFile}`);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  const quizzes = Array.isArray(data) ? data : [data];
  
  console.log(`📦 Importing ${quizzes.length} quiz(es)...\n`);
  
  const results = [];
  
  for (const quiz of quizzes) {
    process.stdout.write(`⏳ ${quiz.title}... `);
    
    const result = await importQuiz(quiz);
    results.push({ slug: quiz.slug, ...result });
    
    if (result.success) {
      console.log(`✅ (${result.questionCount} questions)`);
    } else {
      console.log(`❌`);
      console.error(`   Error: ${result.error || result.errors?.join(', ')}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Success: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
  
  return results;
}

// Main
const jsonFile = process.argv[2];
if (!jsonFile) {
  console.error('Usage: node import-to-supabase.js <json-file>');
  process.exit(1);
}

importBatch(jsonFile).catch(console.error);
