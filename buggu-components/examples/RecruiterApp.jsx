import React, { useState } from 'react';
import { DocumentExtractor } from '../src/index';

/**
 * Example Recruiter App Integration
 * Shows how to use the reusable components with detailed progress tracking
 */
export function RecruiterApp() {
  const [jdData, setJdData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Handle JD extraction completion
  const handleExtract = (extractedData) => {
    console.log('✅ JD Extraction completed:', extractedData);
    setJdData(extractedData);
    setIsSearching(false);
    
    // Now you can use this JSON for other independent things:
    // - Send to your matching algorithm
    // - Store in database
    // - Send to other APIs
    // - Display to user
  };

  // Handle extraction errors
  const handleError = (error) => {
    console.error('❌ Extraction error:', error);
    setError(error.message);
    setIsSearching(false);
  };

  // Handle detailed progress updates
  const handleProgress = (progressUpdate) => {
    console.log('📊 Progress:', progressUpdate);
    setProgress(progressUpdate);
    
    // You can show different UI based on the stage:
    switch (progressUpdate.stage) {
      case 'started':
        // Show "Starting processing..." message
        break;
      case 'uploading':
        // Show "Uploading image X of Y..." with progress bar
        break;
      case 'processing':
        // Show "Analyzing with AI..." message
        break;
      case 'completed':
        // Show "Extraction complete!" message
        break;
      default:
        // Show generic progress message
    }
  };

  // Start search button handler
  const handleStartSearch = () => {
    if (!jdData) {
      setError('Please upload or enter a job description first');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    // Here you would use the extracted JD data for other things:
    // - Match against candidate profiles
    // - Send to recommendation engine
    // - Store in your database
    // - Call other APIs
    
    console.log('🔍 Starting candidate matching with JD data:', jdData);
    
    // Simulate async search process
    setTimeout(() => {
      setIsSearching(false);
      console.log('✅ Search completed - found 15 matching candidates');
    }, 2000);
  };

  // Reset everything
  const handleReset = () => {
    setJdData(null);
    setProgress(null);
    setError(null);
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">
          Recruiter Dashboard - Job Description Processor
        </h1>

        {/* Progress Display */}
        {progress && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-800">
                {progress.message}
              </span>
              <span className="text-sm text-blue-600">
                {progress.progress}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            
            {/* Detailed progress info */}
            <div className="mt-2 text-xs text-blue-600">
              Stage: {progress.stage} 
              {progress.current && ` • Item ${progress.current} of ${progress.imageCount || progress.total}`}
              {progress.uploadedCount && ` • Uploaded: ${progress.uploadedCount}`}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Document Extractor Component */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Step 1: Upload Job Description
          </h2>
          
          <DocumentExtractor
            apiKey="your-gemini-api-key"
            onExtract={handleExtract}
            onError={handleError}
            onProgress={handleProgress}
            showTextInput={true}
            showFileUpload={true}
          />
        </div>

        {/* Extracted Data Display */}
        {jdData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                Step 2: Extracted Job Data
              </h2>
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear and start over
              </button>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-slate-700 mb-2">Job Title:</h3>
              <p className="text-slate-600">{jdData.raw_title || 'N/A'}</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-slate-700 mb-2">Key Skills:</h3>
              <div className="flex flex-wrap gap-2">
                {(jdData.skills?.must_have || []).map((skill, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-2">Experience Required:</h3>
              <p className="text-slate-600">
                {jdData.experience?.min_years ? `${jdData.experience.min_years}+ years` : 'Not specified'}
              </p>
            </div>
            
            {/* Raw JSON for debugging */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                View Raw JSON Data
              </summary>
              <pre className="mt-2 text-xs text-slate-600 bg-slate-100 p-3 rounded overflow-auto">
                {JSON.stringify(jdData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Search Button */}
        {jdData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Step 3: Find Matching Candidates
            </h2>
            
            <button
              onClick={handleStartSearch}
              disabled={isSearching}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Searching for candidates...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Start Candidate Search
                </span>
              )}
            </button>
            
            <p className="text-sm text-slate-500 mt-2 text-center">
              This will use the extracted job data to find matching candidates in your database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecruiterApp;
