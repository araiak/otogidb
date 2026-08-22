import { autoUpdate } from '@floating-ui/react';

/**
 * `autoUpdate`, but position writes are deferred to the next animation frame.
 *
 * autoUpdate observes the reference and floating elements with a
 * ResizeObserver and repositions from inside its callback. Any reposition that
 * changes the floating element's own size re-triggers the observer within the
 * same delivery cycle, which is what makes Chrome report "ResizeObserver loop
 * completed with undelivered notifications". Bouncing the write off rAF moves
 * it out of that cycle, and collapses a burst of triggers into one write.
 *
 * The first update stays synchronous: floatingStyles is `top:0; left:0` until
 * something positions it, so deferring frame one flashes the popup in the
 * corner of the screen.
 *
 * Cost: one frame of lag when repositioning during scroll or resize.
 */
export function rafAutoUpdate(
  reference: Parameters<typeof autoUpdate>[0],
  floating: Parameters<typeof autoUpdate>[1],
  update: () => void
): () => void {
  let frame = 0;
  let positioned = false;

  const cleanup = autoUpdate(reference, floating, () => {
    if (!positioned) {
      positioned = true;
      update();
      return;
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  });

  return () => {
    cancelAnimationFrame(frame);
    cleanup();
  };
}
