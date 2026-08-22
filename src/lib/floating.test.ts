import { describe, it, expect, vi, beforeEach } from 'vitest';

// autoUpdate is a DOM observer; stub it so the test can drive its callback.
let trigger: () => void;
const innerCleanup = vi.fn();
vi.mock('@floating-ui/react', () => ({
  autoUpdate: (_r: unknown, _f: unknown, cb: () => void) => {
    trigger = cb;
    return innerCleanup;
  },
}));

const { rafAutoUpdate } = await import('./floating');

let frames: Array<() => void>;
beforeEach(() => {
  frames = [];
  innerCleanup.mockClear();
  globalThis.requestAnimationFrame = ((cb: () => void) => frames.push(cb)) as never;
  globalThis.cancelAnimationFrame = ((id: number) => {
    delete frames[id - 1];
  }) as never;
});
const flush = () => frames.forEach((cb) => cb?.());

describe('rafAutoUpdate', () => {
  it('runs the first update synchronously so the popup never flashes at 0,0', () => {
    const update = vi.fn();
    rafAutoUpdate({} as never, {} as never, update);
    trigger();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('defers later updates out of the ResizeObserver delivery cycle', () => {
    const update = vi.fn();
    rafAutoUpdate({} as never, {} as never, update);
    trigger(); // first, sync
    trigger();
    expect(update).toHaveBeenCalledTimes(1);
    flush();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('coalesces a burst of triggers into one write', () => {
    const update = vi.fn();
    rafAutoUpdate({} as never, {} as never, update);
    trigger();
    trigger();
    trigger();
    trigger();
    flush();
    expect(update).toHaveBeenCalledTimes(2); // one sync + one coalesced
  });

  it('cancels a pending update on cleanup so it cannot fire after unmount', () => {
    const update = vi.fn();
    const cleanup = rafAutoUpdate({} as never, {} as never, update);
    trigger();
    trigger();
    cleanup();
    flush();
    expect(update).toHaveBeenCalledTimes(1);
    expect(innerCleanup).toHaveBeenCalled();
  });
});
