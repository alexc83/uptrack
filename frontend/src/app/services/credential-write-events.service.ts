import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CredentialWriteEventsService {
  readonly revision = signal(0);

  notifyChanged(): void {
    this.revision.update((value) => value + 1);
  }
}
