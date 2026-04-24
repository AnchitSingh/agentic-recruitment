import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useTopicDetail } from '../hooks/useTopicDetail';
import { toTopicSlug } from '../services/backendAPI';
import { ORGAN_VISUALS, DEFAULT_VISUAL, STEP_VISUALS } from '../data/visualConfig';
import GlobalHeader from '../components/ui/GlobalHeader';

/* ═══════════════════════════════════════════════════════════════════
   TopicPage
   ─────────────────────────────────────────────────────────────────
   Topic landing: hero → diseases → key concepts → study packs →
   accordion quiz-by-step → related topics → tags
   Visual language inherited from GlobalHeader — amber palette,
   rounded-2xl/3xl radii, glassmorphic cards, backdrop-blur,
   staggered entrances, gradient badges.
   ═══════════════════════════════════════════════════════════════════ */

const PAGE_STYLES = `
  @keyframes ebTopicFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ebTopicBarGrow {
    from { width: 0%; }
  }
  @keyframes ebTopicShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ebTopicFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-6px, 8px) scale(1.04); }
  }
  @keyframes ebTopicAccordion {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 2000px; }
  }
`;

const stagger = (i, base = 0.05) => ({
  animation: `ebTopicFadeUp 0.45s ease-out ${i * base}s both`,
});

/* ═══════════════════════════════════════════════════════════════════
   SVG helpers — 1.5-stroke style consistent with NavIcon
   ═══════════════════════════════════════════════════════════════════ */
const ChevronRight = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${className}`} fill="none"
    stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDown = ({ className = '', rotated = false }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 transition-transform duration-300
      ${rotated ? 'rotate-180' : ''} ${className}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

const ArrowRight = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CheckBadge = () => (
  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white
                    flex items-center justify-center shadow-sm
                    shadow-emerald-500/25">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
);

const ClockIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const KeyIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M15.5 7.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
    <path d="M12 11v5m0 0l-2 2m2-2l2 2" />
    <path d="M8.5 14h7" />
  </svg>
);

const LinkIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M13.544 10.456a4.368 4.368 0 00-6.176 0l-3.089
             3.088a4.367 4.367 0 106.176 6.176L12 18.175" />
    <path d="M10.456 13.544a4.368 4.368 0 006.176 0l3.089-3.088a4.367
             4.367 0 00-6.176-6.176L12 5.825" />
  </svg>
);

const TagIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237
             1.17.659 1.591l9.581 9.581c.699.699 1.78.872
             2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369
             -1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path d="M6 6h.008v.008H6V6z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   StatBlock — Glassmorphic stat for hero
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
   SectionHeader — Accent bar + title + trailing + divider
   ═══════════════════════════════════════════════════════════════════ */
const SectionHeader = ({ title, trailing, icon, className = '' }) => (
  <div className={`flex items-center gap-3 mb-5 ${className}`}>
    <div className="w-1 h-6 rounded-full
                    bg-gradient-to-b from-amber-500 to-orange-600" />
    {icon && (
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
    )}
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    <div className="flex-1 h-px bg-slate-200/60" />
    {trailing && (
      <span className="text-sm text-slate-400 font-medium tabular-nums
                       flex-shrink-0">
        {trailing}
      </span>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   FilterChip — amber active state, matching GlobalHeader
   ═══════════════════════════════════════════════════════════════════ */
const FilterChip = ({ label, active, onClick, dot }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center gap-1.5 rounded-full text-xs font-medium
      whitespace-nowrap transition-all duration-200
      ${active
        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 px-4 py-2'
        : 'bg-white text-slate-600 border border-slate-200/60 px-3.5 py-[7px] hover:border-slate-300 hover:bg-slate-50'
      }`}
  >
    {dot && (
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
    )}
    {label}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════
   DifficultyBadge — Pill with coloured bg + dot
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
   TypeBadge — Topic type label in the hero
   ═══════════════════════════════════════════════════════════════════ */
const TYPE_ICONS = {
  organ_system: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5
               5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5
               5.5 0 000-7.78z" />
    </svg>
  ),
  disease: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  subject: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
};

const TypeBadge = ({ type }) => {
  const label = type === 'organ_system' ? 'Organ System'
    : type === 'disease' ? 'Disease'
    : type === 'subject' ? 'Subject'
    : 'Topic';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium
                     px-3 py-1.5 rounded-full bg-white/[0.15]
                     backdrop-blur-sm text-white/90">
      {TYPE_ICONS[type] || null}
      {label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   StudyPackCard — Matching ExamStepPage version
   ═══════════════════════════════════════════════════════════════════ */
const StudyPackCard = ({ pack, index, onClick }) => {
  const pv = ORGAN_VISUALS[pack.organ_system] || DEFAULT_VISUAL;

  return (
    <div
      onClick={onClick}
      style={stagger(index)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm
                 hover:shadow-lg hover:-translate-y-1 cursor-pointer
                 transition-all duration-300 overflow-hidden
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      <div className={`h-1.5 bg-gradient-to-r ${pv.gradient}
                        group-hover:h-2 transition-all duration-300`} />

      <div className="p-5">
        <div className="flex items-start gap-3.5 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${pv.gradient}
                           flex items-center justify-center text-lg shadow-sm
                           flex-shrink-0`}>
            {pack.cover_emoji || pv.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-snug
                           group-hover:text-amber-700 transition-colors line-clamp-2">
              {pack.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {pack.total_quizzes} quizzes · {pack.total_questions} questions
            </p>
          </div>
        </div>

        {pack.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
            {pack.description}
          </p>
        )}

        <div className="flex items-center justify-between px-3.5 py-2.5
                        rounded-xl bg-amber-50/70 group-hover:bg-amber-50
                        transition-colors">
          <span className="text-xs font-semibold text-amber-700">View Pack</span>
          <ArrowRight className="text-amber-500 group-hover:translate-x-0.5
                                 transition-transform duration-200" />
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   QuizCard — Inside accordion, matching ExamStepPage
   ═══════════════════════════════════════════════════════════════════ */
const QuizCard = ({ quiz, completed, index, onClick }) => {
  const durationMin = Math.ceil((quiz.timeLimit || quiz.totalQuestions * 90) / 60);

  return (
    <div
      onClick={onClick}
      style={stagger(index, 0.04)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`group relative p-5 rounded-2xl border transition-all duration-300
        cursor-pointer
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-500 focus-visible:ring-offset-2
        ${completed
          ? 'bg-emerald-50/40 border-emerald-200/60 hover:border-emerald-300 hover:shadow-md'
          : 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5'
        }`}
    >
      {completed && (
        <div className="absolute top-4 right-4">
          <CheckBadge />
        </div>
      )}

      <h4 className={`font-semibold text-sm leading-snug mb-3 pr-10 line-clamp-2
        transition-colors duration-200
        ${completed
          ? 'text-emerald-800'
          : 'text-slate-800 group-hover:text-amber-700'
        }`}>
        {quiz.title}
      </h4>

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

      <div className="absolute bottom-4 right-4 opacity-0
                      group-hover:opacity-100 transition-opacity duration-200">
        <ArrowRight className={completed ? 'text-emerald-400' : 'text-amber-400'} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   StepAccordion — Collapsible per-step quiz group
   ═══════════════════════════════════════════════════════════════════ */
const StepAccordion = ({
  group, visual, stepProgress, isExpanded, onToggle,
  isQuizCompleted, onQuizClick, index,
}) => {
  const stepVisual = STEP_VISUALS[group.step] || {};
  const sp = stepProgress[group.step] || { completed: 0, total: 0, percentage: 0 };
  const gradient = stepVisual.gradient || visual.gradient;

  return (
    <div
      style={stagger(index, 0.08)}
      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm
                 overflow-hidden transition-shadow duration-300
                 hover:shadow-md"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center gap-4 p-5 sm:p-6
                   hover:bg-slate-50/50 transition-colors text-left
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-inset focus-visible:ring-amber-500"
      >
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl
                         bg-gradient-to-br ${gradient}
                         flex items-center justify-center text-lg text-white
                         shadow-sm shrink-0`}>
          {stepVisual.icon || '📋'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800">{group.label}</h3>
            <span className="text-xs text-slate-400">
              {group.quizzes.length} quizzes ·{' '}
              {group.totalQuestions} questions
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2.5 mt-2">
            <div className="w-28 sm:w-36 h-1.5 bg-slate-100 rounded-full
                            overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient}
                            transition-all duration-700`}
                style={{
                  width: `${sp.percentage}%`,
                  animation: 'ebTopicBarGrow 0.8s ease-out 0.2s both',
                }}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-semibold
                             tabular-nums">
              {sp.completed}/{sp.total}
            </span>
          </div>
        </div>

        <ChevronDown className="text-slate-400" rotated={isExpanded} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          className="border-t border-slate-100/80 p-4 sm:p-6 bg-slate-50/30"
          style={{ animation: 'ebTopicAccordion 0.3s ease-out both' }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.quizzes.map((quiz, i) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                completed={isQuizCompleted(quiz.id)}
                index={i}
                onClick={() => onQuizClick(quiz.slug)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   RelatedTopicCard
   ═══════════════════════════════════════════════════════════════════ */
const RelatedTopicCard = ({ related, index }) => {
  const rv = ORGAN_VISUALS[related.name] || DEFAULT_VISUAL;

  const typeIcon = related.type === 'disease' ? '🏥'
    : related.type === 'subject' ? '📖'
    : rv.emoji;

  return (
    <Link
      to={`/topic/${related.slug}`}
      style={stagger(index, 0.04)}
      className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200/60 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <span className="text-xl shrink-0">{typeIcon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition-colors truncate">
          {related.name}
        </p>
        <p className="text-[10px] text-slate-400 capitalize">
          {related.type.replace('_', ' ')}
        </p>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   EmptyFilterState
   ═══════════════════════════════════════════════════════════════════ */
const EmptyFilterState = ({ onClear }) => (
  <div
    className="text-center py-20 bg-white/50 rounded-3xl border border-dashed
               border-slate-200 backdrop-blur-sm"
    style={{ animation: 'ebTopicFadeUp 0.4s ease-out both' }}
  >
    <div className="w-14 h-14 mx-auto mb-5 rounded-2xl
                    bg-gradient-to-br from-slate-100 to-slate-200
                    flex items-center justify-center shadow-inner">
      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor"
        viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M17 17L21 21" />
        <circle cx="11" cy="11" r="8" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-slate-700 mb-1">
      No quizzes match this filter
    </h3>
    <p className="text-sm text-slate-400 mb-6">
      Try broadening your selection
    </p>
    <button
      onClick={onClear}
      className="px-6 py-2.5 rounded-full text-sm font-semibold text-white
                 bg-gradient-to-r from-amber-500 to-orange-600
                 shadow-md shadow-amber-500/25
                 hover:shadow-lg hover:shadow-amber-500/35
                 active:scale-[0.97] transition-all duration-200
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      Clear Filter
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   Bone — Shimmer skeleton block
   ═══════════════════════════════════════════════════════════════════ */
const Bone = ({ className = '', style = {} }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background:
        'linear-gradient(90deg, #f1f5f9 25%, #e8ecf1 37%, #f1f5f9 63%)',
      backgroundSize: '200% 100%',
      animation: 'ebTopicShimmer 1.8s ease-in-out infinite',
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
      <GlobalHeader currentPage="topic" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Hero */}
          <Bone className="h-72 sm:h-80 mb-10 !rounded-3xl" />

          {/* Disease tags */}
          <div className="flex items-center gap-3 mb-4">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-36 h-5" />
          </div>
          <div className="flex gap-2 mb-10 flex-wrap">
            {[80, 96, 72, 88, 68].map((w, i) => (
              <Bone key={i} className="h-7 !rounded-full"
                style={{ width: w, animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>

          {/* Key concepts */}
          <Bone className="h-48 mb-10" style={{ animationDelay: '0.1s' }} />

          {/* Quiz section header */}
          <div className="flex items-center gap-3 mb-5">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-28 h-5" />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-6">
            {[76, 64, 80, 64].map((w, i) => (
              <Bone key={i} className="h-8 !rounded-full"
                style={{ width: w, animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>

          {/* Accordion groups */}
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-2xl border
                                      border-slate-200/60 p-5 sm:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Bone className="w-10 h-10 sm:w-11 sm:h-11 !rounded-xl"
                    style={{ animationDelay: `${i * 0.1}s` }} />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-5 w-40"
                      style={{ animationDelay: `${i * 0.1 + 0.05}s` }} />
                    <Bone className="h-1.5 w-28 !rounded-full"
                      style={{ animationDelay: `${i * 0.1 + 0.1}s` }} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((j) => (
                    <Bone key={j} className="h-[106px]"
                      style={{ animationDelay: `${(i * 3 + j) * 0.06}s` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NotFound — Branded error (matches AuthContext splash)
   ═══════════════════════════════════════════════════════════════════ */
function NotFound({ slug }) {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="topic" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white
                      to-amber-50/30 pt-24 flex items-center justify-center px-4">
        <div className="text-center"
          style={{ animation: 'ebTopicFadeUp 0.5s ease-out both' }}>

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
            Topic Not Found
          </h1>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
            No content found for
            <span className="font-semibold text-slate-700">
              {' "'}
              {slug?.replace(/-/g, ' ')}
              {'"'}
            </span>
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
   TopicPage — Main export
   ═══════════════════════════════════════════════════════════════════ */
export default function TopicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    topic,
    loading,
    error,
    filteredStepGroups,
    progress,
    stepProgress,
    expandedSteps,
    toggleStep,
    expandAll,
    collapseAll,
    difficultyFilter,
    setDifficultyFilter,
    isQuizCompleted,
  } = useTopicDetail(slug);

  useDocumentHead({
    title: topic
      ? `${topic.name} — USMLE Practice Questions | ResidentQuest`
      : 'ResidentQuest',
    description: topic
      ? `${topic.stats.totalQuestions} ${topic.name} practice questions for USMLE. ${topic.stats.totalQuizzes} quizzes across ${topic.stats.steps.length} steps.`
      : undefined,
  });

  if (loading) return <PageSkeleton />;
  if (error || !topic) return <NotFound slug={slug} />;

  const visual = ORGAN_VISUALS[topic.organSystem] || DEFAULT_VISUAL;
  const allExpanded = filteredStepGroups.length > 0 &&
    filteredStepGroups.every((g) => expandedSteps.has(g.step));

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
      <GlobalHeader currentPage="topic" onSearchSelect={handleSearchResultSelect} />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

          {/* ═══════════ Hero ═══════════ */}
          <div
            className={`relative rounded-3xl overflow-hidden
              bg-gradient-to-br ${visual.gradient} p-8 sm:p-10 lg:p-12
              text-white mb-12 shadow-xl`}
            style={{ animation: 'ebTopicFadeUp 0.5s ease-out both' }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full
                            bg-white/[0.08] -translate-y-1/3 translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebTopicFloat 12s ease-in-out infinite' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full
                            bg-white/[0.06] translate-y-1/3 -translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebTopicFloat 10s ease-in-out 2s infinite' }} />
            <div className="absolute top-1/2 right-1/3 w-44 h-44 rounded-full
                            bg-white/[0.04] pointer-events-none"
              style={{ animation: 'ebTopicFloat 14s ease-in-out 4s infinite' }} />

            <div className="relative z-10">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm text-white/50
                              mb-8 flex-wrap"
                aria-label="Breadcrumb">
                <Link to="/"
                  className="hover:text-white/90 transition-colors duration-200">
                  Home
                </Link>
                <ChevronRight className="text-white/30" />
                <Link to="/#browse-by-topic"
                  className="hover:text-white/90 transition-colors duration-200">
                  Topics
                </Link>
                <ChevronRight className="text-white/30" />
                <span className="text-white/80 font-medium truncate
                                 max-w-[200px] sm:max-w-none">
                  {topic.name}
                </span>
              </nav>

              {/* Title row */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                                bg-white/[0.15] backdrop-blur-sm
                                flex items-center justify-center
                                text-3xl sm:text-4xl shadow-lg shrink-0">
                  {visual.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold
                                   leading-tight">
                      {topic.name}
                    </h1>
                    <TypeBadge type={topic.type} />
                  </div>

                  {/* Step badges */}
                  {topic.stats.steps.length > 0 && (
                    <div className="flex gap-2 mb-5 flex-wrap">
                      {topic.stats.steps.map((step) => (
                        <Link
                          key={step}
                          to={`/exam/${step}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-full
                                     bg-white/[0.12] hover:bg-white/[0.22]
                                     backdrop-blur-sm transition-colors duration-200"
                        >
                          {step.replace('step', 'Step ')}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-3 mb-6">
                    <StatBlock
                      value={topic.stats.totalQuizzes}
                      label="Quizzes"
                    />
                    <StatBlock
                      value={topic.stats.totalQuestions.toLocaleString()}
                      label="Questions"
                    />
                    {topic.stats.steps.length > 1 && (
                      <StatBlock
                        value={topic.stats.steps.length}
                        label="Steps"
                      />
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
                          animation: 'ebTopicBarGrow 1s ease-out 0.3s both',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ Diseases Covered ═══════════ */}
          {topic.stats.diseases.length > 0 && (
            <section className="mb-10"
              style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.1s both' }}>
              <SectionHeader
                title="Diseases Covered"
                trailing={`${topic.stats.diseases.length} diseases`}
              />
              <div className="flex flex-wrap gap-2">
                {topic.stats.diseases.map((disease, i) => {
                  const diseaseSlug = toTopicSlug(disease);

                  // Don't link to ourselves
                  if (diseaseSlug === slug) {
                    return (
                      <span
                        key={disease}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 font-medium"
                      >
                        {disease} ← You are here
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={disease}
                      to={`/topic/${diseaseSlug}`}
                      style={stagger(i, 0.02)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-amber-300 hover:bg-amber-50 transition-all"
                    >
                      {disease}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════════ Key Concepts ═══════════ */}
          {topic.stats.keyConcepts.length > 0 && (
            <section className="mb-10"
              style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.15s both' }}>
              <div className="rounded-2xl border border-amber-200/50
                              bg-gradient-to-br from-amber-50/60 to-orange-50/30
                              overflow-hidden">
                {/* Header bar */}
                <div className="flex items-center gap-3 px-6 py-4
                                border-b border-amber-200/40">
                  <div className="w-8 h-8 rounded-lg
                                  bg-gradient-to-br from-amber-500 to-orange-600
                                  flex items-center justify-center shadow-sm
                                  shadow-amber-500/20">
                    <KeyIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-amber-800">
                    Key Concepts You'll Learn
                  </h3>
                  <span className="text-xs text-amber-500/70 font-medium">
                    {topic.stats.keyConcepts.length} concepts
                  </span>
                </div>

                {/* Concept list */}
                <ul className="px-6 py-4 space-y-2.5">
                  {topic.stats.keyConcepts.slice(0, 8).map((concept, i) => (
                    <li
                      key={i}
                      style={stagger(i, 0.04)}
                      className="text-sm text-amber-900/70 flex items-start gap-3
                                 leading-relaxed"
                    >
                      <div className="w-5 h-5 rounded-md bg-amber-100/80
                                      flex items-center justify-center
                                      flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-amber-600
                                         tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <span className="line-clamp-2">{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ═══════════ Study Packs ═══════════ */}
          {topic.studyPacks.length > 0 && (
            <section className="mb-12"
              style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.2s both' }}>
              <SectionHeader
                title="Study Packs"
                trailing={`${topic.studyPacks.length} packs`}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topic.studyPacks.map((pack, i) => (
                  <StudyPackCard
                    key={pack.id}
                    pack={pack}
                    index={i}
                    onClick={() => navigate(`/study-pack/${pack.slug}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ═══════════ Quizzes by Step ═══════════ */}
          <section
            style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.25s both' }}>

            <SectionHeader title="Quizzes" />

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              {/* Difficulty filters */}
              <div className="flex gap-1.5 flex-wrap">
                {['all', 'easy', 'medium', 'hard'].map((d) => (
                  <FilterChip
                    key={d}
                    label={d === 'all'
                      ? 'All Levels'
                      : d.charAt(0).toUpperCase() + d.slice(1)}
                    active={difficultyFilter === d}
                    onClick={() => setDifficultyFilter(d)}
                    dot={
                      d === 'easy'   ? 'bg-emerald-400' :
                      d === 'medium' ? 'bg-amber-400' :
                      d === 'hard'   ? 'bg-red-400' : null
                    }
                  />
                ))}
              </div>

              <div className="flex-1" />

              {/* Expand / Collapse toggle */}
              {filteredStepGroups.length > 1 && (
                <button
                  onClick={allExpanded ? collapseAll : expandAll}
                  className="flex items-center gap-1.5 text-xs font-medium
                             text-slate-500 hover:text-amber-600
                             transition-colors duration-200
                             px-3 py-1.5 rounded-full border border-slate-200/60
                             hover:border-amber-200 hover:bg-amber-50/50
                             flex-shrink-0"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200
                    ${allExpanded ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 20l5-5 5 5" />
                    <path d="M7 4l5 5 5-5" />
                  </svg>
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              )}
            </div>

            {/* Step accordion groups */}
            {filteredStepGroups.length > 0 ? (
              <div className="space-y-4">
                {filteredStepGroups.map((group, i) => (
                  <StepAccordion
                    key={group.step}
                    group={group}
                    visual={visual}
                    stepProgress={stepProgress}
                    isExpanded={expandedSteps.has(group.step)}
                    onToggle={() => toggleStep(group.step)}
                    isQuizCompleted={isQuizCompleted}
                    onQuizClick={(slug) => navigate(`/quiz/${slug}`)}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <EmptyFilterState
                onClear={() => setDifficultyFilter('all')}
              />
            )}
          </section>

          {/* ═══════════ Related Topics ═══════════ */}
          {topic.relatedTopics.length > 0 && (
            <section className="mt-16"
              style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.3s both' }}>
              <SectionHeader
                title="Related Topics"
                icon={<LinkIcon className="w-4 h-4" />}
                trailing={`${topic.relatedTopics.length} topics`}
              />
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {topic.relatedTopics.map((related, i) => (
                  <RelatedTopicCard key={related.slug} related={related} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* ═══════════ Tags Cloud ═══════════ */}
          {topic.stats.tags.length > 0 && (
            <section className="mt-12"
              style={{ animation: 'ebTopicFadeUp 0.4s ease-out 0.35s both' }}>
              <SectionHeader
                title="Tags"
                icon={<TagIcon className="w-4 h-4" />}
                trailing={`${topic.stats.tags.length} tags`}
              />
              <div className="flex flex-wrap gap-2">
                {topic.stats.tags.map((tag, i) => (
                  <span
                    key={tag}
                    style={stagger(i, 0.015)}
                    className="text-[11px] px-3 py-1.5 rounded-full
                               bg-white border border-slate-200/60
                               text-slate-500 shadow-sm
                               hover:border-slate-300 hover:bg-slate-50
                               transition-all duration-200 cursor-default"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}