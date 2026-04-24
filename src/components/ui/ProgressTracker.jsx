import React from 'react';
import { components, colors, typography, shadows, borderRadius, cn } from '../../utils/designTokens';

const ProgressBar = ({ 
  progress, 
  showPercentage = true, 
  label, 
  className = '', 
  color = 'amber',
  animated = true,
  size = 'md' 
}) => {
  const colorClasses = {
    amber: {
      bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500',
      glow: 'shadow-amber-500/50',
      text: 'text-amber-500'
    },
    green: {
      bg: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500',
      glow: 'shadow-green-500/50',
      text: 'text-green-500'
    },
    blue: {
      bg: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500',
      glow: 'shadow-blue-500/50',
      text: 'text-blue-500'
    },
    purple: {
      bg: 'bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500',
      glow: 'shadow-purple-500/50',
      text: 'text-purple-500'
    }
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5'
  };

  const colorConfig = colorClasses[color];
  const height = sizeClasses[size];
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {/* Label and Percentage Row */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={cn(typography.size.sm, typography.weight.medium, 'text-zinc-300')}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={cn(typography.size.sm, typography.weight.semibold, colorConfig.text)}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div className={cn('w-full', height, 'bg-zinc-800', borderRadius.full, 'overflow-hidden relative')}>
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
        
        {/* Progress Fill */}
        <div
          className={cn(
            height,
            colorConfig.bg,
            borderRadius.full,
            'transition-all duration-500 ease-out relative',
            animated && cn(shadows.lg, colorConfig.glow)
          )}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Inner glow */}
          {animated && clampedProgress > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
