import React from 'react';
import { cn } from '../../../utils/designTokens';
import { GoogleSignInButton } from './GoogleSignInButton';
import { EmailSignUpForm } from './EmailSignUpForm';

export const AuthButtons = ({ isMobile = false, onGoogleSignUp }) => {
    return (
        <div className={cn('space-y-3', isMobile ? 'w-full' : 'max-w-sm')}>
            <GoogleSignInButton onGoogleSignUp={onGoogleSignUp} />
            <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <span className="text-sm text-slate-400 font-medium select-none">or</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>
            <EmailSignUpForm isMobile={isMobile} />
        </div>
    );
};
