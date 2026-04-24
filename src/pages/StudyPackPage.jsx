import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useStudyPackDetail } from '../hooks/useStudyPackDetail';
import { ORGAN_VISUALS, DEFAULT_VISUAL } from '../data/visualConfig';
import GlobalHeader from '../components/ui/GlobalHeader';

/* ═══════════════════════════════════════════════════════════════════
   StudyPackPage
   ─────────────────────────────────────────────────────────────────
   Pack landing: hero → disease tags → quiz list → continue section
   Visual language inherited from GlobalHeader — amber palette,
   rounded-2xl/3xl radii, sm→lg shadows, backdrop-blur, gradient
   badges, staggered entrances, cubic-bezier curves.
   ═══════════════════════════════════════════════════════════════════ */

const PAGE_STYLES = `
  @keyframes ebPackFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ebPackBarGrow {
    from { width: 0%; }
  }
  @keyframes ebPackShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ebPackFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-6px, 8px) scale(1.04); }
  }
  @keyframes ebPackPulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35); }
    70%  { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  @keyframes ebPackConfetti {
    0%   { transform: scale(0.8) rotate(-6deg); opacity: 0; }
    50%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
`;

const stagger = (i, base = 0.05) => ({
  animation: `ebPackFadeUp 0.45s ease-out ${i * base}s both`,
});

/* ═══════════════════════════════════════════════════════════════════
   Tiny SVG helpers (1.5-stroke style matching NavIcon)
   ═══════════════════════════════════════════════════════════════════ */
const Chevron = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${className}`} fill="none"
    stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const ArrowRight = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CheckIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const PlayIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none" />
  </svg>
);

const LockIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

const ClockIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   StatBlock — Glassmorphic stat inside the hero
   ═══════════════════════════════════════════════════════════════════ */
const StatBlock = ({ value, label }) => (
  <div className="flex-1 min-w-[90px] bg-white/[0.12] backdrop-blur-sm
                  rounded-2xl px-4 py-3 sm:py-4 text-center">
    <p className="text-xl sm:text-2xl font-bold text-white leading-none mb-1">
      {value}
    </p>
    <p className="text-[11px] sm:text-xs text-white/60 font-medium uppercase
                  tracking-wider">
      {label}
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   SectionHeader — Vertical accent bar + title + trailing line
   ═══════════════════════════════════════════════════════════════════ */
const SectionHeader = ({ title, trailing, className = '' }) => (
  <div className={`flex items-center gap-3 mb-5 ${className}`}>
    <div className="w-1 h-6 rounded-full
                    bg-gradient-to-b from-amber-500 to-orange-600" />
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    <div className="flex-1 h-px bg-slate-200/60" />
    {trailing && (
      <span className="text-sm text-slate-400 font-medium tabular-nums flex-shrink-0">
        {trailing}
      </span>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   DifficultyBadge
   ═══════════════════════════════════════════════════════════════════ */
const DIFF_MAP = {
  easy:   { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Easy' },
  medium: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Medium' },
  hard:   { dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-700',     label: 'Hard' },
};

const DifficultyBadge = ({ difficulty }) => {
  const d = DIFF_MAP[difficulty?.toLowerCase()];
  if (!d) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px]
      font-semibold rounded-full px-2 py-0.5 ${d.bg} ${d.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`} />
      {d.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   QuizRow — Full-width row for each quiz in the pack
   ═══════════════════════════════════════════════════════════════════ */
function QuizRow({ quiz, index, completed, isNext, locked, visual, onStart }) {
  const durationMin = Math.ceil((quiz.timeLimit || quiz.totalQuestions * 90) / 60);

  return (
    <div
      onClick={!locked ? onStart : undefined}
      onKeyDown={(e) => {
        if (!locked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); onStart();
        }
      }}
      role={locked ? undefined : 'link'}
      tabIndex={locked ? -1 : 0}
      style={stagger(index)}
      className={`group relative flex items-center gap-4 p-4 sm:p-5
        rounded-2xl border transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-500 focus-visible:ring-offset-2
        ${completed
          ? 'bg-emerald-50/40 border-emerald-200/60 hover:border-emerald-300 hover:shadow-md cursor-pointer'
          : isNext
            ? 'bg-gradient-to-r from-amber-50/60 to-orange-50/40 border-amber-300/80 shadow-md shadow-amber-100/40 hover:shadow-lg cursor-pointer'
            : locked
              ? 'bg-slate-50/60 border-slate-200/60 opacity-50 cursor-not-allowed'
              : 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
        }`}
    >
      {/* ── Index / status badge ── */}
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center
        justify-center text-sm font-bold shrink-0 transition-all duration-200
        ${completed
          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
          : isNext
            ? `bg-gradient-to-br ${visual.gradient} text-white shadow-md`
            : locked
              ? 'bg-slate-100 text-slate-400'
              : 'bg-slate-100 text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600'
        }`}
        style={isNext ? { animation: 'ebPackPulseRing 2s ease-out infinite' } : {}}
      >
        {completed ? (
          <CheckIcon className="w-5 h-5" />
        ) : locked ? (
          <LockIcon />
        ) : (
          <span className="tabular-nums">{index + 1}</span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold text-sm leading-snug truncate
            transition-colors duration-200
            ${completed
              ? 'text-emerald-800'
              : isNext
                ? 'text-amber-800'
                : 'text-slate-800 group-hover:text-amber-700'
            }`}>
            {quiz.title}
          </h3>
          {isNext && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full
                             bg-amber-200/80 text-amber-800 shrink-0 uppercase
                             tracking-wider">
              Up Next
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <ClockIcon className="text-slate-400" />
            {durationMin} min
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="text-xs text-slate-500">
            {quiz.totalQuestions} Qs
          </span>
          {quiz.difficulty && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <DifficultyBadge difficulty={quiz.difficulty} />
            </>
          )}
        </div>

        {/* Tags — desktop only */}
        {quiz.tags?.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5 mt-2.5">
            {quiz.tags.slice(0, 4).map((tag) => (
              <span key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md
                           bg-slate-50 text-slate-400 border border-slate-100">
                {tag}
              </span>
            ))}
            {quiz.tags.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md
                               text-slate-400">
                +{quiz.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Action ── */}
      <div className="shrink-0">
        {completed ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold
                          text-emerald-600 bg-emerald-100/80 px-3.5 py-2
                          rounded-xl">
            <CheckIcon className="w-3.5 h-3.5" />
            Done
          </div>
        ) : isNext ? (
          <button className="flex items-center gap-2 text-xs font-semibold
                             text-white bg-gradient-to-r from-amber-500
                             to-orange-600 px-5 py-2.5 rounded-xl
                             shadow-md shadow-amber-500/25
                             hover:shadow-lg hover:shadow-amber-500/35
                             active:scale-[0.97] transition-all duration-200">
            <PlayIcon className="w-3.5 h-3.5" />
            Start
          </button>
        ) : locked ? (
          <div className="text-xs text-slate-400 bg-slate-100 px-3.5 py-2
                          rounded-xl">
            Locked
          </div>
        ) : (
          <button className="flex items-center gap-1.5 text-xs font-medium
                             text-slate-500 bg-slate-100 px-4 py-2 rounded-xl
                             group-hover:bg-slate-800 group-hover:text-white
                             transition-all duration-200">
            Start
            <ArrowRight className="w-3.5 h-3.5 opacity-0
                                   group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ContinueCard — Rounded card for the "Continue Studying" section
   ═══════════════════════════════════════════════════════════════════ */
const ContinueCard = ({ to, icon, label, description, gradient }) => (
  <Link
    to={to}
    className="group flex-1 min-w-[200px] p-5 rounded-2xl border
               border-slate-200/60 bg-white
               hover:shadow-lg hover:-translate-y-0.5
               transition-all duration-300
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-amber-500 focus-visible:ring-offset-2"
  >
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient}
                     flex items-center justify-center text-white text-lg
                     shadow-sm mb-3 flex-shrink-0`}>
      {icon}
    </div>
    <h3 className="text-sm font-bold text-slate-800 mb-1
                   group-hover:text-amber-700 transition-colors">
      {label}
    </h3>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    <div className="flex items-center gap-1 mt-3 text-xs font-semibold
                    text-amber-600 opacity-0 group-hover:opacity-100
                    transition-opacity duration-200">
      Explore
      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5
                             transition-transform" />
    </div>
  </Link>
);

/* ═══════════════════════════════════════════════════════════════════
   Bone — Shimmer loading skeleton block
   ═══════════════════════════════════════════════════════════════════ */
const Bone = ({ className = '', style = {} }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background:
        'linear-gradient(90deg, #f1f5f9 25%, #e8ecf1 37%, #f1f5f9 63%)',
      backgroundSize: '200% 100%',
      animation: 'ebPackShimmer 1.8s ease-in-out infinite',
      ...style,
    }}
  />
);

/* ═══════════════════════════════════════════════════════════════════
   PageSkeleton
   ═══════════════════════════════════════════════════════════════════ */
function PageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="study-pack" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Hero */}
          <Bone className="h-72 sm:h-80 mb-10 !rounded-3xl" />

          {/* Disease tags */}
          <div className="flex items-center gap-3 mb-4">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-36 h-5" />
          </div>
          <div className="flex gap-2 mb-10 flex-wrap">
            {[72, 88, 64, 96, 80, 72].map((w, i) => (
              <Bone key={i} className="h-7 !rounded-full"
                style={{ width: w, animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>

          {/* Quiz list header */}
          <div className="flex items-center gap-3 mb-5">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-44 h-5" />
            <div className="flex-1" />
            <Bone className="w-20 h-4" />
          </div>

          {/* Quiz rows */}
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Bone key={i} className="h-[88px]"
                style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NotFound — Branded error (matches AuthContext splash / ExamStep)
   ═══════════════════════════════════════════════════════════════════ */
function NotFound() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="study-pack" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white
                      to-amber-50/30 pt-24 flex items-center justify-center px-4">
        <div className="text-center"
          style={{ animation: 'ebPackFadeUp 0.5s ease-out both' }}>

          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl
                          bg-gradient-to-br from-red-500 to-rose-600
                          flex items-center justify-center shadow-lg
                          shadow-red-500/20">
            <svg className="w-7 h-7 text-white" fill="none"
              stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
              strokeLinecap="round">
              <path d="M12 9v4m0 4h.01" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Study Pack Not Found
          </h1>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
            This study pack may have been removed or the URL is incorrect.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                       text-sm font-semibold text-white
                       bg-gradient-to-r from-amber-500 to-orange-600
                       shadow-md shadow-amber-500/25
                       hover:shadow-lg hover:shadow-amber-500/35
                       active:scale-[0.97] transition-all duration-200
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StudyPackPage — Main export
   ═══════════════════════════════════════════════════════════════════ */
export default function StudyPackPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pack, loading, error, progress, nextQuiz, isQuizCompleted } =
    useStudyPackDetail(slug);

  const stepLabel = pack?.step?.replace('step', 'Step ') || '';

  useDocumentHead({
    title: pack
      ? `${pack.title} — USMLE Study Pack | ResidentQuest`
      : 'ResidentQuest',
    description: pack
      ? pack.description ||
        `${pack.total_quizzes} quizzes for USMLE ${stepLabel}`
      : undefined,
  });

  if (loading) return <PageSkeleton />;
  if (error || !pack) return <NotFound />;

  const visual = ORGAN_VISUALS[pack.organ_system] || DEFAULT_VISUAL;
  const emoji = pack.cover_emoji || visual.emoji;
  const allDone = progress.percentage === 100;

  // Handle search result selection from GlobalHeader
  const handleSearchResultSelect = (result) => {
    if (result.type === 'category') {
      // Navigate to topic page
      navigate(`/topic/${result.id}`);
    } else if (result.type === 'quiz' && result.slug) {
      // Start the quiz
      navigate(`/quiz/${result.slug}`);
    }
  };

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="study-pack" onSearchSelect={handleSearchResultSelect} />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

          {/* ═══════════ Hero ═══════════ */}
          <div
            className={`relative rounded-3xl overflow-hidden
              bg-gradient-to-br ${visual.gradient} p-8 sm:p-10 lg:p-12
              text-white mb-10 shadow-xl`}
            style={{ animation: 'ebPackFadeUp 0.5s ease-out both' }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full
                            bg-white/[0.08] -translate-y-1/3 translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebPackFloat 12s ease-in-out infinite' }} />
            <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full
                            bg-white/[0.06] translate-y-1/3 -translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebPackFloat 10s ease-in-out 2s infinite' }} />
            <div className="absolute top-1/2 right-1/4 w-36 h-36 rounded-full
                            bg-white/[0.04] pointer-events-none"
              style={{ animation: 'ebPackFloat 14s ease-in-out 4s infinite' }} />

            <div className="relative z-10">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm text-white/50
                              mb-8 flex-wrap"
                aria-label="Breadcrumb">
                <Link to="/"
                  className="hover:text-white/90 transition-colors duration-200">
                  Home
                </Link>
                <Chevron className="text-white/30" />
                {stepLabel && (
                  <>
                    <Link to={`/exam/${pack.step}`}
                      className="hover:text-white/90 transition-colors duration-200">
                      {stepLabel}
                    </Link>
                    <Chevron className="text-white/30" />
                  </>
                )}
                <span className="text-white/80 font-medium truncate max-w-[200px] sm:max-w-none">
                  {pack.title}
                </span>
              </nav>

              {/* Title block */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                                bg-white/[0.15] backdrop-blur-sm
                                flex items-center justify-center
                                text-3xl sm:text-4xl shadow-lg shrink-0">
                  {emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold
                                 leading-tight mb-2">
                    {pack.title}
                  </h1>
                  {pack.description && (
                    <p className="text-white/70 text-sm sm:text-base
                                  max-w-2xl leading-relaxed mb-6">
                      {pack.description}
                    </p>
                  )}

                  {/* Stat blocks */}
                  <div className="flex gap-3 mb-6">
                    <StatBlock
                      value={pack.stats.totalQuizzes}
                      label="Quizzes"
                    />
                    <StatBlock
                      value={pack.stats.totalQuestions}
                      label="Questions"
                    />
                    <StatBlock
                      value={`${pack.stats.totalTimeMinutes}m`}
                      label="Total Time"
                    />
                    {stepLabel && (
                      <StatBlock value={stepLabel} label="Exam" />
                    )}
                  </div>

                  {/* Progress */}
                  <div className="max-w-md">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm text-white/60 font-medium">
                        Your Progress
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {progress.completed}/{progress.total}
                        <span className="text-white/50 ml-1">
                          ({progress.percentage}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full shadow-sm"
                        style={{
                          width: `${progress.percentage}%`,
                          boxShadow: '0 0 12px rgba(255,255,255,0.35)',
                          animation: 'ebPackBarGrow 1s ease-out 0.3s both',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8">
                {allDone ? (
                  <div
                    className="inline-flex items-center gap-2.5 px-6 py-3
                               rounded-2xl bg-white/[0.15] backdrop-blur-sm
                               text-white font-semibold text-sm"
                    style={{ animation: 'ebPackConfetti 0.5s ease-out 0.4s both' }}
                  >
                    <span className="text-lg">🎉</span>
                    All quizzes completed — well done!
                  </div>
                ) : nextQuiz ? (
                  <button
                    onClick={() => navigate(`/quiz/${nextQuiz.slug}`)}
                    className="inline-flex items-center gap-2.5 px-7 py-3
                               rounded-full bg-white text-slate-800
                               font-semibold text-sm
                               shadow-lg shadow-black/[0.08]
                               hover:shadow-xl hover:scale-[1.02]
                               active:scale-[0.98]
                               transition-all duration-200
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-white focus-visible:ring-offset-2
                               focus-visible:ring-offset-amber-500"
                  >
                    <PlayIcon className="w-4 h-4 text-amber-600" />
                    {progress.completed === 0
                      ? 'Start First Quiz'
                      : 'Continue Next Quiz'}
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ═══════════ Disease Tags ═══════════ */}
          {pack.stats.allDiseases?.length > 0 && (
            <section className="mb-10"
              style={{ animation: 'ebPackFadeUp 0.4s ease-out 0.15s both' }}>
              <SectionHeader title="Diseases Covered"
                trailing={`${pack.stats.allDiseases.length} topics`} />

              <div className="flex flex-wrap gap-2">
                {pack.stats.allDiseases.map((disease, i) => (
                  <span
                    key={disease}
                    style={stagger(i, 0.02)}
                    className="text-xs px-3 py-1.5 rounded-full
                               bg-white border border-slate-200/60
                               text-slate-600 shadow-sm
                               hover:border-amber-200 hover:bg-amber-50/50
                               hover:text-amber-700 transition-all
                               duration-200 cursor-default"
                  >
                    {disease}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════ Quiz List ═══════════ */}
          <section style={{ animation: 'ebPackFadeUp 0.4s ease-out 0.2s both' }}>
            <SectionHeader
              title="Quizzes in This Pack"
              trailing={`${progress.completed} of ${progress.total} done`}
            />

            <div className="space-y-3">
              {pack.quizzes.map((quiz, index) => {
                const completed = isQuizCompleted(quiz.id);
                const isNext = nextQuiz?.id === quiz.id;
                const locked = false;

                return (
                  <QuizRow
                    key={quiz.id}
                    quiz={quiz}
                    index={index}
                    completed={completed}
                    isNext={isNext}
                    locked={locked}
                    visual={visual}
                    onStart={() => navigate(`/quiz/${quiz.slug}`)}
                  />
                );
              })}
            </div>
          </section>

          {/* ═══════════ Continue Studying ═══════════ */}
          <section className="mt-16"
            style={{ animation: 'ebPackFadeUp 0.4s ease-out 0.3s both' }}>
            <SectionHeader title="Continue Studying" />

            <div className="flex flex-col sm:flex-row gap-4">
              {stepLabel && (
                <ContinueCard
                  to={`/exam/${pack.step}`}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor"
                      viewBox="0 0 24 24" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0
                               002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  }
                  label={`All ${stepLabel} Quizzes`}
                  description={`Browse every quiz and study pack for ${stepLabel}`}
                  gradient="from-blue-500 to-indigo-600"
                />
              )}
              <ContinueCard
                to="/"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052
                             0-2.062.18-3 .512v14.25A8.987 8.987 0
                             016 18c2.305 0 4.408.867 6
                             2.292m0-14.25a8.966 8.966 0 016-2.292c1.052
                             0 2.062.18 3 .512v14.25A8.987 8.987 0
                             0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                }
                label="Browse All Packs"
                description="Explore study packs across all USMLE steps"
                gradient="from-amber-500 to-orange-600"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}