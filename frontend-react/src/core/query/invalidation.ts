import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
export async function invalidateCredentialData(client: QueryClient, credentialIds: readonly string[]): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.credentialsRoot() }),
    client.invalidateQueries({ queryKey: queryKeys.dashboard() }),
    ...Array.from(new Set(credentialIds)).map(id => client.invalidateQueries({ queryKey: queryKeys.credential(id) })),
  ]);
}
export async function invalidateCERecordData(client: QueryClient, credentialIds: readonly string[], recordIds: readonly string[]): Promise<void> {
  await Promise.all([
    invalidateCredentialData(client, credentialIds),
    ...Array.from(new Set(recordIds)).map(id => client.invalidateQueries({ queryKey: queryKeys.ceRecord(id) })),
  ]);
}
// If a future credential delete cannot enumerate its cascaded CE IDs, also call
// client.invalidateQueries({ queryKey: queryKeys.ceRecordsRoot() }). No hooks or
// mutation side effects run automatically here.
