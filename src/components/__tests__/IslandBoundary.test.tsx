import { describe, it, expect, vi, afterEach } from 'vitest';
import IslandBoundary from '../IslandBoundary';

// The boundary exists to survive a commit-phase DOMException (removeChild on a
// node a page translator moved). It can't be provoked in SSR, so drive the
// lifecycle directly: one failure retries, a second one gives up.
function makeBoundary() {
  const b = new IslandBoundary({ children: null });
  b.setState = (updater: any) => { b.state = { ...b.state, ...updater(b.state) }; };
  return b;
}

afterEach(() => vi.restoreAllMocks());

describe('IslandBoundary', () => {
  it('remounts the subtree on the first failure', () => {
    const b = makeBoundary();
    b.componentDidCatch();
    expect(b.state.failures).toBe(1);
    // Keyed fragment, not the fallback: children still render.
    expect((b.render() as any).key).toBe('1');
  });

  it('falls back after a second failure', () => {
    const b = makeBoundary();
    b.componentDidCatch();
    b.componentDidCatch();
    expect((b.render() as any).type).toBe('div');
  });
});
