import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from './theme-provider';
import { useTheme } from './use-theme';

function Toggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}
afterEach(() => { document.documentElement.classList.remove('dark'); localStorage.clear(); vi.restoreAllMocks(); });
it('adopts the pre-painted class and synchronizes toggles and storage', async () => {
  document.documentElement.classList.add('dark');
  render(<ThemeProvider><Toggle /></ThemeProvider>);
  await userEvent.click(screen.getByRole('button', { name: 'dark' }));
  expect(document.documentElement).not.toHaveClass('dark');
  expect(localStorage.getItem('uptrack-theme')).toBe('light');
  await userEvent.click(screen.getByRole('button', { name: 'light' }));
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('uptrack-theme')).toBe('dark');
});
it('keeps theme usable when storage throws', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  render(<ThemeProvider><Toggle /></ThemeProvider>);
  await userEvent.click(screen.getByRole('button', { name: 'light' }));
  expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
});
