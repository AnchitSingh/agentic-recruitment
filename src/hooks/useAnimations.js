import { useState, useEffect } from 'react';
import { quizEvents } from '../data/quizEvents';

export const useAnimations = () => {
    const [mounted, setMounted] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [sliderPaused, setSliderPaused] = useState(false);

    // Trigger entrance animations
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    // Auto-advance slider
    useEffect(() => {
        if (sliderPaused) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % quizEvents.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [sliderPaused]);

    const entrance = (step, base = 0) => ({
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${
            base + step * 120
        }ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${base + step * 120}ms`,
    });

    return {
        // State
        mounted,
        currentSlide,
        sliderPaused,
        
        // Setters
        setCurrentSlide,
        setSliderPaused,
        
        // Helpers
        entrance,
        quizEvents,
    };
};
