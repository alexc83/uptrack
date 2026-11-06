import { useEffect, useState } from 'react';

export const SLOW_NOTICE_DELAY_MS = 10_000;

/** True once `active` has stayed true for `delayMs`. The timer is cleared as soon as `active` ends or the component unmounts. */
export function useSlowNotice(active: boolean, delayMs = SLOW_NOTICE_DELAY_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);
  return active && slow;
}
