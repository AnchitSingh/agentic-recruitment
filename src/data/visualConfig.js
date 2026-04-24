// src/data/visualConfig.js

// ── Step Visuals (for Explore by Exam) ──────────────────

export const STEP_VISUALS = {
  step1: {
    title: 'USMLE Step 1',
    subtitle: 'Basic Sciences & Foundations',
    icon: '🧬',
    gradient: 'from-blue-600 to-indigo-700',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    pillBg: 'bg-blue-100 text-blue-700',
    description:
      'Master the foundational sciences — anatomy, physiology, pathology, pharmacology, and biochemistry.',
  },
  step2: {
    title: 'USMLE Step 2 CK',
    subtitle: 'Clinical Knowledge',
    icon: '🩺',
    gradient: 'from-emerald-600 to-teal-700',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    pillBg: 'bg-emerald-100 text-emerald-700',
    description:
      'Apply clinical reasoning to real patient scenarios — diagnosis, management, and next best step.',
  },
  step3: {
    title: 'USMLE Step 3',
    subtitle: 'Clinical Management',
    icon: '👨‍⚕️',
    gradient: 'from-purple-600 to-violet-700',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    pillBg: 'bg-purple-100 text-purple-700',
    description:
      'Demonstrate readiness for independent practice — outpatient, inpatient, and emergency management.',
  },
};

// ── Organ System Visuals (for Study Packs) ──────────────

export const ORGAN_VISUALS = {
  Cardiovascular:       { gradient: 'from-red-500 to-rose-600',      emoji: '❤️' },
  Respiratory:          { gradient: 'from-sky-500 to-blue-600',      emoji: '🫁' },
  Renal:                { gradient: 'from-amber-500 to-yellow-600',  emoji: '🫘' },
  Gastrointestinal:     { gradient: 'from-teal-500 to-cyan-600',    emoji: '🔥' },
  Endocrine:            { gradient: 'from-violet-500 to-purple-600', emoji: '🦋' },
  'Hematology/Oncology':{ gradient: 'from-rose-500 to-pink-600',     emoji: '🩸' },
  Neurology:            { gradient: 'from-indigo-500 to-blue-600',   emoji: '🧠' },
  Psychiatry:           { gradient: 'from-teal-500 to-cyan-600',     emoji: '🧩' },
  Musculoskeletal:      { gradient: 'from-stone-500 to-zinc-600',    emoji: '🦴' },
  Reproductive:         { gradient: 'from-pink-500 to-fuchsia-600',  emoji: '🧬' },
  Dermatology:          { gradient: 'from-yellow-500 to-amber-600',  emoji: '🧴' },
  'Infectious Disease': { gradient: 'from-lime-500 to-green-600',    emoji: '🦠' },
};

export const DEFAULT_VISUAL = {
  gradient: 'from-slate-500 to-slate-600',
  emoji: '📚',
};

/**
 * Generate feature bullets from study pack metadata
 */
export function generatePackFeatures(pack) {
  const features = [];

  if (pack.total_quizzes) {
    features.push(`${pack.total_quizzes} quizzes in sequential order`);
  }

  if (pack.step) {
    const label = pack.step.replace('step', 'Step ');
    features.push(`Aligned with USMLE ${label} content`);
  }

  if (pack.organ_system) {
    features.push(`Comprehensive ${pack.organ_system} coverage`);
  }

  if (pack.difficulty === 'mixed') {
    features.push('Progressive difficulty (easy → hard)');
  } else if (pack.difficulty) {
    features.push(`${pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1)} difficulty level`);
  }

  features.push('Track progress across all quizzes');

  return features.slice(0, 4); // max 4 features per card
}