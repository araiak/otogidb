import { useState, useEffect, useRef, useCallback } from 'react';

interface FilterDropdownProps {
  options: string[] | number[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  renderOption?: (opt: string | number) => React.ReactNode;
  placeholder: string;
  dropdownClassName?: string;
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
  dropdownClassName = ''
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([]);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

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

  const toggleOption = (opt: string | number) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open on arrow down or enter when closed
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          toggleOption(options[focusedIndex]);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  }, [isOpen, focusedIndex, options, toggleOption]);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs rounded border bg-primary hover:bg-surface transition-colors"
        style={{ borderColor: value.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
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
          {options.map((opt, index) => (
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
