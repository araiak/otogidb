import { useState, useEffect, useRef } from 'react';

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

  const toggleOption = (opt: string | number) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

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
          className={`absolute z-50 mt-1 p-2 rounded-md shadow-lg border bg-primary min-w-[120px] ${dropdownClassName}`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {options.map((opt) => (
            <label key={String(opt)} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-surface px-2 rounded">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="rounded"
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
