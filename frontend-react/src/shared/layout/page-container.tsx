import type { ReactNode } from 'react';
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-6 p-4 [@media(width>768px)]:p-6">{children}</div>;
}
