import React, { useState, useRef, useEffect } from 'react';
import { useDocumentProcessor } from '../../hooks/useDocumentProcessor';
import { extractJSONFromImages } from '../../utils/buggu/geminiAI';
import FileUpload from './FileUpload';
import TextInput from './TextInput';
import ContentPreview from './ContentPreview';

/**
 * Document Extractor Component - All-in-one document processing and AI extraction
 * @param {Object} props
 * @param {string} props.apiKey - Gemini API key
 * @param {string} props.customPrompt - Custom prompt for AI (optional)
 * @param {Function} props.onExtract - Callback when extraction completes
 * @param {Function} props.onError - Callback when error occurs
 * @param {Function} props.onProgress - Progress callback with detailed updates
 * @param {boolean} props.showTextInput - Show text input option
 * @param {boolean} props.showFileUpload - Show file upload option
 * @param {string} props.className - Additional CSS classes
 */
export function DocumentExtractor({
  apiKey,
  customPrompt,
  onExtract,
  onError,
  onProgress,
  showTextInput = true,
  showFileUpload = true,
  className = ""
}) {
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const previewRef = useRef(null);

  const documentProcessor = useDocumentProcessor({
    onSuccess: (processedItems) => {
      setExtractionError(null);
    },
    onError: (error) => {
      setExtractionError(error.message);
      if (onError) onError(error);
    }
  });

  const handleFileUpload = (files) => {
    documentProcessor.processUploadedFiles(files);
  };

  const handleTextInput = (text) => {
    documentProcessor.processTextInput(text);
  };

  const handleClearAll = () => {
    documentProcessor.clearAll();
    setResult(null);
    setExtractionError(null);
  };

  // Auto-scroll to preview when files are uploaded
  useEffect(() => {
    if (documentProcessor.processedItems.length > 0 && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [documentProcessor.processedItems.length]);

  const handleExtract = async () => {
    if (!apiKey) {
      const error = new Error('Gemini API key is required');
      setExtractionError(error.message);
      if (onError) onError(error);
      return;
    }

    if (documentProcessor.totalCount === 0) {
      const error = new Error('No content to extract from');
      setExtractionError(error.message);
      if (onError) onError(error);
      return;
    }

    setExtracting(true);
    setExtractionError(null);

    try {
      // Progress callback handler
      const progressCallback = (progress) => {
        // Forward progress to parent component
        if (onProgress) {
          onProgress(progress);
        }

        // Update internal state if needed
        console.log('Progress update:', progress);
      };

      let extractedData;
      if (customPrompt) {
        // Use custom prompt
        extractedData = await extractJSONFromImages({
          imageBlobs: documentProcessor.getProcessedItems(),
          schemaPrompt: customPrompt,
          onProgress: progressCallback
        });
      } else {
        // Use default job description schema
        extractedData = await extractJSONFromImages({
          imageBlobs: documentProcessor.getProcessedItems(),
          onProgress: progressCallback
        });
      }

      setResult(extractedData);
      if (onExtract) onExtract(extractedData);
    } catch (error) {
      setExtractionError(error.message);
      if (onError) onError(error);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload Section */}
      {showFileUpload && (
        <FileUpload 
          onFilesSelected={handleFileUpload}
          loading={documentProcessor.loading}
          disabled={extracting}
        />
      )}

      {/* Text Input Section */}
      {showTextInput && (
        <TextInput 
          onTextSubmit={handleTextInput}
          loading={documentProcessor.loading}
          disabled={extracting}
        />
      )}

      {/* Content Preview */}
      <div ref={previewRef}>
        <ContentPreview
          items={documentProcessor.processedItems}
          onClear={handleClearAll}
        />
      </div>

      {/* Error Display */}
      {extractionError && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-shake">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-700">{extractionError}</p>
          </div>
        </div>
      )}

      {/* Extract Button */}
      {documentProcessor.hasContent && (
        <div className="flex justify-center">
          <button
            onClick={handleExtract}
            disabled={extracting || !apiKey}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-3"
          >
            {extracting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Extracting Data...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {customPrompt ? 'Extract Data' : 'Extract Job Description'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Extracted Data</h3>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear result
            </button>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* API Key Warning */}
      {!apiKey && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800">API Key Required</p>
            <p className="text-sm text-amber-700">
              Please provide a Gemini API key to enable data extraction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentExtractor;
