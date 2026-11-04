// TEMPORARY D01-B controlled CI failure probe. Disposable branch only; never merge.
import { describe, expect, it } from 'vitest';

describe('D01-B controlled CI failure probe', () => {
  it('deliberate frontend failure for CI validation', () => {
    expect('D01-B deliberate frontend failure').toBe('expected');
  });
});
