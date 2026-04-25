import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext';
import JDSearchModal from './JDSearchModal';

/* ═══════════════════════════════════════════════════════════════════
   Navigation — Balanced layout: 3 · SEARCH · 3
   Slot #6 is Profile/Login with a dropdown.
   History lives inside that dropdown.
   ═══════════════════════════════════════════════════════════════════ */

const LEFT_NAV = [
  { id: 'home', label: 'Home', icon: 'home', path: '/' },
];

/* Right navigation is now empty */
const RIGHT_NAV = [];

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

/* ── Injected keyframes for gradient text & dropdown entrance ── */
const INJECTED_STYLES = `
  @keyframes profileGradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes dropdownSlideIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   NavIcon
   ═══════════════════════════════════════════════════════════════════ */
const NavIcon = ({ name, isActive = false, light = false }) => {
  const cls = `w-5 h-5 transition-colors ${light ? 'text-white' : isActive ? 'text-amber-600' : 'text-slate-800'
    }`;

  switch (name) {
    case 'home':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls}>
          <path d="M2 10L11.1076 2.80982C11.3617 2.60915 11.6761 2.5 12 2.5C12.3239 2.5 12.6383 2.60915 12.8924 2.80982L16.5 5.65789V4C16.5 3.44772 16.9477 3 17.5 3H18.5C19.0523 3 19.5 3.44771 19.5 4V8.02632L22 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 11.5V15.5C20 18.3284 20 19.7426 19.1213 20.6213C18.2426 21.5 16.8284 21.5 14 21.5H10C7.17157 21.5 5.75736 21.5 4.87868 20.6213C4 19.7426 4 18.3284 4 15.5V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.0011 15.5C14.2016 16.1224 13.1513 16.5 12.0011 16.5C10.8509 16.5 9.80062 16.1224 9.0011 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls}>
          <path d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H18C19.1046 18 20 17.1046 20 16V2C20 3.10457 19.1046 4 18 4L10 4C7.17157 4 5.75736 4 4.87868 4.87868C4 5.75736 4 7.17157 4 10V20Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 4V12L12 9L15 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.5 18C18.5 18 17.5 18.7628 17.5 20C17.5 21.2372 18.5 22 18.5 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pause':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9L9.5 15M14.5 9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'stats':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls}>
          <path d="M6.5 17.5L6.5 14.5M11.5 17.5L11.5 8.5M16.5 17.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21.5 5.5C21.5 7.15685 20.1569 8.5 18.5 8.5C16.8431 8.5 15.5 7.15685 15.5 5.5C15.5 3.84315 16.8431 2.5 18.5 2.5C20.1569 2.5 21.5 3.84315 21.5 5.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M21.4955 11C21.4955 11 21.5 11.3395 21.5 12C21.5 16.4784 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4784 2.5 12C2.5 7.52169 2.5 5.28252 3.89124 3.89127C5.28249 2.50003 7.52166 2.50003 12 2.50003L13 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
        case 'search':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 17L21 21" />
          <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" />
        </svg>
      );
    case 'browse':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" className={cls} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M20.9977 13C21 12.5299 21 12.0307 21 11.5C21 7.02166 21 4.78249 19.6088 3.39124C18.2175 2 15.9783 2 11.5 2C7.02166 2 4.78249 2 3.39124 3.39124C2 4.78249 2 7.02166 2 11.5C2 15.9783 2 18.2175 3.39124 19.6088C4.78249 21 7.02166 21 11.5 21C12.0307 21 12.5299 21 13 20.9977" />
          <path d="M18.5 15L18.7579 15.697C19.0961 16.611 19.2652 17.068 19.5986 17.4014C19.932 17.7348 20.389 17.9039 21.303 18.2421L22 18.5L21.303 18.7579C20.389 19.0961 19.932 19.2652 19.5986 19.5986C19.2652 19.932 19.0961 20.389 18.7579 21.303L18.5 22L18.2421 21.303C17.9039 20.389 17.7348 19.932 17.4014 19.5986C17.068 19.2652 16.611 19.0961 15.697 18.7579L15 18.5L15.697 18.2421C16.611 17.9039 17.068 17.7348 17.4014 17.4014C17.7348 17.068 17.9039 16.611 18.2421 15.697L18.5 15Z" />
          <path d="M2 9H21" />
          <path d="M6.49981 5.5H6.50879" />
          <path d="M10.4998 5.5H10.5088" />
        </svg>
      );
    case 'user':
      return (

        <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" width="22" height="22" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8.5C17 5.73858 14.7614 3.5 12 3.5C9.23858 3.5 7 5.73858 7 8.5C7 11.2614 9.23858 13.5 12 13.5C14.7614 13.5 17 11.2614 17 8.5Z" />
          <path d="M19 20.5C19 16.634 15.866 13.5 12 13.5C8.13401 13.5 5 16.634 5 20.5" />
        </svg>
      );
    default:
      return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════
   ProfileModal — Edit profile name
   ═══════════════════════════════════════════════════════════════════ */
const ProfileModal = ({ isOpen, onClose, currentName, onSubmit }) => {
  const [name, setName] = useState(currentName);

  useEffect(() => { if (isOpen) setName(currentName); }, [currentName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Update profile">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Update Profile</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }}>
          <div className="mb-4">
            <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input type="text" id="profileName" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="Enter your name" autoFocus />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   ExpandingNavItem — Compact pill that reveals label on hover
   ═══════════════════════════════════════════════════════════════════ */
const ExpandingNavItem = ({ item, isActive, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const leaveTimer = useRef(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setExpanded(true);
  }, []);
  const handleMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setExpanded(false), 150);
  }, []);
  const handleTouchStart = useCallback((e) => { e.preventDefault(); setExpanded((p) => !p); }, []);
  const handleClick = useCallback(() => {
    onClick();
    if (isTouchDevice.current) setTimeout(() => setExpanded(false), 1000);
  }, [onClick]);

  return (
    <button
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart} onClick={handleClick}
      aria-label={item.label}
      className={`relative flex items-center justify-center h-10 rounded-full overflow-hidden
        ${expanded ? 'pl-2 pr-4' : 'px-0'}
        ${isActive ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
      style={{
        width: expanded ? 'auto' : '40px', minWidth: expanded ? '120px' : '40px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="flex items-center justify-center flex-shrink-0"
        style={{ width: expanded ? '32px' : '40px', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <NavIcon name={item.icon} isActive={isActive} />
      </div>
      <span className="text-sm font-medium whitespace-nowrap" style={{
        opacity: expanded ? 1 : 0, maxWidth: expanded ? '200px' : '0',
        marginLeft: expanded ? '0.625rem' : '0',
        transition: 'opacity 0.3s ease-out, max-width 0.3s ease-out, margin-left 0.3s ease-out',
      }}>
        {item.label}
      </span>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   SearchBadge — Centre-stage gradient search button
   ═══════════════════════════════════════════════════════════════════ */
const SearchBadge = ({ onClick, compact = false }) => (
  <button onClick={onClick}
    className={`group flex items-center justify-center rounded-full flex-shrink-0
      bg-gradient-to-r from-amber-500 to-orange-600 text-white
      shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35
      active:scale-[0.97] transition-all duration-200
      ${compact ? 'mx-1.5 sm:mx-2.5 px-3 sm:px-4 h-10' : 'mx-3 px-5 h-10'}`}
    aria-label={`Parse Job Description (${IS_MAC ? '⌘' : 'Ctrl+'}K)`}
  >
    <NavIcon name="search" light />
    <span className={`font-semibold text-sm ${compact ? 'hidden sm:inline ml-0 sm:ml-2' : 'ml-2'}`}>Parse JD</span>
    {!compact && (
      <kbd className="hidden xl:inline-flex items-center ml-2 text-[10px] font-sans font-normal bg-white/20 backdrop-blur-sm rounded-md px-1.5 py-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
        {IS_MAC ? '⌘' : 'Ctrl+'}K
      </kbd>
    )}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════
   DropdownItem — Row inside the profile dropdown
   ═══════════════════════════════════════════════════════════════════ */
const DropdownItem = ({ icon, label, active = false, danger = false, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
      ${danger
        ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
        : active
          ? 'text-amber-700 bg-amber-50/80'
          : 'text-gray-600 hover:bg-amber-50/60 hover:text-amber-700'
      }`}
  >
    <span className="flex-shrink-0">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════
   ProfileDropdown — 3rd right-side slot
   Shows profile information with edit option
   Moving orange gradient text · hover/click dropdown
   ═══════════════════════════════════════════════════════════════════ */
const ProfileDropdown = ({
  currentPage, compact = false,
  onNavigate, onEditProfile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef(null);
  const leaveTimer = useRef(null);

  const isActive = false;
  const label = 'Profile';
  const showLabel = compact ? (hovered || isOpen) : true;

  /* Close on outside click */
  useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false); setHovered(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') { setIsOpen(false); setHovered(false); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen]);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const onEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setHovered(true); setIsOpen(true);
  }, []);

  const onLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => { setIsOpen(false); setHovered(false); }, 280);
  }, []);

  const doAction = useCallback((fn) => {
    fn(); setIsOpen(false); setHovered(false);
  }, []);

  /* ── Gradient text inline style ── */
  const gradientText = {
    background: 'linear-gradient(90deg, #f59e0b, #ea580c, #d97706, #f59e0b)',
    backgroundSize: '300% 100%',
    animation: 'profileGradientShift 3s ease infinite',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <div ref={containerRef} className="relative"
      onMouseEnter={onEnter} onMouseLeave={onLeave}>

      {/* ── Trigger ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={label} aria-expanded={isOpen} aria-haspopup="true"
        className={`relative flex items-center justify-center h-10 rounded-full
          text-sm font-medium transition-all duration-300
          ${isActive ? 'bg-white shadow-sm' : 'hover:bg-slate-50'}`}
        style={compact ? {
          width: showLabel ? 'auto' : '40px',
          minWidth: showLabel ? '105px' : '40px',
          paddingLeft: showLabel ? '8px' : '0',
          paddingRight: showLabel ? '10px' : '0',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        } : {
          paddingLeft: '16px', paddingRight: '14px',
        }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center flex-shrink-0"
          style={compact ? {
            width: showLabel ? '28px' : '40px',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          } : {}}>
          <NavIcon name="user" isActive={isActive} />
        </div>

        {/* Gradient label */}
        <span className="font-semibold text-sm whitespace-nowrap"
          style={{
            ...gradientText,
            ...(compact ? {
              opacity: showLabel ? 1 : 0,
              maxWidth: showLabel ? '80px' : '0',
              marginLeft: showLabel ? '6px' : '0',
              overflow: 'hidden',
              transition: 'opacity 0.25s, max-width 0.3s, margin-left 0.3s',
            } : { marginLeft: '8px' }),
          }}>
          {label}
        </span>

        {/* Chevron */}
        <svg
          className={`flex-shrink-0 text-amber-500 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}`}
          style={{
            width: '10px', height: '10px',
            marginLeft: compact ? (showLabel ? '3px' : '0') : '5px',
            opacity: compact ? (showLabel ? 0.6 : 0) : 0.6,
            transition: compact
              ? 'opacity 0.25s, margin-left 0.3s, transform 0.2s'
              : 'transform 0.2s',
          }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        /* Outer wrapper includes the gap so the mouse can travel from
           the trigger to the panel without triggering onMouseLeave */
        <div className="absolute right-0 top-full pt-1.5 z-[60]">
          <div className="w-56 bg-white backdrop-blur-xl rounded-2xl shadow-xl
                          shadow-black/[0.08] border border-gray-100 py-1"
            style={{ animation: 'dropdownSlideIn 0.18s ease-out' }}>

            {/* ──────── Profile menu ──────── */}
            <>
              {/* User card */}
              <div className="px-4 py-3 border-b border-gray-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500
                                  flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">Guest User</p>
                    <p className="text-[11px] text-gray-400">Talent Scout Platform</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <DropdownItem
                  icon={<NavIcon name="user" />}
                  label="Edit Profile"
                  onClick={() => doAction(onEditProfile)}
                />
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   GlobalHeader
   Layout: [Home Browse Bookmarks]  🔍 SEARCH  [Paused Stats Profile▾]
   ═══════════════════════════════════════════════════════════════════ */
const GlobalHeader = ({ currentPage = 'home', onProfileUpdate, onSearchSelect }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJDModal, setShowJDModal] = useState(false);
  const { profile, updateProfileName } = useProfile();

  const profileName = profile?.name || 'Guest';

  /* ── ⌘K / Ctrl+K ── */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowJDModal(true); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleProfileSubmit = useCallback(async (name) => {
    await updateProfileName(name);
    onProfileUpdate?.(name);
    setShowProfileModal(false);
  }, [updateProfileName, onProfileUpdate]);

  const handleJDExtracted = useCallback((jdData) => {
    console.log('🎉 JD data extracted in GlobalHeader:', jdData);
    // Pass extracted JD data to parent component
    onSearchSelect?.(jdData);
  }, [onSearchSelect]);

  useEffect(() => {
    // Listen for custom events to open JD modal
    const handleOpenJD = (e) => {
      console.log('openJDModal event received:', e.detail);
      setShowJDModal(true);
    };
    window.addEventListener('openJDModal', handleOpenJD);
    
    return () => {
      window.removeEventListener('openJDModal', handleOpenJD);
    };
  }, []);

  /* ── Desktop item renderer ── */
  const renderDesktopItem = (item) => {
    const isActive = currentPage === item.id;
    return (
      <button key={item.id} onClick={() => navigate(item.path)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center space-x-2 px-4 py-2 rounded-full
          text-sm font-medium transition-all duration-200
          ${isActive
            ? 'bg-white text-amber-700 shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
        <NavIcon name={item.icon} isActive={isActive} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Inject animation keyframes */}
      <style>{INJECTED_STYLES}</style>

      <header className="fixed h-16 top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-max">
        <div className="bg-white/80 backdrop-blur-lg h-full rounded-[1.25rem] shadow-lg
                        flex items-center px-2">
          {/* overflow-hidden intentionally removed so the dropdown
              can extend below the island container */}

          {/* ═══════════ Desktop (lg+) ═══════════ */}
          <nav className="hidden lg:flex items-center w-full" aria-label="Main navigation">
            {/* Left — 3 items */}
            <div className="flex items-center space-x-1 pl-1">
              {LEFT_NAV.map(renderDesktopItem)}
            </div>

            {/* Centre — Search */}
            <SearchBadge onClick={() => setShowJDModal(true)} />

            {/* Right — 2 items + Profile dropdown = 3 slots */}
            <div className="flex items-center space-x-1 pr-1">
              {RIGHT_NAV.map(renderDesktopItem)}
              <ProfileDropdown
                currentPage={currentPage}
                onNavigate={navigate}
                onEditProfile={() => setShowProfileModal(true)}
              />
            </div>
          </nav>

          {/* ═══════════ Compact (< lg) ═══════════ */}
          <nav className="lg:hidden flex items-center w-full" aria-label="Main navigation">
            <div className="flex items-center space-x-0.5 pl-0.5">
              {LEFT_NAV.map((item) => (
                <ExpandingNavItem key={item.id} item={item}
                  isActive={currentPage === item.id} onClick={() => navigate(item.path)} />
              ))}
            </div>

            <SearchBadge onClick={() => setShowJDModal(true)} compact />

            <div className="flex items-center space-x-0.5 pr-0.5">
              {RIGHT_NAV.map((item) => (
                <ExpandingNavItem key={item.id} item={item}
                  isActive={currentPage === item.id} onClick={() => navigate(item.path)} />
              ))}
              <ProfileDropdown
                currentPage={currentPage}
                compact
                onNavigate={navigate}
                onEditProfile={() => setShowProfileModal(true)}
              />
            </div>
          </nav>
        </div>
      </header>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentName={profileName}
        onSubmit={handleProfileSubmit}
      />

      <JDSearchModal
        isOpen={showJDModal}
        onClose={() => setShowJDModal(false)}
        onJDExtracted={handleJDExtracted}
      />
    </>
  );
};

export default GlobalHeader;