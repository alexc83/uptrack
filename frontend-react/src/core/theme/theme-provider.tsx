import { useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme-context';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  function setTheme(next: Theme) {
    document.documentElement.classList.toggle('dark', next === 'dark');
    updateTheme(next);
    try { localStorage.setItem('uptrack-theme', next); } catch { /* Storage may be unavailable. */ }
  }
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}
