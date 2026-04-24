import React from 'react';

/**
 * File Upload Component
 * @param {Object} props
 * @param {Function} props.onFilesSelected - Callback when files are selected
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.accept - File types to accept
 * @param {boolean} props.multiple - Allow multiple files
 * @param {string} props.className - Additional CSS classes
 */
export function FileUpload({ 
  onFilesSelected, 
  loading = false, 
  disabled = false,
  accept = "image/*,application/pdf,text/plain,.txt",
  multiple = true,
  className = ""
}) {
  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  return (
    <div className={`relative ${className}`}>
      <input 
        type="file" 
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled || loading}
        id="file-input"
        className="hidden"
      />
      <label 
        htmlFor="file-input" 
        className={`
          flex flex-col items-center justify-center w-full h-64 
          border-2 border-dashed border-amber-300 rounded-2xl 
          cursor-pointer 
          bg-gradient-to-br from-amber-50/50 to-orange-50/50 
          hover:from-amber-50 hover:to-orange-50 
          transition-all duration-300 group
          ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {loading ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Processing files...</p>
          </div>
        ) : (
          <>
            <svg className="w-16 h-16 text-amber-500 mb-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-semibold text-slate-700 mb-1">Click to upload files</p>
            <p className="text-sm text-slate-500">
              Images (PNG, JPG), PDF (unlimited pages), or Text files
            </p>
          </>
        )}
      </label>
    </div>
  );
}

export default FileUpload;
