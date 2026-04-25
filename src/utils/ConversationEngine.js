/**
 * ConversationEngine.js — v2.1 (Gemini Edition - Production Hardened)
 *
 * Two-LLM agentic conversation system for candidate interest assessment.
 * Updated to use Google Gemini API (April 2026)
 *
 * Changes in v2.1:
 * - Added retry logic with exponential backoff for rate limits (429)
 * - Added safetySettings for production use
 * - Cleaner first-turn handling (removed fragile prependUser pattern)
 * - Judge now uses responseMimeType: "application/json" for reliable structured output
 * - Improved error messages and logging
 *
 * Architecture:
 *   JD JSON + Candidate Profile → Recruiter Prompt + Candidate Prompt
 *   → Parallel conversation loops (MAX_TURNS=5) → Judge LLM scores interest
 *   → Returns structured results ready for Combined Score ranking
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Recommended models (April 2026)
const CHAT_MODEL = 'gemini-3.1-flash-lite-preview';   // Fast, cost-effective for conversation turns
const JUDGE_MODEL = 'gemini-3.1-flash-lite-preview';     // Superior reasoning for interest scoring

const MAX_TURNS = 5;      // Hard cap — never let LLMs extend this
const MAX_TOKENS_CHAT = 700;    // Keep each message short — screening call
const MAX_TOKENS_JUDGE = 1000;    // Judge needs more room to reason
const MAX_RETRIES = 3;      // Retry attempts for transient errors / rate limits

// ─── Availability label map ───────────────────────────────────────────────────
const AVAILABILITY_LABELS = {
  actively_looking: 'actively looking for new opportunities',
  open_to_offers: 'open to the right opportunity',
  passively_looking: 'currently employed but open to interesting roles',
  not_looking: 'happily employed and not actively looking',
};

const SENIORITY_LABELS = {
  junior: 'a junior professional',
  mid: 'a mid-level professional',
  'mid-senior': 'a mid-to-senior level professional',
  senior: 'a senior professional',
  lead: 'a technical lead',
  principal: 'a principal engineer',
  staff: 'a staff engineer',
};


// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run conversations for all candidates in parallel.
 * Main entry point — call from Results page.
 */
export async function runAllConversations(jd, candidates, apiKey, onProgress = null) {
  const tasks = candidates.map(async ({ candidate, matchScore }) => {
    try {
      onProgress?.(candidate.candidate_id, 'running');

      const result = await runSingleConversation(jd, candidate, apiKey);

      onProgress?.(candidate.candidate_id, 'done');
      return { ...result, matchScore };

    } catch (err) {
      console.error(`Conversation failed for ${candidate.candidate_id}:`, err);
      onProgress?.(candidate.candidate_id, 'error');
      return _buildFallbackResult(candidate, matchScore, err.message);
    }
  });

  return Promise.all(tasks);
}

/**
 * Run a single recruiter ↔ candidate conversation + judge scoring.
 */
export async function runSingleConversation(jd, candidate, apiKey) {
  const recruiterSystemPrompt = _buildRecruiterSystemPrompt(jd);
  const candidateSystemPrompt = _buildCandidateSystemPrompt(candidate, jd);

  const transcript = await _runConversationLoop(
    recruiterSystemPrompt,
    candidateSystemPrompt,
    apiKey,
  );

  const judgement = await _judgeTranscript(transcript, jd, candidate, apiKey);

  return {
    candidate_id: candidate.candidate_id,
    candidate_name: candidate.personal?.name || 'Unknown',
    transcript,
    interest_score: judgement.interest_score,
    interest_level: judgement.interest_level,
    blockers: judgement.blockers,
    enthusiasm: judgement.enthusiasm,
    salary_signal: judgement.salary_signal,
    availability_signal: judgement.availability_signal,
    summary: judgement.summary,
    raw_judgement: judgement,
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — RECRUITER SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════════════════════

function _buildRecruiterSystemPrompt(jd) {
  const mustHave = jd.skills?.must_have?.map(s => s.name).join(', ') || 'not specified';
  const niceToHave = jd.skills?.nice_to_have?.map(s => s.name).join(', ') || 'none';
  const domain = jd.skills?.domain_knowledge?.map(d => d.name).join(', ') || 'general';
  const salaryRange = jd.compensation?.disclosed
    ? `${jd.compensation.min_lpa}–${jd.compensation.max_lpa} ${jd.compensation.currency || 'LPA'}`
    : 'competitive, discussed based on experience';
  const locationStr = _describeLocation(jd.role?.location);

  return `You are a talent recruiter at ${jd.company?.name || 'a growing company'} conducting an initial screening call with a candidate for the role of ${jd.role?.title || 'Software Engineer'}.

ROLE CONTEXT:
- Role: ${jd.role?.title} (${jd.role?.seniority || 'mid-senior'} level)
- Required skills: ${mustHave}
- Nice-to-have skills: ${niceToHave}
- Domain: ${domain}
- Experience required: ${jd.experience?.min_years || 0}–${jd.experience?.max_years || 10} years
- Location: ${locationStr}
- Compensation: ${salaryRange}
- Company: ${jd.company?.name || 'our company'} (${jd.company?.industry || 'tech'}, ${jd.company?.size || 'growing'})

YOUR GOAL IN THIS CONVERSATION:
Assess the candidate across four dimensions — ask about each naturally over the course of the conversation:
1. Their current situation and why they are open to opportunities
2. Genuine interest and enthusiasm for this specific role and domain
3. Notice period and availability
4. Salary expectations and alignment

STRICT RULES:
- Keep every message under 80 words
- Ask exactly ONE question per message — never stack multiple questions
- Be warm, professional, and conversational — not robotic or transactional
- Do NOT reveal the full salary range immediately — let the candidate share their expectation first
- Do NOT repeat information the candidate has already shared
- This is a ${MAX_TURNS}-turn conversation — pace yourself to cover all four goals naturally
- Turn 1: Warm opening + ask about current situation
- Turn 2–3: Explore interest in the role and domain
- Turn 4: Ask about notice period / availability
- Turn 5: Wrap up salary + close warmly`;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — CANDIDATE SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════════════════════

function _buildCandidateSystemPrompt(candidate, jd) {
  const name = candidate.personal?.name || 'the candidate';
  const currentTitle = candidate.role?.current_title || 'Software Engineer';
  const currentCo = candidate.experience?.current_company || 'their current company';
  const totalYears = candidate.experience?.total_years ?? 3;
  const seniority = SENIORITY_LABELS[candidate.role?.seniority] || 'an experienced professional';

  const primarySkills = candidate.skills?.primary
    ?.map(s => `${s.name} (${s.years || '?'} yrs)`)
    .join(', ') || 'not listed';

  const secondarySkills = candidate.skills?.secondary
    ?.map(s => s.name)
    .join(', ') || 'none';

  const domains = candidate.skills?.domain_knowledge
    ?.map(d => `${d.name} (${d.strength || 'moderate'})`)
    .join(', ') || 'general software';

  const availability = AVAILABILITY_LABELS[candidate.availability?.status] || 'open to opportunities';
  const noticePeriod = candidate.availability?.notice_period_days
    ? `${candidate.availability.notice_period_days} days`
    : 'standard notice';
  const currentSalary = candidate.compensation?.current_lpa
    ? `${candidate.compensation.current_lpa} ${candidate.compensation.currency || 'LPA'}`
    : 'not disclosed';
  const expectedSalary = candidate.compensation?.expected_lpa
    ? `${candidate.compensation.expected_lpa} ${candidate.compensation.currency || 'LPA'}`
    : 'open to discussion';
  const negotiable = candidate.compensation?.negotiable ? 'You are open to negotiation.' : 'Your expectation is firm.';

  const motivators = candidate.persona?.motivators?.join(', ') || 'technical challenges and growth';
  const dealbreakers = candidate.persona?.dealbreakers?.join(', ') || 'micromanagement';
  const commStyle = candidate.persona?.communication_style || 'professional and direct';
  const personalityNote = candidate.persona?.personality_notes || '';

  const domainMatch = jd.skills?.domain_knowledge?.some(d =>
    candidate.skills?.domain_knowledge?.some(cd =>
      cd.name.toLowerCase().includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(cd.name.toLowerCase())
    )
  );
  const interestLevel = domainMatch ? 'genuinely interested' : 'cautiously curious but not fully convinced';

  return `You are ${name}, ${seniority} currently working as ${currentTitle} at ${currentCo} with ${totalYears} years of total experience. You are ${availability}.

YOUR PROFESSIONAL PROFILE:
- Primary skills: ${primarySkills}
- Secondary skills: ${secondarySkills}
- Domain expertise: ${domains}
- Current compensation: ${currentSalary}
- Expected compensation: ${expectedSalary}. ${negotiable}
- Notice period: ${noticePeriod}

YOUR PERSONALITY:
- Communication style: ${commStyle}
- What motivates you: ${motivators}
- Dealbreakers: ${dealbreakers}
${personalityNote ? `- Additional notes: ${personalityNote}` : ''}

YOUR ATTITUDE TOWARD THIS OPPORTUNITY:
You are ${interestLevel} in this role. React accordingly — if the role aligns with your motivators and domain expertise, show genuine enthusiasm. If something touches your dealbreakers, express appropriate hesitation.

STRICT RULES:
- Stay in character as ${name} at ALL times — never break the fourth wall
- Keep responses under 100 words
- Answer only what is asked — do not volunteer all information at once
- When asked about salary, share your expectation of ${expectedSalary} naturally
- When asked about notice period, give ${noticePeriod} directly
- You may ask ONE brief question if genuinely curious about the role
- Do NOT ask about things already addressed in the conversation
- Sound like a real professional, not a chatbot — use natural, slightly informal language`;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — CONVERSATION LOOP (CLEANED UP)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Runs the recruiter ↔ candidate loop for exactly MAX_TURNS turns.
 * Returns the full transcript as an array of message objects.
 */
async function _runConversationLoop(recruiterSystemPrompt, candidateSystemPrompt, apiKey) {
  const transcript = [];

  const recruiterHistory = [];
  const candidateHistory = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {

    // ── Recruiter speaks ──────────────────────────────────────────────────────
    const isFirstTurn = turn === 0;
    const firstMessage = isFirstTurn
      ? 'Begin the screening call with a warm, professional opening message. Introduce yourself briefly and ask about their current situation.'
      : null;

    const recruiterMsg = await _callLLM(
      apiKey,
      recruiterSystemPrompt,
      recruiterHistory,
      firstMessage
    );

    transcript.push({ role: 'recruiter', content: recruiterMsg, turn });

    recruiterHistory.push({ role: 'assistant', content: recruiterMsg });
    candidateHistory.push({ role: 'user', content: recruiterMsg });

    // ── Candidate replies ─────────────────────────────────────────────────────
    const candidateReply = await _callLLM(
      apiKey,
      candidateSystemPrompt,
      candidateHistory,
    );

    transcript.push({ role: 'candidate', content: candidateReply, turn });

    recruiterHistory.push({ role: 'user', content: candidateReply });
    candidateHistory.push({ role: 'assistant', content: candidateReply });
  }

  return transcript;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — JUDGE LLM (WITH JSON MODE)
// ══════════════════════════════════════════════════════════════════════════════

async function _judgeTranscript(transcript, jd, candidate, apiKey) {
  const transcriptText = transcript
    .map(m => `[${m.role.toUpperCase()} - Turn ${m.turn + 1}]: ${m.content}`)
    .join('\n\n');

  const judgePrompt = `You are an expert talent analyst. Read the following recruiter-candidate conversation transcript and score the candidate's genuine interest in this role.

JOB ROLE: ${jd.role?.title} at ${jd.company?.name || 'the company'}
CANDIDATE: ${candidate.personal?.name} (${candidate.role?.current_title} at ${candidate.experience?.current_company})
CANDIDATE STATUS: ${candidate.availability?.status}

TRANSCRIPT:
${transcriptText}

Analyse the transcript and return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, no preamble):
{
  "interest_score": <integer 0-100>,
  "interest_level": <"high" | "medium" | "low" | "none">,
  "enthusiasm": <"excited" | "positive" | "neutral" | "hesitant" | "disengaged">,
  "salary_signal": <"well_aligned" | "slightly_above" | "above_budget" | "unknown">,
  "availability_signal": <"immediate" | "short_notice" | "long_notice" | "unavailable">,
  "blockers": <array of strings — real blockers mentioned, empty array if none>,
  "positive_signals": <array of strings — genuine enthusiasm signals observed>,
  "summary": <2-3 sentence human-readable summary of the candidate's interest and fit for the recruiter to read>
}

SCORING GUIDE for interest_score:
- 80-100: Clearly excited, asked follow-up questions, salary aligned, available soon
- 60-79: Generally positive, no major blockers, some enthusiasm shown
- 40-59: Lukewarm, cautious, has some concerns or reservations
- 20-39: Mostly polite but not genuinely interested, or has significant blockers
- 0-19: Clearly not interested or has dealbreaking incompatibilities`;

  const responseText = await _callLLM(
    apiKey,
    null,                    // No system prompt for Judge
    [{ role: 'user', content: judgePrompt }],
    null,
    true                     // ← isJudge = true → enables JSON mode
  );

  return _parseJudgeResponse(responseText, candidate);
}

function _parseJudgeResponse(responseText, candidate) {
  try {
    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      interest_score: typeof parsed.interest_score === 'number' ? parsed.interest_score : 50,
      interest_level: parsed.interest_level || 'medium',
      enthusiasm: parsed.enthusiasm || 'neutral',
      salary_signal: parsed.salary_signal || 'unknown',
      availability_signal: parsed.availability_signal || 'unknown',
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      positive_signals: Array.isArray(parsed.positive_signals) ? parsed.positive_signals : [],
      summary: parsed.summary || 'Unable to assess interest from conversation.',
    };

  } catch (err) {
    console.warn('Judge response parse failed, using fallback:', err.message);
    return _neutralJudgement(candidate);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// GEMINI API CALLER (PRODUCTION HARDENED - v2.1)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Single Gemini API call with retry logic, safety settings, and JSON mode support.
 *
 * @param {string}        apiKey       - Google Gemini API key
 * @param {string|null}   systemPrompt - System instruction (null for Judge)
 * @param {Object[]}      messages     - History in { role: 'user'|'assistant', content: string } format
 * @param {string|null}   firstMessage - Optional first message for recruiter (turn 0)
 * @param {boolean}       isJudge      - If true, enables responseMimeType: "application/json"
 * @returns {Promise<string>}
 */
async function _callLLM(apiKey, systemPrompt, messages, firstMessage = null, isJudge = false) {
  const model = systemPrompt ? CHAT_MODEL : JUDGE_MODEL;

  // Convert internal history format to Gemini format
  // 'assistant' → 'model' (Gemini terminology)
  let geminiContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add first message if provided (for recruiter turn 0)
  if (firstMessage) {
    geminiContents.push({
      role: 'user',
      parts: [{ text: firstMessage }]
    });
  }

  const body = {
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: systemPrompt ? MAX_TOKENS_CHAT : MAX_TOKENS_JUDGE,
      temperature: 0.7,
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  // Enable JSON mode for Judge LLM
  if (isJudge) {
    body.generationConfig.responseMimeType = "application/json";
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  // ── Retry logic with exponential backoff ────────────────────────────────────
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        // Rate limit — wait with exponential backoff
        const waitTime = Math.pow(2, attempt) * 800; // 800ms, 1.6s, 3.2s
        console.warn(`Gemini rate limit hit (attempt ${attempt + 1}/${MAX_RETRIES}). Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No text content returned from Gemini API');
      }

      return text.trim();

    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        // Final attempt failed
        console.error('Gemini API call failed after all retries:', err);
        throw err;
      }

      // Transient error — retry
      const waitTime = Math.pow(2, attempt) * 500;
      console.warn(`Gemini API error (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Gemini API call failed after maximum retries');
}


// ══════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function _describeLocation(location) {
  if (!location) return 'flexible';

  const parts = [];
  if (location.type) parts.push(location.type);
  if (location.city) parts.push(location.city);
  if (location.remote_allowed) parts.push('remote allowed');

  return parts.join(', ') || 'flexible';
}

function _neutralJudgement(candidate) {
  return {
    interest_score: 50,
    interest_level: 'medium',
    enthusiasm: 'neutral',
    salary_signal: 'unknown',
    availability_signal: 'unknown',
    blockers: [],
    positive_signals: [],
    summary: `Could not fully assess ${candidate.personal?.name || "the candidate"}'s interest from this conversation. Manual follow-up recommended.`,
  };
}

function _buildFallbackResult(candidate, matchScore, errorMessage) {
  return {
    candidate_id: candidate.candidate_id,
    candidate_name: candidate.personal?.name || 'Unknown',
    matchScore,
    transcript: [],
    interest_score: 0,
    interest_level: 'unknown',
    enthusiasm: 'unknown',
    salary_signal: 'unknown',
    availability_signal: 'unknown',
    blockers: [`Conversation failed: ${errorMessage}`],
    positive_signals: [],
    summary: 'Conversation could not be completed due to an API error.',
    raw_judgement: null,
    error: errorMessage,
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// COMBINED SCORE HELPER
// ══════════════════════════════════════════════════════════════════════════════

export function computeCombinedScore(matchScore, interestScore) {
  return parseFloat((matchScore * 0.60 + interestScore * 0.40).toFixed(1));
}

export function buildFinalShortlist(matchResults, conversationResults) {
  const convMap = new Map(
    conversationResults.map(r => [r.candidate_id, r])
  );

  const merged = matchResults.map(matchResult => {
    const conv = convMap.get(matchResult.candidate.candidate_id);

    const interestScore = conv?.interest_score ?? 50;
    const combinedScore = computeCombinedScore(matchResult.matchScore, interestScore);

    return {
      candidate: matchResult.candidate,
      matchScore: matchResult.matchScore,
      interestScore,
      combinedScore,
      matchExplanation: matchResult.explanation,
      matchBreakdown: matchResult.scoreBreakdown,
      interestLevel: conv?.interest_level || 'unknown',
      enthusiasm: conv?.enthusiasm || 'unknown',
      salarySignal: conv?.salary_signal || 'unknown',
      availabilitySignal: conv?.availability_signal || 'unknown',
      blockers: conv?.blockers || [],
      positiveSignals: conv?.positive_signals || [],
      interestSummary: conv?.summary || '',
      transcript: conv?.transcript || [],
      strengthTags: matchResult.explanation?.strength_tags || [],
      hasError: !!conv?.error,
    };
  });

  merged.sort((a, b) => b.combinedScore - a.combinedScore);
  return merged;
}