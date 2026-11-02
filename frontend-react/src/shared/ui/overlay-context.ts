import { createContext } from 'react';

export interface OverlayManager {
  register: (host: HTMLElement) => () => void;
  isTop: (host: HTMLElement) => boolean;
}
export const OverlayContext = createContext<OverlayManager | null>(null);
