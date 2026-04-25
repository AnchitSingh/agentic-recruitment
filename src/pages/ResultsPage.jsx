import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn, components, backgrounds } from '../utils/designTokens';
import { generateJDEmbedding } from '../utils/embeddingGenerator';
import { getTopCandidates } from '../utils/MatchEngine';
import candidatesDb from '../data/candidate_db_with_vectors.json';
import { runAllConversations, buildFinalShortlist } from '../utils/ConversationEngine';
import { ChatViewModal } from '../components/ui/ChatViewModal';

// ─── Icons ─────────────────────────────────────────────────────────────────────

/**
 * BackIcon - Back arrow icon for navigation.
 * @returns {JSX.Element} Rendered back icon
 */
const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

/**
 * ChevronDown - Chevron icon that rotates when open.
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the chevron should be rotated (open state)
 * @returns {JSX.Element} Rendered chevron icon
 */
const ChevronDown = ({ open }) => (
  <svg
    className={cn('w-3.5 h-3.5 transition-transform duration-200', open ? 'rotate-180' : '')}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
  </svg>
);

/**
 * CheckIcon - Checkmark icon for success states.
 * @returns {JSX.Element} Rendered check icon
 */
const CheckIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

/**
 * XIcon - X icon for error or close states.
 * @returns {JSX.Element} Rendered X icon
 */
const XIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * scoreConfig - Returns color configuration based on match score.
 * @param {number} score - Match score (0-100)
 * @returns {Object} Configuration object with ring color, text color class, and label
 */
const scoreConfig = (score) => {
  if (score >= 85) return { ring: '#22c55e', text: 'text-green-600', label: 'Excellent' };
  if (score >= 70) return { ring: '#f59e0b', text: 'text-amber-600', label: 'Strong' };
  if (score >= 55) return { ring: '#f97316', text: 'text-orange-500', label: 'Good' };
  return { ring: '#94a3b8', text: 'text-slate-400', label: 'Fair' };
};

/**
 * tagVariants - CSS class variants for colored tags.
 * Maps color names to their corresponding Tailwind classes.
 */
const tagVariants = {
  green: 'bg-green-50  text-green-700  ring-1 ring-green-200/80',
  blue: 'bg-blue-50   text-blue-700   ring-1 ring-blue-200/80',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
  yellow: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200/80',
  red: 'bg-red-50    text-red-600    ring-1 ring-red-200/80',
};

// ─── Arc Score Badge ────────────────────────────────────────────────────────────

/**
 * ScoreArc - Circular progress indicator showing match score as an arc.
 * Displays score with color-coded ring based on performance level.
 *
 * @param {Object} props - Component props
 * @param {number} props.score - Match score (0-100)
 * @returns {JSX.Element} Rendered score arc component
 */
const ScoreArc = ({ score }) => {
  const cfg = scoreConfig(score);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ * 0.75;

  return (
    <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-[225deg]">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"
          strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={cfg.ring} strokeWidth="5"
          strokeDasharray={`${fill} ${circ - fill + circ * 0.25}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-lg font-bold leading-none', cfg.text)}>{score}</span>
        <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">/ 100</span>
      </div>
    </div>
  );
};

// ─── Stat Bar ──────────────────────────────────────────────────────────────────

/**
 * StatBar - Horizontal progress bar for displaying individual score components.
 * Shows label, visual bar, and percentage value.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Label text for the stat
 * @param {number} props.value - Value between 0-1 (will be displayed as percentage)
 * @returns {JSX.Element} Rendered stat bar component
 */
const StatBar = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
        style={{ width: `${Math.round(value * 100)}%`, transition: 'width 0.6s ease' }}
      />
    </div>
    <span className="text-xs text-slate-600 font-semibold w-8 text-right">
      {Math.round(value * 100)}%
    </span>
  </div>
);

// ─── Candidate Card ─────────────────────────────────────────────────────────────

/**
 * CandidateCard - Card component displaying a candidate's match information.
 * Shows candidate details, match score, skills, and allows viewing chat transcripts.
 *
 * @param {Object} props - Component props
 * @param {Object} props.result - Candidate result object containing:
 *   - candidate: Full candidate profile object
 *   - matchScore: Overall match score (0-100)
 *   - scoreBreakdown: Individual score components
 *   - explanation: Match explanation with tags and notes
 *   - interestScore: Interest score from conversations
 *   - combinedScore: Combined match and interest score
 *   - interestLevel: Interest level string
 *   - matchExplanation: Alternative explanation from final shortlist
 *   - matchBreakdown: Alternative score breakdown from final shortlist
 * @param {number} props.index - Index in the results list (for ranking display)
 * @param {Function} props.onViewChat - Callback when user clicks to view chat, receives candidate_id
 * @param {Object} props.outreachProgress - Object tracking outreach progress by candidate_id
 * @param {string} props.outreachState - Current outreach state ('idle', 'running', 'done', 'error')
 * @param {boolean} props.showCombinedScores - Whether to show combined match+interest scores
 * @returns {JSX.Element} Rendered candidate card
 */
const CandidateCard = ({ result, index, onViewChat, outreachProgress, outreachState, showCombinedScores }) => {
  const [expanded, setExpanded] = useState(false);
  const { candidate, matchScore, scoreBreakdown, explanation, interestScore, combinedScore, interestLevel, matchExplanation, matchBreakdown } = result;

  // Use match properties when available (from finalShortlist), otherwise use original
  const displayExplanation = matchExplanation || explanation;
  const displayScoreBreakdown = matchBreakdown || scoreBreakdown;

  const initials = (candidate.personal?.name || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 hover:border-amber-200/70 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
      style={{ animation: 'fadeSlideUp 0.45s ease both', animationDelay: `${index * 70}ms` }}
    >
      {/* ── Top section ───────────────────────────────────────────── */}
      <div className="p-6 pb-4">
        {/* Row: rank + avatar + name + score arc */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-300 tracking-widest">#{index + 1}</span>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <span className="text-base font-bold text-amber-700">{initials}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-semibold text-slate-900 leading-tight truncate">
              {candidate.personal?.name || 'Unknown'}
            </h3>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {candidate.role?.current_title || 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {showCombinedScores && (
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Combined</div>
                <div className="text-sm font-bold text-amber-600">{combinedScore?.toFixed(1) || 'N/A'}</div>
              </div>
            )}
            <ScoreArc score={matchScore} />
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {candidate.experience?.total_years || 0} yrs
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {candidate.personal?.location?.city || 'Remote'}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            ₹{candidate.compensation?.expected_lpa || 'N/A'} LPA
          </span>

          {showCombinedScores && interestLevel && (
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1',
              interestLevel === 'high' ? 'bg-green-50 text-green-700 ring-green-200/60' :
                interestLevel === 'medium' ? 'bg-amber-50 text-amber-700 ring-amber-200/60' :
                  interestLevel === 'low' ? 'bg-orange-50 text-orange-600 ring-orange-200/60' :
                    'bg-slate-50 text-slate-600 ring-slate-200/60'
            )}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Interest: {interestLevel}
            </span>
          )}

          {displayExplanation?.availability_note && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-200/60">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {displayExplanation.availability_note.split('·')[0].trim()}
            </span>
          )}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-px bg-slate-100 mx-6" />

      {/* ── Tags + skills + summary ────────────────────────────────── */}
      <div className="px-6 py-4 flex-1">
        {displayExplanation?.strength_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {displayExplanation.strength_tags.map((tag, i) => (
              <span key={i} className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', tagVariants[tag.color] || tagVariants.blue)}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {displayExplanation?.must_have_matched?.map((s, i) => (
            <span key={`m${i}`} className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full ring-1 ring-green-200/60">
              <CheckIcon />{s}
            </span>
          ))}
          {displayExplanation?.must_have_missing?.map((s, i) => (
            <span key={`x${i}`} className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full ring-1 ring-red-200/60">
              <XIcon />{s}
            </span>
          ))}
          {displayExplanation?.nice_to_have_matched?.map((s, i) => (
            <span key={`n${i}`} className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200/60">
              +{s}
            </span>
          ))}
        </div>

        {displayExplanation?.summary && (
          <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2">
            {displayExplanation.summary}
          </p>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown open={expanded} />
          {expanded ? 'Hide details' : 'Score breakdown'}
        </button>

        <button
          onClick={() => onViewChat(candidate.candidate_id)}
          disabled={outreachState !== 'done' || outreachProgress?.[candidate.candidate_id] === 'running'}
          className={cn(
            components.button.base,
            components.button.variants.primary,
            'text-sm px-5 h-9 min-h-0 rounded-xl gap-1.5',
            (outreachState !== 'done' || outreachProgress?.[candidate.candidate_id] === 'running') && 'opacity-50 cursor-not-allowed'
          )}
        >
          {outreachProgress?.[candidate.candidate_id] === 'running' ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Chatting...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              View Chat
            </>
          )}
        </button>
      </div>

      {/* ── Expandable score breakdown ────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '280px' : '0' }}
      >
        <div className="px-6 pb-5 pt-3 border-t border-slate-50 space-y-2.5">
          {showCombinedScores ? (
            <>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold text-slate-700">Combined Score</span>
                <span className="text-xs font-bold text-amber-600">{combinedScore?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500">Match (60%)</span>
                <span className="text-xs font-medium text-slate-600">{matchScore?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500">Interest (40%)</span>
                <span className="text-xs font-medium text-slate-600">{interestScore || 'N/A'}</span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
            </>
          ) : null}
          <StatBar label="Semantic match" value={displayScoreBreakdown?.vector_similarity ?? 0} />
          <StatBar label="Experience" value={displayScoreBreakdown?.experience_score ?? 0} />
          <StatBar label="Location fit" value={displayScoreBreakdown?.location_score ?? 0} />
          <StatBar label="Salary fit" value={displayScoreBreakdown?.salary_score ?? 0} />
          <StatBar label="Availability" value={displayScoreBreakdown?.availability_score ?? 0} />
          {displayExplanation?.experience_note && (
            <p className="text-xs text-slate-400 pt-1">{displayExplanation.experience_note}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────────

/**
 * SkeletonCard - Loading placeholder for candidate cards.
 * Displays animated skeleton elements while data is loading.
 * @returns {JSX.Element} Rendered skeleton card
 */
const SkeletonCard = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
    <div className="p-6 pb-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0 pt-0.5 space-y-2">
          <div className="h-5 bg-slate-100 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2" />
        </div>
        <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-20" />
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-24" />
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-20" />
      </div>
    </div>
    <div className="h-px bg-slate-100 mx-6" />
    <div className="px-6 py-4 flex-1 space-y-2">
      <div className="h-7 bg-slate-100 rounded-full animate-pulse w-16" />
      <div className="flex flex-wrap gap-1.5">
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-20" />
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-24" />
        <div className="h-7 bg-slate-100 rounded-full animate-pulse w-20" />
      </div>
      <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-full mt-3" />
    </div>
    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
      <div className="h-5 bg-slate-100 rounded-lg animate-pulse w-24" />
      <div className="h-9 bg-slate-100 rounded-xl animate-pulse w-28" />
    </div>
  </div>
);

// ─── Results Page ───────────────────────────────────────────────────────────────

/**
 * ResultsPage - Main page displaying ranked candidate matches for a job description.
 * Features candidate cards with match scores, agentic negotiations, and chat view modal.
 * Supports both initial matching and final shortlist with combined scores.
 *
 * @returns {JSX.Element} Rendered results page
 */
const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { jd, candidates } = location.state || { jd: null, candidates: [] };
  const [loading, setLoading] = useState(false);
  const [localCandidates, setLocalCandidates] = useState(candidates);
  const [localJd, setLocalJd] = useState(jd);

  // Outreach state
  const [outreachState, setOutreachState] = useState('idle');
  const [outreachProgress, setOutreachProgress] = useState({});
  const [finalShortlist, setFinalShortlist] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  // Run matching if we have jd but no candidates
  useEffect(() => {
    const runMatching = async () => {
      if (jd && (!candidates || candidates.length === 0)) {
        setLoading(true);
        try {
          const jdWithEmbedding = await generateJDEmbedding(jd);
          const jdVector = jdWithEmbedding.meta.embedding_vector;
          const rankedCandidates = getTopCandidates(
            jdWithEmbedding,
            jdVector,
            candidatesDb,
            6
          );
          setLocalJd(jdWithEmbedding);
          setLocalCandidates(rankedCandidates);
        } catch (error) {
          console.error('Matching failed:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    runMatching();
  }, [jd, candidates]);

  // Initiate agentic negotiations for all 6 candidates
  const handleInitiateOutreach = async () => {
    setOutreachState('running');
    setOutreachProgress({});

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // Run conversations with all 6 candidates
      const topCandidates = localCandidates.slice(0, 6);

      const onProgress = (candidateId, status) => {
        setOutreachProgress(prev => ({ ...prev, [candidateId]: status }));
      };

      const conversationResults = await runAllConversations(
        localJd,
        topCandidates,
        apiKey,
        onProgress,
      );

      const shortlist = buildFinalShortlist(localCandidates, conversationResults);
      setFinalShortlist(shortlist);
      setOutreachState('done');

    } catch (err) {
      console.error('Outreach failed:', err);
      setOutreachState('error');
    }
  };

  if (loading) {
    return (
      <div className={cn(backgrounds.pageMinHeight, 'relative overflow-x-hidden')}>
        <style>{`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-100/60 to-orange-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-orange-100/50 to-amber-50/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-amber-50/30 to-orange-50/20 rounded-full blur-3xl" />
        </div>
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-3xl">
          <div className="bg-white/80 backdrop-blur-lg h-14 rounded-[1.25rem] shadow-lg flex items-center px-3 gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
            >
              <BackIcon />
            </button>
            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-900 truncate block leading-tight">
                Finding matches...
              </span>
            </div>
          </div>
        </div>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!localCandidates || localCandidates.length === 0) {
    return (
      <div className={cn(backgrounds.pageMinHeight, 'flex items-center justify-center')}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">No matches found</h2>
          <p className="text-sm text-slate-500 mb-6">Try uploading a different job description.</p>
          <button
            onClick={() => navigate('/')}
            className={cn(components.button.base, components.button.variants.primary, components.button.sizes.md)}
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(backgrounds.pageMinHeight, 'relative overflow-x-hidden')}>

      {/* ── Animation keyframes ────────────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Background — identical to LandingPage ─────────────────── */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-100/60 to-orange-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-orange-100/50 to-amber-50/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-amber-50/30 to-orange-50/20 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ── Floating pill header — same island style as GlobalHeader ─ */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-3xl">
        <div className="bg-white/80 backdrop-blur-lg h-14 rounded-[1.25rem] shadow-lg flex items-center px-3 gap-3">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <BackIcon />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

          {/* Role title */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate block leading-tight">
              {localJd?.role?.title || 'Candidate Matches'}
            </span>
          </div>

          {/* Right pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {outreachState === 'idle' && (
              <button
                onClick={handleInitiateOutreach}
                className={cn(
                  components.button.base,
                  components.button.variants.primary,
                  'text-xs px-4 h-8 min-h-0 rounded-lg gap-1.5'
                )}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start Agentic Negotiations
              </button>
            )}

            {outreachState === 'running' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running conversations...
              </span>
            )}

            {outreachState === 'done' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Completed
              </span>
            )}

            {outreachState === 'error' && (
              <button
                onClick={handleInitiateOutreach}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Ranked by {outreachState === 'done' ? 'combined score' : 'match'}
            </span>

            <span className="inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm shadow-amber-500/25">
              {localCandidates.length} candidates
            </span>
          </div>

        </div>
      </div>

      {/* ── Card grid ──────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(finalShortlist || localCandidates).map((result, index) => (
            <CandidateCard
              key={result.candidate?.candidate_id || index}
              result={result}
              index={index}
              onViewChat={setSelectedChat}
              outreachProgress={outreachProgress}
              outreachState={outreachState}
              showCombinedScores={outreachState === 'done'}
            />
          ))}
        </div>
      </main>

      {/* ── Chat View Modal ──────────────────────────────────────────── */}
      {selectedChat && finalShortlist && (
        <ChatViewModal
          isOpen={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          conversationData={finalShortlist.find(item => item.candidate.candidate_id === selectedChat)}
        />
      )}
    </div>
  );
};

export default ResultsPage;