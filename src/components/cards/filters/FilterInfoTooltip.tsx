import { useState, useEffect, useRef } from 'react';

interface FilterInfoTooltipProps {
  text: string;
}

/**
 * Info tooltip component for filter help.
 * - Desktop: Shows floating tooltip on hover
 * - Mobile: Shows modal on tap
 */
export default function FilterInfoTooltip({ text }: FilterInfoTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    if (!showModal) return;
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

  const handleClick = () => {
    // On mobile (no hover), show modal
    if (window.matchMedia('(hover: none)').matches) {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="ml-1 p-0.5 rounded-full text-secondary hover:text-primary hover:bg-surface transition-colors"
          aria-label="Filter info"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {/* Desktop tooltip */}
        {showTooltip && (
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-md shadow-lg border whitespace-nowrap text-center hidden md:block"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {text}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--color-border)',
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:hidden">
          <div
            ref={tooltipRef}
            className="w-auto min-w-[320px] max-w-md rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-sm">Filter Info</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 text-sm">
              {text}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
