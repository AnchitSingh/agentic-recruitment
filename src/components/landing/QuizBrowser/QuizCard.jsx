// src/components/landing/QuizBrowser/QuizCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ORGAN_VISUALS, DEFAULT_VISUAL } from '../../../data/visualConfig';

export const QuizCard = ({ quiz, highlighted, onStart }) => {
  const navigate = useNavigate();
  const visual = ORGAN_VISUALS[quiz.system] || DEFAULT_VISUAL;
  const stepLabel = quiz.step?.replace('step', 'Step ') || '';

  return (
    <div
      onClick={() => navigate(`/quiz/${quiz.slug}`)}
      className={`relative bg-white rounded-2xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group ${
        highlighted
          ? 'border-amber-400 ring-2 ring-amber-200 shadow-lg shadow-amber-100/50'
          : 'border-slate-200/60 shadow-sm'
      }`}
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${visual.gradient}`} />

      <div className="p-5">
        {/* Header: emoji + badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{visual.emoji}</span>
            {quiz.highYield && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                HIGH YIELD
              </span>
            )}
          </div>
          {stepLabel && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
              {stepLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-amber-700 transition-colors">
          {quiz.title}
        </h3>

        {/* Topic label */}
        {quiz.topic && quiz.topic !== quiz.system && (
          <p className="text-xs text-slate-400 mb-3 truncate">{quiz.topic}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {quiz.questions} Qs
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {quiz.duration}
          </span>
          <DifficultyBadge difficulty={quiz.difficulty} />
        </div>

        {/* Tags */}
        {quiz.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {quiz.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100"
              >
                {tag}
              </span>
            ))}
            {quiz.tags.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-400">
                +{quiz.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Related topics (if available) */}
        {quiz.relatedTopics?.length > 0 && (
          <p className="text-[10px] text-slate-400 mb-4 line-clamp-1">
            Related: {quiz.relatedTopics.slice(0, 2).join(', ')}
          </p>
        )}

        {/* CTA Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-amber-200/50 transition-all duration-300"
        >
          Start Quiz →
        </button>
      </div>

      {/* Highlighted pulse effect */}
      {highlighted && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

function DifficultyBadge({ difficulty }) {
  const config = {
    Easy: { dot: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    Medium: { dot: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' },
    Hard: { dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50' },
  };
  const c = config[difficulty] || config.Medium;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {difficulty}
    </span>
  );
}