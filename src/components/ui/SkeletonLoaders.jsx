import React from 'react';
import { cn } from '../../utils/designTokens';

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse rounded-xl bg-slate-200/60', className)} />
);

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 space-y-3">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-7 w-16" />
    <Skeleton className="h-3 w-28" />
  </div>
);

const SkeletonQuizRow = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
    <div className="flex justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex justify-between">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

const SkeletonCatalogCard = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-2.5">
    <div className="flex gap-1.5">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-10 rounded-full" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-3 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-full rounded-lg" />
  </div>
);

const QuizCatalogSkeleton = () => (
  <div className="bg-white/90 rounded-2xl border border-white/70 p-4 sm:p-5 space-y-4">
    <Skeleton className="h-5 w-40" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCatalogCard key={i} />
      ))}
    </div>
  </div>
);

const ContinueLearningSkeleton = () => (
  <div className="xl:col-span-2 bg-white/85 rounded-2xl border border-white/70 p-4 sm:p-5 space-y-3">
    <Skeleton className="h-5 w-40" />
    {Array.from({ length: 2 }).map((_, i) => (
      <SkeletonQuizRow key={i} />
    ))}
  </div>
);

const RecentActivitySkeleton = () => (
  <div className="bg-white/85 rounded-2xl border border-white/70 p-4 sm:p-5 space-y-3">
    <Skeleton className="h-5 w-32" />
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-14 w-full" />
    ))}
  </div>
);

const HeroSkeleton = () => (
  <div className="mb-7 rounded-3xl bg-white/80 border border-white/70 p-5 sm:p-7 space-y-3">
    <Skeleton className="h-3 w-32" />
    <Skeleton className="h-9 w-72" />
    <Skeleton className="h-4 w-96 max-w-full" />
  </div>
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export {
  Skeleton,
  SkeletonCard,
  SkeletonQuizRow,
  SkeletonCatalogCard,
  QuizCatalogSkeleton,
  ContinueLearningSkeleton,
  RecentActivitySkeleton,
  HeroSkeleton,
  StatsSkeleton,
};
