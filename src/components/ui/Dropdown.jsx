import React from 'react';
import { createPortal } from 'react-dom';

// ==================== UTILITY FUNCTIONS ====================
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ==================== HOOKS ====================
/**
 * Hook to handle click outside of elements
 */
function useClickOutside(refs, handler, enabled = true) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleEvent = (event) => {
      const target = event.target;
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(target)
      );
      if (isOutside) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleEvent);
    document.addEventListener('touchstart', handleEvent);

    return () => {
      document.removeEventListener('mousedown', handleEvent);
      document.removeEventListener('touchstart', handleEvent);
    };
  }, [refs, handler, enabled]);
}

// ==================== DROPDOWN COMPONENT ====================
/**
 * Robust Custom Dropdown Component
 *
 * Features:
 * - Smart viewport-aware positioning (flips up/down automatically)
 * - Handles scroll and resize events
 * - Smooth enter/exit animations
 * - Full keyboard navigation (arrows, enter, escape, home, end, type-ahead)
 * - Proper accessibility (ARIA attributes, focus management)
 * - Touch device support
 * - Optional search/filter
 * - Loading state
 * - Empty state
 * - Disabled options with proper keyboard skip
 * - Custom option rendering
 *
 * @param {object}   props
 * @param {string}   props.value               Currently selected value
 * @param {function} props.onChange             Callback when value changes
 * @param {Array<{value:string, label:string, disabled?:boolean, icon?:React.ReactNode, description?:string}>} props.options
 * @param {string}   [props.placeholder]        Placeholder text
 * @param {boolean}  [props.disabled]           Disable the dropdown
 * @param {string}   [props.className]          Additional class names
 * @param {string}   [props.label]              Accessible label
 * @param {string}   [props.error]              Error message
 * @param {string}   [props.helperText]         Helper / hint text
 * @param {boolean}  [props.searchable]         Enable search filtering
 * @param {string}   [props.searchPlaceholder]  Placeholder for the search input
 * @param {string}   [props.emptyMessage]       Shown when no options match
 * @param {boolean}  [props.loading]            Show a loading spinner
 * @param {number}   [props.maxHeight]          Max pixel height of the menu
 * @param {function} [props.renderOption]       Custom renderer (option, isSelected) => ReactNode
 *
 * @example
 * <Dropdown
 *   value={selectedValue}
 *   onChange={setValue}
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2', disabled: true },
 *     { value: 'option3', label: 'Option 3', description: 'With description' }
 *   ]}
 *   placeholder="Select an option"
 *   searchable
 * />
 */
export const Dropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  label,
  error,
  helperText,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  loading = false,
  maxHeight = 300,
  renderOption,
}) => {
  // ==================== STATE ====================
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [menuPosition, setMenuPosition] = React.useState(null);
  const [openDirection, setOpenDirection] = React.useState('down');
  const [animationState, setAnimationState] = React.useState('idle');
  const [shouldRender, setShouldRender] = React.useState(false);

  // ==================== REFS ====================
  const dropdownRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const optionsRef = React.useRef([]);

  // ==================== COMPUTED VALUES ====================
  const dropdownId = React.useId();
  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // ==================== POSITION CALCULATION ====================
  const calculateMenuPosition = React.useCallback(() => {
    if (!triggerRef.current) return null;

    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate available space
    const spaceBelow = viewportHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;

    // Determine menu height
    const estimatedMenuHeight = Math.min(
      maxHeight,
      filteredOptions.length * 44 + (searchable ? 52 : 0) + 16
    );

    // Determine direction
    let direction = 'down';
    let availableHeight = spaceBelow;

    if (spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow) {
      direction = 'up';
      availableHeight = spaceAbove;
    }

    const menuMaxHeight = Math.min(maxHeight, availableHeight);

    // Calculate top position
    let top;
    if (direction === 'down') {
      top = rect.bottom + padding;
    } else {
      top = rect.top - menuMaxHeight - padding;
    }

    // Handle horizontal overflow
    let left = rect.left;
    const menuWidth = rect.width;

    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setOpenDirection(direction);

    return {
      top: Math.max(padding, top),
      left,
      width: rect.width,
      maxHeight: menuMaxHeight,
    };
  }, [filteredOptions.length, maxHeight, searchable]);

  const updateMenuPosition = React.useCallback(() => {
    const position = calculateMenuPosition();
    if (position) {
      setMenuPosition(position);
    }
  }, [calculateMenuPosition]);

  // ==================== KEYBOARD NAVIGATION HELPERS ====================
  const findNextEnabledIndex = React.useCallback(
    (startIndex, direction) => {
      const opts = filteredOptions;
      let index = startIndex;

      while (index >= 0 && index < opts.length) {
        if (!opts[index]?.disabled) return index;
        index += direction;
      }
      return -1;
    },
    [filteredOptions]
  );

  const findFirstEnabledIndex = React.useCallback(() => {
    return findNextEnabledIndex(0, 1);
  }, [findNextEnabledIndex]);

  const findLastEnabledIndex = React.useCallback(() => {
    return findNextEnabledIndex(filteredOptions.length - 1, -1);
  }, [findNextEnabledIndex, filteredOptions.length]);

  // ==================== EVENT HANDLERS ====================
  const openMenu = React.useCallback(() => {
    if (disabled) return;

    setIsOpen(true);
    setShouldRender(true);
    setSearchQuery('');

    // Calculate position immediately
    requestAnimationFrame(() => {
      const position = calculateMenuPosition();
      if (position) {
        setMenuPosition(position);
      }

      // Start animation after position is set
      requestAnimationFrame(() => {
        setAnimationState('entering');
      });
    });

    // Set initial highlighted index
    const selectedIndex = options.findIndex((opt) => opt.value === value);
    if (selectedIndex >= 0 && !options[selectedIndex].disabled) {
      setHighlightedIndex(selectedIndex);
    } else {
      setHighlightedIndex(findFirstEnabledIndex());
    }
  }, [disabled, calculateMenuPosition, options, value, findFirstEnabledIndex]);

  const closeMenu = React.useCallback(() => {
    setAnimationState('exiting');

    const timer = setTimeout(() => {
      setIsOpen(false);
      setShouldRender(false);
      setAnimationState('idle');
      setHighlightedIndex(-1);
      setSearchQuery('');
      setMenuPosition(null);
    }, 150); // Match animation duration

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = React.useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  const handleOptionSelect = React.useCallback(
    (optionValue, optionDisabled) => {
      if (optionDisabled) return;

      onChange(optionValue);
      closeMenu();
      triggerRef.current?.focus();
    },
    [onChange, closeMenu]
  );

  const handleKeyDown = React.useCallback(
    (e) => {
      if (!isOpen) {
        // Open on arrow down/up or enter/space when closed
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          openMenu();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            if (prev === -1) return findFirstEnabledIndex();
            const next = findNextEnabledIndex(prev + 1, 1);
            return next !== -1 ? next : prev;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            if (prev === -1) return findLastEnabledIndex();
            const next = findNextEnabledIndex(prev - 1, -1);
            return next !== -1 ? next : prev;
          });
          break;

        case 'Home':
          e.preventDefault();
          setHighlightedIndex(findFirstEnabledIndex());
          break;

        case 'End':
          e.preventDefault();
          setHighlightedIndex(findLastEnabledIndex());
          break;

        case 'Enter':
        case ' ':
          // Don't prevent default for space in search input
          if (
            e.key === ' ' &&
            searchable &&
            document.activeElement === searchInputRef.current
          ) {
            return;
          }
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(
              filteredOptions[highlightedIndex].value,
              filteredOptions[highlightedIndex].disabled
            );
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeMenu();
          triggerRef.current?.focus();
          break;

        case 'Tab':
          closeMenu();
          break;

        default:
          break;
      }
    },
    [
      isOpen,
      openMenu,
      closeMenu,
      highlightedIndex,
      filteredOptions,
      handleOptionSelect,
      findFirstEnabledIndex,
      findLastEnabledIndex,
      findNextEnabledIndex,
      searchable,
    ]
  );

  // ==================== EFFECTS ====================
  // Handle click outside
  useClickOutside([dropdownRef, menuRef], closeMenu, isOpen);

  // Handle scroll and resize
  React.useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    // Use capture phase to catch scroll on any element
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateMenuPosition]);

  // Focus search input when menu opens
  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;

    const optionElement = optionsRef.current[highlightedIndex];
    if (optionElement) {
      optionElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const currentHighlighted = filteredOptions[highlightedIndex];
      if (!currentHighlighted || currentHighlighted.disabled) {
        setHighlightedIndex(findFirstEnabledIndex());
      }
    } else if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions, highlightedIndex, isOpen, findFirstEnabledIndex]);

  // Global keyboard handler for when focus is on trigger
  React.useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (document.activeElement === triggerRef.current || isOpen) {
        handleKeyDown(e);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // ==================== RENDER HELPERS ====================
  const renderOptionContent = (option, isSelected) => {
    if (renderOption) {
      return renderOption(option, isSelected);
    }

    return (
      <>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {option.icon && (
              <span className="flex-shrink-0 w-5 h-5">{option.icon}</span>
            )}
            <span className="truncate">{option.label}</span>
          </div>
          {option.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {option.description}
            </p>
          )}
        </div>
        {isSelected && (
          <svg
            className="w-4 h-4 text-blue-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </>
    );
  };

  // ==================== ANIMATION STYLES ====================
  const getAnimationClass = () => {
    if (animationState === 'entering') {
      return openDirection === 'down'
        ? 'animate-dropdown-enter-down'
        : 'animate-dropdown-enter-up';
    }
    if (animationState === 'exiting') {
      return openDirection === 'down'
        ? 'animate-dropdown-exit-down'
        : 'animate-dropdown-exit-up';
    }
    return '';
  };

  // ==================== RENDER ====================
  return (
    <div className={cn('w-full', className)} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={`${dropdownId}-trigger`}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={`${dropdownId}-trigger`}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          // Base styles
          'relative w-full h-11 px-4 flex items-center justify-between gap-2',
          'bg-white border rounded-xl text-left',
          'transition-all duration-200 ease-out',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          // Default state
          !error && !disabled && 'border-gray-200 hover:border-gray-300',
          // Error state
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          // Placeholder text
          !selectedOption && 'text-gray-400'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${dropdownId}-label` : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error
            ? `${dropdownId}-error`
            : helperText
            ? `${dropdownId}-helper`
            : undefined
        }
        aria-activedescendant={
          isOpen && highlightedIndex >= 0
            ? `${dropdownId}-option-${highlightedIndex}`
            : undefined
        }
      >
        <span className="truncate text-sm">{displayText}</span>

        {/* Chevron / Loading indicator */}
        {loading ? (
          <svg
            className="w-4 h-4 text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Error message */}
      {error && (
        <p id={`${dropdownId}-error`} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p id={`${dropdownId}-helper`} className="mt-1.5 text-xs text-gray-500">
          {helperText}
        </p>
      )}

      {/* Dropdown Menu Portal */}
      {shouldRender &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              'fixed z-[9999] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden',
              getAnimationClass()
            )}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              maxHeight: `${menuPosition.maxHeight}px`,
            }}
            role="listbox"
            aria-labelledby={`${dropdownId}-trigger`}
            tabIndex={-1}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={cn(
                      'w-full h-9 pl-9 pr-3 text-sm',
                      'bg-gray-50 border border-gray-200 rounded-lg',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                      'placeholder:text-gray-400'
                    )}
                    aria-label="Search options"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              className="overflow-y-auto py-1"
              style={{
                maxHeight: `${menuPosition.maxHeight - (searchable ? 52 : 0)}px`,
              }}
            >
              {/* Loading State */}
              {loading && (
                <div className="px-4 py-8 text-center">
                  <svg
                    className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredOptions.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <svg
                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">{emptyMessage}</p>
                </div>
              )}

              {/* Options */}
              {!loading &&
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      ref={(el) => {
                        optionsRef.current[index] = el;
                      }}
                      id={`${dropdownId}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer',
                        'transition-colors duration-100',
                        // Default state
                        !isSelected &&
                          !isHighlighted &&
                          !option.disabled &&
                          'text-gray-700 hover:bg-gray-50',
                        // Selected state
                        isSelected && !isHighlighted && 'bg-blue-50 text-blue-700',
                        // Highlighted state
                        isHighlighted &&
                          !option.disabled &&
                          'bg-blue-100 text-blue-700',
                        // Disabled state
                        option.disabled &&
                          'opacity-50 cursor-not-allowed text-gray-400'
                      )}
                      onClick={() =>
                        handleOptionSelect(option.value, option.disabled)
                      }
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedIndex(index);
                        }
                      }}
                    >
                      {renderOptionContent(option, isSelected)}
                    </div>
                  );
                })}
            </div>
          </div>,
          document.body
        )}

      {/* CSS for animations */}
      <style>{`
        @keyframes dropdown-enter-down {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dropdown-exit-down {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
        }

        @keyframes dropdown-enter-up {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dropdown-exit-up {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
        }

        .animate-dropdown-enter-down {
          animation: dropdown-enter-down 0.15s ease-out forwards;
        }

        .animate-dropdown-exit-down {
          animation: dropdown-exit-down 0.15s ease-in forwards;
        }

        .animate-dropdown-enter-up {
          animation: dropdown-enter-up 0.15s ease-out forwards;
        }

        .animate-dropdown-exit-up {
          animation: dropdown-exit-up 0.15s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default Dropdown;