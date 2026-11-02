import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { MobileToolbar } from './mobile-toolbar';
import { useShellNavigation } from './use-shell-navigation';
import { DrawerShell } from '../ui/drawer-shell';

export function AppShell() {
  const { mobile, open, setOpen, collapsed, toggleCollapsed } = useShellNavigation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const lastLocation = useRef(location.key);
  useEffect(() => {
    setOpen(false);
    if (lastLocation.current === location.key) return;
    lastLocation.current = location.key;
    const frame = requestAnimationFrame(() => mainRef.current?.querySelector('h1')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [location.key, setOpen]);
  return <div className="flex h-dvh overflow-hidden bg-ut-main text-ut-text">
    <a href="#main-content" className="sr-only z-[100] rounded-lg bg-ut-surface p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3" onClick={() => mainRef.current?.focus()}>Skip to content</a>
    {!mobile && <aside data-testid="desktop-sidebar" className={`h-full shrink-0 bg-ut-sidebar pt-3 ${collapsed ? 'w-[88px]' : 'w-[272px]'}`}><AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} onNavigate={() => undefined} /></aside>}
    {mobile && <DrawerShell open={open} onClose={() => setOpen(false)} title="Navigation" variant="navigation" returnFocusRef={triggerRef} fallbackFocusRef={mainRef}><AppSidebar mobile onToggle={() => setOpen(false)} onNavigate={() => setOpen(false)} /></DrawerShell>}
    <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto [@media(width>768px)]:pt-3">
      {mobile && <MobileToolbar open={open} onOpen={() => setOpen(true)} triggerRef={triggerRef} />}
      <Outlet />
    </main>
  </div>;
}
