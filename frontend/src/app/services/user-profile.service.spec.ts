import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../core/api/api.config';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080/api' },
      ],
    });

    service = TestBed.inject(UserProfileService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads the current user profile', () => {
    service.getCurrentProfile().subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/users/me');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('updates the current user profile', () => {
    service
      .updateCurrentProfile({
        name: 'Alex Carter',
        email: 'alex@example.com',
      })
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/users/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: 'Alex Carter',
      email: 'alex@example.com',
    });
    request.flush({});
  });
});
