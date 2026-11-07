import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WorkGuardRegistry } from './work-guard';
import { useRegisterWorkGuard, useWorkGuard, WorkGuardProvider } from './work-guard-context';

describe('WorkGuardRegistry', () => {
  it('reports clear status when empty', () => {
    const registry = new WorkGuardRegistry();
    const status = registry.check();
    expect(status.hasUnsavedChanges).toBe(false);
    expect(status.isBusy).toBe(false);
    expect(status.reasons).toEqual([]);
  });

  it('detects dirty forms and busy operations', () => {
    const registry = new WorkGuardRegistry();
    const unregisterForm = registry.register({
      id: 'test-form',
      description: 'Credential form',
      isDirty: () => true,
      isBusy: () => false,
    });
    const unregisterUpload = registry.register({
      id: 'test-upload',
      description: 'Certificate upload',
      isDirty: () => false,
      isBusy: () => true,
    });

    const status = registry.check();
    expect(status.hasUnsavedChanges).toBe(true);
    expect(status.isBusy).toBe(true);
    expect(status.reasons).toContain('Credential form (unsaved changes)');
    expect(status.reasons).toContain('Certificate upload (in progress)');

    unregisterForm();
    const afterForm = registry.check();
    expect(afterForm.hasUnsavedChanges).toBe(false);
    expect(afterForm.isBusy).toBe(true);

    unregisterUpload();
    const clean = registry.check();
    expect(clean.hasUnsavedChanges).toBe(false);
    expect(clean.isBusy).toBe(false);
  });
});

describe('useRegisterWorkGuard React hook lifecycle', () => {
  it('registers on mount and unregisters on unmount without retaining stale guards', () => {
    const registry = new WorkGuardRegistry();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkGuardProvider registry={registry}>{children}</WorkGuardProvider>
    );

    const { unmount } = renderHook(
      () =>
        useRegisterWorkGuard({
          id: 'credential-form',
          description: 'Credential form',
          isDirty: () => true,
        }),
      { wrapper }
    );

    expect(registry.check().hasUnsavedChanges).toBe(true);
    expect(registry.check().reasons).toContain('Credential form (unsaved changes)');

    unmount();

    // Verify unmount cleans up guard completely
    expect(registry.check().hasUnsavedChanges).toBe(false);
    expect(registry.check().reasons).toEqual([]);
  });

  it('updates isDirty and isBusy status dynamically across renders without reregistering', () => {
    const registry = new WorkGuardRegistry();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkGuardProvider registry={registry}>{children}</WorkGuardProvider>
    );

    let dirtyState = false;
    let busyState = false;

    const { rerender } = renderHook(
      () =>
        useRegisterWorkGuard({
          id: 'ce-record-form',
          description: 'CE form',
          isDirty: () => dirtyState,
          isBusy: () => busyState,
        }),
      { wrapper }
    );

    expect(registry.check().hasUnsavedChanges).toBe(false);
    expect(registry.check().isBusy).toBe(false);

    // Make form dirty
    dirtyState = true;
    rerender();
    expect(registry.check().hasUnsavedChanges).toBe(true);
    expect(registry.check().isBusy).toBe(false);

    // Start in-flight upload
    busyState = true;
    rerender();
    expect(registry.check().hasUnsavedChanges).toBe(true);
    expect(registry.check().isBusy).toBe(true);

    // Complete upload and save
    dirtyState = false;
    busyState = false;
    rerender();
    expect(registry.check().hasUnsavedChanges).toBe(false);
    expect(registry.check().isBusy).toBe(false);
  });

  it('handles multiple independent guard registrations and unmounts cleanly', () => {
    const registry = new WorkGuardRegistry();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkGuardProvider registry={registry}>{children}</WorkGuardProvider>
    );

    const hook1 = renderHook(
      () =>
        useRegisterWorkGuard({
          id: 'form-1',
          description: 'Form 1',
          isDirty: () => true,
        }),
      { wrapper }
    );

    const hook2 = renderHook(
      () =>
        useRegisterWorkGuard({
          id: 'upload-2',
          description: 'Upload 2',
          isBusy: () => true,
        }),
      { wrapper }
    );

    const checkHook = renderHook(() => useWorkGuard(), { wrapper });

    expect(checkHook.result.current.check().hasUnsavedChanges).toBe(true);
    expect(checkHook.result.current.check().isBusy).toBe(true);

    // Unmount hook1 only
    act(() => {
      hook1.unmount();
    });

    expect(checkHook.result.current.check().hasUnsavedChanges).toBe(false);
    expect(checkHook.result.current.check().isBusy).toBe(true);

    // Unmount hook2
    act(() => {
      hook2.unmount();
    });

    expect(checkHook.result.current.check().hasUnsavedChanges).toBe(false);
    expect(checkHook.result.current.check().isBusy).toBe(false);
  });
});
