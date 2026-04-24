import React, { useState, useEffect, useCallback } from 'react';
import { Coffee } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const KOFI_URL = 'https://ko-fi.com/residentquest';

const HIDDEN_ROUTES = ['/quiz', '/quiz/loading'];

const KofiButton = () => {
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const isHidden = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Staggered entrance animation
  useEffect(() => {
    if (isHidden) return;
    const entryTimer = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(entryTimer);
  }, [isHidden]);

  // Auto-expand briefly to draw attention on first load
  useEffect(() => {
    if (!mounted || hasInteracted) return;

    const expandTimer = setTimeout(() => setIsExpanded(true), 2500);
    const collapseTimer = setTimeout(() => {
      setIsExpanded(false);
      setShowPulse(false);
    }, 5500);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
    };
  }, [mounted, hasInteracted]);

  // Fade pulse ring after timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  const handleDonateClick = useCallback(() => {
    window.open(KOFI_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsExpanded(true);
    setHasInteracted(true);
    setShowPulse(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
    setHasInteracted(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsExpanded(false);
  }, []);

  if (isHidden) return null;

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${mounted
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-16 opacity-0 scale-75'}
      `}
      role="complementary"
      aria-label="Support link"
    >
      {/* Attention pulse rings */}
      {showPulse && mounted && (
        <>
          <span
            className="
              absolute inset-0 rounded-full
              bg-[#FF5E5B] opacity-30
              animate-ping
            "
            aria-hidden="true"
          />
          <span
            className="
              absolute -inset-1 rounded-full
              bg-[#FF5E5B] opacity-15
              animate-pulse
            "
            aria-hidden="true"
          />
        </>
      )}

      <button
        type="button"
        onClick={handleDonateClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="
          relative flex items-center gap-0
          bg-gradient-to-br from-[#FF5E5B] via-[#FF6B6B] to-[#e84644]
          hover:from-[#ff4744] hover:via-[#FF5E5B] hover:to-[#d63b39]
          text-white rounded-full
          shadow-lg shadow-red-500/20
          hover:shadow-xl hover:shadow-red-500/30
          active:shadow-md active:scale-[0.97]
          transition-all duration-300 ease-out
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50 focus-visible:ring-offset-2
          overflow-hidden cursor-pointer
        "
        style={{
          padding: isExpanded ? '14px 22px 14px 16px' : '14px',
        }}
        aria-label="Support us on Ko-Fi — opens in a new tab"
      >
        {/* Coffee icon with hover rotation */}
        <Coffee
          className="
            w-6 h-6 flex-shrink-0
            transition-transform duration-500 ease-out
            group-hover:rotate-12
          "
          style={{
            transform: isExpanded ? 'rotate(-12deg) scale(1.08)' : 'rotate(0deg) scale(1)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
          }}
          aria-hidden="true"
        />

        {/* Expanding label */}
        <span
          className="
            whitespace-nowrap font-semibold text-sm
            transition-all duration-300 ease-out
            overflow-hidden
          "
          style={{
            maxWidth: isExpanded ? '160px' : '0px',
            opacity: isExpanded ? 1 : 0,
            marginLeft: isExpanded ? '10px' : '0px',
          }}
          aria-hidden={!isExpanded}
        >
          Buy us a Coffee ☕
        </span>

        {/* Shine sweep effect */}
        <span
          className="
            absolute inset-0 rounded-full
            bg-gradient-to-r from-transparent via-white/20 to-transparent
            -translate-x-full
            transition-transform duration-700 ease-out
          "
          style={{
            transform: isExpanded ? 'translateX(100%)' : 'translateX(-100%)',
          }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export default KofiButton;