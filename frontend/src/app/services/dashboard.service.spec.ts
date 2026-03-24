import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../core/api/api.config';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080/api' },
      ],
    });

    service = TestBed.inject(DashboardService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls the aggregated dashboard endpoint', () => {
    service.getDashboard().subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/dashboard');
    expect(request.request.method).toBe('GET');
    request.flush({
      stats: {
        totalCredentials: 0,
        activeCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        needsCEAttentionCount: 0,
      },
      upcomingExpirations: [],
      ceAttention: [],
      recentActivity: [],
    });
  });
});
