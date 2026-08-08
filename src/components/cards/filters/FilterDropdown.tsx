import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface FilterDropdownProps {
  options: string[] | number[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  renderOption?: (opt: string | number) => React.ReactNode;
  placeholder: string;
  dropdownClassName?: string;
  /** Show a filter box above the options. Worth it past ~20 options (e.g. events). */
  searchable?: boolean;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
}

/**
 * Multi-select dropdown for filter options.
 * Shows selected count and provides clear all functionality.
 * Supports keyboard navigation (arrows, escape, enter/space).
 */
export default function FilterDropdown({
  options,
  value,
  onChange,
  renderOption,
  placeholder,
  dropdownClassName = '',
  searchable = false,
  searchPlaceholder = 'Search...'
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Options actually rendered. Everything below indexes against THIS, not `options`,
  // or keyboard navigation would select a different row than the one highlighted.
  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return (options as (string | number)[]).filter(opt =>
      String(opt).toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      // Searchable dropdowns start with focus in the search box, not on an option.
      setFocusedIndex(searchable ? -1 : 0);
    } else {
      setFocusedIndex(-1);
      setQuery('');
    }
  }, [isOpen, searchable]);

  // Focus the search box on open, but only for mouse/trackpad users — autofocusing on
  // touch pops the on-screen keyboard over the list the user just asked to see.
  useEffect(() => {
    if (!isOpen || !searchable) return;
    if (window.matchMedia('(pointer: fine)').matches) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  // Keep the highlight inside the list as it shrinks while typing
  useEffect(() => {
    setFocusedIndex(prev => (prev >= visibleOptions.length ? visibleOptions.length - 1 : prev));
  }, [visibleOptions.length]);

  // Focus the option when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = useCallback((opt: string | number) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open on arrow down or enter when closed
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    // While typing in the search box, Space/Home/End belong to the text field — the
    // listbox must not swallow them, or the query can never contain a space.
    const typing = event.target === searchRef.current;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, visibleOptions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case ' ':
        if (typing) return;
      // falls through
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleOptions.length) {
          toggleOption(visibleOptions[focusedIndex]);
        }
        break;
      case 'Home':
        if (typing) return;
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        if (typing) return;
        event.preventDefault();
        setFocusedIndex(visibleOptions.length - 1);
        break;
    }
  }, [isOpen, focusedIndex, visibleOptions, toggleOption]);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs rounded border bg-primary hover:bg-surface transition-colors"
        style={{ borderColor: value.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        suppressHydrationWarning
      >
        {value.length > 0 ? `${value.length} selected` : placeholder}
      </button>
      {isOpen && (
        <div
          className={`absolute left-0 z-50 mt-1 p-2 rounded-md shadow-lg border bg-primary min-w-[120px] max-h-[60vh] overflow-y-auto ${dropdownClassName}`}
          style={{ borderColor: 'var(--color-border)', maxWidth: 'calc(100vw - 2rem)' }}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* sticky: the panel scrolls, and a search box that scrolls out of reach is
              worse than none once the list is long enough to need one. */}
          {searchable && (
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full mb-2 px-2 py-1 text-xs rounded border bg-primary outline-none focus:ring-2 focus:ring-accent sticky top-0 z-10"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}
          {searchable && visibleOptions.length === 0 && (
            <p className="px-2 py-1 text-xs text-secondary">No matches</p>
          )}
          {visibleOptions.map((opt, index) => (
            <label
              key={String(opt)}
              ref={el => { optionRefs.current[index] = el; }}
              tabIndex={focusedIndex === index ? 0 : -1}
              role="option"
              aria-selected={value.includes(opt)}
              className={`flex items-center gap-2 py-1.5 cursor-pointer px-2 rounded outline-none ${
                focusedIndex === index ? 'bg-surface ring-2 ring-accent' : 'hover:bg-surface'
              }`}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="rounded"
                tabIndex={-1}
              />
              {renderOption ? renderOption(opt) : String(opt)}
            </label>
          ))}
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mt-2 text-xs text-secondary hover:text-primary w-full text-left px-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
