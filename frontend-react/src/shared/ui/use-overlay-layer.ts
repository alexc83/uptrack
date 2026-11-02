import { useContext, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { OverlayContext } from './overlay-context';

export interface FocusOptions {
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}
const focusableSelector = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function useOverlayLayer(open: boolean, trap: boolean, { initialFocusRef, returnFocusRef, fallbackFocusRef }: FocusOptions) {
  const context = useContext(OverlayContext);
  if (!context) throw new Error('Overlays require OverlayProvider');
  const manager = context;
  const [host] = useState(() => document.createElement('div'));
  const options = useRef({ initialFocusRef, returnFocusRef, fallbackFocusRef });
  options.current = { initialFocusRef, returnFocusRef, fallbackFocusRef };
  const isTop = () => manager.isTop(host);
  useLayoutEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    host.dataset.overlayLayer = trap ? 'drawer' : 'modal';
    host.style.position = 'relative';
    host.style.zIndex = '50';
    document.body.append(host);
    const unregister = manager.register(host);
    const focusable = () => Array.from(host.querySelectorAll<HTMLElement>(focusableSelector)).filter(el => !el.closest('[inert], [hidden]') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
    const focusFirst = () => (options.current.initialFocusRef?.current ?? focusable()[0] ?? host.querySelector<HTMLElement>('[role="dialog"]'))?.focus();
    const frame = trap ? requestAnimationFrame(focusFirst) : undefined;
    function handleTab(event: KeyboardEvent) {
      if (!trap || !manager.isTop(host) || event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); host.querySelector<HTMLElement>('[role="dialog"]')?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
    }
    function handleFocus(event: FocusEvent) {
      if (trap && manager.isTop(host) && event.target instanceof Node && !host.contains(event.target)) focusFirst();
    }
    document.addEventListener('keydown', handleTab, true);
    document.addEventListener('focusin', handleFocus);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleTab, true);
      document.removeEventListener('focusin', handleFocus);
      unregister();
      host.remove();
      const target = options.current.returnFocusRef?.current ?? opener;
      // Let Flowbite's modal cleanup run before applying the disconnected-opener fallback.
      requestAnimationFrame(() => {
        const restore = target?.isConnected && !target.closest('[inert]') ? target : options.current.fallbackFocusRef?.current;
        restore?.focus();
      });
    };
  }, [host, manager, open, trap]);
  return { host, isTop };
}
