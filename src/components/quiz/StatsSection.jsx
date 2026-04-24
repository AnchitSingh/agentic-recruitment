import React from 'react';
import { cn } from '../../utils/designTokens';
import { safePercent } from '../../utils/quizHelpers';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
);

// Skeleton loading card
const SkeletonCard = () => (
  <div className="group bg-white/85 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="h-3 bg-slate-200 rounded-full w-16 animate-pulse" />
        <div className="h-7 bg-slate-200 rounded-full w-12 mt-2 animate-pulse" />
        <div className="h-2 bg-slate-100 rounded-full w-20 mt-2 animate-pulse" />
      </div>
      <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  </div>
);

const StatCard = ({ label, value, helper, icon, color = 'amber' }) => {
  const palette = {
    amber: 'from-amber-500/10 to-orange-500/10 text-amber-600 ring-amber-500/20',
    blue: 'from-blue-500/10 to-indigo-500/10 text-blue-600 ring-blue-500/20',
    green: 'from-emerald-500/10 to-green-500/10 text-emerald-600 ring-emerald-500/20',
    rose: 'from-rose-500/10 to-pink-500/10 text-rose-600 ring-rose-500/20',
  };

  return (
    <div
      className="group bg-white/85 backdrop-blur-sm rounded-2xl border border-white/70
                 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{helper}</p>
        </div>
        <div
          className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1 shrink-0',
            'group-hover:scale-110 transition-transform duration-300',
            palette[color],
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const Icons = {
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  flame: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  ),
  bookmark: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v15l7-3 7 3V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
    </svg>
  ),
};

const StatsSection = ({ stats, bookmarks }) => {
  // Check if data is still loading (stats is null/undefined and bookmarks is empty)
  const isLoading = !stats || stats === null;
  
  // If loading, show skeleton cards
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <StatCard
        label="Total Quizzes"
        value={stats?.totalQuizzes ?? 0}
        helper="Completed all-time"
        color="amber"
        icon={Icons.document}
      />
      <StatCard
        label="Accuracy"
        value={`${safePercent(stats?.overallAccuracy)}%`}
        helper="Across all questions"
        color="green"
        icon={Icons.check}
      />
      <StatCard
        label="Active Streak"
        value={stats?.activeStreak ?? 0}
        helper="Days in a row"
        color="rose"
        icon={Icons.flame}
      />
      <StatCard
        label="Bookmarked"
        value={bookmarks?.length ?? 0}
        helper="Questions saved"
        color="blue"
        icon={Icons.bookmark}
      />
    </div>
  );
};

export default StatsSection;
