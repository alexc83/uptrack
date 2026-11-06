import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackendRecovery } from './use-backend-recovery';
import { useSlowNotice } from './use-slow-notice';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); setVisibility('visible'); });

describe('useSlowNotice', () => {
  it('turns on after the delay only while active and clears its timer when deactivated or unmounted', () => {
    const { result, rerender, unmount } = renderHook(({ active }) => useSlowNotice(active, 10_000), { initialProps: { active: true } });
    act(() => { vi.advanceTimersByTime(9_999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useBackendRecovery', () => {
  it('does nothing while inactive', () => {
    const check = vi.fn().mockResolvedValue(true);
    renderHook(() => useBackendRecovery(false, check, 15_000));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(check).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('polls at a low frequency through a 3 minute outage, reports recovery once, then stops', async () => {
    const check = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useBackendRecovery(true, check, 15_000));
    for (let i = 0; i < 12; i += 1) await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(check).toHaveBeenCalledTimes(12); // 3 minutes at 15s: one request per tick, no bursts
    expect(result.current).toBe(false);
    check.mockResolvedValue(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current).toBe(true);
    const calls = check.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(check).toHaveBeenCalledTimes(calls); // stopped after recovery
  });

  it('never overlaps checks and skips hidden tabs, then checks promptly when visible again', async () => {
    let release: (ok: boolean) => void = () => undefined;
    const check = vi.fn(() => new Promise<boolean>((resolve) => { release = resolve; }));
    renderHook(() => useBackendRecovery(true, check, 15_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
    expect(check).toHaveBeenCalledTimes(1); // first check still pending: later ticks skipped
    await act(async () => { release(false); await Promise.resolve(); });
    setVisibility('hidden');
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(check).toHaveBeenCalledTimes(1);
    await act(async () => { setVisibility('visible'); await Promise.resolve(); });
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight check and removes its timer and listener on unmount', async () => {
    let signal: AbortSignal | undefined;
    const check = vi.fn((s: AbortSignal) => { signal = s; return new Promise<boolean>(() => undefined); });
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useBackendRecovery(true, check, 15_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
