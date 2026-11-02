import type { ComponentPropsWithRef } from 'react';
import { SidebarItem, SidebarItemGroup, SidebarItems } from 'flowbite-react';
import { Link, useLocation } from 'react-router-dom';
import { navigation } from './navigation';

function NavigationLink({ href, ...props }: ComponentPropsWithRef<'a'>) {
  return <Link to={href ?? '/'} {...props} />;
}

export function PrimaryNavigation({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useLocation();
  return <SidebarItems className="flex-1 px-3 py-5"><SidebarItemGroup>
    {navigation.map(({ path, label, icon }) => <SidebarItem key={path} as={NavigationLink} href={path} icon={icon} active={pathname === path} aria-current={pathname === path ? 'page' : undefined} aria-label={label} aria-labelledby={undefined} onClick={onNavigate}>{label}</SidebarItem>)}
  </SidebarItemGroup></SidebarItems>;
}
