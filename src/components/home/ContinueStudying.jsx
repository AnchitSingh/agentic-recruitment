import React from 'react';
import { getContinueStudyingData } from '../../services/dataService';

const colorMap = {
  blue:    { bg: 'bg-blue-50',    progress: 'from-blue-500 to-blue-400',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  purple:  { bg: 'bg-purple-50',  progress: 'from-purple-500 to-purple-400',  text: 'text-purple-600',  badge: 'bg-purple-100 text-purple-700' },
  emerald: { bg: 'bg-emerald-50', progress: 'from-emerald-500 to-emerald-400', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   progress: 'from-amber-500 to-amber-400',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
};

const examBadge = {
  'Step 1':    'bg-amber-50 text-amber-700 border-amber-200/60',
  'Step 2 CK': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Step 3':    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
};

export const ContinueStudying = ({ onContinue }) => {
  const continueStudyingData = getContinueStudyingData();
  if (!continueStudyingData.length) return null;

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              Continue Studying
            </h2>
            <p className="mt-1 text-slate-500 text-sm">Pick up where you left off</p>
          </div>
          <button className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1 transition-colors">
            See All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Scrollable card row */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {continueStudyingData.map((item) => {
            const c = colorMap[item.color] || colorMap.blue;
            return (
              <div
                key={item.id}
                className="snap-start shrink-0 w-[280px] sm:w-[300px] lg:w-auto bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center text-xl shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">
                        {item.title}
                      </h3>
                      <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${examBadge[item.exam] || examBadge['Step 1']}`}>
                        {item.exam}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-500">Progress</span>
                      <span className={`text-xs font-bold ${c.text}`}>{item.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${c.progress} transition-all duration-500`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {item.questionsCompleted}/{item.totalQuestions}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.accuracy}% accuracy
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mb-4">{item.lastAccessed}</div>

                  {/* CTA */}
                  <button
                    onClick={() => onContinue?.(item)}
                    className={`mt-auto w-full text-center py-2.5 rounded-xl text-sm font-semibold ${c.text} ${c.bg} hover:opacity-80 transition-all duration-200 group-hover:shadow-sm`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};