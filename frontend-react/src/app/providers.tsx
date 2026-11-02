import { type ReactNode, useState } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as FlowbiteThemeProvider } from 'flowbite-react';
import { createQueryClient } from '../core/query/query-client';
import { SessionProvider } from '../core/auth/session-context';
import { createSessionStore, type SessionStore } from '../core/auth/session-store';
import { ThemeProvider } from '../core/theme/theme-provider';
import { OverlayProvider } from '../shared/ui/overlay-provider';
import { flowbiteTheme } from '../core/theme/flowbite-theme';

const queryClient = createQueryClient();
const appSession = createSessionStore({ queryClient });

interface AppProvidersProps {
  children: ReactNode;
  client?: QueryClient;
  /** Tests may inject a store; it must be bound to the same QueryClient as `client`. */
  session?: SessionStore;
}

export function AppProviders({ children, client = queryClient, session }: AppProvidersProps) {
  // The production store is bound to the production QueryClient. A custom client gets its own store.
  const [store] = useState(() => session ?? (client === queryClient ? appSession : createSessionStore({ queryClient: client })));
  return (
    <QueryClientProvider client={client}>
      <SessionProvider store={store}>
        <ThemeProvider>
          <FlowbiteThemeProvider theme={flowbiteTheme} applyTheme="replace">
            <OverlayProvider>{children}</OverlayProvider>
          </FlowbiteThemeProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
