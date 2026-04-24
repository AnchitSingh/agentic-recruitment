/**
 * medicalSynonyms.js
 *
 * Three exports:
 *   SYNONYM_MAP      — bidirectional term → Set<related> (used by SearchEngine for query expansion)
 *   ABBREVIATION_MAP — lowercase abbrev → expansion tokens (mi → ['myocardial','infarction'])
 *   MEDICAL_STOPWORDS— terms to strip from queries before scoring
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. SYNONYM GROUPS
//    Format: [primaryTerm, ...aliases]
//    Synonyms are expanded at query time with a weight penalty (usually 0.55×)
//    NOTE: Because SearchEngine splits on spaces, single-word tokens work best here.
//    (Multi-word phrases typed by the user should be caught by your LINGO_PHRASE_MAP).
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYM_GROUPS = [
  // ─── ANATOMY & SYSTEMS ─────────────────────────────────────────────────────
  ['heart', 'cardiac', 'cardio', 'cardiovascular', 'cvs', 'coronary', 'myocardium'],
  ['kidney', 'renal', 'nephro', 'nephrology', 'nephric'],
  ['brain', 'neuro', 'neuroanatomy', 'neurology', 'cns', 'nervous', 'cerebral', 'encephalon'],
  ['liver', 'hepatic', 'hepato', 'hepatology', 'hepatocellular'],
  ['lung', 'pulmonary', 'respiratory', 'pulm', 'thoracic', 'airway'],
  ['bone', 'skeletal', 'orthopedic', 'musculoskeletal', 'msk', 'osseous', 'osteology'],
  ['blood', 'hematology', 'heme', 'hematopathology', 'hema', 'hematologic', 'sanguineous'],
  ['skin', 'derm', 'dermatology', 'cutaneous', 'integument', 'dermal', 'epidermal'],
  ['stomach', 'gastric', 'gastro', 'gastrointestinal', 'gi', 'digestive', 'bowel', 'gut', 'abdominal'],
  ['intestine', 'intestinal', 'enteric'],
  ['colon', 'colonic', 'sigmoid', 'rectum', 'rectal'],
  ['hormone', 'endocrine', 'endo', 'endocrinology', 'hormonal'],
  ['lymph', 'lymphatic', 'lymphoma', 'lymphocyte', 'lymphoid', 'node', 'nodal'],
  ['thyroid', 'thyroidal'],
  ['spleen', 'splenic', 'hypersplenism'],
  ['pancreas', 'pancreatic'],
  ['adrenal', 'adrenals', 'suprarenal', 'cortisol', 'corticosteroid'],
  ['eye', 'ophthalmology', 'ocular', 'optic', 'vision', 'retinal', 'ophthalmic'],
  ['ear', 'otology', 'auditory', 'aural', 'ent'],
  ['mouth', 'oral', 'stomatology', 'dental', 'buccal'],
  ['muscle', 'myo', 'myology', 'muscular', 'sarco'],
  ['vessel', 'vascular', 'angiology', 'angio', 'arterial', 'venous'],
  ['joint', 'articular', 'arthro', 'arthrology'],
  ['esophagus', 'esophageal', 'oesophageal'],
  ['gallbladder', 'cholecyst', 'cholecystic', 'biliary', 'bile'],
  ['peritoneum', 'peritoneal', 'intraabdominal'],
  ['spine', 'spinal', 'vertebra', 'vertebral'],
  ['nerve', 'neural', 'neuropathy', 'pns'],
  ['uterus', 'uterine', 'womb', 'endometrium'],
  ['ovary', 'ovarian', 'oophoro'],
  ['testis', 'testicular', 'scrotum', 'scrotal'],
  ['breast', 'mammary'],

  // ─── DISCIPLINES & BASIC SCIENCE ───────────────────────────────────────────
  ['drug', 'drugs', 'pharmacology', 'pharm', 'medication', 'therapeutic', 'therapeutics', 'rx'],
  ['bacteria', 'bacteriology', 'bacterial', 'bacterium', 'prokaryote'],
  ['virus', 'virology', 'viral', 'viruses', 'virion'],
  ['fungus', 'fungi', 'mycology', 'fungal', 'yeast', 'mold'],
  ['parasite', 'parasitology', 'parasitic', 'protozoa', 'helminth', 'worm'],
  ['micro', 'microbiology', 'microbe', 'microbial', 'microorganism', 'pathogen'],
  ['path', 'pathology', 'pathological', 'pathophysiology', 'disease', 'disorder', 'lesion'],
  ['anatomy', 'anatomical', 'anat'],
  ['physiology', 'physio', 'physiological', 'function'],
  ['biochem', 'biochemistry', 'metabolism', 'metabolic', 'metabolite', 'molecular'],
  ['embryo', 'embryology', 'developmental', 'fetal', 'fetus', 'teratology'],
  ['gene', 'genetics', 'genomics', 'genetic', 'hereditary', 'inheritance', 'chromosomal'],
  ['cell', 'cellular', 'cytology', 'histology', 'tissue'],
  ['immune', 'immunology', 'immunity', 'autoimmune', 'immunologic', 'defense'],
  ['biostats', 'biostatistics', 'statistics', 'epidemiology', 'epi', 'statistical'],
  ['ethics', 'ethical', 'bioethics', 'medicolegal', 'moral', 'professionalism'],
  ['neoplasm', 'cancer', 'oncology', 'tumor', 'malignancy', 'malignant', 'carcinoma', 'sarcoma', 'neoplasia'],

  // ─── SYMPTOMS & PRESENTATION (Key for Vignette Search) ──────────────────────
  ['fever', 'febrile', 'pyrexia', 'hyperthermia', 'temperature'],
  ['pain', 'algesia', 'dolor', 'ache', 'tenderness'],
  ['headache', 'cephalgia', 'migraine'],
  ['vomiting', 'emesis', 'nausea', 'regurgitation'],
  ['diarrhea', 'dysentery'],
  ['constipation', 'obstipation'],
  ['cough', 'tussis', 'coughing'],
  ['dyspnea', 'sob', 'breathlessness', 'orthopnea', 'tachypnea'],
  ['sweating', 'diaphoresis', 'perspiration', 'hyperhidrosis'],
  ['syncope', 'fainting', 'lightheadedness', 'blackout'],
  ['bleeding', 'hemorrhage', 'hemorrhagic'],
  ['swelling', 'edema', 'edematous', 'tumefaction'],
  ['itch', 'pruritus', 'itching'],
  ['fatigue', 'tiredness', 'lethargy', 'asthenia', 'malaise', 'weakness'],
  ['dizziness', 'vertigo', 'disequilibrium'],
  ['angina', 'pectoralis'],
  ['arthralgia', 'arthritis'],
  ['myalgia', 'soreness'],
  ['hypoxia', 'hypoxemia', 'desaturation'],
  ['hemoptysis', 'haemoptysis'],
  ['hematuria', 'haematuria'],
  ['hematemesis', 'haematemesis'],
  ['hematochezia', 'haematochezia'],
  ['melena', 'melaena'],
  ['seizure', 'convulsion', 'epilepsy', 'ictal', 'fit'],
  ['delirium', 'confusion', 'ams', 'encephalopathy'],
  ['paresthesia', 'tingling', 'numbness'],
  ['cyanosis', 'blue', 'bluish'],
  ['palpitations', 'fluttering'],
  ['claudication', 'limp'],
  ['dysuria', 'burning'],
  ['polyuria', 'frequency'],
  ['nocturia', 'nighttime'],
  ['oliguria', 'anuria'],
  ['amenorrhea', 'amenorrhoea'],
  ['menorrhagia', 'menses'],
  ['dysmenorrhea', 'cramps'],
  ['dyspareunia', 'intercourse'],
  ['jaundice', 'icterus'],
  ['pallor', 'pale'],
  ['lymphadenopathy', 'adenopathy'],
  ['ecchymosis', 'bruising', 'purpura'],

  // ─── COMMON DISEASES & CONDITIONS ──────────────────────────────────────────
  ['hypertension', 'htn', 'hypertensive'],
  ['hypotension', 'shock'],
  ['diabetes', 'diabetic', 'dm', 'hyperglycemia', 'insulin'],
  ['stroke', 'cva', 'infarct'],
  ['pneumonia', 'pna', 'consolidation'],
  ['chf', 'failure', 'cardiac failure'],
  ['mi', 'infarction', 'ischemic', 'acs'],
  ['anemia', 'anemic', 'pallor'],
  ['nephrolithiasis', 'urolithiasis'],
  ['cholelithiasis', 'gallstone'],
  ['clot', 'thrombus', 'thrombosis', 'dvt', 'embolus', 'embolism', 'pe'],
  ['appendicitis', 'appendix'],
  ['pancreatitis', 'pancreas'],
  ['hepatitis', 'liver'],
  ['asthma', 'bronchospasm'],
  ['sepsis', 'septic', 'bacteremia'],
  ['endocarditis', 'vegetation'],
  ['pericarditis', 'pleuritic'],
  ['myocarditis', 'carditis'],
  ['cirrhosis', 'fibrosis'],
  ['cholecystitis', 'gallbladder'],
  ['celiac', 'coeliac', 'sprue'],
  ['gastritis', 'stomach'],
  ['ulcer', 'pud'],
  ['gerd', 'reflux'],
  ['pyelonephritis', 'pyelo'],
  ['glomerulonephritis', 'nephritic', 'gn'],
  ['nephrotic', 'proteinuria'],
  ['thyrotoxicosis', 'hyperthyroidism'],
  ['hypothyroidism', 'hashimoto'],
  ['osteoporosis', 'osteopenia'],
  ['osteoarthritis', 'oa', 'degenerative'],
  ['rheumatoid', 'ra'],
  ['gout', 'urate'],
  ['lupus', 'sle'],
  ['sarcoidosis', 'sarcoid'],
  ['meningitis', 'meningeal'],
  ['encephalitis', 'brain'],
  ['dementia', 'neurocognitive'],
  ['schizophrenia', 'psychosis'],
  ['pregnancy', 'gestation', 'gravid'],
  ['preeclampsia', 'eclampsia'],
  ['ectopic', 'extrauterine'],

  // ─── MICRO / BUGS ──────────────────────────────────────────────────────────
  ['staph', 'staphylococcus', 'staphylococcal'],
  ['strep', 'streptococcus', 'streptococcal'],
  ['tb', 'tuberculosis', 'mycobacterium'],
  ['cdiff', 'difficile', 'clostridioides', 'clostridium'],

  // ─── VITAMINS & ELECTROLYTES ───────────────────────────────────────────────
  ['sodium', 'na', 'natrium', 'salt'],
  ['potassium', 'k', 'kalium'],
  ['calcium', 'ca', 'calcemia'],
  ['iron', 'fe', 'ferrous', 'ferritin'],
  ['cobalamin', 'cyanocobalamin'],
  ['folate', 'folic'],
  ['ascorbic', 'scurvy'],
  ['cholecalciferol', 'calcitriol', 'rickets'],
  ['thiamine', 'beriberi'],
  ['niacin', 'pellagra'],

  // ─── SPELLING VARIATIONS (US vs UK/International) ──────────────────────────
  ['hemoglobin', 'haemoglobin', 'hb'],
  ['anemia', 'anaemia'],
  ['diarrhea', 'diarrhoea'],
  ['edema', 'oedema'],
  ['esophagus', 'oesophagus'],
  ['fetus', 'foetus'],
  ['etiology', 'aetiology'],
  ['cesarean', 'caesarean'],
  ['pediatric', 'paediatric'],
  ['orthopedic', 'orthopaedic'],
  ['estrogen', 'oestrogen'],
  ['gynecology', 'gynaecology'],

  // ─── USMLE SPECIFIC TERMS ──────────────────────────────────────────────────
  ['step1', 'preclinical', 'foundations'],
  ['step2', 'step2ck', 'clinical'],
  ['step3', 'ccs'],
  ['vignette', 'case', 'stem'],
];

// Build bidirectional lookup: term → Set<related terms>
export const SYNONYM_MAP = new Map();
SYNONYM_GROUPS.forEach((group) => {
  group.forEach((term) => {
    const key = term.toLowerCase().trim();
    if (!SYNONYM_MAP.has(key)) SYNONYM_MAP.set(key, new Set());
    group.forEach((other) => {
      const val = other.toLowerCase().trim();
      if (val !== key) SYNONYM_MAP.get(key).add(val);
    });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2. MEDICAL ABBREVIATION MAP
//    Keys are lowercase abbreviations (NO PUNCTUATION ALLOWED, tokenizer strips it).
//    Values are arrays of expansion tokens.
// ─────────────────────────────────────────────────────────────────────────────
export const ABBREVIATION_MAP = new Map([
  // ─── CARDIOLOGY & VASCULAR ───
  ['mi',       ['myocardial', 'infarction', 'heart', 'attack']],
  ['stemi',    ['myocardial', 'infarction', 'st', 'elevation']],
  ['nstemi',   ['myocardial', 'infarction', 'non', 'st', 'elevation']],
  ['chf',      ['congestive', 'heart', 'failure']],
  ['hfref',    ['heart', 'failure', 'reduced', 'ejection', 'fraction']],
  ['hfpef',    ['heart', 'failure', 'preserved', 'ejection', 'fraction']],
  ['cad',      ['coronary', 'artery', 'disease']],
  ['htn',      ['hypertension', 'blood', 'pressure']],
  ['af',       ['atrial', 'fibrillation']],
  ['afib',     ['atrial', 'fibrillation']],
  ['vt',       ['ventricular', 'tachycardia']],
  ['vfib',     ['ventricular', 'fibrillation']],
  ['svt',      ['supraventricular', 'tachycardia']],
  ['pvc',      ['premature', 'ventricular', 'contraction']],
  ['mvp',      ['mitral', 'valve', 'prolapse']],
  ['as',       ['aortic', 'stenosis']], // Works now that 'as' is removed from stopwords
  ['ar',       ['aortic', 'regurgitation']],
  ['mr',       ['mitral', 'regurgitation']],
  ['ms',       ['mitral', 'stenosis', 'multiple', 'sclerosis']],
  ['dvt',      ['deep', 'vein', 'thrombosis']],
  ['pad',      ['peripheral', 'artery', 'disease']],
  ['pvd',      ['peripheral', 'vascular', 'disease']],
  ['aaa',      ['abdominal', 'aortic', 'aneurysm']],
  ['pfo',      ['patent', 'foramen', 'ovale']],
  ['asd',      ['atrial', 'septal', 'defect']],
  ['vsd',      ['ventricular', 'septal', 'defect']],
  ['pda',      ['patent', 'ductus', 'arteriosus']],
  ['tof',      ['tetralogy', 'of', 'fallot']],
  ['hcm',      ['hypertrophic', 'cardiomyopathy']],
  ['hocm',     ['hypertrophic', 'obstructive', 'cardiomyopathy']],
  ['wpw',      ['wolff', 'parkinson', 'white']],
  ['pea',      ['pulseless', 'electrical', 'activity']],
  ['cabg',     ['coronary', 'artery', 'bypass', 'graft']],
  ['pci',      ['percutaneous', 'coronary', 'intervention']],
  ['phtn',     ['pulmonary', 'hypertension']],

  // ─── RESPIRATORY ───
  ['copd',     ['chronic', 'obstructive', 'pulmonary', 'disease']],
  ['ards',     ['acute', 'respiratory', 'distress', 'syndrome']],
  ['osa',      ['obstructive', 'sleep', 'apnea']],
  ['pe',       ['pulmonary', 'embolism']],
  ['uri',      ['upper', 'respiratory', 'infection']],
  ['cf',       ['cystic', 'fibrosis']],
  ['cap',      ['community', 'acquired', 'pneumonia']],
  ['hap',      ['hospital', 'acquired', 'pneumonia']],
  ['vap',      ['ventilator', 'associated', 'pneumonia']],
  ['pna',      ['pneumonia']],
  ['pft',      ['pulmonary', 'function', 'test']],

  // ─── GASTROINTESTINAL ───
  ['gerd',     ['gastroesophageal', 'reflux', 'disease']],
  ['ibd',      ['inflammatory', 'bowel', 'disease']],
  ['ibs',      ['irritable', 'bowel', 'syndrome']],
  ['uc',       ['ulcerative', 'colitis']],
  ['cd',       ['crohn', 'disease']],
  ['nash',     ['nonalcoholic', 'steatohepatitis']],
  ['nafld',    ['nonalcoholic', 'fatty', 'liver', 'disease']],
  ['pud',      ['peptic', 'ulcer', 'disease']],
  ['sbo',      ['small', 'bowel', 'obstruction']],
  ['ugib',     ['upper', 'gi', 'bleed']],
  ['lgib',     ['lower', 'gi', 'bleed']],
  ['esld',     ['end', 'stage', 'liver', 'disease']],

  // ─── RENAL / GU ───
  ['aki',      ['acute', 'kidney', 'injury']],
  ['ckd',      ['chronic', 'kidney', 'disease']],
  ['esrd',     ['end', 'stage', 'renal', 'disease']],
  ['uti',      ['urinary', 'tract', 'infection']],
  ['bph',      ['benign', 'prostatic', 'hyperplasia']],
  ['psa',      ['prostate', 'specific', 'antigen']],
  ['gfr',      ['glomerular', 'filtration', 'rate']],
  ['atn',      ['acute', 'tubular', 'necrosis']],
  ['ain',      ['acute', 'interstitial', 'nephritis']],
  ['rta',      ['renal', 'tubular', 'acidosis']],
  ['gn',       ['glomerulonephritis']],
  ['eswl',     ['extracorporeal', 'shock', 'wave', 'lithotripsy']],

  // ─── ENDOCRINE ───
  ['dm',       ['diabetes', 'mellitus']],
  ['dka',      ['diabetic', 'ketoacidosis']],
  ['hhs',      ['hyperosmolar', 'hyperglycemic', 'state']],
  ['siadh',    ['syndrome', 'inappropriate', 'antidiuretic', 'hormone']],
  ['di',       ['diabetes', 'insipidus']],
  ['pcos',     ['polycystic', 'ovary', 'syndrome']],
  ['tsh',      ['thyroid', 'stimulating', 'hormone']],
  ['pth',      ['parathyroid', 'hormone']],
  ['t3',       ['triiodothyronine']],
  ['t4',       ['thyroxine']],
  ['fsh',      ['follicle', 'stimulating', 'hormone']],
  ['lh',       ['luteinizing', 'hormone']],
  ['acth',     ['adrenocorticotropic', 'hormone']],
  ['gnrh',     ['gonadotropin', 'releasing', 'hormone']],

  // ─── NEUROLOGY / PSYCH ───
  ['cva',      ['stroke', 'cerebrovascular', 'accident']],
  ['tia',      ['transient', 'ischemic', 'attack']],
  ['als',      ['amyotrophic', 'lateral', 'sclerosis']],
  ['gbs',      ['guillain', 'barre', 'syndrome']],
  ['mdd',      ['major', 'depressive', 'disorder']],
  ['gad',      ['generalized', 'anxiety', 'disorder']],
  ['ocd',      ['obsessive', 'compulsive', 'disorder']],
  ['adhd',     ['attention', 'deficit', 'hyperactivity', 'disorder']],
  ['ptsd',     ['post', 'traumatic', 'stress', 'disorder']],
  ['sah',      ['subarachnoid', 'hemorrhage']],
  ['sdh',      ['subdural', 'hematoma']],
  ['lp',       ['lumbar', 'puncture']],
  ['ich',      ['intracerebral', 'hemorrhage']],
  ['tbi',      ['traumatic', 'brain', 'injury']],
  ['icp',      ['intracranial', 'pressure']],

  // ─── HEMATOLOGY / ONCOLOGY / RHEUM ───
  ['all',      ['acute', 'lymphoblastic', 'leukemia']],
  ['aml',      ['acute', 'myeloid', 'leukemia']],
  ['cll',      ['chronic', 'lymphocytic', 'leukemia']],
  ['cml',      ['chronic', 'myeloid', 'leukemia']],
  ['hl',       ['hodgkin', 'lymphoma']],
  ['nhl',      ['non', 'hodgkin', 'lymphoma']],
  ['mm',       ['multiple', 'myeloma']],
  ['dic',      ['disseminated', 'intravascular', 'coagulation']],
  ['itp',      ['immune', 'thrombocytopenic', 'purpura']],
  ['ttp',      ['thrombotic', 'thrombocytopenic', 'purpura']],
  ['hus',      ['hemolytic', 'uremic', 'syndrome']],
  ['scd',      ['sickle', 'cell', 'disease']],
  ['g6pd',     ['glucose', 'phosphate', 'dehydrogenase', 'deficiency']],
  ['hit',      ['heparin', 'induced', 'thrombocytopenia']],
  ['vwd',      ['von', 'willebrand', 'disease']],
  ['apls',     ['antiphospholipid', 'syndrome']],
  ['sle',      ['systemic', 'lupus', 'erythematosus']],
  ['ra',       ['rheumatoid', 'arthritis']],

  // ─── INFECTIOUS DISEASE ───
  ['hiv',      ['human', 'immunodeficiency', 'virus']],
  ['aids',     ['acquired', 'immunodeficiency', 'syndrome']],
  ['mrsa',     ['methicillin', 'resistant', 'staphylococcus']],
  ['vre',      ['vancomycin', 'resistant', 'enterococcus']],
  ['hsv',      ['herpes', 'simplex', 'virus']],
  ['hpv',      ['human', 'papillomavirus']],
  ['ebv',      ['epstein', 'barr', 'virus']],
  ['cmv',      ['cytomegalovirus']],
  ['pcp',      ['pneumocystis', 'jirovecii', 'pneumonia']],
  ['hbv',      ['hepatitis', 'b', 'virus']],
  ['hcv',      ['hepatitis', 'c', 'virus']],
  ['hav',      ['hepatitis', 'a', 'virus']],
  ['vzv',      ['varicella', 'zoster', 'virus']],
  ['rsv',      ['respiratory', 'syncytial', 'virus']],
  ['covid',    ['covid', '19', 'sars', 'cov', '2']],

  // ─── OB/GYN ───
  ['iugr',     ['intrauterine', 'growth', 'restriction']],
  ['prom',     ['premature', 'rupture', 'membranes']],
  ['pprom',    ['preterm', 'premature', 'rupture', 'membranes']],
  ['ocp',      ['oral', 'contraceptive', 'pill']],
  ['iud',      ['intrauterine', 'device']],
  ['pid',      ['pelvic', 'inflammatory', 'disease']],
  ['gdm',      ['gestational', 'diabetes', 'mellitus']],
  ['lmp',      ['last', 'menstrual', 'period']],
  ['edd',      ['estimated', 'due', 'date']],
  ['pph',      ['postpartum', 'hemorrhage']],
  ['hcg',      ['human', 'chorionic', 'gonadotropin', 'pregnancy']],
  ['bhcg',     ['beta', 'hcg', 'human', 'chorionic', 'gonadotropin', 'pregnancy']],

  // ─── PHARMACOLOGY CLASSES & MED ROUTING ───
  ['ace',      ['angiotensin', 'converting', 'enzyme']],
  ['arb',      ['angiotensin', 'receptor', 'blocker']],
  ['ccb',      ['calcium', 'channel', 'blocker']],
  ['bb',       ['beta', 'blocker']],
  ['nsaid',    ['nonsteroidal', 'anti', 'inflammatory', 'drug']],
  ['ssri',     ['selective', 'serotonin', 'reuptake', 'inhibitor']],
  ['snri',     ['serotonin', 'norepinephrine', 'reuptake', 'inhibitor']],
  ['tca',      ['tricyclic', 'antidepressant']],
  ['maoi',     ['monoamine', 'oxidase', 'inhibitor']],
  ['ppi',      ['proton', 'pump', 'inhibitor']],
  ['hctz',     ['hydrochlorothiazide', 'diuretic']],
  ['mtx',      ['methotrexate']],
  ['asa',      ['aspirin', 'acetylsalicylic', 'acid']],
  ['apap',     ['acetaminophen', 'paracetamol', 'tylenol']],
  ['po',       ['oral', 'mouth']],
  ['iv',       ['intravenous']],
  ['im',       ['intramuscular']],
  ['subq',     ['subcutaneous']],
  ['prn',      ['as', 'needed']],
  ['bid',      ['twice', 'daily']],
  ['tid',      ['three', 'times', 'daily']],
  ['qid',      ['four', 'times', 'daily']],

  // ─── DIAGNOSTICS & STATS & LABS ───
  ['ecg',      ['electrocardiogram', 'ekg']],
  ['ekg',      ['electrocardiogram', 'ecg']],
  ['eeg',      ['electroencephalogram']],
  ['emg',      ['electromyography']],
  ['cxr',      ['chest', 'xray']],
  ['ct',       ['computed', 'tomography']],
  ['mri',      ['magnetic', 'resonance', 'imaging']],
  ['us',       ['ultrasound', 'sonography']],
  ['tte',      ['transthoracic', 'echocardiogram']],
  ['tee',      ['transesophageal', 'echocardiogram']],
  ['cbc',      ['complete', 'blood', 'count']],
  ['bmp',      ['basic', 'metabolic', 'panel']],
  ['cmp',      ['comprehensive', 'metabolic', 'panel']],
  ['abg',      ['arterial', 'blood', 'gas']],
  ['a1c',      ['hemoglobin', 'a1c']],
  ['hba1c',    ['hemoglobin', 'a1c']],
  ['bun',      ['blood', 'urea', 'nitrogen']],
  ['cr',       ['creatinine']],
  ['wbc',      ['white', 'blood', 'cell']],
  ['rbc',      ['red', 'blood', 'cell']],
  ['plt',      ['platelet']],
  ['pt',       ['prothrombin', 'time']],
  ['ptt',      ['partial', 'thromboplastin', 'time']],
  ['inr',      ['international', 'normalized', 'ratio']],
  ['ast',      ['aspartate', 'aminotransferase']],
  ['alt',      ['alanine', 'aminotransferase']],
  ['alp',      ['alkaline', 'phosphatase']],
  ['ggt',      ['gamma', 'glutamyl', 'transferase']],
  ['tbil',     ['total', 'bilirubin']],
  ['dbil',     ['direct', 'bilirubin']],
  ['ldl',      ['low', 'density', 'lipoprotein']],
  ['hdl',      ['high', 'density', 'lipoprotein']],
  ['tg',       ['triglycerides']],
  ['ana',      ['antinuclear', 'antibody']],
  ['anca',     ['antineutrophil', 'cytoplasmic', 'antibody']],
  ['esr',      ['erythrocyte', 'sedimentation', 'rate']],
  ['crp',      ['c', 'reactive', 'protein']],
  ['ck',       ['creatine', 'kinase']],
  ['cpk',      ['creatine', 'phosphokinase']],
  ['ldh',      ['lactate', 'dehydrogenase']],
  ['lft',      ['liver', 'function', 'test']],
  ['ppv',      ['positive', 'predictive', 'value']],
  ['npv',      ['negative', 'predictive', 'value']],
  ['rr',       ['relative', 'risk']],
]);


// ─────────────────────────────────────────────────────────────────────────────
// 3. MEDICAL STOPWORDS
//    These are stripped from queries before scoring to reduce noise.
//    *CRITICAL FIX*: 'as', 'or', and 'step' have been REMOVED from this list
//    so that ABBREVIATION_MAP ('as', 'or') and step intents ('step 1') work!
// ─────────────────────────────────────────────────────────────────────────────
export const MEDICAL_STOPWORDS = new Set([
  // Grammar & Common
  'a', 'an', 'the', 'and', 'of', 'in', 'for', 'to', 'with', 'on', 'at',
  'by', 'is', 'it', 'be', 'do', 'does', 'did', 'are', 'was', 'were',
  'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'which',
  'that', 'this', 'these', 'those', 'who', 'what', 'where', 'when', 'why',
  'how', 'about', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under',

  // Quiz / App Meta-Terms
  'quiz', 'quizzes', 'question', 'questions', 'practice', 'review', 'study',
  'test', 'exam', 'examination', 'usmle', 'board', 'boards', 'shelf',
  'me', 'my', 'find', 'show', 'get', 'give', 'want', 'need', 'search',
  'topic', 'topics', 'related', 'hard', 'easy', 'medium', 'qbank',

  // Vignette Filler (Generic demographic/history terms that add noise unless specific)
  'patient', 'presents', 'presenting', 'presentation', 'complaint', 'complains',
  'history', 'past', 'medical', 'year', 'old', 'yo', 'man', 'woman',
  'associated', 'symptoms', 'signs', 'clinical', 'diagnosis', 'treatment',
  'management', 'best', 'next', 'likely', 'most', 'describe',
  'seen', 'setting', 'findings', 'result', 'results',

  // Common clinical shorthand that adds pure noise
  'hx', 'hpi', 'pmh', 'psh', 'fhx', 'shx', 'ros', 'cc',
  'states', 'reports', 'reported', 'noted', 'denies', 'endorse', 'endorses',
  'otherwise', 'today', 'yesterday', 'weeks', 'months', 'days',
  'mg', 'ml', 'kg', 'lbs', 'cm', 'mmhg', 'bpm', 'vs', 'versus'
]);

export default SYNONYM_GROUPS;