import { ReactNode } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as FlowbiteThemeProvider } from 'flowbite-react';
import { createQueryClient } from '../core/query/query-client';
import { ThemeProvider } from '../core/theme/theme-provider';
import { OverlayProvider } from '../shared/ui/overlay-provider';
import { flowbiteTheme } from '../core/theme/flowbite-theme';

const queryClient = createQueryClient();

interface AppProvidersProps {
  children: ReactNode;
  client?: QueryClient;
}

export function AppProviders({ children, client = queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <FlowbiteThemeProvider theme={flowbiteTheme} applyTheme="replace">
          <OverlayProvider>{children}</OverlayProvider>
        </FlowbiteThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
