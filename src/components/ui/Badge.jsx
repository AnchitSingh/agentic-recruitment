import React from 'react';
import { components, cn } from '../../utils/designTokens';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className = '' 
}) => {
  return (
    <span className={cn(
      components.badge.base,
      components.badge.variants[variant],
      components.badge.sizes[size],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
