import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { MobileToolbar } from './mobile-toolbar';
import { useShellNavigation } from './use-shell-navigation';
import { DrawerShell } from '../ui/drawer-shell';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useSession } from '../../core/auth/session-context';
import { AvailabilityBanner } from './availability-banner';

export function AppShell() {
  const { mobile, open, setOpen, collapsed, toggleCollapsed } = useShellNavigation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { user, logout, persistenceFailed } = useSession();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const identity = user ? { name: user.name, email: user.email } : undefined;
  const requestLogout = identity ? () => { setOpen(false); setConfirmingLogout(true); } : undefined;
  const lastLocation = useRef(location.key);
  useEffect(() => {
    setOpen(false);
    if (lastLocation.current === location.key) return;
    lastLocation.current = location.key;
    mainRef.current?.scrollTo?.(0, 0);
    const frame = requestAnimationFrame(() => mainRef.current?.querySelector('h1')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [location.key, setOpen]);
  return <div className="flex h-dvh overflow-hidden bg-ut-main text-ut-text">
    <a href="#main-content" className="sr-only z-[100] rounded-lg bg-ut-surface p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3" onClick={() => mainRef.current?.focus()}>Skip to content</a>
    {!mobile && <aside data-testid="desktop-sidebar" className={`h-full shrink-0 bg-ut-sidebar pt-3 ${collapsed ? 'w-[88px]' : 'w-[272px]'}`}><AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} onNavigate={() => undefined} identity={identity} onLogout={requestLogout} /></aside>}
    {mobile && <DrawerShell open={open} onClose={() => setOpen(false)} title="Navigation" variant="navigation" returnFocusRef={triggerRef} fallbackFocusRef={mainRef}><AppSidebar mobile onToggle={() => setOpen(false)} onNavigate={() => setOpen(false)} identity={identity} onLogout={requestLogout} /></DrawerShell>}
    <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto [@media(width>768px)]:pt-3">
      {mobile && <MobileToolbar open={open} onOpen={() => setOpen(true)} triggerRef={triggerRef} />}
      {persistenceFailed && <p role="status" className="mx-4 mt-3 rounded-lg bg-ut-hover p-3 text-sm text-ut-muted">Your sign-in could not be saved in this browser, so you will be signed out when you close this tab.</p>}
      <AvailabilityBanner />
      <Outlet />
    </main>
    <ConfirmDialog open={confirmingLogout} onClose={() => setConfirmingLogout(false)} onConfirm={() => { setConfirmingLogout(false); logout(); }} title="Log out" description="You will need to sign in again to see your credentials." confirmLabel="Log out" />
  </div>;
}
