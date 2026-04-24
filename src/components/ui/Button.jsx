import React from 'react';
import { components, cn } from '../../utils/designTokens';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  className = '',
  icon,
  loading = false,
  ...props 
}) => {
  const disabledClasses = disabled ? components.button.disabled : "";
  const loadingClasses = loading ? components.button.loading : "";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        components.button.base,
        components.button.variants[variant],
        components.button.sizes[size],
        disabledClasses,
        loadingClasses,
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
