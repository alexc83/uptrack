import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { map } from 'rxjs';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { CeReportResponse } from '../../models/ce-report.models';
import { CredentialStatus, CredentialType } from '../../models/credential.models';
import { CredentialService } from '../../services/credential.service';
import { formatLongDate, formatShortDate } from '../dashboard/utils/dashboard.helpers';

@Component({
  selector: 'app-ce-report-page',
  imports: [ButtonModule],
  templateUrl: './ce-report-page.component.html',
  styleUrl: './ce-report-page.component.scss',
})
export class CeReportPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly credentialService = inject(CredentialService);
  private readonly destroyRef = inject(DestroyRef);
  private requestSequence = 0;

  readonly isLoading = signal(true);
  readonly isPrinting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly report = signal<CeReportResponse | null>(null);
  readonly returnTo = signal('/credentials');
  readonly generatedAt = new Date();
  readonly generatedDateLabel = formatLongDate(this.generatedAt);
  readonly generatedTimestampLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(this.generatedAt);
  readonly currentUserName = computed(() => this.authStore.currentUser()?.name ?? 'UpTrack User');

  readonly summaryFields = computed(() => {
    const report = this.report();

    if (!report) {
      return [];
    }

    return [
      { label: 'Credential Type', value: this.formatCredentialType(report.credential.type) },
      { label: 'Issuing Organization', value: report.credential.issuingOrganization },
      { label: 'Expiration Date', value: formatShortDate(report.credential.expirationDate) },
      { label: 'Current Status', value: this.formatStatus(report.credential.status) },
      {
        label: 'Required CE Hours',
        value:
          report.credential.requiredCEHours > 0
            ? `${this.formatHours(report.credential.requiredCEHours)} hours`
            : 'Not required',
      },
      {
        label: 'Earned CE Hours',
        value: `${this.formatHours(report.summary.totalHoursEarned)} hours`,
      },
      {
        label: 'Remaining Hours',
        value:
          report.credential.requiredCEHours > 0
            ? `${this.formatHours(report.summary.remainingHours)} hours`
            : '0 hours',
      },
      {
        label: 'CE Record Count',
        value: `${report.summary.recordCount} record${report.summary.recordCount === 1 ? '' : 's'}`,
      },
    ];
  });

  readonly progressPercent = computed(() => {
    const report = this.report();

    if (!report) {
      return 0;
    }

    if (report.credential.requiredCEHours <= 0) {
      return 100;
    }

    return Math.round(Math.min(1, report.summary.progress) * 100);
  });

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('returnTo') || '/credentials'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((returnTo) => this.returnTo.set(this.normalizeReturnPath(returnTo)));

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const credentialId = params.get('credentialId');

      if (!credentialId) {
        this.report.set(null);
        this.errorMessage.set('We could not determine which credential report to open.');
        this.isLoading.set(false);
        return;
      }

      this.loadReport(credentialId);
    });
  }

  retryLoad(): void {
    const credentialId = this.route.snapshot.paramMap.get('credentialId');

    if (!credentialId) {
      return;
    }

    this.loadReport(credentialId);
  }

  goBack(): void {
    void this.router.navigateByUrl(this.returnTo());
  }

  printReport(): void {
    this.isPrinting.set(true);
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains('dark');

    if (hadDarkClass) {
      root.classList.remove('dark');
    }

    const cleanup = () => {
      this.isPrinting.set(false);
      if (hadDarkClass) {
        root.classList.add('dark');
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    requestAnimationFrame(() => {
      window.print();
    });
  }

  protected formatHours(value: number): string {
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  }

  protected formatRecordDate(value: string): string {
    return formatShortDate(value);
  }

  protected formatStatus(status: CredentialStatus): string {
    return status
      .toLowerCase()
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  protected formatCredentialType(type: CredentialType): string {
    return type === 'LICENSE' ? 'License' : 'Certification';
  }

  protected statusTone(status: CredentialStatus): 'active' | 'expiring' | 'expired' {
    if (status === 'EXPIRED') {
      return 'expired';
    }

    if (status === 'EXPIRING_SOON') {
      return 'expiring';
    }

    return 'active';
  }

  protected certificateLabel(record: CeReportResponse['records'][number]): string {
    return record.certificateUrl ? 'On file' : 'Not attached';
  }

  private loadReport(credentialId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.report.set(null);

    this.credentialService
      .getCredentialCeReport(credentialId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.report.set(report);
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not load this CE report right now.'),
          );
          this.isLoading.set(false);
        },
      });
  }

  private normalizeReturnPath(returnTo: string): string {
    if (!returnTo.startsWith('/')) {
      return '/credentials';
    }

    return returnTo;
  }
}
