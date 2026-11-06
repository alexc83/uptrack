import { ClipboardList, FolderOpen, LayoutDashboard, LifeBuoy, Map } from 'lucide-react';

export const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/credentials', label: 'Credentials', icon: FolderOpen },
  { path: '/ce-records', label: 'CE Records', icon: ClipboardList },
];
/** `matchPrefix` keeps a link active on nested routes (e.g. /help/credentials/add-a-credential). */
export const secondaryNavigation = [
  { path: '/roadmap', label: 'Roadmap', icon: Map, matchPrefix: false },
  { path: '/help', label: 'Help Center', icon: LifeBuoy, matchPrefix: true },
];
export const mobileQuery = '(max-width: 768px)';
