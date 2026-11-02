import { Drawer } from 'flowbite-react';
import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayLayer, type FocusOptions } from './use-overlay-layer';

interface DrawerShellProps extends FocusOptions {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: 'navigation' | 'detail';
  children?: ReactNode;
}
export function DrawerShell({ open, onClose, title, variant = 'detail', children, ...focus }: DrawerShellProps) {
  const titleId = useId();
  const { host, isTop } = useOverlayLayer(open, true, focus);
  if (!open) return null;
  const navigation = variant === 'navigation';
  return createPortal(<Drawer open onClose={() => { if (isTop()) onClose(); }} position={navigation ? 'left' : 'right'} aria-labelledby={titleId} aria-describedby={undefined} className={navigation ? 'h-dvh w-[min(300px,calc(100vw-2rem))] bg-ut-sidebar p-0 text-ut-text' : 'h-dvh w-[min(92vw,30rem)] bg-ut-surface p-0 text-ut-text [@media(width<=1024px)]:w-[min(96vw,34rem)] [@media(width<=640px)]:w-screen'}>
    {navigation ? <h2 id={titleId} className="sr-only">{title}</h2> : <header className="flex items-center justify-between gap-4 border-b border-ut-border p-5"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><button type="button" aria-label="Close drawer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-ut-hover" onClick={onClose}><X aria-hidden size={20} /></button></header>}
    <div className={navigation ? 'h-full' : 'p-5'}>{children}</div>
  </Drawer>, host);
}
