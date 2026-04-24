import React from 'react';
import { backgrounds, colors, borderRadius, cn } from '../../utils/designTokens';

const LoadingScreen = ({ message = "Loading..." }) => (
    <div className={backgrounds.pageMinHeight}>
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className={cn(
                    "w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-pulse-slow",
                    colors.primary.gradientBr,
                    borderRadius['2xl']
                )}>
                    <svg className={cn("w-8 h-8 animate-spin", colors.primary.text[600])} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
                <p className={colors.slate.text[600]}>{message}</p>
            </div>
        </div>
    </div>
);

export default LoadingScreen;
