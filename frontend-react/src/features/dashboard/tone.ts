import type { DashboardTone } from './dashboard-view';

/** Existing M04 tokens only; every pair is defined for both themes in globals.css. */
export const toneSurface: Record<DashboardTone, string> = {
  primary: 'bg-ut-primary-subtle text-ut-primary',
  active: 'bg-[var(--ut-status-active-bg)] text-[var(--ut-status-active-text)]',
  expiring: 'bg-[var(--ut-status-expiring-bg)] text-[var(--ut-status-expiring-text)]',
  expired: 'bg-[var(--ut-status-expired-bg)] text-[var(--ut-status-expired-text)]',
};
export const toneText: Record<DashboardTone, string> = {
  primary: 'text-ut-primary',
  active: 'text-[var(--ut-status-active-text)]',
  expiring: 'text-[var(--ut-status-expiring-text)]',
  expired: 'text-[var(--ut-status-expired-text)]',
};
export const toneFill: Record<DashboardTone, string> = {
  primary: 'bg-ut-primary',
  active: 'bg-[var(--ut-status-active-text)]',
  expiring: 'bg-[var(--ut-status-expiring-text)]',
  expired: 'bg-[var(--ut-status-expired-text)]',
};
export const cardClass = 'overflow-hidden rounded-3xl border border-ut-border bg-ut-surface';
export const rowFocus = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ut-primary';
