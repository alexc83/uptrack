export interface WorkGuardRegistration {
  id: string;
  description?: string;
  isDirty?: () => boolean;
  isBusy?: () => boolean;
}

export interface WorkGuardStatus {
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  reasons: string[];
}

export class WorkGuardRegistry {
  private readonly items = new Map<string, WorkGuardRegistration>();

  register(guard: WorkGuardRegistration): () => void {
    this.items.set(guard.id, guard);
    return () => {
      this.items.delete(guard.id);
    };
  }

  check(): WorkGuardStatus {
    const reasons: string[] = [];
    let hasUnsavedChanges = false;
    let isBusy = false;

    for (const guard of this.items.values()) {
      const dirty = guard.isDirty ? guard.isDirty() : false;
      const busy = guard.isBusy ? guard.isBusy() : false;

      if (busy) {
        isBusy = true;
        reasons.push(guard.description ? `${guard.description} (in progress)` : 'Operation in progress');
      }
      if (dirty) {
        hasUnsavedChanges = true;
        reasons.push(guard.description ? `${guard.description} (unsaved changes)` : 'Unsaved changes');
      }
    }

    return {
      hasUnsavedChanges,
      isBusy,
      reasons,
    };
  }
}

export const globalWorkGuard = new WorkGuardRegistry();

if (typeof window !== 'undefined') {
  (window as unknown as { __workGuard?: WorkGuardRegistry }).__workGuard = globalWorkGuard;
}
