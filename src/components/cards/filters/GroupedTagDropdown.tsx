import { useState, useEffect, useRef } from 'react';

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
 */
export default function GroupedTagDropdown({
  categories,
  value,
  onChange,
  placeholder,
}: GroupedTagDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter(v => v !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  // Filter to only show categories that have tags
  const visibleCategories = categories.filter(cat => cat.tags.length > 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs rounded border bg-primary hover:bg-surface transition-colors"
        style={{ borderColor: value.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        {value.length > 0 ? `${value.length} selected` : placeholder}
      </button>
      {isOpen && (
        <div
          className="absolute z-50 mt-1 rounded-md shadow-lg border bg-primary min-w-[200px] max-h-[400px] overflow-y-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {visibleCategories.map((category, idx) => (
            <div key={category.name}>
              {idx > 0 && <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />}
              <div className="px-3 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wide">
                {category.name}
              </div>
              <div className="px-2 pb-1">
                {category.tags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-surface px-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(tag)}
                      onChange={() => toggleOption(tag)}
                      className="rounded"
                    />
                    <span className={`text-sm ${category.colorClass}`}>{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
