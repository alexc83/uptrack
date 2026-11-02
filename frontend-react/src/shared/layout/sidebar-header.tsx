import { Button, Tooltip } from 'flowbite-react';
import { ChevronLeft, ChevronRight, Moon, Shield, Sun, X } from 'lucide-react';
import { useTheme } from '../../core/theme/use-theme';

export function SidebarHeader({ collapsed, mobile, onToggle }: { collapsed: boolean; mobile: boolean; onToggle: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const label = mobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const CollapseIcon = mobile ? X : collapsed ? ChevronRight : ChevronLeft;
  return <div className={`flex shrink-0 border-b border-ut-border px-3 py-4 ${collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-1'}`}>
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-ut-primary text-white"><Shield aria-hidden size={21} /></span>
      {!collapsed && <span className="text-2xl font-bold tracking-tight">UpTrack</span>}
    </div>
    <div className={`flex ${collapsed ? 'flex-col' : ''}`}>
      <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        <Button color="light" className="h-11 w-11 border-0 bg-transparent p-0 text-ut-muted hover:bg-ut-hover" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'dark' ? <Sun aria-hidden size={18} /> : <Moon aria-hidden size={18} />}</Button>
      </Tooltip>
      <Button color="light" className="h-11 w-11 border-0 bg-transparent p-0 text-ut-muted hover:bg-ut-hover" aria-label={label} aria-expanded={mobile ? true : !collapsed} aria-controls="primary-navigation" onClick={onToggle}><CollapseIcon aria-hidden size={18} /></Button>
    </div>
  </div>;
}
