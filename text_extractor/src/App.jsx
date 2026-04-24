import { useState, useEffect } from 'react';
import { processFiles, createPreviewURL, revokePreviewURL } from './utils/pdfProcessor';
import { extractJSONFromImages } from './utils/geminiAI';

function App() {
  const [step, setStep] = useState('home');
  const [files, setFiles] = useState([]);
  const [processedImages, setProcessedImages] = useState([]);
  const [jsonOutput, setJsonOutput] = useState(null);
  const [error, setError] = useState(null);

  
  const handleProcess = async () => {
    setStep('loading');
    setError(null);
    
    try {
      const imageBlobs = processedImages.map(img => img.blob);
      const result = await extractJSONFromImages({ imageBlobs });
      setJsonOutput(result);
      setStep('results');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to extract data');
      setStep('home');
      setTimeout(() => setStep('modal'), 100);
    }
  };

  const handleReset = () => {
    setStep('home');
    setFiles([]);
    setProcessedImages([]);
    setJsonOutput(null);
    setError(null);
  };

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen overflow-x-hidden">
      {/* Background Effects */}
      <BackgroundEffects />
      
            
      {step === 'home' && (
        <HomePage 
          onStart={() => setStep('modal')} 
        />
      )}
      
      {step === 'modal' && (
        <ConversionModal
          files={files}
          setFiles={setFiles}
          processedImages={processedImages}
          setProcessedImages={setProcessedImages}
          error={error}
          onProcess={handleProcess}
          onClose={handleReset}
        />
      )}
      
      {step === 'loading' && (
        <LoadingScreen imageCount={processedImages.length} />
      )}
      
      {step === 'results' && (
        <ResultsPage 
          jsonOutput={jsonOutput}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ===== Background Effects =====
const BackgroundEffects = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full blur-3xl animate-pulse-slow" />
    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-amber-300/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
    <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-200/10 to-orange-200/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000" />
  </div>
);

// ===== Home Page =====
function HomePage({ onStart }) {
  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium mb-6 border border-amber-200/50">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
           Buggu: Privacy First Document Extractor
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-tight mb-6">
            <span className="text-slate-800">Turn documents into</span>
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              {" "}structured data
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed mb-12 max-w-3xl mx-auto">
            Extract JSON from images and PDFs with custom schemas.
            <span className="font-medium text-slate-700"> Private, fast, and powered by</span> Google Gemini AI.
          </p>

          {/* CTA Button */}
          <div className="mb-8">
            <div className="flex flex-col items-center">
              <button 
                onClick={onStart}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-xl shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 transform transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Convert to JSON
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              Secure Processing
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"/>
              </svg>
              Structured Output
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
              </svg>
              Custom Schemas
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ===== Conversion Modal =====
function ConversionModal({ 
  files, 
  setFiles, 
  processedImages, 
  setProcessedImages,
  error,
  onProcess, 
  onClose 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold">
                📄
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Upload Job Description
                </h2>
                <p className="text-sm text-slate-500">
                  Extract structured data from job postings
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-amber-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <UploadStep
            files={files}
            setFiles={setFiles}
            processedImages={processedImages}
            setProcessedImages={setProcessedImages}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-slate-700 hover:bg-slate-200 font-medium transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={onProcess}
            disabled={processedImages.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Extract Job Data
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Upload Step =====
function UploadStep({ files, setFiles, processedImages, setProcessedImages }) {
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [textInput, setTextInput] = useState('');
  
  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles(uploadedFiles);
    setLoading(true);
    
    try {
      const processed = await processFiles(uploadedFiles);
      setProcessedImages(processed);
      const urls = processed.map(img => createPreviewURL(img.blob));
      setPreviewUrls(urls);
    } catch (error) {
      alert('Error processing files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTextInput = async () => {
    if (!textInput.trim()) return;
    
    setLoading(true);
    setFiles([]); // Clear any existing files
    
    try {
      // Create a text blob from the input
      const textBlob = new Blob([textInput], { type: 'text/plain' });
      const textItem = {
        blob: textBlob,
        type: 'text',
        name: 'text-input',
        text: textInput
      };
      
      setProcessedImages([textItem]);
      setPreviewUrls([]); // No preview URLs for text input
    } catch (error) {
      alert('Error processing text: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => revokePreviewURL(url));
    };
  }, [previewUrls]);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="relative">
        <input 
          type="file" 
          accept="image/*,application/pdf,text/plain,.txt"
          multiple
          onChange={handleFileUpload}
          id="file-input"
          className="hidden"
        />
        <label 
          htmlFor="file-input" 
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-amber-300 rounded-2xl cursor-pointer bg-gradient-to-br from-amber-50/50 to-orange-50/50 hover:from-amber-50 hover:to-orange-50 transition-all duration-300 group"
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
              <p className="text-sm text-slate-500">Images (PNG, JPG), PDF (unlimited pages), or Text files</p>
            </>
          )}
        </label>
      </div>

      {/* Text Input Section */}
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-700">Or paste job description text:</h3>
        </div>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste the job description text here..."
          rows={6}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all outline-none resize-none font-mono text-sm"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleTextInput}
            disabled={!textInput.trim() || loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Process Text
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      {processedImages.length > 0 && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800">
                {processedImages.length} item{processedImages.length !== 1 ? 's' : ''} ready
              </p>
            </div>
            <button
              onClick={() => {
                setFiles([]);
                setProcessedImages([]);
                setPreviewUrls([]);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {processedImages.map((img, i) => (
              <div key={i} className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200">
                {img.type === 'text' ? (
                  <div className="aspect-[3/4] overflow-hidden bg-slate-100 p-4">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-slate-600 font-medium">Text Input</p>
                        <p className="text-xs text-slate-500 mt-1">{img.text?.length || 0} characters</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                    <img 
                      src={previewUrls[i]} 
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-2 bg-slate-50">
                  <p className="text-xs text-slate-600 truncate">{img.name}</p>
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
      )}
    </div>
  );
}


// ===== Loading Screen =====
function LoadingScreen({ imageCount }) {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        {/* Spinner */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="relative bg-white rounded-full w-32 h-32 shadow-2xl flex items-center justify-center border border-amber-100/50">
            <svg className="w-16 h-16 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          Processing {imageCount} page{imageCount !== 1 ? 's' : ''}...
        </h2>
        <p className="text-lg text-slate-600 mb-2">Using Google's Gemini AI</p>
        
        {/* Privacy Badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-800 text-sm font-medium mt-4">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
          </svg>
          Your data is processed securely
        </div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

// ===== Results Page =====
function ResultsPage({ jsonOutput, onReset }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative z-10 min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-2">
            Extraction Complete!
          </h2>
          <p className="text-lg text-slate-600">Your structured data is ready</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 animate-fade-in-up">
          <button
            onClick={copyToClipboard}
            className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy JSON
              </>
            )}
          </button>

          <button
            onClick={downloadJSON}
            className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          <button
            onClick={onReset}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Convert Another
          </button>
        </div>

        {/* JSON Viewer */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <span className="text-slate-300 text-sm font-mono">extracted-data.json</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium">
                JSON
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-900 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-sm font-mono text-slate-100 leading-relaxed">
              {JSON.stringify(jsonOutput, null, 2)}
            </pre>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-amber-600 mb-1">
              {JSON.stringify(jsonOutput).length}
            </div>
            <div className="text-sm text-slate-600">Characters</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {Object.keys(jsonOutput || {}).length}
            </div>
            <div className="text-sm text-slate-600">Top-level Fields</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
            <div className="text-sm text-slate-600">On-Device</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;