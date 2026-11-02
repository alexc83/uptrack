import { createTheme } from 'flowbite-react';

// Configure presentation only: UpTrack owns mode and the single storage key.
export const flowbiteTheme = createTheme({
  button: {
    base: 'relative flex items-center justify-center rounded-lg text-center font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-primary disabled:cursor-not-allowed disabled:opacity-50',
    color: {
      light: 'border-0 bg-transparent text-ut-muted hover:bg-ut-hover',
      blue: 'border border-transparent bg-ut-primary text-white hover:bg-ut-primary-hover',
      alternative: 'border border-ut-border bg-ut-surface text-ut-text hover:bg-ut-hover',
      landing: 'border border-transparent bg-ut-landing-primary text-white hover:bg-ut-landing-primary-hover hover:-translate-y-px hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--ut-landing-primary)_24%,transparent)]',
    },
    size: { sm: 'min-h-11 px-3 py-2 text-sm', md: 'min-h-11 px-4 py-2 text-sm' },
  },
  card: {
    root: { base: 'flex rounded-3xl border border-ut-border bg-ut-surface text-ut-text', children: 'flex h-full flex-col gap-4 p-6' },
  },
  sidebar: {
    root: { base: 'h-full', inner: 'flex h-full flex-col overflow-y-auto bg-ut-sidebar p-0' },
    item: {
      base: 'flex min-h-11 items-center justify-center rounded-lg px-4 py-3 text-base font-medium text-ut-muted hover:bg-ut-hover',
      active: 'bg-ut-primary-subtle text-ut-primary',
      icon: { base: 'h-5 w-5 shrink-0 text-current', active: 'text-ut-primary' },
    },
  },
  drawer: { root: { base: 'fixed z-40 overflow-y-auto bg-ut-surface p-0 text-ut-text transition-transform' } },
  modal: {
    root: { base: 'fixed inset-0 z-50 overflow-x-hidden overflow-y-auto p-4' },
    content: { base: 'relative w-full', inner: 'relative flex max-h-[calc(100dvh-2rem)] flex-col rounded-3xl bg-ut-surface text-ut-text shadow-xl' },
    header: { base: 'flex items-start justify-between rounded-t-3xl border-b border-ut-border p-5', title: 'text-xl font-semibold text-ut-text', close: { base: 'ms-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-ut-muted hover:bg-ut-hover' } },
    body: { base: 'flex-1 overflow-auto p-5' },
    footer: { base: 'flex flex-wrap items-center justify-end gap-3 border-t border-ut-border p-5' },
  },
  dropdown: { floating: { base: 'z-50 w-fit rounded-xl border border-ut-border bg-ut-surface text-ut-text shadow-lg', style: { auto: 'bg-ut-surface text-ut-text' }, item: { base: 'flex min-h-11 w-full cursor-pointer items-center justify-start px-4 py-2 text-sm hover:bg-ut-hover focus:bg-ut-hover focus:outline-none' } } },
  textInput: { field: { input: { colors: { gray: 'border-ut-border bg-ut-surface text-ut-text placeholder:text-ut-muted focus:border-ut-primary focus:ring-ut-primary' } } } },
  select: { field: { select: { colors: { gray: 'border-ut-border bg-ut-surface text-ut-text focus:border-ut-primary focus:ring-ut-primary' } } } },
  textarea: { colors: { gray: 'border-ut-border bg-ut-surface text-ut-text focus:border-ut-primary focus:ring-ut-primary' } },
  label: { root: { colors: { default: 'text-ut-text' } } },
});
