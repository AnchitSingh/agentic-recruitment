import React from 'react';
import { cn } from '../../../utils/designTokens';

export const TrustIndicators = ({ className = '' }) => {
    const items = [
        { label: '10,000+ Questions', color: 'bg-green-100 text-green-600' },
        { label: 'Step 1, 2 & 3', color: 'bg-blue-100 text-blue-600' },
        { label: 'AI-Powered Adaptive', color: 'bg-purple-100 text-purple-600' },
        { label: 'Free to Start', color: 'bg-amber-100 text-amber-600' },
    ];
    
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500',
                className
            )}
        >
            {items.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                    <div
                        className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center',
                            color.split(' ')[0]
                        )}
                    >
                        <svg
                            className={cn('w-3 h-3', color.split(' ')[1])}
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
                    <span>{label}</span>
                </div>
            ))}
        </div>
    );
};
