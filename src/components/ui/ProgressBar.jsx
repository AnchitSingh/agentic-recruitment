import React from 'react';
import { components, colors, typography, cn } from '../../utils/designTokens';

const ProgressBar = ({ 
  progress, 
  showPercentage = true, 
  label, 
  className = '',
  color = 'amber' 
}) => {
  return (
    <div className={cn('mb-6 sm:mb-8', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className={cn(typography.size.xs, 'sm:text-sm', typography.weight.medium, colors.slate.text[600])}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={cn(typography.size.xs, 'sm:text-sm', typography.weight.medium, colors.primary.text[600])}>
              {Math.round(progress)}% Complete
            </span>
          )}
        </div>
      )}
      <div className={components.progressBar.container}>
        <div 
          className={cn(components.progressBar.bar, components.progressBar.colors[color])}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
