import { Button } from 'flowbite-react';
import { Menu } from 'lucide-react';
import type { Ref } from 'react';

export function MobileToolbar({ open, onOpen, triggerRef }: { open: boolean; onOpen: () => void; triggerRef: Ref<HTMLButtonElement> }) {
  return <div className="px-4 pt-4 [@media(width>768px)]:hidden"><Button ref={triggerRef} color="alternative" className="h-11 w-11 p-0" aria-label="Open navigation" aria-expanded={open} aria-controls={open ? 'primary-navigation' : undefined} onClick={onOpen}><Menu aria-hidden size={20} /></Button></div>;
}
