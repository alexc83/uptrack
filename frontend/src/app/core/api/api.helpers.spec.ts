import { HttpErrorResponse } from '@angular/common/http';

import { buildHttpParams, getApiErrorMessage } from './api.helpers';

describe('api.helpers', () => {
  it('omits empty query params cleanly', () => {
    const params = buildHttpParams({
      status: 'ACTIVE',
      type: '',
      search: undefined,
      page: null,
      includeExpired: false,
    });

    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('includeExpired')).toBe('false');
    expect(params.has('type')).toBe(false);
    expect(params.has('search')).toBe(false);
    expect(params.has('page')).toBe(false);
  });

  it('returns backend messages when present', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        error: 'Bad Request',
        message: 'Credential not found.',
        timestamp: '2026-03-23T10:00:00Z',
      },
    });

    expect(getApiErrorMessage(error)).toBe('Credential not found.');
  });
});
