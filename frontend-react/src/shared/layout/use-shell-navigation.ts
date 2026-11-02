import { useEffect, useState } from 'react';
import { mobileQuery } from './navigation';

export function useShellNavigation() {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('uptrack-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    const query = window.matchMedia(mobileQuery);
    const update = () => { setMobile(query.matches); setOpen(false); };
    query.addEventListener('change', update);
    // The viewport may have crossed the breakpoint between the initial render and this subscription;
    // that change was never delivered to us, so adopt the current state (a no-op when unchanged).
    setMobile(query.matches);
    return () => query.removeEventListener('change', update);
  }, []);
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('uptrack-sidebar-collapsed', String(next)); } catch { /* Optional persistence. */ }
  }
  return { mobile, open, setOpen, collapsed, toggleCollapsed };
}
