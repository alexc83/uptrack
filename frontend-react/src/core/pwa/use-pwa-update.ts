import { useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PwaUpdateHook {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  dismissUpdate: () => void;
}

export function usePwaUpdate(): PwaUpdateHook {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        });
        window.addEventListener('online', () => {
          void registration.update();
        });
      }
    },
    onRegisterError(error) {
      console.warn('PWA service worker registration error:', error);
    },
  });

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    setNeedRefresh(false);
    setOfflineReady(false);
  }, [setNeedRefresh, setOfflineReady]);

  return {
    needRefresh: needRefresh && !dismissed,
    offlineReady: offlineReady && !dismissed,
    updateServiceWorker,
    dismissUpdate,
  };
}
