import { useState, useEffect, useCallback } from 'react';
import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from '@floating-ui/react';

interface GlossaryEntry {
  definition: string;
  aliases?: string[];
  link?: string;
}

interface ActiveTerm {
  term: string;
  entry: GlossaryEntry;
}

interface GlossaryPopupsProps {
  /** Glossary lookup keyed by canonical term */
  glossary: Record<string, GlossaryEntry>;
}

const SELECTOR = 'span.glossary-term[data-glossary-term]';

/**
 * Hydrates .glossary-term spans in blog content with definition popups.
 * Desktop: hover shows a floating popup. Mobile (no-hover): tap opens a modal.
 *
 * Mirrors CardReferencePopups, but renders a plain-text definition instead of
 * rich card data, so it's self-contained rather than reusing useCardHover.
 * Terms are emitted by the remark-glossary build plugin; definitions live in
 * src/data/glossary.json.
 */
export default function GlossaryPopups({ glossary }: GlossaryPopupsProps) {
  const [active, setActive] = useState<ActiveTerm | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobileTerm, setMobileTerm] = useState<ActiveTerm | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: !!active,
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: referenceElement },
  });

  const resolve = useCallback(
    (target: HTMLElement | null): ActiveTerm | null => {
      const key = target?.dataset.glossaryTerm;
      if (key && glossary[key]) return { term: key, entry: glossary[key] };
      return null;
    },
    [glossary]
  );

  // Delegated hover (desktop) + tap (mobile) listeners.
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
      const resolved = resolve(target);
      if (target && resolved) {
        setActive(resolved);
        setReferenceElement(target);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(SELECTOR);
      const related = (e.relatedTarget as HTMLElement | null)?.closest(SELECTOR);
      if (target && !related) {
        setActive(null);
        setReferenceElement(null);
      }
    };

    const handleClick = (e: Event) => {
      if (!window.matchMedia('(hover: none)').matches) return;
      const target = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
      const resolved = resolve(target);
      if (target && resolved) {
        e.preventDefault();
        setMobileTerm(resolved);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
    };
  }, [resolve]);

  // Close mobile modal on outside tap / Escape.
  useEffect(() => {
    if (!mobileTerm) return;
    const close = () => setMobileTerm(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileTerm]);

  return (
    <>
      {/* Desktop floating popup */}
      {active && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="popup z-50 max-w-xs hidden md:block p-3 text-sm"
          >
            <div className="font-bold mb-1">{active.term}</div>
            <div className="text-secondary">{active.entry.definition}</div>
            {active.entry.link && (
              <a href={active.entry.link} className="link block mt-2 text-xs">
                Learn more →
              </a>
            )}
          </div>
        </FloatingPortal>
      )}

      {/* Mobile modal */}
      {mobileTerm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="glossary-modal-title"
          onClick={() => setMobileTerm(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3 id="glossary-modal-title" className="font-bold text-base truncate pr-2">
                {mobileTerm.term}
              </h3>
              <button
                onClick={() => setMobileTerm(null)}
                className="p-1 rounded-full hover:bg-gray-500/20 flex-shrink-0"
                aria-label="Close definition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto text-sm">
              <p>{mobileTerm.entry.definition}</p>
              {mobileTerm.entry.link && (
                <a href={mobileTerm.entry.link} className="link block mt-3">
                  Learn more →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
