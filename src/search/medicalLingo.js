/**
 * medicalLingo.js
 *
 * Medical student / USMLE culture-specific vocabulary layer.
 * Three distinct maps, each handled differently by the SearchEngine:
 *
 *   LINGO_TOKEN_MAP    — colloquial term → [tokens to inject into search]
 *                         "pathoma" → ['pathology','disease','mechanisms']
 *                         Weight: LINGO_WEIGHT (0.85) — high confidence but below
 *                         abbreviation expansions (0.9)
 *
 *   LINGO_INTENT_MAP   — colloquial term → structured intent object
 *                         { highYield?, difficulty?, step?, system?, boost? }
 *                         Applied as score modifiers, not token matches
 *                         e.g. "brutal" → { difficulty: 'Hard' }
 *                              "HY"     → { highYield: true, boost: 1.35 }
 *
 *   LINGO_PHRASE_MAP   — multi-word phrase → intent + token expansion
 *                         Checked against the raw query string (before tokenisation)
 *                         because these are idiomatic units that lose meaning when split
 *                         e.g. "bread and butter" → classic/recommended content
 *                              "next best step"   → management/clinical questions
 *                              "can't miss"        → high-yield critical diagnoses
 *
 * Additionally exports:
 *   CAREER_STAGE_MAP   — maps stage lingo to USMLE step intent
 *                         M1, M2, preclinical, dedicated → step1
 *                         M3, M4, clerkship, rotation    → step2ck
 *                         intern, PGY, resident, fellow  → step3
 *
 *   RESOURCE_MAP       — study resource names → category tokens
 *                         Used so "where can I find pathoma content" works
 */


// ─────────────────────────────────────────────────────────────────────────────
// 1. LINGO TOKEN MAP
//    Single-word colloquial terms → search token expansions
//    Weight applied in engine: LINGO_WEIGHT (0.85)
// ─────────────────────────────────────────────────────────────────────────────
const LINGO_TOKEN_ENTRIES = [
  // ── Study Resources → content categories ────────────────────────────────
  // Pathoma (Husain Sattar) is THE pathology resource
  ['pathoma',     ['pathology', 'disease', 'mechanisms', 'histology', 'inflammation', 'neoplasia']],
  // Sketchy covers micro + pharm via story mnemonics
  ['sketchy',     ['microbiology', 'pharmacology', 'bacteria', 'drugs', 'mnemonics', 'viruses']],
  ['sketchymed',  ['microbiology', 'pharmacology', 'bacteria', 'viruses', 'drugs']],
  ['sketchymicro',['microbiology', 'bacteria', 'viruses', 'fungi', 'parasites']],
  ['sketchypharm',['pharmacology', 'drugs', 'mechanisms', 'therapeutics']],
  // First Aid = the bible for Step 1
  ['firstaid',    ['step1', 'preclinical', 'foundations', 'basic science', 'boards']],
  ['goljan',      ['pathology', 'disease', 'mechanisms', 'rapid review']],
  // Boards and Beyond = Step 1 video lectures
  ['bnb',         ['step1', 'preclinical', 'physiology', 'foundations', 'basic science']],
  ['boardsandbeyond', ['step1', 'preclinical', 'physiology', 'foundations']],
  // Divine Intervention = Step 3 podcast
  ['divine',      ['step3', 'clinical', 'ambulatory', 'emergency', 'ccs']],
  ['divineintervention', ['step3', 'clinical', 'ambulatory', 'emergency']],
  // Amboss has clinical focus
  ['amboss',      ['clinical', 'step2', 'internal medicine', 'diagnosis', 'management']],
  // Anki / decks
  ['anki',        ['review', 'memorization', 'flashcard']],
  ['zanki',       ['step1', 'preclinical', 'foundations', 'pharmacology', 'pathology']],
  ['brosdecks',   ['step1', 'preclinical', 'anatomy', 'physiology']],
  ['bros',        ['step1', 'preclinical', 'anatomy', 'physiology']],
  // UWorld = question bank spanning all steps
  ['uworld',      ['step1', 'step2', 'step3', 'clinical', 'questions', 'qbank']],
  ['uw',          ['step1', 'step2', 'step3', 'clinical', 'practice']],
  // NBME = National Board of Medical Examiners
  ['nbme',        ['step1', 'step2', 'step3', 'boards', 'practice exam']],
  ['shelf',       ['step2', 'clinical', 'rotation', 'clerkship', 'internal medicine']],

  // ── Clinical role lingo → not content but step ─────────────────────────
  // (step mapping handled by CAREER_STAGE_MAP but also add tokens for context)
  ['intern',      ['step3', 'clinical', 'inpatient', 'management', 'ambulatory']],
  ['resident',    ['step3', 'clinical', 'management', 'inpatient', 'residency']],
  ['fellow',      ['step3', 'clinical', 'subspecialty', 'advanced']],
  ['attending',   ['clinical', 'management', 'diagnosis', 'treatment']],

  // ── Clinical culture terms → related content ────────────────────────────
  // Pimp = rapid-fire attending questions → hard quizzes, clinical knowledge
  ['pimp',        ['clinical', 'diagnosis', 'management', 'hard', 'reasoning']],
  ['pimping',     ['clinical', 'diagnosis', 'management', 'reasoning']],
  // Rounds = daily patient visits → clinical management content
  ['rounds',      ['clinical', 'internal medicine', 'management', 'inpatient']],
  // On call = overnight clinical duty → emergency, acute management
  ['oncall',      ['emergency', 'acute', 'inpatient', 'critical', 'overnight']],
  ['overnight',   ['emergency', 'acute', 'critical care', 'inpatient']],
  // ICU = critical care
  ['icu',         ['emergency', 'critical care', 'acute', 'resuscitation', 'inpatient']],
  ['wards',       ['internal medicine', 'inpatient', 'clinical', 'management']],
  ['clinic',      ['ambulatory', 'outpatient', 'preventive', 'primary care']],

  // ── Exam format lingo → step2/clinical content ──────────────────────────
  // Vignette = the clinical scenario in a USMLE question
  ['vignette',    ['step2', 'clinical', 'diagnosis', 'management', 'reasoning']],
  // Stem = the question story/case
  ['stem',        ['step2', 'clinical', 'case', 'scenario', 'vignette']],
  // Two-step question = question requiring 2-level reasoning (e.g. diagnosis THEN treatment)
  ['twostep',     ['step2', 'clinical', 'reasoning', 'management', 'diagnosis']],
  // Clinical decision making
  ['workup',      ['step2', 'clinical', 'diagnosis', 'testing', 'management']],
  ['ddx',         ['step2', 'diagnosis', 'differential', 'clinical', 'reasoning']],
  ['differential',['step2', 'diagnosis', 'clinical', 'reasoning', 'management']],

  // ── Importance/yield lingo → metadata-driven but add quality tokens ─────
  ['highyield',   ['important', 'tested', 'boards', 'key', 'essential']],
  ['mustkow',     ['important', 'tested', 'boards', 'key', 'essential']],
  // Zebra = rare/unusual diagnosis (House MD: "when you hear hoofbeats think horses, not zebras")
  ['zebra',       ['rare', 'unusual', 'atypical', 'uncommon', 'esoteric']],
  // Fascinoma = fascinating unusual case
  ['fascinoma',   ['rare', 'unusual', 'case', 'interesting', 'atypical']],
  // Bread and butter handled in PHRASE map (multi-word)
  // Classic = common presentation / textbook case
  ['classic',     ['common', 'typical', 'textbook', 'presentation', 'characteristic']],
  ['buzzword',    ['pathognomonic', 'classic', 'characteristic', 'finding', 'sign']],
  ['buzzwords',   ['pathognomonic', 'classic', 'characteristic', 'finding', 'sign']],

  // ── Mnemonic culture ────────────────────────────────────────────────────
  // Triad / tetrad — users may be searching for a set of classic findings
  ['triad',       ['classic', 'findings', 'symptoms', 'diagnosis', 'syndrome']],
  ['tetrad',      ['classic', 'findings', 'symptoms', 'diagnosis', 'syndrome']],
  ['pentad',      ['classic', 'findings', 'symptoms', 'diagnosis', 'syndrome']],
  ['mnemonic',    ['memorization', 'learning', 'review', 'key', 'technique']],

  // ── Body systems in student shorthand ───────────────────────────────────
  // These are more casual than the abbreviations
  ['cards',       ['cardiovascular', 'heart', 'cardiac', 'cvs']],
  ['pulm',        ['pulmonary', 'respiratory', 'lung']],
  ['endo',        ['endocrine', 'hormones', 'thyroid', 'diabetes']],
  ['rheum',       ['rheumatology', 'autoimmune', 'joints', 'inflammation']],
  ['onc',         ['oncology', 'cancer', 'neoplasm', 'malignancy', 'tumor']],
  ['hem',         ['hematology', 'blood', 'anemia', 'coagulation']],
  ['id',          ['infectious', 'microbiology', 'bacteria', 'viruses', 'infection']],
  ['ortho',       ['musculoskeletal', 'bone', 'orthopedic', 'fracture', 'joint']],

  // ── Study phase lingo ───────────────────────────────────────────────────
  // Dedicated = focused full-time exam prep period
  ['dedicated',   ['step1', 'step2', 'step3', 'boards', 'high yield', 'essential']],
  // Block = exam block format
  ['block',       ['timed', 'exam', 'practice', 'questions', 'format']],
  ['qbank',       ['practice', 'questions', 'step1', 'step2', 'step3', 'exam']],
  ['mcq',         ['multiple choice', 'questions', 'practice', 'exam']],
  ['osce',        ['clinical', 'exam', 'skills', 'step2', 'communication']],
  ['ccs',         ['step3', 'clinical', 'case simulation', 'management']],

  // ── More Study Resources (2024-2026 popular ones) ───────────────────────
  ['anking',      ['step1', 'anki', 'comprehensive', 'high yield', 'first aid', 'pathology', 'pharm']],
  ['lightyear',   ['step1', 'boardsandbeyond', 'bnb', 'physiology', 'foundations']],
  ['bootcamp',    ['step1', 'anatomy', 'preclinical', 'videos', 'high yield']],
  ['pixorize',    ['microbiology', 'immunology', 'mnemonics', 'images', 'visual']],
  ['mehlman',     ['step1', 'arrows', 'high yield', 'pdf', 'biochem', 'renal']],
  ['dirtyusmle',  ['ethics', 'biostats', 'step1', 'step2', 'high yield']],
  ['uwsa',        ['step1', 'step2', 'self assessment', 'nbme', 'practice', 'predictor']],
  ['free120',     ['nbme', 'step1', 'free', 'practice', 'questions', 'official']],
  ['cms',         ['nbme', 'clinical', 'mastery', 'shelf', 'step2', 'practice']],

  // ── More Clinical / Rotation lingo → step2/3 tokens ─────────────────────
  ['gunner',      ['competitive', 'high score', 'hard', 'step1', 'boards']],
  ['scut',        ['clinical', 'rotation', 'menial', 'step2', 'clerkship']],
  ['scutwork',    ['clinical', 'rotation', 'step2', 'clerkship']],
  ['hit',         ['admission', 'clinical', 'step2', 'management', 'inpatient']],
  ['whitecloud',  ['easy', 'light', 'call', 'rotation', 'step2']],
  ['blackcloud',  ['hard', 'busy', 'call', 'rotation', 'step2']],
  ['benign',      ['easy', 'rotation', 'clerkship', 'step2']],
  ['malignant',   ['hard', 'rotation', 'clerkship', 'step2']],

  // ── Match / Post-grad lingo (still searched by M4s/pre-residents) ───────
  ['eras',        ['residency', 'application', 'step2', 'step3']],
  ['rol',         ['rank', 'match', 'residency', 'step2']],
  ['soap',        ['unmatched', 'match', 'residency', 'step2']],
  ['scramble',    ['unmatched', 'match', 'residency']],
  ['redflag',     ['warning', 'application', 'residency', 'important']],

  // ── More body system shorthand (students type these constantly) ─────────
  ['gi',          ['gastrointestinal', 'abdomen', 'liver', 'stomach', 'bowel']],
  ['neuro',       ['neurology', 'brain', 'nerve', 'stroke', 'seizure']],
  ['derm',        ['dermatology', 'skin', 'rash', 'lesion', 'dermatitis']],
  ['psych',       ['psychiatry', 'mental', 'behavioral', 'depression', 'psychosis']],
  ['renal',       ['nephrology', 'kidney', 'electrolytes', 'acid base']],
];

export const LINGO_TOKEN_MAP = new Map(
  LINGO_TOKEN_ENTRIES.map(([k, v]) => [k.toLowerCase(), v])
);


// ─────────────────────────────────────────────────────────────────────────────
// 2. LINGO INTENT MAP
//    Single-word lingo that signals metadata rather than content tokens
//    These are applied as score multipliers / filters by the engine
// ─────────────────────────────────────────────────────────────────────────────
const LINGO_INTENT_ENTRIES = [
  // ── High-yield signals ───────────────────────────────────────────────────
  ['hy',          { highYield: true,  boost: 1.35 }],
  ['highyield',   { highYield: true,  boost: 1.35 }],
  ['mustknow',    { highYield: true,  boost: 1.30 }],
  ['important',   { highYield: true,  boost: 1.20 }],
  ['essential',   { highYield: true,  boost: 1.15 }],
  ['tested',      { highYield: true,  boost: 1.20 }],
  ['key',         { highYield: true,  boost: 1.10 }],
  ['yield',       { highYield: true,  boost: 1.15 }],

  // ── Difficulty slang ─────────────────────────────────────────────────────
  // Hard
  ['brutal',      { difficulty: 'Hard' }],
  ['killer',      { difficulty: 'Hard' }],
  ['gnarly',      { difficulty: 'Hard' }],
  ['hardest',     { difficulty: 'Hard' }],
  ['advanced',    { difficulty: 'Hard' }],
  ['challenging', { difficulty: 'Hard' }],
  ['beast',       { difficulty: 'Hard' }],
  ['destroyer',   { difficulty: 'Hard' }],
  ['murder',      { difficulty: 'Hard' }],  // "this topic murders me"
  ['tough',       { difficulty: 'Hard' }],
  ['difficult',   { difficulty: 'Hard' }],
  // Medium
  ['moderate',    { difficulty: 'Medium' }],
  ['solid',       { difficulty: 'Medium' }],
  ['decent',      { difficulty: 'Medium' }],
  // Easy
  ['doable',      { difficulty: 'Easy'  }],
  ['gentle',      { difficulty: 'Easy'  }],
  ['quick',       { difficulty: 'Easy'  }],
  ['simple',      { difficulty: 'Easy'  }],
  ['beginner',    { difficulty: 'Easy'  }],
  ['starter',     { difficulty: 'Easy'  }],
  ['intro',       { difficulty: 'Easy'  }],
  ['introductory',{ difficulty: 'Easy'  }],
  ['easy',        { difficulty: 'Easy'  }],
  ['basic',       { difficulty: 'Easy'  }],
  ['fundamentals',{ difficulty: 'Easy'  }],

  // ── Trending / recommended signals ───────────────────────────────────────
  ['popular',     { trending: true, boost: 1.15 }],
  ['trending',    { trending: true, boost: 1.15 }],
  ['recommended', { recommended: true, boost: 1.10 }],
  ['best',        { recommended: true, boost: 1.10 }],
  ['top',         { recommended: true, boost: 1.10 }],
  ['famous',      { trending: true, boost: 1.10 }],

  // ── More difficulty / style signals (real student speak) ────────────────
  ['gunner',      { difficulty: 'Hard', boost: 1.25 }],
  ['p/f',         { step: 'step1' }],           // Step 1 is pass/fail now — huge search driver
  ['passfail',    { step: 'step1' }],
  ['pass/fail',   { step: 'step1' }],
  ['whitecloud',  { difficulty: 'Easy' }],
  ['blackcloud',  { difficulty: 'Hard' }],
  ['benign',      { difficulty: 'Easy' }],
  ['malignant',   { difficulty: 'Hard' }],

  // ── Match / career signals (M4s type these when hunting Step 2/3 content)
  ['eras',        { step: 'step2ck' }],
  ['soap',        { step: 'step2ck' }],
  ['unmatched',   { step: 'step2ck', boost: 1.10 }],
];

export const LINGO_INTENT_MAP = new Map(
  LINGO_INTENT_ENTRIES.map(([k, v]) => [k.toLowerCase(), v])
);


// ─────────────────────────────────────────────────────────────────────────────
// 3. LINGO PHRASE MAP
//    Multi-word idiomatic phrases checked against the RAW query string.
//    Each entry: [phrase, { tokens?, intent? }]
//    Phrases are matched case-insensitively on the normalised raw query.
// ─────────────────────────────────────────────────────────────────────────────
const LINGO_PHRASE_ENTRIES = [
  // ── Study quality phrases ─────────────────────────────────────────────
  ['bread and butter',
    { tokens: ['common', 'classic', 'typical', 'textbook', 'essential', 'presentation'],
      intent: { recommended: true, boost: 1.25 } }],
  ['can\'t miss',
    { tokens: ['critical', 'important', 'essential', 'diagnosis', 'emergency'],
      intent: { highYield: true, boost: 1.30 } }],
  ['cannot miss',
    { tokens: ['critical', 'important', 'essential', 'diagnosis', 'emergency'],
      intent: { highYield: true, boost: 1.30 } }],
  ['high yield',
    { tokens: ['important', 'boards', 'tested', 'essential', 'key'],
      intent: { highYield: true, boost: 1.35 } }],
  ['low yield',
    { tokens: ['uncommon', 'rare', 'detail'] }],
  ['must know',
    { tokens: ['essential', 'boards', 'tested', 'key', 'important'],
      intent: { highYield: true, boost: 1.30 } }],
  ['most tested',
    { tokens: ['essential', 'boards', 'important', 'high yield'],
      intent: { highYield: true, boost: 1.30 } }],
  ['boards fodder',
    { tokens: ['boards', 'tested', 'step', 'high yield', 'exam'],
      intent: { highYield: true, boost: 1.25 } }],

  // ── Exam question type phrases ────────────────────────────────────────
  ['next best step',
    { tokens: ['management', 'treatment', 'clinical', 'step2', 'decision'],
      intent: { step: 'step2ck' } }],
  ['best next step',
    { tokens: ['management', 'treatment', 'clinical', 'step2', 'decision'],
      intent: { step: 'step2ck' } }],
  ['most likely diagnosis',
    { tokens: ['diagnosis', 'clinical', 'step2', 'presentation', 'findings'],
      intent: { step: 'step2ck' } }],
  ['best initial test',
    { tokens: ['diagnosis', 'workup', 'clinical', 'testing', 'step2'] }],
  ['best initial treatment',
    { tokens: ['management', 'treatment', 'pharmacology', 'clinical', 'step2'] }],
  ['treatment of choice',
    { tokens: ['management', 'treatment', 'pharmacology', 'drugs', 'first line'],
      intent: { step: 'step2ck' } }],
  ['drug of choice',
    { tokens: ['pharmacology', 'drugs', 'treatment', 'first line', 'mechanisms'] }],
  ['mechanism of action',
    { tokens: ['pharmacology', 'drugs', 'mechanisms', 'receptor', 'target'] }],

  // ── Career stage / year phrases ───────────────────────────────────────
  ['first year',       { intent: { step: 'step1' } }],
  ['second year',      { intent: { step: 'step1' } }],
  ['third year',       { intent: { step: 'step2ck' } }],
  ['fourth year',      { intent: { step: 'step2ck' } }],
  ['ms1',              { intent: { step: 'step1' } }],
  ['ms2',              { intent: { step: 'step1' } }],
  ['ms3',              { intent: { step: 'step2ck' } }],
  ['ms4',              { intent: { step: 'step2ck' } }],
  ['m1 year',          { intent: { step: 'step1' } }],
  ['m2 year',          { intent: { step: 'step1' } }],
  ['m3 year',          { intent: { step: 'step2ck' } }],
  ['m4 year',          { intent: { step: 'step2ck' } }],
  ['clinical year',    { intent: { step: 'step2ck' } }],
  ['preclinical year', { intent: { step: 'step1' } }],
  ['basic science year',{ intent: { step: 'step1' } }],
  ['on call',          { tokens: ['emergency', 'acute', 'inpatient', 'overnight'] }],
  ['sub i',            { intent: { step: 'step2ck' },
                         tokens: ['clinical', 'advanced', 'inpatient', 'management'] }],
  ['sub intern',       { intent: { step: 'step2ck' },
                         tokens: ['clinical', 'advanced', 'inpatient'] }],
  ['acting intern',    { intent: { step: 'step2ck' },
                         tokens: ['clinical', 'advanced', 'management'] }],
  ['pgy 1',            { intent: { step: 'step3' } }],
  ['pgy 2',            { intent: { step: 'step3' } }],
  ['pgy 3',            { intent: { step: 'step3' } }],
  ['first year resident',   { intent: { step: 'step3' } }],
  ['junior resident',       { intent: { step: 'step3' } }],
  ['senior resident',       { intent: { step: 'step3' } }],
  ['residency prep',        { intent: { step: 'step3' },
                               tokens: ['step3', 'clinical', 'management', 'ambulatory'] }],
  ['intern year',           { intent: { step: 'step3' } }],

  // ── Resource + content combinations ──────────────────────────────────
  ['first aid',
    { tokens: ['step1', 'preclinical', 'foundations', 'basic science', 'boards'] }],
  ['rapid review',
    { tokens: ['pathology', 'goljan', 'review', 'high yield', 'boards'] }],
  ['boards and beyond',
    { tokens: ['step1', 'preclinical', 'physiology', 'foundations'] }],
  ['divine intervention',
    { tokens: ['step3', 'clinical', 'ambulatory', 'emergency', 'ccs'] }],

  // ── Rotation names ────────────────────────────────────────────────────
  ['internal medicine rotation',
    { intent: { step: 'step2ck' },
      tokens: ['internal medicine', 'diagnosis', 'management', 'inpatient'] }],
  ['surgery rotation',
    { intent: { step: 'step2ck' },
      tokens: ['surgery', 'surgical', 'acute abdomen', 'perioperative'] }],
  ['ob rotation',
    { intent: { step: 'step2ck' },
      tokens: ['obstetrics', 'gynecology', 'pregnancy', 'labor'] }],
  ['psych rotation',
    { intent: { step: 'step2ck' },
      tokens: ['psychiatry', 'behavioral', 'mental health', 'diagnosis'] }],
  ['peds rotation',
    { intent: { step: 'step2ck' },
      tokens: ['pediatrics', 'neonatal', 'developmental'] }],
  ['em rotation',
    { intent: { step: 'step2ck' },
      tokens: ['emergency', 'acute', 'trauma', 'critical'] }],
  ['neuro rotation',
    { intent: { step: 'step2ck' },
      tokens: ['neurology', 'neuroanatomy', 'stroke', 'seizure'] }],

  // ── Classic test-taking phrases ───────────────────────────────────────
  ['next step in management',
    { tokens: ['management', 'treatment', 'clinical', 'decision'],
      intent: { step: 'step2ck' } }],
  ['most appropriate',
    { tokens: ['management', 'clinical', 'treatment', 'diagnosis'] }],
  ['best management',
    { tokens: ['management', 'treatment', 'clinical', 'decision', 'step2'] }],

  // ── Resource combos
  ['free 120',    { tokens: ['nbme', 'step1', 'practice', 'official'], intent: { step: 'step1' } }],
  ['uw self assessment', { tokens: ['uworld', 'self assessment', 'predictor'], intent: { step: 'step1' } }],
  ['uwsa 1',      { tokens: ['uworld', 'self assessment'], intent: { step: 'step1' } }],
  ['uwsa 2',      { tokens: ['uworld', 'self assessment'], intent: { step: 'step1' } }],
  ['mehlman arrows',{ tokens: ['step1', 'high yield', 'arrows', 'pdf'], intent: { highYield: true, boost: 1.30 } }],
  ['anking deck', { tokens: ['step1', 'anki', 'comprehensive'] }],
  ['lightyear deck',{ tokens: ['step1', 'bnb', 'boardsandbeyond'] }],
  ['bootcamp step1',{ tokens: ['step1', 'anatomy', 'videos'] }],

  // ── Rotation / clinical culture phrases
  ['benign rotation', { tokens: ['easy', 'clerkship', 'step2'], intent: { difficulty: 'Easy' } }],
  ['malignant rotation',{ tokens: ['hard', 'clerkship', 'step2'], intent: { difficulty: 'Hard' } }],
  ['scut work',   { tokens: ['clinical', 'rotation', 'step2', 'clerkship'] }],
  ['white cloud', { tokens: ['easy', 'call', 'rotation', 'step2'], intent: { difficulty: 'Easy' } }],
  ['black cloud', { tokens: ['hard', 'call', 'rotation', 'step2'], intent: { difficulty: 'Hard' } }],
  ['gi rounds',   { tokens: ['lunch', 'break', 'joke'] }],  // niche but real

  // ── Match process phrases (searched by M4s looking for "how to apply" content)
  ['rank order list',{ intent: { step: 'step2ck' } }],
  ['soap week',   { intent: { step: 'step2ck' } }],
  ['post match',  { intent: { step: 'step2ck' } }],
  ['red flag',    { tokens: ['warning', 'important', 'application'], intent: { highYield: true } }],

  // ── Classic USMLE question triggers
  ['most common cause',{ tokens: ['high yield', 'presentation', 'step2'], intent: { highYield: true, boost: 1.25 } }],
  ['pathognomonic for',{ tokens: ['buzzword', 'classic', 'finding'], intent: { highYield: true } }],
];

export const LINGO_PHRASE_MAP = new Map(
  LINGO_PHRASE_ENTRIES.map(([k, v]) => [k.toLowerCase(), v])
);


// ─────────────────────────────────────────────────────────────────────────────
// 4. CAREER STAGE MAP
//    Single-token career stage identifiers → step intent
//    Checked in _detectIntent alongside the regular intent maps
// ─────────────────────────────────────────────────────────────────────────────
export const CAREER_STAGE_MAP = new Map([
  // Pre-clinical / Step 1 stage
  ['m1',           'step1'],
  ['m2',           'step1'],
  ['ms1',          'step1'],
  ['ms2',          'step1'],
  ['preclinical',  'step1'],
  ['premed',       'step1'],   // sometimes used loosely
  ['pgy0',         'step1'],   // jokingly used for MS years

  // Clinical / Step 2 stage
  ['m3',           'step2ck'],
  ['m4',           'step2ck'],
  ['ms3',          'step2ck'],
  ['ms4',          'step2ck'],
  ['clerkship',    'step2ck'],
  ['rotation',     'step2ck'],
  ['clerk',        'step2ck'],
  ['clinical',     'step2ck'],
  ['subintern',    'step2ck'],
  ['subbi',        'step2ck'],  // "sub-I"

  // Residency / Step 3 stage
  ['intern',       'step3'],
  ['resident',     'step3'],
  ['pgy1',         'step3'],
  ['pgy2',         'step3'],
  ['pgy3',         'step3'],
  ['pgy',          'step3'],
  ['residency',    'step3'],
  ['postgrad',     'step3'],
  ['pg',           'step3'],    // "PG" used in Indian medical context too

  // Pre-med / early
  ['premed',       'step1'],
  ['pre med',      'step1'],
  ['mcat',         'step1'],

  // M4 / transition
  ['m4',           'step2ck'],
  ['subi',         'step2ck'],     // common shorthand
  ['sub-i',        'step2ck'],
  ['acting intern', 'step2ck'],

  // Match / residency application
  ['eras',         'step2ck'],
  ['match',        'step2ck'],
  ['soap',         'step2ck'],
  ['scramble',     'step2ck'],

  // Residency levels (more granular)
  ['chief',        'step3'],
  ['chief resident','step3'],
  ['pgy4',         'step3'],
  ['fellowship',   'step3'],
  ['fellow',       'step3'],  // already in token but good for stage too
]);


// ─────────────────────────────────────────────────────────────────────────────
// 5. RESOURCE → CATEGORY AFFINITY MAP
//    Lets the engine know which categories a given study resource covers.
//    Used to enrich the lingo token expansions with category-level context.
//    Keys: lowercase resource names  |  Values: categoryIds[] (most relevant first)
// ─────────────────────────────────────────────────────────────────────────────
export const RESOURCE_CATEGORY_MAP = new Map([
  ['pathoma',          ['pathology']],
  ['goljan',           ['pathology']],
  ['sketchy',          ['microbiology', 'pharmacology']],
  ['sketchymicro',     ['microbiology']],
  ['sketchypharm',     ['pharmacology']],
  ['firstaid',         ['step1', 'anatomy', 'pathology']],
  ['boardsandbeyond',  ['step1']],
  ['bnb',              ['step1']],
  ['divine',           ['step3']],
  ['divineintervention',['step3']],
  ['amboss',           ['step2ck', 'step3']],
  ['uworld',           ['step1', 'step2ck', 'step3']],
  ['nbme',             ['step1', 'step2ck', 'step3']],
  ['zanki',            ['step1', 'pharmacology', 'pathology']],

  ['anking',          ['step1']],
  ['lightyear',       ['step1']],
  ['bootcamp',        ['step1', 'anatomy']],
  ['pixorize',        ['microbiology', 'immunology']],
  ['mehlman',         ['step1']],
  ['dirtyusmle',      ['ethics', 'biostats']],
  ['uwsa',            ['step1', 'step2']],
  ['free120',         ['step1']],
  ['cms',             ['step2']],
]);