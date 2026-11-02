import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as FlowbiteThemeProvider } from 'flowbite-react';
import { ThemeProvider } from '../core/theme/theme-provider';
import { OverlayProvider } from '../shared/ui/overlay-provider';
import { flowbiteTheme } from '../core/theme/flowbite-theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

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
