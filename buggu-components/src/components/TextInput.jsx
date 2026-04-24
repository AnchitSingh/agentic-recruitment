import React, { useState } from 'react';

/**
 * Text Input Component
 * @param {Object} props
 * @param {Function} props.onTextSubmit - Callback when text is submitted
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.rows - Number of rows
 * @param {string} props.value - Controlled value
 * @param {string} props.className - Additional CSS classes
 */
export function TextInput({ 
  onTextSubmit, 
  loading = false, 
  disabled = false,
  placeholder = "Paste the job description text here...",
  rows = 6,
  value: controlledValue,
  className = ""
}) {
  const [internalValue, setInternalValue] = useState('');
  
  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledValue !== undefined ? () => {} : setInternalValue;

  const handleSubmit = () => {
    if (!value.trim() || loading || disabled) return;
    onTextSubmit(value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-700">Or paste job description text:</h3>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || loading}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all outline-none resize-none font-mono text-sm disabled:opacity-50"
      />
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-slate-500">
          {value.length} characters • Ctrl+Enter to submit
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || loading || disabled}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {loading ? 'Processing...' : 'Process Text'}
        </button>
      </div>
    </div>
  );
}

export default TextInput;
