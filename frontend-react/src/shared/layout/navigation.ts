import { ClipboardList, FolderOpen, LayoutDashboard } from 'lucide-react';

export const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/credentials', label: 'Credentials', icon: FolderOpen },
  { path: '/ce-records', label: 'CE Records', icon: ClipboardList },
];
export const mobileQuery = '(max-width: 768px)';
