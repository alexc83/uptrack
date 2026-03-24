import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthStore } from '../../core/auth/auth.store';
import { CredentialService } from '../../services/credential.service';
import { CeReportPageComponent } from './ce-report-page.component';

describe('CeReportPageComponent', () => {
  let fixture: ComponentFixture<CeReportPageComponent>;
  let credentialService: { getCredentialCeReport: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let paramMap$: Subject<ReturnType<typeof convertToParamMap>>;
  let queryParamMap$: Subject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    paramMap$ = new Subject();
    queryParamMap$ = new Subject();
    credentialService = {
      getCredentialCeReport: vi.fn(),
    };
    router = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CeReportPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({ credentialId: 'cred-123' }),
            },
          },
        },
        {
          provide: CredentialService,
          useValue: credentialService,
        },
        {
          provide: Router,
          useValue: router,
        },
        {
          provide: AuthStore,
          useValue: {
            currentUser: () => ({
              id: 'user-123',
              name: 'Jordan Hale',
              email: 'jordan@example.com',
              createdAt: '2026-03-24T00:00:00Z',
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders an empty state when the report has no records', () => {
    credentialService.getCredentialCeReport.mockReturnValue(
      of({
        credential: {
          id: 'cred-123',
          name: 'BLS',
          type: 'CERTIFICATION',
          issuingOrganization: 'AHA',
          expirationDate: '2026-09-01',
          requiredCEHours: 4,
          status: 'ACTIVE',
        },
        summary: {
          totalHoursEarned: 0,
          remainingHours: 4,
          recordCount: 0,
          progress: 0,
        },
        records: [],
      }),
    );

    fixture = TestBed.createComponent(CeReportPageComponent);
    queryParamMap$.next(convertToParamMap({ returnTo: '/credentials' }));
    paramMap$.next(convertToParamMap({ credentialId: 'cred-123' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No CE records on file');
    expect(fixture.nativeElement.textContent).toContain('Jordan Hale');
    expect(credentialService.getCredentialCeReport).toHaveBeenCalledWith('cred-123');
  });

  it('shows an error state when the report load fails', () => {
    credentialService.getCredentialCeReport.mockReturnValue(
      throwError(() => ({
        status: 404,
        error: { message: 'Credential not found' },
      })),
    );

    fixture = TestBed.createComponent(CeReportPageComponent);
    queryParamMap$.next(convertToParamMap({ returnTo: '/credentials' }));
    paramMap$.next(convertToParamMap({ credentialId: 'cred-123' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('CE report unavailable');
  });

  it('calls window.print when the print button is used', () => {
    credentialService.getCredentialCeReport.mockReturnValue(
      of({
        credential: {
          id: 'cred-123',
          name: 'RN License',
          type: 'LICENSE',
          issuingOrganization: 'Texas Board of Nursing',
          expirationDate: '2027-01-01',
          requiredCEHours: 20,
          status: 'ACTIVE',
        },
        summary: {
          totalHoursEarned: 12,
          remainingHours: 8,
          recordCount: 2,
          progress: 0.6,
        },
        records: [
          {
            title: 'Renewal Course',
            provider: 'AACN',
            hours: 6,
            dateCompleted: '2026-03-12',
            certificateUrl: 'https://example.com/certificate.pdf',
          },
        ],
      }),
    );

    fixture = TestBed.createComponent(CeReportPageComponent);
    queryParamMap$.next(convertToParamMap({ returnTo: '/credentials' }));
    paramMap$.next(convertToParamMap({ credentialId: 'cred-123' }));
    fixture.detectChanges();

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const printButton = buttons.find(
      (button) => button.textContent?.includes('Print Report'),
    ) as HTMLButtonElement;

    printButton.click();

    expect(printSpy).toHaveBeenCalled();
    requestAnimationFrameSpy.mockRestore();
    printSpy.mockRestore();
  });
});
