import React from 'react';
import { components, borderRadius, shadows, cn } from '../../utils/designTokens';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  icon, 
  size = 'md' 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className={components.modal.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Spacer for centering */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal */}
        <div className={cn(components.modal.container, sizeClasses[size])}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            {icon && (
              <div className={components.modal.iconContainer}>
                {icon}
              </div>
            )}
            
            {title && (
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                {title}
              </h3>
            )}
            
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
