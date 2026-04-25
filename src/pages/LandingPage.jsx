import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backgrounds, cn } from '../utils/designTokens';
import JDSearchModal from '../components/ui/JDSearchModal';

import '../styles/animations.css';

// Import extracted components
import { HeroSection } from '../components/landing/Hero/HeroSection';


const LandingPage = () => {
    const navigate = useNavigate();
    const [showJDModal, setShowJDModal] = useState(false);

    // Handle search result selection
    const handleSearchResultSelect = (result) => {
        // Quiz feature coming soon
        console.log('Search result selected:', result);
    };

    // In your component:
    const [matchLoading, setMatchLoading] = useState(false);

    const handleJDExtracted = async (jdData) => {
        console.log('JD extracted:', jdData);
        // Navigation now happens in JDSearchModal, ResultsPage handles matching
    };
    // ─── Shape of each item in rankedCandidates ───────────────────────────────────
    //
    // {
    //   candidate: { ...full candidate profile },
    //   matchScore: 87.4,              ← 0–100, use this for the ranked shortlist
    //
    //   scoreBreakdown: {
    //     bm25_raw: 142.3,             ← raw BM25F before normalisation (for debugging)
    //     vector_similarity: 0.847,    ← cosine sim from Gemini embeddings
    //     experience_score: 0.95,      ← structural bonus scores
    //     location_score: 1.0,
    //     salary_score: 0.88,
    //     availability_score: 0.85,
    //     match_score: 87,
    //   },
    //
    //   explanation: {
    //     must_have_matched:    ['Node.js', 'PostgreSQL', 'REST APIs'],
    //     must_have_missing:    [],
    //     nice_to_have_matched: ['Redis'],
    //     nice_to_have_missing: ['Kubernetes'],
    //     domain_matched:       ['fintech', 'payments'],
    //     experience_note:      '5 years — within range (4–7)',
    //     salary_note:          'Expects 28 INR — within budget (20–32)',
    //     availability_note:    'Passively looking · 60-day notice period',
    //     strength_tags: [
    //       { label: 'Full Skills Match',  color: 'green'  },
    //       { label: 'Domain Expert',      color: 'blue'   },
    //       { label: '+1 Bonus Skills',    color: 'purple' },
    //     ],
    //     summary: 'Rahul Sharma matches all required skills, with hands-on fintech & payments domain experience, and bonus skills in Redis.',
    //   }
    // }
    // Open JD modal
    const handleOpenJDModal = () => {
        setShowJDModal(true);
    };

    return (
        <div className={cn(backgrounds.page, 'overflow-x-hidden relative min-h-screen')}>
            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-100/60 to-orange-100/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-orange-100/50 to-amber-50/30 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-amber-50/30 to-orange-50/20 rounded-full blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />
            </div>

            {/* Main Content */}
            <main className="relative pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <HeroSection
                    onOpenJDModal={handleOpenJDModal}
                />

            </main>

            {/* JD Search Modal */}
            <JDSearchModal
                isOpen={showJDModal}
                onClose={() => setShowJDModal(false)}
                onJDExtracted={handleJDExtracted}
            />
        </div>
    );
};

export default LandingPage;
