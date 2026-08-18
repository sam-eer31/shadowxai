import { useEffect, useRef, useState } from 'react';

interface SmoothStreamOptions {
  /**
   * Whether smoothing is currently active.
   * If false, snaps immediately to targetText.
   */
  enabled?: boolean;
}

/**
 * Custom hook that smoothly unrolls incoming text stream token-by-token / character-by-character.
 * When providers (like Gemini or Ollama) send large paragraph chunks in a single SSE event,
 * this hook interpolates the text across animation frames to provide a fluid typewriter experience.
 */
export function useSmoothStream(
  targetText: string,
  options: SmoothStreamOptions = {}
): string {
  const { enabled = true } = options;
  const [displayedText, setDisplayedText] = useState(targetText);
  const targetRef = useRef(targetText);
  targetRef.current = targetText;

  const displayedRef = useRef(displayedText);
  displayedRef.current = displayedText;

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(targetText);
      displayedRef.current = targetText;
      return;
    }

    // If text was cleared or drastically reset, sync immediately
    if (!targetText) {
      setDisplayedText('');
      displayedRef.current = '';
      return;
    }

    // If target does not start with what we already displayed, sync immediately
    if (displayedRef.current && !targetText.startsWith(displayedRef.current.slice(0, Math.min(displayedRef.current.length, 10)))) {
      setDisplayedText(targetText);
      displayedRef.current = targetText;
      return;
    }

    let animationFrameId: number;

    const tick = () => {
      const target = targetRef.current;
      const current = displayedRef.current;

      if (current.length < target.length) {
        const remaining = target.length - current.length;

        // Adaptive pacing:
        // - Small stream (1-4 chars): 1 char per frame (natural typing)
        // - Medium stream (5-15 chars): 2 chars per frame
        // - Fast stream (16-50 chars): 3-5 chars per frame
        // - Paragraph bursts (50+ chars): Scales smoothly so large paragraphs unroll across ~10 frames (160ms)
        let step = 1;
        if (remaining > 100) {
          step = Math.max(8, Math.ceil(remaining / 8));
        } else if (remaining > 50) {
          step = Math.max(5, Math.ceil(remaining / 7));
        } else if (remaining > 20) {
          step = 3;
        } else if (remaining > 6) {
          step = 2;
        } else {
          step = 1;
        }

        // Apply a hard max typing speed limit (e.g., 10 chars per frame = ~600 chars/sec)
        // No matter how fast the model generates, the stream will not unroll faster than this.
        const MAX_CHARS_PER_FRAME = 1;
        step = Math.min(step, MAX_CHARS_PER_FRAME);

        const nextLength = Math.min(target.length, current.length + step);
        const nextText = target.slice(0, nextLength);

        displayedRef.current = nextText;
        setDisplayedText(nextText);
      }

      if (displayedRef.current.length < targetRef.current.length) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetText, enabled]);

  return enabled ? displayedText : targetText;
}
