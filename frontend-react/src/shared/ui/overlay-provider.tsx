import { useMemo, type ReactNode } from 'react';
import { OverlayContext, type OverlayManager } from './overlay-context';

// These are the properties FloatingOverlay may change while locking scrolling.
const scrollProperties = ['overflow', 'padding-left', 'padding-right', 'position', 'top', 'left', 'right', '--floating-ui-scrollbar-width'];

// Coordinate isolation only; Flowbite keeps ownership of modal focus management.
export function OverlayProvider({ children }: { children: ReactNode }) {
  const manager = useMemo<OverlayManager>(() => {
    const layers: HTMLElement[] = [];
    const previousInert = new Map<HTMLElement, boolean>();
    let previousScroll: { property: string; value: string; priority: string }[] = [];

    function restoreScroll() {
      for (const { property, value, priority } of previousScroll) {
        if (value) document.body.style.setProperty(property, value, priority);
        else document.body.style.removeProperty(property);
      }
    }
    function sync() {
      const top = layers.at(-1);
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement)) continue;
        if (!previousInert.has(child)) previousInert.set(child, child.inert);
        child.inert = child !== top;
      }
    }
    return {
      isTop: host => layers.at(-1) === host,
      register(host) {
        if (!layers.length) {
          previousScroll = scrollProperties.map(property => ({
            property,
            value: document.body.style.getPropertyValue(property),
            priority: document.body.style.getPropertyPriority(property),
          }));
        }
        layers.push(host);
        document.body.style.overflow = 'hidden';
        sync();
        return () => {
          const index = layers.indexOf(host);
          if (index !== -1) layers.splice(index, 1);
          if (layers.length) sync();
          else {
            for (const [element, inert] of previousInert) element.inert = inert;
            previousInert.clear();
            restoreScroll();
          }
          // FloatingOverlay clears its own lock during cleanup. Reconcile before
          // the next paint, retaining a drawer's lock or restoring original styles.
          requestAnimationFrame(() => {
            if (layers.length) document.body.style.overflow = 'hidden';
            else restoreScroll();
          });
        };
      },
    };
  }, []);
  return <OverlayContext.Provider value={manager}>{children}</OverlayContext.Provider>;
}
