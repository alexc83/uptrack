import { inject, Injectable } from '@angular/core';
import { map, of } from 'rxjs';

import { AuthStore } from '../core/auth/auth.store';
import { CeRecord } from '../models/ce-record.models';
import { Dashboard, DashboardData } from '../models/dashboard.models';
import { Credential } from '../models/credential.models';
import { CredentialService } from './credential.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly authStore = inject(AuthStore);
  private readonly credentialService = inject(CredentialService);

  getDashboard() {
    const userId = this.authStore.currentUser()?.id;

    if (!userId) {
      return of({
        dashboard: buildDashboard([]),
        credentials: [],
        ceRecords: [],
      } satisfies DashboardData);
    }

    return this.credentialService.getCredentials({ userId }).pipe(
      map((credentials) => ({
        dashboard: buildDashboard(credentials),
        credentials,
        ceRecords: flattenCeRecords(credentials),
      })),
    );
  }
}

function flattenCeRecords(credentials: Credential[]): CeRecord[] {
  return credentials.flatMap((credential) =>
    (credential.ceRecords ?? []).map((record) => ({
      ...record,
      credentialId: credential.id,
    })),
  );
}

function buildDashboard(credentials: Credential[]): Dashboard {
  const now = new Date();
  const credentialsNeedingCE = credentials.filter(
    (credential) =>
      credential.requiredCEHours > 0 && credential.ceHoursEarned < credential.requiredCEHours,
  );

  const within90Days = credentials
    .filter((credential) => daysUntil(credential.expirationDate, now) <= 90)
    .sort((left, right) => left.expirationDate.localeCompare(right.expirationDate));

  return {
    stats: {
      totalCredentials: credentials.length,
      activeCount: credentials.filter((credential) => credential.status === 'ACTIVE').length,
      expiringSoonCount: credentials.filter((credential) => credential.status === 'EXPIRING_SOON')
        .length,
      expiredCount: credentials.filter((credential) => credential.status === 'EXPIRED').length,
      needsCEAttentionCount: credentialsNeedingCE.length,
    },
    expirationBuckets: {
      within30Days: within90Days.filter((credential) => daysUntil(credential.expirationDate, now) <= 30),
      within60Days: within90Days.filter((credential) => daysUntil(credential.expirationDate, now) <= 60),
      within90Days,
    },
    credentialsNeedingCE: credentialsNeedingCE.sort(
      (left, right) => left.expirationDate.localeCompare(right.expirationDate),
    ),
    recentCredentials: [...credentials]
      .sort((left, right) => right.expirationDate.localeCompare(left.expirationDate))
      .slice(0, 5),
  };
}

function daysUntil(value: string, now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(`${value}T00:00:00`);

  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}
