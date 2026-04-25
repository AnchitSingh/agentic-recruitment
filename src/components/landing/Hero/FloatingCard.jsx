import React from 'react';
import { cn } from '../../../utils/designTokens';

/**
 * FloatingCard - A reusable floating card component with glassmorphism styling.
 * Used to display informational content with a blurred background effect.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to be rendered inside the card
 * @param {string} [props.className=''] - Additional CSS classes for positioning and animation
 * @param {string} [props.animationClass=''] - Additional animation classes (currently unused but available for future use)
 * @returns {JSX.Element} Rendered floating card
 */
export const FloatingCard = ({ children, className = '', animationClass = '' }) => (
    <div className={cn('absolute', className)}>
        <div className="rounded-2xl p-3.5 shadow-xl bg-white/95 backdrop-blur-md border border-white/60 shadow-black/[0.04]">
            {children}
        </div>
    </div>
);
