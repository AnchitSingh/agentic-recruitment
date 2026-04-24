import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from './LandingPage';
import HomePage from './HomePage';
import LoadingScreen from '../components/ui/LoadingScreen';

const IndexPage = ({ onGoogleSignUp }) => {
    const { user, ready } = useAuth();

    // Show loading screen while auth is initializing
    if (!ready) {
        return <LoadingScreen message="Checking authentication..." />;
    }

    // If user is logged in (has user object), show HomePage
    // Otherwise show LandingPage
    if (user) {
        return <HomePage />;
    } else {
        return (
            <LandingPage 
                onGoogleSignUp={onGoogleSignUp} 
            />
        );
    }
};

export default IndexPage;
