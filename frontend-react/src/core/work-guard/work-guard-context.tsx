import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { globalWorkGuard, WorkGuardRegistry, type WorkGuardStatus } from './work-guard';

const WorkGuardContext = createContext<WorkGuardRegistry>(globalWorkGuard);

export function WorkGuardProvider({ children, registry = globalWorkGuard }: { children: ReactNode; registry?: WorkGuardRegistry }) {
  return <WorkGuardContext.Provider value={registry}>{children}</WorkGuardContext.Provider>;
}

export function useWorkGuard(): { check: () => WorkGuardStatus } {
  const registry = useContext(WorkGuardContext);
  return {
    check: () => registry.check(),
  };
}

export function useRegisterWorkGuard({
  id,
  description,
  isDirty,
  isBusy,
}: {
  id: string;
  description?: string;
  isDirty?: () => boolean;
  isBusy?: () => boolean;
}) {
  const registry = useContext(WorkGuardContext);
  const dirtyRef = useRef(isDirty);
  const busyRef = useRef(isBusy);

  useEffect(() => {
    dirtyRef.current = isDirty;
    busyRef.current = isBusy;
  });

  useEffect(() => {
    return registry.register({
      id,
      description,
      isDirty: () => dirtyRef.current?.() ?? false,
      isBusy: () => busyRef.current?.() ?? false,
    });
  }, [id, description, registry]);
}
