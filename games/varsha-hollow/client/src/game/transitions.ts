/**
 * Varsha Hollow — Chapter Transition System
 * ==========================================
 *
 * A CSS-driven fade/slide transition between chapters. The old chapter
 * content fades out and slides left; the new chapter content fades in
 * and slides from the right. Duration ~400ms with a smooth cubic-bezier.
 *
 * This module is framework-agnostic: it applies CSS classes to a
 * container element and resolves a promise when the transition
 * completes. Integration in React is done via a small hook (see the
 * integration instructions in the report) that toggles a key/state on
 * the story container.
 */

export type TransitionDirection = "forward" | "backward";

export type TransitionHandle = {
  /**
   * Run a chapter transition on the given container element.
   * Adds the `chapter-out` class, waits for the out-animation,
   * then swaps to the `chapter-in` class. Returns a promise that
   * resolves when the full transition is complete.
   */
  run(container: HTMLElement, direction?: TransitionDirection): Promise<void>;
  /** The configured transition duration in milliseconds. */
  readonly duration: number;
};

export const CHAPTER_TRANSITION_MS = 400;

/**
 * Create a transition handle. The CSS classes (`chapter-out`,
 * `chapter-in`, and their `--reverse` variants) must be present in
 * `index.css` (added by this feature).
 */
export function createChapterTransition(): TransitionHandle {
  return {
    duration: CHAPTER_TRANSITION_MS,

    async run(container: HTMLElement, direction: TransitionDirection = "forward") {
      const outClass = direction === "forward" ? "chapter-out" : "chapter-out-reverse";
      const inClass = direction === "forward" ? "chapter-in" : "chapter-in-reverse";

      /* Phase 1: fade/slide old content out. */
      container.classList.remove("chapter-in", "chapter-in-reverse", "chapter-out", "chapter-out-reverse");
      // Force a reflow so the browser registers the class change.
      void container.offsetWidth;
      container.classList.add(outClass);

      await wait(CHAPTER_TRANSITION_MS);

      /* Phase 2: fade/slide new content in. */
      container.classList.remove(outClass);
      void container.offsetWidth;
      container.classList.add(inClass);

      await wait(CHAPTER_TRANSITION_MS);

      /* Clean up so subsequent transitions start fresh. */
      container.classList.remove(inClass);
    },
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* React helper: a hook-free trigger function                          */
/* ------------------------------------------------------------------ */

/**
 * A convenience function for React integration. Given a ref to the
 * story container and a callback that performs the state swap (e.g.
 * `setState(next)`), it runs the out-transition, calls the swap, then
 * runs the in-transition.
 *
 * Usage (inside a React event handler or effect):
 *   await triggerChapterTransition(storyRef, () => choose(choiceId));
 */
export async function triggerChapterTransition(
  container: HTMLElement | null,
  swap: () => void,
  direction: TransitionDirection = "forward",
): Promise<void> {
  if (!container) {
    swap();
    return;
  }
  const transition = createChapterTransition();
  const outClass = direction === "forward" ? "chapter-out" : "chapter-out-reverse";
  const inClass = direction === "forward" ? "chapter-in" : "chapter-in-reverse";

  container.classList.remove("chapter-in", "chapter-in-reverse", "chapter-out", "chapter-out-reverse");
  void container.offsetWidth;
  container.classList.add(outClass);

  await wait(CHAPTER_TRANSITION_MS);

  swap();

  container.classList.remove(outClass);
  void container.offsetWidth;
  container.classList.add(inClass);

  await wait(CHAPTER_TRANSITION_MS);
  container.classList.remove(inClass);
}
