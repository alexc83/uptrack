import { describe, it, expect } from 'vitest';
import { WorkGuardRegistry } from './work-guard';

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
