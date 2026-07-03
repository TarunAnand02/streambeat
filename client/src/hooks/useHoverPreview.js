import { useCallback, useRef, useState } from 'react';

const HOVER_DELAY_MS = 500;

export function useHoverPreview() {
  const [previewing, setPreviewing] = useState(false);
  const timeoutRef = useRef(null);

  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => setPreviewing(true), HOVER_DELAY_MS);
  }, []);

  const onMouseLeave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setPreviewing(false);
  }, []);

  return { previewing, onMouseEnter, onMouseLeave };
}
