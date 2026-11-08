import { Button } from 'flowbite-react';
import { Menu } from 'lucide-react';
import type { Ref } from 'react';

export function MobileToolbar({ open, onOpen, triggerRef }: { open: boolean; onOpen: () => void; triggerRef: Ref<HTMLButtonElement> }) {
  return (
    <div className="sticky top-0 z-20 flex items-center border-b border-ut-border/50 bg-ut-main px-4 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-2.5 pl-[max(1rem,env(safe-area-inset-left,1rem))] pr-[max(1rem,env(safe-area-inset-right,1rem))] [@media(width>768px)]:hidden">
      <Button
        ref={triggerRef}
        color="alternative"
        className="h-11 w-11 p-0"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls={open ? 'primary-navigation' : undefined}
        onClick={onOpen}
      >
        <Menu aria-hidden size={20} />
      </Button>
    </div>
  );
}
