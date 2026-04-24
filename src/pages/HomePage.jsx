import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProfile } from '../contexts/ProfileContext';
import CustomJsonModal from '../components/quiz/CustomJsonModal';
import ContinueLearningSection from '../components/quiz/ContinueLearningSection';
import RecentActivitySection from '../components/quiz/RecentActivitySection';
import SmartSuggestionsSection from '../components/quiz/SmartSuggestionsSection';
import GlobalHeader from '../components/ui/GlobalHeader';
import examBuddyAPI from '../services/api';
import { getQuizHistory } from '../utils/quizHistory';
import { findSuggestedQuizzes } from '../utils/quizHelpers';
import { getQuizzes } from '../services/dataService';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import LoadingScreen from '../components/ui/LoadingScreen';
import { generateId } from '../utils/helpers';
import { backgrounds, colors, typography, borderRadius, shadows, transitions, effects, components, cn } from '../utils/designTokens';
import LoggedInHeroSection from '../components/quiz/HeroSection';
import StatsSection from '../components/quiz/StatsSection';

// Empty default topics that will be populated from stats
const DEFAULT_TOPICS = [];

// Helper function to normalize topic names
const normalizeManualTopic = (topic) => {
  if (!topic) return '';
  return topic.toLowerCase().trim();
};

// Main Component
const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const navigationData = location.state;

    const [showCustomJson, setShowCustomJson] = useState(false);
    const { profile, loading: profileLoading } = useProfile();
    const [pausedQuizzes, setPausedQuizzes] = useState([]);
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recommendedTopics, setRecommendedTopics] = useState(DEFAULT_TOPICS);
    const [displayContent, setDisplayContent] = useState('continue');

    useEffect(() => {
        if (navigationData?.openQuizSetup) {
            setShowCustomJson(true);
        }
        // Handle recommended topic from navigation data
        if (navigationData?.recommendedTopic) {
            // Set timeout to allow modal to open first, then update its state
            setTimeout(() => {
                setShowCustomJson(true);
            }, 100);
        }
    }, [navigationData]);

    useEffect(() => {
        let mounted = true;

        const loadUserData = async () => {
            try {
                setIsLoading(true);
                const [profileResponse, pausedResponse, bookmarksResponse, statsResponse] = await Promise.all([
                    examBuddyAPI.getUserProfile(),
                    examBuddyAPI.getPausedQuizzes(),
                    examBuddyAPI.getBookmarks(),
                    examBuddyAPI.getGlobalStats('all'), // Get user stats for recommendations
                ]);

                // Load quiz history for recent activity
                const quizHistory = await getQuizHistory();
                if (Array.isArray(quizHistory)) {
                    setHistory(quizHistory);
                }

                // Load quiz catalog for suggestions
                const catalogResponse = await getQuizzes();
                if (catalogResponse?.success && Array.isArray(catalogResponse.data)) {
                    setCatalog(catalogResponse.data);
                }

                if (!mounted) return;

                if (profileResponse.success) {
                    // Profile data is handled by ProfileProvider
                }

                if (pausedResponse.success) setPausedQuizzes(pausedResponse.data);
                if (bookmarksResponse.success) setBookmarks(bookmarksResponse.data);

                // Determine recommended topics based on stats
                if (statsResponse.success && statsResponse.data) {
                    setStats(statsResponse.data);
                    const userStats = statsResponse.data;
                    if (userStats.subjectPerformance && Object.keys(userStats.subjectPerformance).length > 0) {
                        // Get subjects with lowest performance
                        const sortedSubjects = Object.entries(userStats.subjectPerformance)
                            .sort(([, a], [, b]) => a.score - b.score)
                            .slice(0, 3)
                            .map(([subject]) => subject.toLowerCase().trim());

                        if (sortedSubjects.length > 0) {
                            setRecommendedTopics(sortedSubjects);
                        }
                    } else {
                        // Fallback to default topics if stats not available
                        setRecommendedTopics(DEFAULT_TOPICS);
                    }
                }

            } catch (err) {
                console.error('Error loading user data:', err);
                if (mounted) {
                    toast.error('Unable to load your data. Using offline mode.');
                    // Fallback demo data
                    setPausedQuizzes([
                        {
                            id: 'demo1',
                            title: "React Advanced Concepts",
                            progress: 60,
                            questionsLeft: 4,
                            totalQuestions: 10,
                            lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000)
                        },
                        {
                            id: 'demo2',
                            title: "JavaScript Design Patterns",
                            progress: 30,
                            questionsLeft: 7,
                            totalQuestions: 10,
                            lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    ]);
                    setBookmarks([
                        { id: 'b1', title: 'React Hooks Guide', savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                        { id: 'b2', title: 'State Management Patterns', savedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
                    ]);
                    setRecommendedTopics(DEFAULT_TOPICS);
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadUserData();
        return () => { mounted = false; };
    }, []);

    // Computed values
    const continueQuizzes = useMemo(
        () =>
            [...pausedQuizzes]
                .sort((a, b) => new Date(b.lastUpdated || b.pausedAt || 0) - new Date(a.lastUpdated || a.pausedAt || 0))
                .slice(0, 3),
        [pausedQuizzes],
    );

    const recentHistory = useMemo(
        () => [...history].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, 5),
        [history],
    );

    const weakTopics = useMemo(
        () =>
            (stats?.topicPerformance?.weak || [])
                .slice(0, 5)
                .map((t) => String(t.name || '').toLowerCase())
                .filter(Boolean),
        [stats],
    );

    const suggestedQuizzes = useMemo(() => findSuggestedQuizzes(catalog, weakTopics), [catalog, weakTopics]);

    const handleStartQuiz = (config) => {
        setShowCustomJson(false);
        if (typeof config === 'string') {
            // If it's a string, treat it as a slug
            navigate(`/quiz/${config}`);
        } else {
            // If it's an object, pass it as quizConfig
            navigate('/quiz', { state: { quizConfig: config } });
        }
    };

    // Handle search result selection from GlobalHeader
    const handleSearchResultSelect = (result) => {
        if (result.type === 'quiz' && result.slug) {
            // Start the quiz
            handleStartQuiz(result.slug);
        }
    };



    if (isLoading) {
        // Don't show loading screen, just render with empty/default data
        // Data will load in the background
    }

    return (
        <>
            <div className={cn(backgrounds.pageMinHeight, "overflow-x-hidden")}>
                <BackgroundEffects />
                {/* Minimal Header */}
                <GlobalHeader currentPage="home" onSearchSelect={handleSearchResultSelect} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-30 pb-12 relative z-10">
                    {/* ── Hero ──────────────────────────────────────── */}
                    <LoggedInHeroSection profile={profile} />

                    {/* ── Stats ─────────────────────────────────────── */}
                    <StatsSection stats={stats} bookmarks={bookmarks} />

                    {/* ── Continue + Activity ───────────────────────── */}
                    <section aria-label="Continue learning and activity" className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
                        <ContinueLearningSection
                            pausedQuizzes={pausedQuizzes}
                            continueQuizzes={continueQuizzes}
                        />
                        <RecentActivitySection
                            history={history}
                            recentHistory={recentHistory}
                        />
                    </section>

                    {/* ── Smart Suggestions ─────────────────────────── */}
                    <SmartSuggestionsSection
                        suggestedQuizzes={suggestedQuizzes}
                        weakTopics={weakTopics}
                        onStartQuiz={handleStartQuiz}
                    />
                </main>


                <CustomJsonModal
                    isOpen={showCustomJson}
                    onClose={() => setShowCustomJson(false)}
                    onStartQuiz={handleStartQuiz}
                />

                {/* Progress Tracker - Shown during processing */}

            </div>

            {/* Extracted CSS */}
            <style>{`
                 @keyframes scroll-horizontal {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }

                .animate-scroll-horizontal {
                    animation: scroll-horizontal 30s linear infinite;
                    display: flex;
                    will-change: transform;
                }

                .animate-scroll-horizontal:hover {
                    animation-play-state: paused;
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                
                @keyframes fadeInUp {
                    0% { 
                        opacity: 0; 
                        transform: translateY(20px); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }

                @keyframes pulse-slow {
                    0%, 100% { 
                        opacity: 0.3; 
                        transform: scale(1); 
                    }
                    50% { 
                        opacity: 0.5; 
                        transform: scale(1.05); 
                    }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out;
                }
                
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out both;
                }

                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }

                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </>
    );
};

export default HomePage;