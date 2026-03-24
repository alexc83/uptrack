import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../core/api/api.config';
import { CeRecordService } from './ce-record.service';

describe('CeRecordService', () => {
  let service: CeRecordService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CeRecordService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080/api' },
      ],
    });

    service = TestBed.inject(CeRecordService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls the CE detail endpoint by id', () => {
    service.getCeRecordById('ce-123').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/ce-records/ce-123');
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'ce-123',
      title: 'ACLS',
      provider: 'AHA',
      hours: 4,
      dateCompleted: '2026-03-10',
      certificateUrl: null,
    });
  });

  it('creates CE records without a userId payload field', () => {
    service
      .createCeRecord('cred-123', {
        title: 'Trauma Update',
        provider: 'AACN',
        hours: 4.5,
        dateCompleted: '2026-03-01',
        certificateUrl: null,
      })
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/ce-records');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Trauma Update',
      provider: 'AACN',
      hours: 4.5,
      dateCompleted: '2026-03-01',
      certificateUrl: null,
      credentialId: 'cred-123',
    });
    expect('userId' in request.request.body).toBe(false);
    request.flush({});
  });
});
