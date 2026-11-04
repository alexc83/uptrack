import '@testing-library/jest-dom';
import { transferableAbortController } from 'node:util';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { installMatchMedia } from './match-media';

// jsdom does not implement inert; the browser suite verifies native isolation.
if (!('inert' in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, 'inert', {
  configurable: true,
  get() { return this.hasAttribute('inert'); },
  set(value: boolean) { this.toggleAttribute('inert', value); },
});
// React Router's native Request must receive a Node AbortSignal, not jsdom's realm.
const NodeAbortController = transferableAbortController().constructor;
beforeEach(() => {
  installMatchMedia();
  vi.stubGlobal('AbortController', NodeAbortController);
  // jsdom logs "Not implemented: window.scrollTo"; real browsers implement it. Stub only in tests (unstubbed in afterEach)
  // so production scroll-to-top behavior stays untouched. A global stub, not a spy, so specs that call
  // vi.restoreAllMocks() in their own beforeEach do not silently remove it.
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(async () => {
  cleanup();
  // Overlay unmount queues scroll reconciliation and focus return before the next paint.
  // Finish that frame before resetting the DOM or letting another test establish its styles.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.body.removeAttribute('style');
  document.body.querySelectorAll('[inert]').forEach(element => element.removeAttribute('inert'));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
