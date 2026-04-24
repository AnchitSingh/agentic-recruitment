// scripts/medical-knowledge.mjs

export const ORGAN_SYSTEM_META = {
  'Cardiovascular': {
    icon: '❤️',
    aliases: ['cardio', 'cardiac', 'heart', 'CVS', 'cardiovascular system'],
    abbreviations: ['MI', 'STEMI', 'NSTEMI', 'ACS', 'CHF', 'HF', 'HFrEF', 'HFpEF', 'AF', 'AFIB', 'VT', 'VF', 'SVT', 'CAD', 'HTN', 'PVD', 'PAD', 'DVT', 'PE', 'EKG', 'ECG', 'ECHO', 'BNP', 'AVB', 'LBBB', 'RBBB', 'MVP', 'AS', 'AR', 'MS', 'MR', 'PDA', 'VSD', 'ASD', 'TOF', 'CoA'],
    lingo: ['pathoma', 'cards', 'bread and butter', 'high yield', 'HY', 'boards', 'first aid', 'FA', 'sketchy', 'ECG interpretation', 'classic', 'can\'t miss', 'buzzword'],
    keywords: ['murmur', 'chest pain', 'dyspnea', 'palpitations', 'syncope', 'edema', 'troponin', 'ejection fraction', 'preload', 'afterload', 'contractility'],
  },

  'Respiratory': {
    icon: '🫁',
    aliases: ['pulmonary', 'pulm', 'lungs', 'respiratory system', 'airways'],
    abbreviations: ['COPD', 'ARDS', 'PE', 'PTX', 'CF', 'TB', 'PFT', 'FEV1', 'FVC', 'ABG', 'IPF', 'ILD', 'OSA', 'CPAP', 'BiPAP', 'SOB', 'DOE', 'CXR', 'CT', 'BAL', 'PaO2', 'PaCO2', 'SpO2'],
    lingo: ['pathoma', 'pulm', 'high yield', 'HY', 'boards', 'classic', 'first aid', 'FA', 'ABG interpretation'],
    keywords: ['cough', 'hemoptysis', 'wheezing', 'crackles', 'consolidation', 'effusion', 'pneumonia', 'ventilation', 'perfusion', 'compliance', 'surfactant'],
  },

  'Renal': {
    icon: '🫘',
    aliases: ['kidney', 'nephrology', 'urinary', 'renal system', 'nephro'],
    abbreviations: ['AKI', 'CKD', 'GFR', 'BUN', 'UTI', 'RTA', 'ADPKD', 'ARPKD', 'HUS', 'TTP', 'FSGS', 'MCD', 'GBM', 'IgA', 'RPGN', 'ATN', 'RAS', 'NSAID'],
    lingo: ['pathoma', 'nephro', 'high yield', 'HY', 'classic triad', 'buzzword', 'bread and butter', 'first aid', 'FA'],
    keywords: ['proteinuria', 'hematuria', 'oliguria', 'creatinine', 'electrolyte', 'acid base', 'nephrotic', 'nephritic', 'dialysis', 'transplant', 'cast'],
  },

  'Gastrointestinal': {
    icon: '🔥',
    aliases: ['GI', 'digestive', 'gastro', 'gut', 'liver', 'hepatology', 'gastroenterology'],
    abbreviations: ['GERD', 'IBD', 'IBS', 'UC', 'CD', 'HCC', 'PSC', 'PBC', 'NAFLD', 'NASH', 'GIB', 'SBP', 'TIPS', 'EGD', 'ERCP', 'PUD', 'SBO', 'LBO', 'AST', 'ALT', 'ALP', 'GGT', 'INR', 'AFP'],
    lingo: ['pathoma', 'GI', 'high yield', 'HY', 'surgery', 'bread and butter', 'classic', 'first aid', 'FA'],
    keywords: ['abdominal pain', 'diarrhea', 'constipation', 'jaundice', 'ascites', 'varices', 'cirrhosis', 'hepatitis', 'pancreatitis', 'malabsorption', 'obstruction'],
  },

  'Endocrine': {
    icon: '🦋',
    aliases: ['endo', 'hormones', 'thyroid', 'adrenal', 'pituitary', 'endocrinology'],
    abbreviations: ['DM', 'DKA', 'HHS', 'T1DM', 'T2DM', 'TSH', 'T3', 'T4', 'PCOS', 'MEN', 'MEN1', 'MEN2', 'SIADH', 'DI', 'PTH', 'HbA1c', 'OGTT', 'FPG', 'ACTH', 'GH', 'IGF', 'FSH', 'LH', 'PRL'],
    lingo: ['pathoma', 'endo', 'high yield', 'HY', 'classic triad', 'boards', 'first aid', 'FA', 'bread and butter'],
    keywords: ['diabetes', 'thyroid', 'cortisol', 'insulin', 'glucose', 'calcium', 'sodium', 'potassium', 'aldosterone', 'growth hormone', 'feedback'],
  },

  'Hematology/Oncology': {
    icon: '🩸',
    aliases: ['heme', 'onc', 'heme/onc', 'blood', 'cancer', 'hematology', 'oncology'],
    abbreviations: ['ALL', 'AML', 'CLL', 'CML', 'NHL', 'HL', 'DIC', 'ITP', 'TTP', 'HUS', 'SCD', 'G6PD', 'vWD', 'HIT', 'DVT', 'PE', 'CBC', 'PT', 'PTT', 'INR', 'LDH', 'ESR', 'CRP', 'PSA', 'CEA', 'CA125', 'AFP', 'bHCG'],
    lingo: ['pathoma', 'heme', 'onc', 'high yield', 'HY', 'smear', 'classic', 'buzzword', 'first aid', 'FA', 'boards'],
    keywords: ['anemia', 'leukemia', 'lymphoma', 'bleeding', 'coagulation', 'platelet', 'transfusion', 'bone marrow', 'chemotherapy', 'staging', 'metastasis'],
  },

  'Neurology': {
    icon: '🧠',
    aliases: ['neuro', 'brain', 'CNS', 'nervous system', 'neurological'],
    abbreviations: ['CVA', 'TIA', 'MS', 'ALS', 'MG', 'GBS', 'SAH', 'SDH', 'EDH', 'ICP', 'LP', 'CSF', 'EEG', 'EMG', 'NCV', 'MRI', 'CT', 'PD', 'AD', 'HD', 'SCI', 'NMJ'],
    lingo: ['pathoma', 'neuro', 'high yield', 'HY', 'localization', 'lesion', 'pimp', 'classic', 'buzzword', 'first aid', 'FA'],
    keywords: ['headache', 'seizure', 'weakness', 'numbness', 'stroke', 'dementia', 'tremor', 'gait', 'reflex', 'cranial nerve', 'dermatome', 'myotome'],
  },

  'Psychiatry': {
    icon: '🧩',
    aliases: ['psych', 'mental health', 'behavioral', 'behavioral science'],
    abbreviations: ['MDD', 'GAD', 'OCD', 'PTSD', 'ADHD', 'ASD', 'SUD', 'BPD', 'SAD', 'PDD', 'NMS', 'SS', 'EPS', 'TD', 'SSRI', 'SNRI', 'TCA', 'MAOI', 'ECT'],
    lingo: ['HY', 'high yield', 'DSM', 'step 2', 'shelf', 'first aid', 'FA', 'classic presentation'],
    keywords: ['depression', 'anxiety', 'psychosis', 'delusion', 'hallucination', 'mood', 'substance', 'suicide', 'personality', 'therapy', 'antidepressant', 'antipsychotic'],
  },

  'Musculoskeletal': {
    icon: '🦴',
    aliases: ['MSK', 'ortho', 'orthopedics', 'rheumatology', 'bones', 'joints', 'muscles'],
    abbreviations: ['RA', 'OA', 'SLE', 'DMD', 'BMD', 'AS', 'JIA', 'PMR', 'GCA', 'CRP', 'ESR', 'ANA', 'RF', 'CCP', 'HLA', 'DEXA', 'BMD', 'MRI'],
    lingo: ['pathoma', 'ortho', 'rheum', 'high yield', 'HY', 'classic', 'first aid', 'FA', 'boards'],
    keywords: ['arthritis', 'fracture', 'inflammation', 'autoimmune', 'joint', 'muscle', 'bone', 'connective tissue', 'crystal', 'gout', 'lupus'],
  },

  'Reproductive': {
    icon: '🧬',
    aliases: ['repro', 'OB/GYN', 'obstetrics', 'gynecology', 'ob', 'gyn', 'fertility'],
    abbreviations: ['PCOS', 'PID', 'STI', 'GDM', 'HELLP', 'DES', 'hCG', 'AFP', 'BRCA', 'HPV', 'HSV', 'BV', 'IVF', 'IUI', 'LEEP', 'D&C', 'PPROM', 'PROM'],
    lingo: ['shelf', 'step 2', 'OB', 'GYN', 'high yield', 'HY', 'classic', 'first aid', 'FA'],
    keywords: ['pregnancy', 'menstruation', 'ovulation', 'contraception', 'infertility', 'preeclampsia', 'ectopic', 'miscarriage', 'labor', 'delivery'],
  },

  'Dermatology': {
    icon: '🧴',
    aliases: ['derm', 'skin', 'dermatological'],
    abbreviations: ['BCC', 'SCC', 'SJS', 'TEN', 'HSP', 'EM', 'UV', 'SPF', 'AK'],
    lingo: ['derm', 'high yield', 'HY', 'visual', 'classic', 'boards', 'first aid', 'FA'],
    keywords: ['rash', 'lesion', 'biopsy', 'melanoma', 'eczema', 'psoriasis', 'acne', 'dermatitis', 'pruritus', 'ulcer', 'vesicle', 'papule'],
  },

  'Infectious Disease': {
    icon: '🦠',
    aliases: ['ID', 'infection', 'infectious', 'micro', 'microbiology'],
    abbreviations: ['MRSA', 'VRE', 'ESBL', 'TB', 'HIV', 'AIDS', 'HBV', 'HCV', 'HSV', 'EBV', 'CMV', 'HPV', 'RSV', 'STI', 'UTI', 'PNA', 'HAP', 'VAP', 'CDI', 'PCP', 'MAC'],
    lingo: ['sketchy', 'sketchymicro', 'high yield', 'HY', 'classic', 'buzzword', 'first aid', 'FA', 'mnemonics'],
    keywords: ['fever', 'infection', 'antibiotic', 'culture', 'gram stain', 'resistance', 'sepsis', 'abscess', 'immunocompromised', 'prophylaxis', 'vaccine'],
  },
};

export const STEP_META = {
  'step1': {
    label: 'Step 1',
    fullLabel: 'USMLE Step 1',
    icon: '🧬',
    description: 'Basic science foundations — anatomy, physiology, pathology, pharmacology, biochemistry',
    aliases: ['step 1', 'step one', 'preclinical', 'basic sciences', 'USMLE step 1'],
    lingo: ['M1', 'M2', 'preclinical', 'first year', 'second year', 'dedicated', 'first aid', 'FA', 'pathoma', 'sketchy', 'boards and beyond', 'B&B', 'zanki', 'anking', 'lightyear', 'UWorld', 'UW'],
    keywords: ['mechanism', 'pathophysiology', 'embryology', 'histology', 'biochemistry', 'molecular', 'cellular'],
  },
  'step2': {
    label: 'Step 2 CK',
    fullLabel: 'USMLE Step 2 CK',
    icon: '🩺',
    description: 'Clinical knowledge — diagnosis, management, next best step',
    aliases: ['step 2', 'step two', 'CK', 'clinical knowledge', 'step 2 ck', 'USMLE step 2'],
    lingo: ['M3', 'M4', 'clerkship', 'clinical', 'shelf', 'rotation', 'attending', 'UWorld', 'UW', 'amboss', 'divine', 'OME', 'online med ed', 'step up to medicine'],
    keywords: ['diagnosis', 'management', 'next best step', 'screening', 'prevention', 'treatment', 'workup', 'clinical scenario'],
  },
  'step3': {
    label: 'Step 3',
    fullLabel: 'USMLE Step 3',
    icon: '👨‍⚕️',
    description: 'Clinical management — independent practice, CCS cases',
    aliases: ['step 3', 'step three', 'USMLE step 3'],
    lingo: ['intern', 'PGY1', 'residency', 'CCS', 'clinical case simulation', 'UWorld'],
    keywords: ['management', 'outpatient', 'inpatient', 'quality improvement', 'patient safety', 'ethics', 'biostatistics'],
  },
};

export const DIFFICULTY_DURATIONS = {
  easy: 60,   // 60 sec per question
  medium: 90,
  hard: 120,
};