import { expect, it } from 'vitest';
import { createQueryClient } from './query-client';
import { normalizeCredentialFilters, queryKeys } from './query-keys';
it('matches the approved tuple contracts without embedding credentials', () => {
  expect([queryKeys.authMe(), queryKeys.dashboard(), queryKeys.credentials({ status: 'ACTIVE' }), queryKeys.credential('id'), queryKeys.credentialCERecords('id'), queryKeys.credentialCEReport('id'), queryKeys.ceRecord('id'), queryKeys.profile()]).toEqual([
    ['auth', 'me'], ['dashboard'], ['credentials', { status: 'ACTIVE' }], ['credential', 'id'], ['credential', 'id', 'ce-records'], ['credential', 'id', 'ce-report'], ['ce-record', 'id'], ['profile'],
  ]);
});
it('equivalent filters share a cache entry and distinct filters do not', () => {
  const client = createQueryClient();
  const key = queryKeys.credentials({ type: 'LICENSE', status: 'ACTIVE', search: '' });
  client.setQueryData(key, ['fixture']);
  expect(client.getQueryData(queryKeys.credentials({ status: 'ACTIVE', type: 'LICENSE' }))).toEqual(['fixture']);
  expect(client.getQueryData(queryKeys.credentials({ status: 'EXPIRED' }))).toBeUndefined();
  expect(normalizeCredentialFilters({ search: '  ' })).toEqual({ search: '  ' });
  client.clear();
});
