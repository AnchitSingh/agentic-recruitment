import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import BackgroundEffects from '../components/ui/BackgroundEffects';

const LoadingProgress = ({ steps, currentStep, streamMessage }) => (
    <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/60">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-amber-400/10 via-orange-400/5 to-transparent p-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-md opacity-60"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800">Loading Quiz ✨</h3>
                        <p className="text-slate-500 text-sm">Step {currentStep + 1} of {steps.length}</p>
                    </div>
                </div>
                
                {/* Overall Progress Bar */}
                <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    ></div>
                </div>
            </div>
            
            {/* Steps Section */}
            <div className="p-6 space-y-3">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    
                    return (
                        <div 
                            key={index} 
                            className={`relative overflow-hidden transition-all duration-500 rounded-2xl ${
                                isCurrent 
                                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg shadow-amber-100' 
                                    : isCompleted
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                                        : 'bg-slate-50/50 border border-slate-200'
                            }`}
                        >
                            {/* Animated background for current step */}
                            {isCurrent && (
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 animate-pulse"></div>
                            )}
                            
                            <div className="relative p-4">
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        isCompleted 
                                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg' 
                                            : isCurrent 
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg' 
                                                : 'bg-white border-2 border-slate-300'
                                    }`}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isCurrent ? (
                                            <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                                        )}
                                    </div>
                                    
                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold transition-colors ${
                                            isCompleted ? 'text-green-800' : 
                                            isCurrent ? 'text-amber-900' : 'text-slate-500'
                                        }`}>
                                            {step.title}
                                        </p>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {isCompleted && (
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                                                Done
                                            </span>
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800">
                                                Processing
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Stream Message */}
                                {isCurrent && streamMessage && (
                                    <p className="ml-14 mt-2 text-xs font-medium animate-pulse text-amber-700">
                                        {streamMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);

const QuizLoadingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { quizData } = location.state || {};
    
    const [currentStep, setCurrentStep] = useState(0);
    const [streamMessage, setStreamMessage] = useState('');

    const steps = [
        { title: 'Loading Quiz Data' },
        { title: 'Preparing Questions' },
        { title: 'Setting Up Quiz' },
    ];

    useEffect(() => {
        if (!quizData) {
            toast.error("No quiz data found.");
            navigate('/home');
            return;
        }

        const loadQuiz = async () => {
            try {
                // Step 1: Loading
                setCurrentStep(0);
                setStreamMessage('Loading quiz data...');
                await new Promise(res => setTimeout(res, 800));

                // Step 2: Preparing
                setCurrentStep(1);
                setStreamMessage('Preparing questions...');
                await new Promise(res => setTimeout(res, 800));

                // Step 3: Setting up
                setCurrentStep(2);
                setStreamMessage('Setting up quiz environment...');
                await new Promise(res => setTimeout(res, 800));

                // Navigate to quiz with the loaded data
                navigate('/quiz', { state: { quizData } });

            } catch (error) {
                console.error('Failed to load quiz:', error);
                toast.error(`Error: ${error.message}`);
                navigate('/home');
            }
        };

        loadQuiz();
    }, [quizData, navigate]);

    return (
        <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex items-center justify-center p-4">
            <BackgroundEffects />
            <LoadingProgress 
                steps={steps} 
                currentStep={currentStep} 
                streamMessage={streamMessage} 
            />
        </div>
    );
};

export default QuizLoadingPage;