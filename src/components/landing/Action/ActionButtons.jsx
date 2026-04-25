import React from 'react';
import { cn } from '../../../utils/designTokens';
import { ParseJDButton } from './ParseJDButton';

export const AuthButtons = ({ isMobile = false, onOpenJDModal }) => {
    return (
        <div className={cn('space-y-3', isMobile ? 'w-full' : 'max-w-sm')}>

            <ParseJDButton isMobile={isMobile} onClick={onOpenJDModal} />
        </div>
    );
};