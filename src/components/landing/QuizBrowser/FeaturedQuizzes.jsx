// src/components/landing/QuizBrowser/FeaturedQuizzes.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ORGAN_VISUALS, DEFAULT_VISUAL } from '../../../data/visualConfig';

export const FeaturedQuizzes = ({ featured, onStartQuiz, onCategorySelect }) => {
  const { popular, highYield, stepPicks } = featured;
  const [activeTab, setActiveTab] = useState('popular');

  // Don't render if no featured content
  if (popular.length === 0 && highYield.length === 0) return null;

  const tabs = [
    { id: 'popular', label: '🔥 Popular', data: popular },
    { id: 'highYield', label: '🎯 High Yield', data: highYield },
    ...(stepPicks.length > 1
      ? [{ id: 'byStep', label: '📋 By Step', data: stepPicks }]
      : []),
  ].filter(tab => tab.data.length > 0);

  const activeData = tabs.find(t => t.id === activeTab)?.data || popular;

  return (
    <div className="mb-12">
      {/* Section Label */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="text-base">⚡</span>
          Featured Quizzes
        </div>
        <div className="flex-1 h-px bg-slate-200/60" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${
              activeTab === tab.id ? 'text-slate-300' : 'text-slate-400'
            }`}>
              {tab.data.length}
            </span>
          </button>
        ))}
      </div>

      {/* Scrollable Card Row */}
      <FeaturedCardRow
        quizzes={activeData}
        onStartQuiz={onStartQuiz}
        onCategorySelect={onCategorySelect}
      />
    </div>
  );
};

// ─── Horizontally Scrollable Card Row ─────────────────────

function FeaturedCardRow({ quizzes, onStartQuiz, onCategorySelect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [quizzes]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 280 + 16; // card width + gap
    el.scrollBy({ left: direction * cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroll">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover/scroll:opacity-100"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 group-hover/scroll:opacity-100"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Fade edges */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50/80 to-transparent z-[5] pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50/80 to-transparent z-[5] pointer-events-none" />
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {quizzes.map((quiz, i) => (
          <FeaturedCard
            key={`${quiz.slug}-${i}`}
            quiz={quiz}
            rank={i + 1}
            onStart={() => onStartQuiz(quiz)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual Featured Card ─────────────────────────────

function FeaturedCard({ quiz, rank, onStart }) {
  const navigate = useNavigate();
  const visual = ORGAN_VISUALS[quiz.system] || DEFAULT_VISUAL;
  const stepLabel = quiz.step?.replace('step', 'Step ') || '';

  return (
    <div
      onClick={() => toast.info('Quiz feature coming soon')}
      className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${visual.gradient}`} />

      <div className="p-5">
        {/* Rank + Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {rank <= 3 && (
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                {rank}
              </span>
            )}
            <span className="text-lg">{visual.emoji}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {quiz.highYield && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                HY
              </span>
            )}
            {stepLabel && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {stepLabel}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors">
          {quiz.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {quiz.questions} Qs
          </span>
          <span>·</span>
          <span>{quiz.duration}</span>
          <span>·</span>
          <DifficultyDot difficulty={quiz.difficulty} />
        </div>

        {/* Tags preview */}
        {quiz.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {quiz.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                {tag}
              </span>
            ))}
            {quiz.tags.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-400">
                +{quiz.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-all duration-200"
        >
          Start Quiz →
        </button>
      </div>
    </div>
  );
}

function DifficultyDot({ difficulty }) {
  const colors = {
    Easy: 'bg-emerald-400',
    Medium: 'bg-amber-400',
    Hard: 'bg-red-400',
  };

  return (
    <span className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[difficulty] || colors.Medium}`} />
      {difficulty}
    </span>
  );
}