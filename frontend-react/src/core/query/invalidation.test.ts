import { expect, it } from 'vitest';
import { createQueryClient } from './query-client';
import { invalidateCERecordData, invalidateCredentialData } from './invalidation';
import { queryKeys as keys } from './query-keys';

it('invalidates all list filters/dashboard and affected detail/CE/report prefixes only', async () => {
  const client = createQueryClient();
  const affected = [keys.credentials(), keys.credentials({ status: 'ACTIVE' }), keys.dashboard(), keys.credential('a'), keys.credentialCERecords('a'), keys.credentialCEReport('a')];
  const unaffected = [keys.credential('other'), keys.profile(), keys.authMe()];
  for (const key of [...affected, ...unaffected]) client.setQueryData(key, {});
  await invalidateCredentialData(client, ['a', 'a']);
  for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of unaffected) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  client.clear();
});
it('handles CE reassignment old/new credential contexts and affected record details', async () => {
  const client = createQueryClient();
  const affected = [keys.credential('old'), keys.credentialCEReport('old'), keys.credential('new'), keys.credentialCERecords('new'), keys.ceRecord('record')];
  for (const key of [...affected, keys.ceRecord('other')]) client.setQueryData(key, {});
  await invalidateCERecordData(client, ['old', 'new'], ['record']);
  for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(keys.ceRecord('other'))?.isInvalidated).toBe(false);
  client.clear();
});
it('supports the documented cascade-delete recipe when dependent IDs are unavailable', async () => {
  const client = createQueryClient();
  for (const id of ['a', 'b']) client.setQueryData(keys.ceRecord(id), {});
  await invalidateCredentialData(client, ['deleted']);
  await client.invalidateQueries({ queryKey: keys.ceRecordsRoot() });
  for (const id of ['a', 'b']) expect(client.getQueryState(keys.ceRecord(id))?.isInvalidated).toBe(true);
  client.clear();
});
