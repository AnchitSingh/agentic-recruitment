import React from 'react';
import { getRecentlyViewedData } from '../../services/dataService';

const difficultyStyle = {
  Easy:   'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard:   'bg-red-50 text-red-700',
};

const examStyle = {
  'Step 1':    'text-amber-600',
  'Step 2 CK': 'text-blue-600',
  'Step 3':    'text-emerald-600',
};

export const RecentlyViewed = ({ onStartQuiz }) => {
  const recentlyViewedData = getRecentlyViewedData();
  if (!recentlyViewedData.length) return null;

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              Recently Viewed
            </h2>
            <p className="mt-1 text-slate-500 text-sm">Jump back into a recent quiz</p>
          </div>
          <button className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1 transition-colors">
            View History
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Scrollable row */}
        <div className="flex gap-3.5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {recentlyViewedData.map((item) => (
            <button
              key={item.id}
              onClick={() => onStartQuiz?.(item)}
              className="snap-start shrink-0 w-[220px] bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left group"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-2 line-clamp-2">
                {item.title}
              </h3>

              {/* Exam + Questions */}
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className={`font-semibold ${examStyle[item.exam] || 'text-slate-600'}`}>
                  {item.exam}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{item.questions}Q</span>
              </div>

              {/* Difficulty + Rating */}
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${difficultyStyle[item.difficulty] || ''}`}>
                  {item.difficulty}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {item.rating}
                </span>
              </div>

              {/* Last viewed */}
              <div className="mt-2.5 text-[11px] text-slate-400">{item.lastViewed}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};