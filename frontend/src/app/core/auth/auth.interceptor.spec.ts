import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../api/api.config';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let handleUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handleUnauthorized = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080/api' },
        {
          provide: AuthStore,
          useValue: {
            token: () => 'test-token',
            handleUnauthorized,
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('adds the bearer token to protected API requests', () => {
    http.get('http://localhost:8080/api/credentials').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/credentials');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush([]);
  });

  it('skips auth headers for public auth endpoints', () => {
    http.post('http://localhost:8080/api/auth/login', {}).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
