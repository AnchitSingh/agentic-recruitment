import React from 'react';
import { cn } from '../../../utils/designTokens';

export const EmailSignUpForm = ({ isMobile = false }) => {
    const handleEmailClick = () => {
        window.dispatchEvent(new CustomEvent('openSignupModal'));
    };

    return (
        <button
            onClick={handleEmailClick}
            className={cn(
                'group relative inline-flex items-center justify-center w-full',
                'px-6 py-3.5 rounded-xl font-semibold text-base',
                'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
                'text-white shadow-lg shadow-amber-500/25',
                'hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5',
                'transition-all duration-300 cursor-pointer active:translate-y-0 active:shadow-lg overflow-hidden'
            )}
        >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <svg
                className="w-5 h-5 mr-3 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
            </svg>
            <span className="relative z-10">Sign up with Email</span>
        </button>
    );
};
