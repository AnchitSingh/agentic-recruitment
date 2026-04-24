import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/designTokens';
import { DocumentExtractor } from '../buggu/DocumentExtractor';

// Icons
const CloseIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon = ({ className = 'w-6 h-6' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const SearchIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const SparklesIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ExclamationIcon = ({ className = 'w-6 h-6' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const BriefcaseIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const ClockIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CodeIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

/**
 * Enhanced JD Search Modal with improved UI/UX
 */
export const JDSearchModal = ({ isOpen, onClose, onJDExtracted }) => {
    const modalRef = useRef(null);
    const [jdData, setJdData] = useState(null);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const handleExtract = useCallback((extractedData) => {
        console.log('🎉 JD Extraction completed:', extractedData);
        setJdData(extractedData);
        setIsProcessing(false);
        setProgress(null);
        setError(null);
        
        if (onJDExtracted) {
            onJDExtracted(extractedData);
        }
    }, [onJDExtracted]);

    const handleError = useCallback((error) => {
        console.error('❌ JD Extraction error:', error);
        setError(error.message || 'Failed to extract JD data');
        setIsProcessing(false);
        setProgress(null);
    }, []);

    const handleProgress = useCallback((progressUpdate) => {
        console.log('📊 JD Extraction progress:', progressUpdate);
        setProgress(progressUpdate);
        
        if (progressUpdate.stage === 'started') {
            setIsProcessing(true);
        } else if (progressUpdate.stage === 'completed') {
            setIsProcessing(false);
        }
    }, []);

    const handleClose = useCallback(() => {
        if (isProcessing) {
            const confirmClose = window.confirm('Extraction is in progress. Are you sure you want to close?');
            if (!confirmClose) return;
        }
        setJdData(null);
        setProgress(null);
        setError(null);
        setIsProcessing(false);
        onClose();
    }, [onClose, isProcessing]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, handleClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-[100]',
                    'bg-slate-900/70 backdrop-blur-md',
                    'animate-fade-in'
                )}
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                className="fixed inset-0 z-[101] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="min-h-full flex items-start sm:items-center justify-center p-4 sm:p-6">
                    <div
                        ref={modalRef}
                        className={cn(
                            'relative w-full max-w-4xl',
                            'bg-white rounded-2xl shadow-2xl',
                            'animate-modal-slide-up',
                            'max-h-[90vh] flex flex-col'
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className={cn(
                                    'absolute top-4 right-4',
                                    'w-10 h-10 rounded-full',
                                    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300',
                                    'flex items-center justify-center',
                                    'transition-all duration-200',
                                    'hover:scale-105 active:scale-95',
                                    'group',
                                    isProcessing && 'opacity-50 cursor-not-allowed'
                                )}
                                aria-label="Close modal"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
                            </button>

                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    'flex-shrink-0 w-14 h-14 rounded-2xl',
                                    'bg-gradient-to-br from-amber-500 to-orange-600',
                                    'flex items-center justify-center',
                                    'shadow-lg shadow-amber-500/30',
                                    'animate-pulse-slow'
                                )}>
                                    <SparklesIcon className="w-7 h-7 text-white" />
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-1">
                                    <h2 id="modal-title" className="text-2xl font-bold text-slate-900 mb-1">
                                        AI Job Description Parser
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Upload or paste a job description to extract structured data with AI
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {/* Progress Display */}
                            {progress && (
                                <div className={cn(
                                    'p-4 rounded-xl border-2',
                                    'bg-gradient-to-r from-amber-50 to-orange-50',
                                    'border-amber-200',
                                    'animate-slide-down'
                                )}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                            <span className="text-sm font-semibold text-amber-900">
                                                {progress.message}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-amber-700 tabular-nums">
                                            {progress.progress}%
                                        </span>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="relative w-full bg-amber-200/50 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={cn(
                                                'absolute inset-y-0 left-0',
                                                'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500',
                                                'bg-size-200 animate-shimmer',
                                                'transition-all duration-500 ease-out',
                                                'rounded-full'
                                            )}
                                            style={{ width: `${progress.progress}%` }}
                                        />
                                    </div>
                                    
                                    {/* Progress Details */}
                                    {(progress.stage || progress.current) && (
                                        <div className="mt-2 flex items-center gap-3 text-xs text-amber-700">
                                            {progress.stage && (
                                                <span className="px-2 py-0.5 bg-amber-200/50 rounded-full font-medium">
                                                    {progress.stage}
                                                </span>
                                            )}
                                            {progress.current && (
                                                <span>
                                                    Item {progress.current} of {progress.imageCount || progress.total}
                                                </span>
                                            )}
                                            {progress.uploadedCount && (
                                                <span>• Uploaded: {progress.uploadedCount}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className={cn(
                                    'p-4 rounded-xl border-2',
                                    'bg-red-50 border-red-200',
                                    'animate-shake'
                                )}>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                            <ExclamationIcon className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-red-900 mb-1">
                                                Extraction Failed
                                            </h3>
                                            <p className="text-sm text-red-700">
                                                {error}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setError(null)}
                                            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Document Extractor */}
                            <div className={cn(
                                'rounded-xl border-2 border-slate-200',
                                'bg-gradient-to-br from-slate-50 to-white',
                                'overflow-hidden'
                            )}>
                                {!apiKey ? (
                                    <div className="p-8 text-center">
                                        <div className={cn(
                                            'inline-flex w-16 h-16 rounded-2xl',
                                            'bg-amber-100 items-center justify-center',
                                            'mb-4'
                                        )}>
                                            <ExclamationIcon className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                            API Key Required
                                        </h3>
                                        <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                                            To enable AI-powered JD parsing, please configure your Gemini API key in the environment settings.
                                        </p>
                                        <div className="inline-block bg-slate-100 rounded-lg px-4 py-3 border border-slate-200">
                                            <code className="text-xs text-slate-700 font-mono">
                                                VITE_GEMINI_API_KEY=your_api_key_here
                                            </code>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <DocumentExtractor
                                            apiKey={apiKey}
                                            onExtract={handleExtract}
                                            onError={handleError}
                                            onProgress={handleProgress}
                                            showTextInput={true}
                                            showFileUpload={true}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Extracted Data Preview */}
                            {jdData && (
                                <div className={cn(
                                    'rounded-xl border-2 border-green-200',
                                    'bg-gradient-to-br from-green-50 to-emerald-50',
                                    'overflow-hidden animate-slide-up'
                                )}>
                                    {/* Success Header */}
                                    <div className="px-6 py-4 bg-white/60 backdrop-blur-sm border-b border-green-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-900">
                                                        Extraction Complete
                                                    </h3>
                                                    <p className="text-xs text-slate-600">
                                                        Job description parsed successfully
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setJdData(null)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-lg',
                                                    'text-xs font-medium',
                                                    'bg-white hover:bg-slate-50',
                                                    'text-slate-600 hover:text-slate-800',
                                                    'border border-slate-200',
                                                    'transition-all duration-200',
                                                    'hover:shadow-sm'
                                                )}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {/* Data Cards */}
                                    <div className="p-6 space-y-4">
                                        {/* Job Title & Experience Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Job Title */}
                                            <div className={cn(
                                                'p-4 rounded-xl',
                                                'bg-white border border-slate-200',
                                                'hover:border-amber-300 hover:shadow-md',
                                                'transition-all duration-200'
                                            )}>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <BriefcaseIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-medium text-slate-500 mb-1">
                                                            Job Title
                                                        </h4>
                                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                                            {jdData.raw_title || 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Experience */}
                                            <div className={cn(
                                                'p-4 rounded-xl',
                                                'bg-white border border-slate-200',
                                                'hover:border-amber-300 hover:shadow-md',
                                                'transition-all duration-200'
                                            )}>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                        <ClockIcon className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-medium text-slate-500 mb-1">
                                                            Experience Required
                                                        </h4>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {jdData.experience?.min_years 
                                                                ? `${jdData.experience.min_years}+ years` 
                                                                : 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Skills */}
                                        <div className={cn(
                                            'p-4 rounded-xl',
                                            'bg-white border border-slate-200',
                                            'hover:border-amber-300 hover:shadow-md',
                                            'transition-all duration-200'
                                        )}>
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                                    <CodeIcon className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-medium text-slate-500 mb-1">
                                                        Required Skills
                                                    </h4>
                                                    <p className="text-xs text-slate-600">
                                                        {(jdData.skills?.must_have || []).length} must-have skills identified
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {(jdData.skills?.must_have || []).length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {(jdData.skills?.must_have || []).slice(0, 8).map((skill, index) => (
                                                        <span 
                                                            key={index}
                                                            className={cn(
                                                                'inline-flex items-center gap-1.5',
                                                                'px-3 py-1.5 rounded-lg',
                                                                'bg-gradient-to-r from-blue-50 to-indigo-50',
                                                                'border border-blue-200',
                                                                'text-xs font-medium text-blue-800',
                                                                'hover:shadow-sm hover:scale-105',
                                                                'transition-all duration-200',
                                                                'animate-fade-in'
                                                            )}
                                                            style={{ animationDelay: `${index * 50}ms` }}
                                                        >
                                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                            {skill.name}
                                                        </span>
                                                    ))}
                                                    {(jdData.skills?.must_have || []).length > 8 && (
                                                        <span className={cn(
                                                            'inline-flex items-center',
                                                            'px-3 py-1.5 rounded-lg',
                                                            'bg-slate-100 border border-slate-200',
                                                            'text-xs font-medium text-slate-600'
                                                        )}>
                                                            +{(jdData.skills?.must_have || []).length - 8} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">
                                                    No skills extracted
                                                </p>
                                            )}
                                        </div>

                                        {/* Raw JSON (Collapsible) */}
                                        <details className="group">
                                            <summary className={cn(
                                                'flex items-center gap-2 px-4 py-3 rounded-lg',
                                                'bg-white border border-slate-200',
                                                'cursor-pointer select-none',
                                                'hover:bg-slate-50 hover:border-slate-300',
                                                'transition-all duration-200',
                                                'text-sm font-medium text-slate-700'
                                            )}>
                                                <svg 
                                                    className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                                View Raw JSON Data
                                            </summary>
                                            <div className="mt-2 p-4 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                                <pre className="text-xs text-green-400 font-mono overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                                                    {JSON.stringify(jdData, null, 2)}
                                                </pre>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer with Action Button */}
                        {jdData && (
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-xs text-slate-600 text-center sm:text-left">
                                        Ready to find matching candidates based on this job description
                                    </p>
                                    <button
                                        onClick={() => {
                                            console.log('🔍 Starting candidate search with JD data:', jdData);
                                            // Trigger search functionality
                                            alert('JD data is ready for candidate search! Check console for details.');
                                        }}
                                        className={cn(
                                            'inline-flex items-center gap-2',
                                            'px-6 py-3 rounded-xl',
                                            'bg-gradient-to-r from-blue-600 to-purple-600',
                                            'text-white font-semibold text-sm',
                                            'shadow-lg shadow-blue-500/30',
                                            'hover:shadow-xl hover:shadow-blue-500/40',
                                            'hover:scale-105 active:scale-95',
                                            'transition-all duration-200',
                                            'whitespace-nowrap'
                                        )}
                                    >
                                        <SearchIcon className="w-5 h-5" />
                                        Start Candidate Search
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add custom animations to global styles */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes modal-slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes slide-down {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes shake {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    10%, 30%, 50%, 70%, 90% {
                        transform: translateX(-5px);
                    }
                    20%, 40%, 60%, 80% {
                        transform: translateX(5px);
                    }
                }

                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }

                @keyframes shimmer {
                    0% {
                        background-position: 200% center;
                    }
                    100% {
                        background-position: -200% center;
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }

                .animate-modal-slide-up {
                    animation: modal-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }

                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }

                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }

                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }

                .animate-shimmer {
                    animation: shimmer 2s linear infinite;
                }

                .bg-size-200 {
                    background-size: 200% 100%;
                }

                /* Scrollbar styles */
                .scrollbar-thin::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }

                .scrollbar-thumb-slate-700::-webkit-scrollbar-thumb {
                    background-color: rgb(51 65 85);
                    border-radius: 4px;
                }

                .scrollbar-track-slate-800::-webkit-scrollbar-track {
                    background-color: rgb(30 41 59);
                }
            `}</style>
        </>,
        document.body
    );
};

export default JDSearchModal;