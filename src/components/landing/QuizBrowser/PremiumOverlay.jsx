import React from 'react';
import { cn } from '../../../utils/designTokens';

export const PremiumOverlay = ({ activeCategoryData }) => {
    return (
        <div className="relative min-h-[400px]">
            {/* Blurred placeholder cards */}
            <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none pointer-events-none"
                aria-hidden="true"
            >
                {(activeCategoryData.quizzes.length > 0
                    ? activeCategoryData.quizzes
                    : [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
                ).map((q) => (
                    <div
                        key={q.id}
                        className="bg-white rounded-2xl p-5 border border-slate-100 opacity-30 blur-[3px]"
                    >
                        <div className="flex justify-between mb-3">
                            <div className="h-5 w-20 bg-slate-200 rounded-lg" />
                            <div className="h-5 w-14 bg-slate-100 rounded-md" />
                        </div>
                        <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
                        <div className="h-10 w-full bg-slate-100 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Premium overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-white/[0.97] backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-2xl shadow-slate-200/60 border border-amber-100/80 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-inner">
                        <span className="text-3xl">👑</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        Premium Content
                    </h3>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        Unlock{' '}
                        <span className="font-semibold text-slate-700">
                            {activeCategoryData.label}
                        </span>{' '}
                        quizzes and supercharge your prep
                    </p>
                    <ul className="text-left space-y-3 mb-8">
                        {[
                            'Full access to all quiz topics',
                            'Detailed explanations & references',
                            'Performance analytics & tracking',
                            'Priority access to quiz events',
                        ].map((f) => (
                            <li
                                key={f}
                                className="flex items-center gap-2.5 text-sm text-slate-600"
                            >
                                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <svg
                                        className="w-3 h-3 text-amber-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                {f}
                            </li>
                        ))}
                    </ul>
                    <button
                        className={cn(
                            'w-full px-6 py-3.5 rounded-xl font-semibold text-base',
                            'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
                            'text-white shadow-lg shadow-amber-500/25',
                            'hover:shadow-xl hover:-translate-y-0.5',
                            'active:translate-y-0 transition-all duration-300 cursor-pointer'
                        )}
                    >
                        Upgrade to Premium →
                    </button>
                    <p className="text-xs text-slate-400 mt-3">
                        Starting at $9.99/month
                    </p>
                </div>
            </div>
        </div>
    );
};
