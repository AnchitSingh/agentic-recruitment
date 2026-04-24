import React from 'react';
import { MobileHero } from './MobileHero';
import { DesktopHero } from './DesktopHero';

export const HeroSection = ({ entrance, onGoogleSignUp }) => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <MobileHero 
                entrance={entrance} 
                onGoogleSignUp={onGoogleSignUp} 
            />
            <DesktopHero 
                entrance={entrance} 
                onGoogleSignUp={onGoogleSignUp} 
            />
        </div>
    );
};
