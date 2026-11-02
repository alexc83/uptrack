import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useShellNavigation } from './use-shell-navigation';

afterEach(() => vi.unstubAllGlobals());

/**
 * A viewport that can cross the 768px breakpoint without any `change` event being delivered
 * to a listener that was not yet attached (the real browser behaviour in the render→effect gap).
 */
function stubViewport(width: number) {
  let current = width;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() { return current <= 768; },
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    resizeSilently: (next: number) => { current = next; },
    resize: (next: number) => { current = next; listeners.forEach(listener => listener()); },
    listenerCount: () => listeners.size,
  };
}

describe('useShellNavigation breakpoint synchronization', () => {
  it('follows change events after mount', () => {
    const viewport = stubViewport(1280);
    const { result } = renderHook(() => useShellNavigation());
    expect(result.current.mobile).toBe(false);
    act(() => viewport.resize(767));
    expect(result.current.mobile).toBe(true);
    act(() => viewport.resize(769));
    expect(result.current.mobile).toBe(false);
  });

  it('adopts a breakpoint crossing that happened between initial state and listener subscription', () => {
    const viewport = stubViewport(1280);
    const original = window.matchMedia;
    let calls = 0;
    // The first read (initial state) sees desktop; the viewport then becomes mobile before the
    // effect subscribes, so no change event will ever be delivered for that transition.
    vi.stubGlobal('matchMedia', (query: string) => {
      const list = original(query);
      if (++calls === 1) { const snapshot = list.matches; viewport.resizeSilently(767); return { ...list, matches: snapshot, addEventListener: list.addEventListener, removeEventListener: list.removeEventListener } as MediaQueryList; }
      return list;
    });
    const { result } = renderHook(() => useShellNavigation());
    expect(result.current.mobile).toBe(true);
    expect(result.current.open).toBe(false);
    expect(viewport.listenerCount()).toBe(1);
  });

  it('unsubscribes on unmount', () => {
    const viewport = stubViewport(1280);
    const { unmount } = renderHook(() => useShellNavigation());
    expect(viewport.listenerCount()).toBe(1);
    unmount();
    expect(viewport.listenerCount()).toBe(0);
  });
});
