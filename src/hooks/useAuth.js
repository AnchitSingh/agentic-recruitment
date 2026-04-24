import { useState } from 'react';

export const useAuth = () => {
    const [email, setEmail] = useState('');
    const [showEmailInput, setShowEmailInput] = useState(false);

    const handleEmailSubmit = (e, onEmailSignUp) => {
        e.preventDefault();
        if (email.trim()) {
            onEmailSignUp?.(email.trim());
        }
    };

    const toggleEmailInput = () => {
        setShowEmailInput(!showEmailInput);
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    return {
        // State
        email,
        showEmailInput,
        
        // Handlers
        handleEmailSubmit,
        toggleEmailInput,
        handleEmailChange,
        
        // Setters
        setEmail,
        setShowEmailInput,
    };
};
