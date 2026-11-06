import { Tooltip } from 'flowbite-react';
import { Link, useLocation } from 'react-router-dom';
import { secondaryNavigation } from './navigation';

export function SecondaryNavigation({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { path, label, icon: Icon } = secondaryNavigation;
  const active = useLocation().pathname === path;
  const link = <Link to={path} aria-label={label} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-xs font-medium text-ut-muted hover:bg-ut-hover hover:text-ut-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-primary ${collapsed ? 'justify-center' : ''} ${active ? 'bg-ut-hover text-ut-text' : ''}`}>
    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{!collapsed && <span>{label}</span>}
  </Link>;
  return <div className="shrink-0 px-3 pb-2">{collapsed ? <Tooltip content={label} placement="right">{link}</Tooltip> : link}</div>;
}
