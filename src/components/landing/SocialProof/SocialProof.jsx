import React from 'react';
import { cn } from '../../../utils/designTokens';

export const SocialProof = ({ className = '' }) => (
    <div className={cn('flex items-center gap-4', className)}>
        <div className="flex -space-x-2.5">
            {[
                { bg: 'bg-blue-500', letter: 'A' },
                { bg: 'bg-emerald-500', letter: 'S' },
                { bg: 'bg-purple-500', letter: 'M' },
                { bg: 'bg-amber-500', letter: 'K' },
            ].map(({ bg, letter }, i) => (
                <div
                    key={i}
                    className={cn(
                        'w-8 h-8 rounded-full border-[2.5px] border-white flex items-center justify-center text-white text-xs font-medium shadow-sm',
                        bg
                    )}
                >
                    {letter}
                </div>
            ))}
        </div>
        <div>
            <div className="flex items-center gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => (
                    <svg
                        key={i}
                        className="w-3.5 h-3.5 text-amber-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
            <p className="text-sm text-slate-500">
                Loved by{' '}
                <span className="font-medium text-slate-700">5,000+</span> students
            </p>
        </div>
    </div>
);
