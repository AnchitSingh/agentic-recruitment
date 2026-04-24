import React from 'react';
import { cn } from '../../../utils/designTokens';

export const FloatingCard = ({ children, className = '', animationClass = '' }) => (
    <div className={cn('absolute', className)}>
        <div className="rounded-2xl p-3.5 shadow-xl bg-white/95 backdrop-blur-md border border-white/60 shadow-black/[0.04]">
            {children}
        </div>
    </div>
);
