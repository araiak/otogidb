import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface TagCategory {
  name: string;
  tags: string[];
  colorClass: string;
}

interface GroupedTagDropdownProps {
  categories: TagCategory[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}

/**
 * Grouped tag filter dropdown with categories.
 * Displays tags organized by category with section headers.
 * Supports keyboard navigation (arrows, escape, enter/space).
 */
export default function GroupedTagDropdown({
  categories,
  value,
  onChange,
  placeholder,
}: GroupedTagDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([]);

  // Filter to only show categories that have tags
  const visibleCategories = useMemo(() =>
    categories.filter(cat => cat.tags.length > 0),
    [categories]
  );

  // Flatten all tags for keyboard navigation
  const allTags = useMemo(() => {
    const tags: { tag: string; colorClass: string }[] = [];
    visibleCategories.forEach(cat => {
      cat.tags.forEach(tag => tags.push({ tag, colorClass: cat.colorClass }));
    });
    return tags;
  }, [visibleCategories]);

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

  const toggleOption = useCallback((tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter(v => v !== tag));
    } else {
      onChange([...value, tag]);
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
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
        setFocusedIndex(prev => Math.min(prev + 1, allTags.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allTags.length) {
          toggleOption(allTags[focusedIndex].tag);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(allTags.length - 1);
        break;
    }
  }, [isOpen, focusedIndex, allTags, toggleOption]);

  // Track global index for refs across categories
  let globalIndex = 0;

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
          className="absolute z-50 mt-1 rounded-md shadow-lg border bg-primary min-w-[200px] max-h-[400px] overflow-y-auto"
          style={{ borderColor: 'var(--color-border)' }}
          role="listbox"
          aria-multiselectable="true"
        >
          {visibleCategories.map((category, idx) => {
            const categoryTags = category.tags.map(tag => {
              const currentIndex = globalIndex++;
              return (
                <label
                  key={tag}
                  ref={el => { optionRefs.current[currentIndex] = el; }}
                  tabIndex={focusedIndex === currentIndex ? 0 : -1}
                  role="option"
                  aria-selected={value.includes(tag)}
                  className={`flex items-center gap-2 py-1 cursor-pointer px-2 rounded outline-none ${
                    focusedIndex === currentIndex ? 'bg-surface ring-2 ring-accent' : 'hover:bg-surface'
                  }`}
                  onMouseEnter={() => setFocusedIndex(currentIndex)}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(tag)}
                    onChange={() => toggleOption(tag)}
                    className="rounded"
                    tabIndex={-1}
                  />
                  <span className={`text-sm ${category.colorClass}`}>{tag}</span>
                </label>
              );
            });

            return (
              <div key={category.name}>
                {idx > 0 && <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />}
                <div className="px-3 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wide">
                  {category.name}
                </div>
                <div className="px-2 pb-1">
                  {categoryTags}
                </div>
              </div>
            );
          })}
          {value.length > 0 && (
            <div className="border-t px-2 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => onChange([])}
                className="text-xs text-secondary hover:text-primary w-full text-left px-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
