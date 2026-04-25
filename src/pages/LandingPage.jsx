import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backgrounds, cn } from '../utils/designTokens';
import GlobalHeader from '../components/ui/GlobalHeader';
import JDSearchModal from '../components/ui/JDSearchModal';
import '../styles/animations.css';

// Import extracted components
import { HeroSection } from '../components/landing/Hero/HeroSection';


// Import hooks
import { useAnimations } from '../hooks/useAnimations';


const LandingPage = () => {
    const navigate = useNavigate();
    const [showJDModal, setShowJDModal] = useState(false);

    // Use custom hooks
    const { mounted, entrance, currentSlide, setCurrentSlide, sliderPaused, setSliderPaused } = useAnimations();

    // Handle search result selection
    const handleSearchResultSelect = (result) => {
        // Quiz feature coming soon
        console.log('Search result selected:', result);
    };

    // Handle JD extraction
    const handleJDExtracted = (jdData) => {
        console.log('JD data extracted:', jdData);
        // TODO: Process the extracted JD data
    };

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

            {/* Header */}
            <GlobalHeader currentPage="landing" onSearchSelect={handleSearchResultSelect} />

            {/* Main Content */}
            <main className="relative pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <HeroSection
                    entrance={entrance}
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
