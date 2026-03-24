import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../core/api/api.config';
import { CredentialService } from './credential.service';

describe('CredentialService', () => {
  let service: CredentialService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CredentialService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080/api' },
      ],
    });

    service = TestBed.inject(CredentialService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('builds credential filter query params without empty values', () => {
    service
      .getCredentials({
        userId: 'user-123',
        status: 'ACTIVE',
        type: undefined,
        search: '',
      })
      .subscribe();

    const request = httpTesting.expectOne((req) => req.url === 'http://localhost:8080/api/credentials');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('userId')).toBe('user-123');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('search')).toBe(false);

    request.flush([]);
  });

  it('calls the credential CE records endpoint', () => {
    service.getCredentialCeRecords('cred-123').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/credentials/cred-123/ce-records');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates credentials without a userId payload field', () => {
    service
      .createCredential({
        name: 'RN License',
        type: 'LICENSE',
        issuingOrganization: 'Texas Board of Nursing',
        expirationDate: '2027-03-23',
        renewalCycleMonths: 24,
        requiredCEHours: 20,
      })
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/credentials');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'RN License',
      type: 'LICENSE',
      issuingOrganization: 'Texas Board of Nursing',
      expirationDate: '2027-03-23',
      renewalCycleMonths: 24,
      requiredCEHours: 20,
    });
    expect('userId' in request.request.body).toBe(false);
    request.flush({});
  });
});
