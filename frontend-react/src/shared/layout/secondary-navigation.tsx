import { Tooltip } from 'flowbite-react';
import { Link, useLocation } from 'react-router-dom';
import { secondaryNavigation } from './navigation';

export function SecondaryNavigation({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { pathname } = useLocation();
  return <div className="flex shrink-0 flex-col gap-1 px-3 pb-2">
    {secondaryNavigation.map(({ path, label, icon: Icon, matchPrefix }) => {
      const active = pathname === path || (matchPrefix && pathname.startsWith(`${path}/`));
      const link = <Link to={path} aria-label={label} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-xs font-medium text-ut-muted hover:bg-ut-hover hover:text-ut-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-primary ${collapsed ? 'justify-center' : ''} ${active ? 'bg-ut-hover text-ut-text' : ''}`}>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{!collapsed && <span>{label}</span>}
      </Link>;
      return <div key={path}>{collapsed ? <Tooltip content={label} placement="right">{link}</Tooltip> : link}</div>;
    })}
  </div>;
}
