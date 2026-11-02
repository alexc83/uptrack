import { Sidebar } from 'flowbite-react';
import { SidebarHeader } from './sidebar-header';
import { PrimaryNavigation } from './primary-navigation';
import { AccountMenu } from './account-menu';

export function AppSidebar({ collapsed = false, mobile = false, onToggle, onNavigate, identity, onLogout }: { collapsed?: boolean; mobile?: boolean; onToggle: () => void; onNavigate: () => void; identity?: { name: string; email: string }; onLogout?: () => void }) {
  return <Sidebar id="primary-navigation" aria-label="Primary navigation" collapsed={collapsed} className="h-full w-full">
    <SidebarHeader collapsed={collapsed} mobile={mobile} onToggle={onToggle} />
    <PrimaryNavigation onNavigate={onNavigate} />
    <AccountMenu collapsed={collapsed} identity={identity} onLogout={onLogout} onNavigate={onNavigate} />
  </Sidebar>;
}
