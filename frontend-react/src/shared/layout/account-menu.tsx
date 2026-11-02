import { Avatar, Dropdown, DropdownHeader, DropdownItem } from 'flowbite-react';
import { LogOut, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface AccountMenuProps {
  collapsed: boolean;
  identity?: { name: string; email: string };
  onLogout?: () => void;
  onNavigate: () => void;
}
export function AccountMenu({ collapsed, identity, onLogout, onNavigate }: AccountMenuProps) {
  const location = useLocation();
  const name = identity?.name ?? 'Migration preview';
  const initials = identity ? name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 3).toUpperCase() : 'UT';
  return <div className="shrink-0 border-t border-ut-border p-4">
    <Dropdown placement="top-start" arrowIcon={false} renderTrigger={() => <button type="button" aria-label="Open account menu" className="flex min-h-11 w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-ut-hover">
      <Avatar placeholderInitials={initials} rounded theme={{ root: { img: { off: 'relative overflow-hidden bg-ut-primary' }, size: { md: 'h-11 w-11' }, initials: { base: 'relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ut-primary text-white', text: 'font-medium text-white' } } }} />
      {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-ut-muted">{identity?.email ?? 'Account unavailable'}</span></span>}
    </button>}>
      <DropdownHeader><span className="text-sm">{identity ? name : 'Preview account — not signed in'}</span></DropdownHeader>
      <DropdownItem as={Link} to="/settings" state={{ from: location.pathname + location.search }} icon={Settings} onClick={onNavigate}>Settings</DropdownItem>
      <DropdownItem icon={LogOut} disabled={!onLogout} onClick={onLogout}>{onLogout ? 'Log out' : 'Log out — available in M06'}</DropdownItem>
    </Dropdown>
  </div>;
}
