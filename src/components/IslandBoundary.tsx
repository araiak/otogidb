import { Component, Fragment, type ComponentType, type ReactNode } from 'react';

/**
 * Error boundary for Astro islands.
 *
 * React owns the DOM inside an island and remembers which node sits where. If
 * something outside React swaps those nodes — a page translator (Chrome's
 * "Translate this page" replaces text nodes wholesale) or a content-injecting
 * extension — the next unmount calls removeChild on a node that is no longer
 * where React left it and throws:
 *
 *   NotFoundError: Failed to execute 'removeChild' on 'Node'
 *
 * That throws from the commit phase, so without a boundary React tears down the
 * whole island root and the reader is left with a blank slot where the card
 * table used to be. Remounting rebuilds the subtree from React's own DOM, which
 * is normally enough; a second failure means it isn't, so stop and let the
 * reader reload rather than loop.
 */
class IslandBoundary extends Component<{ children: ReactNode }, { failures: number }> {
  state = { failures: 0 };

  // componentDidCatch alone makes this a boundary; the bump both remounts the
  // subtree (new key) and counts the attempt.
  componentDidCatch() {
    this.setState((s) => ({ failures: s.failures + 1 }));
  }

  render() {
    if (this.state.failures > 1) {
      return (
        <div className="p-4 text-sm text-secondary">
          Something went wrong displaying this section.{' '}
          <button className="link" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      );
    }
    // ponytail: a keyed Fragment discards the broken subtree without adding a
    // wrapper element that would land inside the page's flex/grid layouts.
    return <Fragment key={this.state.failures}>{this.props.children}</Fragment>;
  }
}

/** Wrap an island's default export so a DOM desync can't blank the island. */
export function withIslandBoundary<P extends object>(Inner: ComponentType<P>): ComponentType<P> {
  return function BoundedIsland(props: P) {
    return (
      <IslandBoundary>
        <Inner {...props} />
      </IslandBoundary>
    );
  };
}

export default IslandBoundary;
