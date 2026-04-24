#!/usr/bin/env node

/**
 * Enrich Quiz Metadata
 * Auto-extracts abbreviations, keywords, and adds student lingo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Medical abbreviations (subset - expand as needed)
const COMMON_ABBREVS = new Set([
  'ACE', 'ARB', 'MI', 'CHF', 'CAD', 'HTN', 'DM', 'COPD', 'GERD',
  'CVA', 'TIA', 'PE', 'DVT', 'AFib', 'VTE', 'ACS', 'STEMI', 'NSTEMI',
  'HFrEF', 'HFpEF', 'BNP', 'EKG', 'ECG', 'CT', 'MRI', 'CXR',
  'CBC', 'BMP', 'CMP', 'LFT', 'TSH', 'HbA1c', 'PSA', 'UA',
  'NSAID', 'SSRI', 'SNRI', 'PPI', 'H2RA', 'SGLT2', 'GLP1',
  'ICU', 'ED', 'OR', 'PACU', 'NICU', 'PICU', 'CCU',
  'USMLE', 'NBME', 'COMLEX', 'IMG', 'FMG', 'ECFMG'
]);

// Student lingo by category
const LINGO_MAP = {
  'Step 1': ['m1', 'm2', 'preclinical', 'first aid', 'FA', 'dedicated', 'zanki', 'anki', 'bnb', 'boards and beyond', 'pathoma', 'sketchy'],
  'Step 2 CK': ['m3', 'm4', 'shelf', 'clinical', 'wards', 'clerkship', 'uworld', 'amboss', 'onlinemeded', 'OME'],
  'Step 3': ['intern', 'residency', 'ccs', 'post-grad', 'pgy1']
};

// Body systems
const SYSTEM_KEYWORDS = {
  'Cardiovascular': ['heart', 'cardiac', 'cardio', 'vessel', 'blood pressure', 'hypertension', 'arrhythmia'],
  'Respiratory': ['lung', 'pulmonary', 'respiratory', 'breathing', 'asthma', 'copd'],
  'Gastrointestinal': ['gi', 'gastro', 'intestinal', 'bowel', 'liver', 'pancreas', 'stomach'],
  'Renal': ['kidney', 'renal', 'nephro', 'urinary', 'bladder'],
  'Nervous': ['neuro', 'brain', 'cns', 'nerve', 'spinal', 'stroke', 'seizure'],
  'Musculoskeletal': ['bone', 'muscle', 'joint', 'orthopedic', 'fracture', 'arthritis'],
  'Endocrine': ['hormone', 'thyroid', 'diabetes', 'adrenal', 'pituitary'],
  'Hematologic': ['blood', 'heme', 'anemia', 'coagulation', 'platelet'],
  'Infectious': ['infection', 'bacteria', 'virus', 'antibiotic', 'sepsis'],
  'Reproductive': ['pregnancy', 'obstetric', 'gynecologic', 'reproductive']
};

function extractAbbreviations(text) {
  const found = new Set();
  const words = text.match(/\b[A-Z]{2,}\b/g) || [];
  
  words.forEach(word => {
    if (COMMON_ABBREVS.has(word)) {
      found.add(word);
    }
  });
  
  return [...found];
}

function detectSystem(text) {
  const lowerText = text.toLowerCase();
  
  for (const [system, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return system;
    }
  }
  
  return 'General';
}

function extractKeywords(text) {
  // Simple keyword extraction (can be enhanced with NLP)
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);
  
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  return Object.entries(freq)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function enrichQuiz(quiz) {
  const enriched = JSON.parse(JSON.stringify(quiz));
  
  // Combine all text
  const allText = [
    quiz.title,
    quiz.description || '',
    ...(quiz.questions || []).map(q => 
      `${q.question_text} ${q.explanation || ''}`
    )
  ].join(' ');
  
  // Initialize metadata if not exists
  if (!enriched.metadata) {
    enriched.metadata = {};
  }
  
  // Extract abbreviations
  const abbrevs = extractAbbreviations(allText);
  enriched.metadata.abbreviations = [
    ...new Set([
      ...(enriched.metadata.abbreviations || []),
      ...abbrevs
    ])
  ];
  
  // Detect system
  if (!enriched.metadata.system) {
    enriched.metadata.system = detectSystem(allText);
  }
  
  // Extract keywords
  const keywords = extractKeywords(allText);
  enriched.metadata.keywords = [
    ...new Set([
      ...(enriched.metadata.keywords || []),
      ...keywords
    ])
  ];
  
  // Add student lingo
  const categoryLingo = LINGO_MAP[quiz.category] || [];
  enriched.metadata.lingo = [
    ...new Set([
      ...(enriched.metadata.lingo || []),
      ...categoryLingo
    ])
  ];
  
  // Add tags if missing
  if (!enriched.metadata.tags || enriched.metadata.tags.length === 0) {
    enriched.metadata.tags = [
      quiz.subject.toLowerCase(),
      quiz.difficulty.toLowerCase(),
      enriched.metadata.system.toLowerCase()
    ];
  }
  
  // Set defaults
  enriched.metadata.trending = enriched.metadata.trending || false;
  enriched.metadata.recommended = enriched.metadata.recommended || false;
  enriched.metadata.highYield = enriched.metadata.highYield || false;
  enriched.metadata.completions = enriched.metadata.completions || 0;
  enriched.metadata.rating = enriched.metadata.rating || 0;
  
  return enriched;
}

function enrichFile(inputFile, outputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const quizzes = Array.isArray(data) ? data : [data];
  
  console.log(`🔍 Enriching ${quizzes.length} quiz(es)...\n`);
  
  const enriched = quizzes.map(quiz => {
    console.log(`⚡ ${quiz.title}`);
    const result = enrichQuiz(quiz);
    
    console.log(`   Abbreviations: ${result.metadata.abbreviations.length}`);
    console.log(`   Keywords: ${result.metadata.keywords.length}`);
    console.log(`   System: ${result.metadata.system}`);
    console.log(`   Lingo: ${result.metadata.lingo.length}`);
    console.log();
    
    return result;
  });
  
  const output = Array.isArray(data) ? enriched : enriched[0];
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`✅ Saved to: ${outputFile}`);
}

// Main
const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace('.json', '-enriched.json');

if (!inputFile) {
  console.error('Usage: node enrich-metadata.js <input.json> [output.json]');
  process.exit(1);
}

enrichFile(inputFile, outputFile);
