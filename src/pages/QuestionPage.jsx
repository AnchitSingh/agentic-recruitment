import React, { useState, useEffect, memo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuestion } from '../hooks/useQuestion';
import { useAuth } from '../contexts/AuthContext';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import GlobalHeader from '../components/ui/GlobalHeader';
import { backgrounds, cn } from '../utils/designTokens';
import examBuddyAPI from '../services/api';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════════
   Style injection (once, SSR-safe)
   ═══════════════════════════════════════════════════════════════════ */
let _injected = false;
function injectStyles() {
  if (_injected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes qp-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes qp-scale-in{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes qp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes qp-pulse-soft{0%,100%{box-shadow:0 0 24px rgba(245,158,11,.12)}50%{box-shadow:0 0 48px rgba(245,158,11,.24)}}
    .qp-fade-up{animation:qp-fade-up .4s ease-out both}
    .qp-scale-in{animation:qp-scale-in .3s ease-out both}
    .qp-shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:qp-shimmer 1.5s ease-in-out infinite}
    .qp-pulse-soft{animation:qp-pulse-soft 3s ease-in-out infinite}
    details.qp-details>summary::-webkit-details-marker{display:none}
    details.qp-details>summary::marker{content:"";display:none}
    details.qp-details[open] .qp-chevron{transform:rotate(180deg)}
  `;
  document.head.appendChild(el);
  _injected = true;
}

/* ═══════════════════════════════════════════════════════════════════
   QuestionOption — MCQ answer option (mirrors quiz-page OptionButton)
   ═══════════════════════════════════════════════════════════════════ */
const QuestionOption = memo(({
  index, text, isSelected, isRevealed, isCorrectAnswer, isWrongSelection, onSelect,
}) => {
  const stateClass = isRevealed
    ? isCorrectAnswer
      ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10'
      : isWrongSelection
        ? 'border-red-400 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg shadow-red-500/10'
        : 'border-slate-200/60 bg-white/40 opacity-50'
    : isSelected
      ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg scale-[1.02]'
      : 'border-white/50 bg-white/60 hover:border-amber-200 hover:bg-white/80 hover:shadow-md';

  const dotClass = isRevealed
    ? isCorrectAnswer
      ? 'border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30'
      : isWrongSelection
        ? 'border-red-500 bg-red-500 shadow-sm shadow-red-500/30'
        : 'border-slate-300'
    : isSelected
      ? 'border-amber-500 bg-amber-500 shadow-sm shadow-amber-500/30'
      : 'border-slate-300 group-hover:border-amber-300';

  const badgeClass = isRevealed
    ? isCorrectAnswer
      ? 'bg-emerald-500 text-white'
      : isWrongSelection
        ? 'bg-red-500 text-white'
        : 'bg-slate-100 text-slate-400'
    : isSelected
      ? 'bg-amber-500 text-white'
      : 'bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700';

  const textClass = isRevealed
    ? isCorrectAnswer
      ? 'text-emerald-800 font-medium'
      : isWrongSelection
        ? 'text-red-800 font-medium'
        : 'text-slate-500'
    : isSelected
      ? 'text-amber-800 font-medium'
      : 'text-slate-700';

  return (
    <button
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(index)}
      disabled={isRevealed}
      className={cn(
        'group w-full text-left p-4 rounded-2xl border-2 transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
        'backdrop-blur-sm',
        stateClass,
        isRevealed && 'cursor-default',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Radio dot / status icon */}
        <span className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300',
          dotClass,
        )}>
          {(isRevealed && isCorrectAnswer) && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {(isRevealed && isWrongSelection) && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {(!isRevealed && isSelected) && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>

        {/* Letter badge */}
        <span className={cn(
          'text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 transition-colors duration-200',
          badgeClass,
        )}>
          {String.fromCharCode(65 + index)}
        </span>

        {/* Text */}
        <span className={cn('text-base flex-1 min-w-0 break-words transition-colors duration-200', textClass)}>
          {text}
        </span>

        {/* Correct / Wrong pill */}
        {isRevealed && isCorrectAnswer && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
            ✓ Correct
          </span>
        )}
        {isRevealed && isWrongSelection && (
          <span className="text-[11px] font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
            ✗ Your pick
          </span>
        )}
      </div>
    </button>
  );
});
QuestionOption.displayName = 'QuestionOption';

/* ═══════════════════════════════════════════════════════════════════
   Chevron icon used in breadcrumbs & details
   ═══════════════════════════════════════════════════════════════════ */
const ChevronRight = () => (
  <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   QuestionSkeleton — Shimmer loading state
   ═══════════════════════════════════════════════════════════════════ */
function QuestionSkeleton() {
  useEffect(injectStyles, []);

  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        {/* Breadcrumb shimmer */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-12 rounded-full qp-shimmer" />
          <div className="h-4 w-4 rounded qp-shimmer" />
          <div className="h-4 w-20 rounded-full qp-shimmer" />
          <div className="h-4 w-4 rounded qp-shimmer" />
          <div className="h-4 w-28 rounded-full qp-shimmer" />
        </div>

        {/* Card shimmer */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8">
          {/* Badges */}
          <div className="flex gap-2 mb-6">
            <div className="h-7 w-16 rounded-full qp-shimmer" />
            <div className="h-7 w-24 rounded-full qp-shimmer" />
            <div className="h-7 w-20 rounded-full qp-shimmer" />
          </div>
          {/* Question */}
          <div className="space-y-3 mb-8">
            <div className="h-6 w-full rounded-lg qp-shimmer" />
            <div className="h-6 w-4/5 rounded-lg qp-shimmer" />
            <div className="h-6 w-3/5 rounded-lg qp-shimmer" />
          </div>
          {/* Options */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full rounded-2xl qp-shimmer mb-3" />
          ))}
          {/* Button */}
          <div className="h-12 w-full rounded-2xl qp-shimmer mt-6" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QuestionNotFound — Error / 404 state (mirrors quiz StatusScreen)
   ═══════════════════════════════════════════════════════════════════ */
function QuestionNotFound() {
  useEffect(injectStyles, []);

  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md qp-fade-up">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12
                   2zm-1 15v-2h2v2h-2zm0-10v6h2V7h-2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Question Not Found</h1>
          <p className="text-slate-600 mb-6">
            This question may have been removed or the URL is incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/browse"
              className="px-6 py-3 font-semibold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600
                         text-white hover:shadow-lg active:scale-[.98] transition-all duration-200
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              Browse Quizzes
            </Link>
            <Link
              to="/"
              className="px-6 py-3 font-semibold rounded-xl bg-slate-100 text-slate-700
                         hover:bg-slate-200 transition-all duration-200
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QuestionPage — Main public question page (SEO-optimised)
   ═══════════════════════════════════════════════════════════════════ */
export default function QuestionPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuestion(slug);
  const { user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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

  const handleSelect = (i) => { if (!revealed) setSelectedAnswer(i); };
  const handleCheck = () => { if (selectedAnswer !== null) setRevealed(true); };

  /* ── One-time style injection ──────────────────────────────── */
  useEffect(injectStyles, []);

  /* ── Reset when navigating between questions ───────────────── */
  useEffect(() => {
    setSelectedAnswer(null);
    setRevealed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  /* ── SEO: Title, meta description, canonical ───────────────── */
  useEffect(() => {
    if (!data?.question) return;
    const q = data.question;

    document.title = `${q.questionText.slice(0, 60)}… — USMLE Practice | ResidentQuest`;

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) { el = document.createElement(selector.startsWith('link') ? 'link' : 'meta'); document.head.appendChild(el); }
      Object.entries(attr).forEach(([k, v]) => el.setAttribute(k, v));
      if (value !== undefined) el.setAttribute(selector.startsWith('link') ? 'href' : 'content', value);
    };

    setMeta('meta[name="description"]', { name: 'description' }, q.questionText.slice(0, 155) + '…');
    setMeta('link[rel="canonical"]', { rel: 'canonical' }, `https://resident.quest/question/${slug}`);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, `${q.questionText.slice(0, 60)}… — USMLE Practice`);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, q.questionText.slice(0, 155) + '…');
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'article');
    setMeta('meta[property="og:url"]', { property: 'og:url' }, `https://resident.quest/question/${slug}`);
  }, [data, slug]);

  /* ── Check if question is bookmarked ───────────────────────────── */
  useEffect(() => {
    if (data?.question?.id || data?.question?.slug) {
      console.log('Question data:', data.question); // Debug log
      examBuddyAPI.getBookmarks().then(res => {
        console.log('Bookmarks response:', res); // Debug log
        if (res?.success && Array.isArray(res.data)) {
          const questionId = data.question.id || data.question.slug;
          const isBookmarked = res.data.some(b => b.questionId === questionId);
          console.log('Is bookmarked:', isBookmarked, 'for questionId:', questionId); // Debug log
          setIsBookmarked(isBookmarked);
        }
      }).catch(err => {
        console.error('Failed to load bookmarks:', err);
      });
    }
  }, [data]);

  /* ── Guard screens ─────────────────────────────────────────── */
  if (loading) return <QuestionSkeleton />;
  if (error || !data) return <QuestionNotFound />;

  const { question, quiz, related, navigation } = data;
  const correctIdx = parseInt(question.correctAnswer, 10);
  const isCorrect = selectedAnswer === correctIdx;

  const getOptionText = (opt) => (typeof opt === 'object' ? opt.text : opt) || '';
  const correctText = getOptionText(question.options?.[correctIdx]);

  /* ── Bookmark toggle function (not useCallback to avoid hook order issues) ───── */
  const toggleBookmark = async () => {
    if (!question?.id && !question?.slug) return;
    
    // Use slug as identifier if id is not available
    const questionId = question.id || question.slug;
    console.log('Toggle bookmark clicked, questionId:', questionId, 'isBookmarked:', isBookmarked);
    
    try {
      if (isBookmarked) {
        const res = await examBuddyAPI.removeBookmark(questionId);
        console.log('Remove bookmark response:', res); // Debug log
        if (res?.success) {
          setIsBookmarked(false);
          toast.success('Bookmark removed');
        } else {
          toast.error('Failed to remove bookmark');
        }
      } else {
        const bookmarkData = {
          question: question.questionText,
          subject: question.subject,
          topic: question.topic,
          difficulty: question.difficulty,
          quizTitle: quiz?.title,
          slug: question.slug,
          options: question.options,
          correct_answer: parseInt(question.correctAnswer, 10),
          explanation: question.explanation,
          questionType: question.questionType,
        };
        console.log('Adding bookmark with data:', bookmarkData); // Debug log
        const res = await examBuddyAPI.addBookmark(questionId, bookmarkData);
        console.log('Add bookmark response:', res); // Debug log
        if (res?.success) {
          setIsBookmarked(true);
          toast.success('Question bookmarked');
        } else {
          toast.error('Failed to bookmark question');
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast.error('Failed to update bookmark');
    }
  };

  /* ── JSON-LD structured data ───────────────────────────────── */
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      // 1. Organization — brand entity (persistent across all pages)
      {
        '@type': 'Organization',
        '@id': 'https://resident.quest/#organization',
        name: 'ResidentQuest',
        url: 'https://resident.quest',
        logo: {
          '@type': 'ImageObject',
          url: 'https://resident.quest/logo.png',
        },
        sameAs: [
          // Add your social links here
          // 'https://twitter.com/residentquest',
          // 'https://www.linkedin.com/company/residentquest',
        ],
        description: 'USMLE practice question platform with thousands of board-style MCQs.',
      },

      // 2. WebSite — enables sitelinks searchbox
      {
        '@type': 'WebSite',
        '@id': 'https://resident.quest/#website',
        name: 'ResidentQuest',
        url: 'https://resident.quest',
        publisher: { '@id': 'https://resident.quest/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://resident.quest/practice?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },

      // 3. QAPage — the core rich result trigger (one per question page)
      {
        '@type': 'QAPage',
        '@id': `https://resident.quest/question/${slug}`,
        url: `https://resident.quest/question/${slug}`,
        name: question.questionText,
        isPartOf: { '@id': 'https://resident.quest/#website' },
        datePublished: question.createdAt,
        dateModified: question.updatedAt || question.createdAt,
        mainEntity: {
          '@type': 'Question',
          name: question.questionText,
          text: question.questionText,
          answerCount: 1,
          dateCreated: question.createdAt,
          author: { '@id': 'https://resident.quest/#organization' },
          acceptedAnswer: {
            '@type': 'Answer',
            text: `The correct answer is ${String.fromCharCode(65 + correctIdx)}) ${correctText}${question.explanation ? '. ' + question.explanation : ''}`,
            dateCreated: question.createdAt,
            url: `https://resident.quest/question/${slug}`,
            author: { '@id': 'https://resident.quest/#organization' },
          },
        },
      },

      // 4. LearningResource — positions as educational assessment, not medical advice
      {
        '@type': 'LearningResource',
        name: question.questionText,
        url: `https://resident.quest/question/${slug}`,
        educationalLevel: 'Medical School',
        learningResourceType: 'Practice Question',
        teaches: question.topic || question.subject,
        assesses: question.topic || question.subject,
        educationalAlignment: {
          '@type': 'AlignmentObject',
          alignmentType: 'assesses',
          targetName: `USMLE ${question.subject}`,
          targetDescription: `Board examination assessment in ${question.subject}`,
        },
        isPartOf: quiz
          ? {
              '@type': 'Quiz',
              name: quiz.title,
              url: `https://resident.quest/quiz/${quiz.slug}`,
              about: question.subject,
            }
          : undefined,
        provider: { '@id': 'https://resident.quest/#organization' },
        inLanguage: 'en',
        ...(question.difficulty && { proficiencyLevel: question.difficulty }),
      },

      // 5. BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://resident.quest/' },
          { '@type': 'ListItem', position: 2, name: question.subject, item: `https://resident.quest/practice/${question.subject.toLowerCase().replace(/\s+/g, '-')}` },
          ...(question.topic
            ? [{ '@type': 'ListItem', position: 3, name: question.topic, item: `https://resident.quest/practice/${question.subject.toLowerCase().replace(/\s+/g, '-')}/${question.topic.toLowerCase().replace(/\s+/g, '-')}` }]
            : []),
          ...(quiz
            ? [{ '@type': 'ListItem', position: question.topic ? 4 : 3, name: quiz.title, item: `https://resident.quest/quiz/${quiz.slug}` }]
            : []),
        ],
      },
    ],
  });

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <GlobalHeader currentPage="question" onSearchSelect={handleSearchResultSelect} />
      
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20">

        {/* ═══════ Breadcrumbs ═══════ */}
        <nav aria-label="Breadcrumb" className="mb-6 qp-fade-up">
          <ol
            className="flex items-center flex-wrap gap-1.5 text-sm"
            itemScope
            itemType="https://schema.org/BreadcrumbList"
          >
            {/* Home */}
            <li className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link
                to="/"
                className="text-slate-400 hover:text-amber-600 transition-colors"
                itemProp="item"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <meta itemProp="name" content="Home" />
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <ChevronRight />

            {/* Subject */}
            <li className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <button
                onClick={() => {
                  // Trigger search modal with subject pre-filled
                  console.log('Breadcrumb clicked, subject:', question.subject);
                  const event = new CustomEvent('openSearchModal', { 
                    detail: { query: question.subject } 
                  });
                  console.log('Dispatching event:', event);
                  window.dispatchEvent(event);
                }}
                className="text-slate-500 hover:text-amber-600 transition-colors font-medium"
                itemProp="item"
              >
                <span itemProp="name">{question.subject}</span>
              </button>
              <meta itemProp="position" content="2" />
            </li>

            {/* Quiz (optional) */}
            {quiz && (
              <>
                <ChevronRight />
                <li className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <Link
                    to={`/quiz/${quiz.slug}`}
                    className="text-slate-500 hover:text-amber-600 transition-colors font-medium"
                    itemProp="item"
                  >
                    <span itemProp="name">{quiz.title}</span>
                  </Link>
                  <meta itemProp="position" content="3" />
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* ═══════ Question Card ═══════ */}
        <article
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50
                     p-6 sm:p-8 qp-fade-up mb-6"
          style={{ animationDelay: '.06s' }}
        >
          {/* ── Badge row ───────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {question.difficulty && (
                <span
                  className={cn(
                    'px-3 py-1 text-xs sm:text-sm font-semibold rounded-full',
                    question.difficulty === 'Easy'
                      ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800'
                      : question.difficulty === 'Medium'
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800'
                        : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800',
                  )}
                >
                  {question.difficulty}
                </span>
              )}
              {question.subject && (
                <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700
                                 text-xs sm:text-sm font-medium rounded-full border border-blue-200/50">
                  {question.subject}
                </span>
              )}
              {question.topic && (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700
                                 text-xs sm:text-sm font-medium rounded-full border border-purple-200/50">
                  {question.topic}
                </span>
              )}
            </div>

            {/* ── Bookmark button ─────────────────────────────────────── */}
            <button
              onClick={toggleBookmark}
              className={cn(
                'p-2 rounded-xl transition-all duration-300 shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                isBookmarked
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40'
                  : 'bg-white/60 text-slate-500 hover:bg-amber-50 hover:text-amber-600 border border-white/50 hover:border-amber-200',
              )}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark for later'}
            >
              <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isBookmarked ? '0' : '2'} 
                      d={isBookmarked 
                        ? 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3.5L17 21V5c0-1.1-.9-2-2-2z'
                        : 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3.5L17 21V5c0-1.1-.9-2-2-2z'} />
              </svg>
            </button>
          </div>

          {/* ── Question text (h1 for SEO) ──────────────────────── */}
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed break-words mb-6">
            {question.questionText}
          </h1>

          {/* ── Optional image ──────────────────────────────────── */}
          {question.imageUrl && (
            <figure className="mb-6 qp-fade-up" style={{ animationDelay: '.1s' }}>
              <img
                src={question.imageUrl}
                alt={`Clinical image for: ${question.questionText.slice(0, 60)}`}
                className="w-full max-w-lg mx-auto rounded-2xl border border-slate-200/50 shadow-sm"
                loading="lazy"
              />
            </figure>
          )}

          {/* ── Options ─────────────────────────────────────────── */}
          <div className="space-y-3 mb-6" role="radiogroup" aria-label="Answer options">
            {question.options.map((opt, i) => (
              <QuestionOption
                key={i}
                index={i}
                text={getOptionText(opt)}
                isSelected={selectedAnswer === i}
                isRevealed={revealed}
                isCorrectAnswer={revealed && i === correctIdx}
                isWrongSelection={revealed && selectedAnswer === i && i !== correctIdx}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* ── Check Answer CTA ────────────────────────────────── */}
          {!revealed && (
            <button
              onClick={handleCheck}
              disabled={selectedAnswer === null}
              className={cn(
                'w-full py-3.5 rounded-2xl font-semibold text-base transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
                selectedAnswer !== null
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/25 hover:shadow-xl hover:shadow-amber-600/40 hover:scale-[1.02] active:scale-[.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed',
              )}
            >
              {selectedAnswer !== null ? '🔍 Check Answer' : 'Select an option first'}
            </button>
          )}

          {/* ═══ Answer & Explanation (SEO <details>) ═══
              Content is ALWAYS in the DOM → crawlable by Google.
              Collapsed visually until user checks their answer. */}
          <details
            className="qp-details mt-6"
            open={revealed || undefined}
          >
            <summary
              className={cn(
                'flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                revealed
                  ? isCorrect
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200'
                  : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200',
              )}
            >
              {/* Status icon */}
              <div
                className={cn(
                  'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                  revealed
                    ? isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                    : 'bg-amber-100',
                )}
              >
                {revealed ? (
                  isCorrect ? (
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )
                ) : (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </div>

              <span
                className={cn(
                  'font-semibold text-sm sm:text-base flex-1',
                  revealed
                    ? isCorrect ? 'text-emerald-800' : 'text-red-800'
                    : 'text-slate-700',
                )}
              >
                {revealed
                  ? isCorrect ? 'Correct! Well done! 🎉' : 'Not quite right'
                  : 'View Answer & Explanation'}
              </span>

              {/* Chevron */}
              <svg
                className={cn(
                  'qp-chevron w-5 h-5 shrink-0 transition-transform duration-300',
                  revealed
                    ? isCorrect ? 'text-emerald-400' : 'text-red-400'
                    : 'text-slate-400',
                )}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            {/* Expandable content */}
            <div className="mt-4 space-y-4 qp-scale-in">
              {/* Correct answer callout */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80
                              rounded-xl border border-emerald-200/60">
                <span className="shrink-0 w-9 h-9 bg-emerald-500 text-white rounded-full
                                 flex items-center justify-center text-sm font-bold shadow-sm shadow-emerald-500/30">
                  {String.fromCharCode(65 + correctIdx)}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">
                    Correct Answer
                  </p>
                  <p className="text-emerald-900 font-semibold break-words">{correctText}</p>
                </div>
              </div>

              {/* Declarative answer block (LLM-optimized) */}
              <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Answer
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  The correct answer is <strong>{String.fromCharCode(65 + correctIdx)}) {correctText}</strong>
                  {question.explanation && `. ${question.explanation}`}
                </p>
              </div>

              {/* Show WHY each wrong answer is wrong */}
              {question.distractorExplanations && (
                <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Why the other choices are wrong
                  </h2>
                  {question.options.map((opt, idx) => {
                    const expl = question.distractorExplanations[String(idx)];
                    if (!expl || idx === correctIdx) return null;
                    return (
                      <div key={idx} className="mb-3 last:mb-0">
                        <strong className="text-red-700">{String.fromCharCode(65 + idx)}) {opt.text}</strong>
                        <p className="text-slate-600 text-sm mt-1">{expl}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Key Concept */}
              {question.keyConcept && (
                <div className="p-5 bg-gradient-to-r from-emerald-50/80 to-green-50/80 rounded-xl border border-emerald-200/60">
                  <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    🔑 Key Concept
                  </h2>
                  <p className="text-slate-700 leading-relaxed text-sm">{question.keyConcept}</p>
                </div>
              )}

              {/* Learning Objective */}
              {question.learningObjective && (
                <div className="p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/60">
                  <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    🎯 Learning Objective
                  </h2>
                  <p className="text-slate-700 leading-relaxed text-sm">{question.learningObjective}</p>
                </div>
              )}

              {/* "Why This Question Matters" block */}
              <div className="p-5 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/60">
                <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Why This Question Matters
                </h2>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {question.topic
                    ? `This USMLE question tests your understanding of ${question.topic} within ${question.subject}. ${question.topic} is a high-yield topic frequently tested on USMLE Step 1 and Step 2 CK.`
                    : `This USMLE practice question covers ${question.subject}, an essential subject for board exam preparation.`}
                </p>
              </div>
            </div>
          </details>
        </article>

        {/* ═══════ Prev / Next Navigation ═══════ */}
        <nav
          className="flex justify-between items-center mb-8 qp-fade-up"
          style={{ animationDelay: '.12s' }}
          aria-label="Question navigation"
        >
          {navigation.prev ? (
            <Link
              to={`/question/${navigation.prev.slug}`}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-white/60 backdrop-blur-sm border border-white/50
                         hover:bg-white/80 hover:shadow-md transition-all duration-300
                         text-slate-500 hover:text-amber-700
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Previous Question</span>
            </Link>
          ) : <span />}

          {navigation.next ? (
            <Link
              to={`/question/${navigation.next.slug}`}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-white/60 backdrop-blur-sm border border-white/50
                         hover:bg-white/80 hover:shadow-md transition-all duration-300
                         text-slate-500 hover:text-amber-700
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span className="text-sm font-medium">Next Question</span>
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : <span />}
        </nav>

        {/* ═══════ Social-proof stats bar ═══════ */}
        {question.stats && (
          <div
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-5 mb-8 qp-fade-up"
            style={{ animationDelay: '.18s' }}
          >
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              {/* Attempted */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100
                                flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Attempted</p>
                  <p className="text-sm font-bold text-slate-800 tabular-nums">
                    {question.stats.attempts?.toLocaleString?.() ?? '—'}
                  </p>
                </div>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200/80" aria-hidden="true" />

              {/* Correct rate */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-green-100
                                flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Got Correct</p>
                  <p className="text-sm font-bold text-emerald-700 tabular-nums">
                    {question.stats.correctRate ?? '—'}%
                  </p>
                </div>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200/80" aria-hidden="true" />

              {/* Avg time */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-100 to-orange-100
                                flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Avg Time</p>
                  <p className="text-sm font-bold text-amber-700 tabular-nums">
                    {question.stats.avgTime ?? '—'}s
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ CTA — Funnel to full quiz / sign-up ═══════ */}
        {quiz && (
          <section
            className="relative overflow-hidden rounded-3xl mb-8 qp-fade-up qp-pulse-soft"
            style={{ animationDelay: '.22s' }}
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600" />
            {/* Dot pattern overlay */}
            <div className="absolute inset-0 opacity-[.07]" aria-hidden="true">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="cta-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                    <circle cx="16" cy="16" r="1.5" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-dots)" />
              </svg>
            </div>

            <div className="relative px-6 sm:px-10 py-10 sm:py-12 text-center">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl
                              flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Practice More {question.subject} Questions
              </h2>
              <p className="text-amber-100 mb-8 max-w-lg mx-auto leading-relaxed">
                This question is from{' '}
                <strong className="text-white">{quiz.title}</strong>.
                Take the full quiz to benchmark your knowledge and track progress.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to={`/quiz/${quiz.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5
                             bg-white text-amber-700 font-bold rounded-2xl shadow-lg
                             hover:shadow-xl hover:scale-105 active:scale-[.98]
                             transition-all duration-300
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-500"
                >
                  Take Full Quiz
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                {!user && (
                  <button
                    onClick={() => {
                      // Trigger signup modal by dispatching custom event that GlobalHeader listens for
                      window.dispatchEvent(new CustomEvent('openSignupModal'));
                    }}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5
                               bg-white/15 backdrop-blur-sm text-white font-semibold rounded-2xl
                               border-2 border-white/30 hover:bg-white/25
                               hover:scale-105 active:scale-[.98] transition-all duration-300
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-500"
                  >
                    Sign Up Free
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════ Related Questions — Internal linking for SEO ═══════ */}
        {related?.length > 0 && (
          <section className="qp-fade-up" style={{ animationDelay: '.26s' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-100 to-orange-100
                              rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Related USMLE Questions</h2>
            </div>

            <div className="grid gap-3">
              {related.map((q, i) => (
                <Link
                  key={q.slug}
                  to={`/question/${q.slug}`}
                  className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50
                             p-4 hover:bg-white/90 hover:shadow-md hover:border-amber-200/50
                             transition-all duration-300 qp-fade-up"
                  style={{ animationDelay: `${0.3 + i * 0.04}s` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <span className="shrink-0 w-7 h-7 bg-gradient-to-br from-slate-100 to-slate-50
                                     text-slate-500 group-hover:from-amber-100 group-hover:to-orange-50
                                     group-hover:text-amber-600 rounded-lg flex items-center justify-center
                                     text-xs font-bold transition-all duration-300">
                      {i + 1}
                    </span>

                    {/* Question text */}
                    <p className="text-sm text-slate-700 group-hover:text-slate-900
                                  transition-colors leading-relaxed flex-1 min-w-0">
                      {q.questionText.length > 120
                        ? q.questionText.slice(0, 120) + '…'
                        : q.questionText}
                    </p>

                    {/* Difficulty pill */}
                    {q.difficulty && (
                      <span
                        className={cn(
                          'shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                          q.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700'
                            : q.difficulty === 'Medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700',
                        )}
                      >
                        {q.difficulty}
                      </span>
                    )}

                    {/* Arrow */}
                    <svg
                      className="w-4 h-4 text-slate-300 group-hover:text-amber-500
                                 shrink-0 mt-0.5 transition-all duration-300
                                 group-hover:translate-x-1"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════ Bottom browse link (extra internal link) ═══════ */}
        <div className="mt-12 text-center qp-fade-up" style={{ animationDelay: '.32s' }}>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-600
                       transition-colors font-medium
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg px-2 py-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Browse all USMLE practice questions
          </Link>
        </div>
      </main>
    </div>
  );
}