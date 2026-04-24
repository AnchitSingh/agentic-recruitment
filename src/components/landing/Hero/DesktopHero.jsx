import React from 'react';
import { cn } from '../../../utils/designTokens';
import { FloatingCard } from './FloatingCard';
import { SocialProof } from '../SocialProof/SocialProof';
import { TrustIndicators } from '../SocialProof/TrustIndicators';

export const DesktopHero = ({ entrance }) => {
    return (
        <section className="hidden lg:block">
            <div className="grid grid-cols-2 gap-16 xl:gap-20 items-center min-h-[calc(100vh-100px)]">
                <div className="py-16">
                    <div style={entrance(1)}>
                        <h1 className="text-5xl xl:text-6xl font-display font-bold tracking-tight leading-[1.08] mb-6">
                            The most
                            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                                {' '}
                                comprehensive{' '}
                            </span>
                            USMLE question bank
                        </h1>
                    </div>
                    <div style={entrance(2)}>
                        <p className="text-xl leading-relaxed mb-8 text-slate-500 max-w-lg">
                            10,000+ expertly crafted questions across Step 1, 2 &amp; 3
                            with{' '}
                            <span className="font-medium text-slate-700">
                                adaptive quizzes that learn your weak spots
                            </span>{' '}
                            and help you score higher, faster.
                        </p>
                    </div>
                    <div style={entrance(3)} className="mb-8">
                        <SocialProof />
                    </div>
                                        <div style={entrance(5)}>
                        <TrustIndicators />
                    </div>
                </div>
                <div className="relative flex justify-center items-center py-16">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[420px] h-[420px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/30 blur-3xl" />
                    </div>
                    <div
                        className="relative z-10 animate-float"
                        style={entrance(2, 200)}
                    >
                        <img
                            src="/assets/i3.avif"
                            alt="ResidentQuest study companion"
                            className="w-80 xl:w-96 drop-shadow-2xl"
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                    <FloatingCard className="top-12 right-4 xl:right-8 animate-float-reverse">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <span className="text-sm leading-none">🎯</span>
                            </div>
                            <div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                    Target Score
                                </div>
                                <div className="text-sm font-semibold text-slate-800">
                                    265+
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                    <FloatingCard className="top-32 -left-4 xl:left-0 animate-float-slow">
                        <div className="text-xs mb-2.5 font-medium text-slate-600">
                            High-Yield Subjects
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                {
                                    label: 'Anatomy',
                                    cls: 'bg-blue-50 text-blue-700',
                                },
                                {
                                    label: 'Pharm',
                                    cls: 'bg-green-50 text-green-700',
                                },
                                {
                                    label: 'Micro',
                                    cls: 'bg-purple-50 text-purple-700',
                                },
                                {
                                    label: 'Patho',
                                    cls: 'bg-amber-50 text-amber-700',
                                },
                            ].map(({ label, cls }) => (
                                <span
                                    key={label}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg text-center ${cls}`}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </FloatingCard>
                    <FloatingCard className="bottom-24 -left-6 xl:left-2 animate-float-medium">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg
                                    className="w-4 h-4 text-amber-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-700">
                                    Weak Spot Found
                                </div>
                                <div className="text-xs text-amber-600 font-medium">
                                    Renal Phys → 12 Qs added
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                    <FloatingCard className="bottom-8 right-6 xl:right-12 animate-float-reverse-slow">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-sm leading-none">📚</span>
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">
                                    10,000+
                                </div>
                                <div className="text-xs text-slate-500">
                                    Questions &amp; Growing
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                </div>
            </div>
        </section>
    );
};
