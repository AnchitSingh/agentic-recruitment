import React, { useState, useEffect } from 'react';
import { createPreviewURL, revokePreviewURL } from '../../utils/buggu/pdfProcessor';

/**
 * Content Preview Component
 * @param {Object} props
 * @param {Array} props.items - Array of processed items
 * @param {Function} props.onClear - Callback to clear all items
 * @param {string} props.className - Additional CSS classes
 */
export function ContentPreview({ items, onClear, className = "" }) {
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    // Create preview URLs for image items
    const urls = items
      .filter(item => item.type === 'image')
      .map(img => createPreviewURL(img.blob));
    setPreviewUrls(urls);

    // Cleanup function
    return () => {
      urls.forEach(url => revokePreviewURL(url));
    };
  }, [items]);

  const imageItems = items.filter(item => item.type === 'image');
  const textItems = items.filter(item => item.type === 'text');

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 animate-fade-in-up ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800">
            {items.length} item{items.length !== 1 ? 's' : ''} ready
          </p>
          <span className="text-sm text-slate-500">
            ({imageItems.length} image{imageItems.length !== 1 ? 's' : ''}, {textItems.length} text{textItems.length !== 1 ? 's' : ''})
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div key={index} className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200">
            {item.type === 'text' ? (
              <div className="aspect-[3/4] overflow-hidden bg-slate-100 p-4">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-slate-600 font-medium">Text Input</p>
                    <p className="text-xs text-slate-500 mt-1">{item.text?.length || 0} characters</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                <img 
                  src={previewUrls[imageItems.indexOf(item)]} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-2 bg-slate-50">
              <p className="text-xs text-slate-600 truncate">{item.name}</p>
            </div>
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContentPreview;
