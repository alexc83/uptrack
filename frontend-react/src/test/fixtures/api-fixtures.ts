import type { CredentialRequest, CredentialResponse } from '../../lib/dto/credentials';
import type { CERecordRequest, CERecordResponse } from '../../lib/dto/ce-records';
import type { UserResponse } from '../../lib/dto/auth';

export const credentialId = '00000000-0000-4000-8000-000000000001';
export const recordId = '00000000-0000-4000-8000-000000000002';
export const user: UserResponse = { id: '00000000-0000-4000-8000-000000000003', name: 'Fixture User', email: 'fixture@example.test', createdAt: '2026-01-01T00:00:00Z' };
export const credentialRequest: CredentialRequest = { name: 'Fixture credential', type: 'LICENSE', issuingOrganization: 'Fixture organization', expirationDate: '2027-01-01', renewalCycleMonths: 12, requiredCEHours: 10 };
export const recordRequest: CERecordRequest = { title: 'Fixture record', provider: 'Fixture provider', hours: 15, dateCompleted: '2026-01-01', credentialId, certificateUrl: null, certificatePublicId: null, certificateResourceType: null, certificateOriginalFilename: null };
export const record: CERecordResponse = { id: recordId, title: recordRequest.title, provider: recordRequest.provider, hours: recordRequest.hours, dateCompleted: recordRequest.dateCompleted, certificateUrl: null, certificatePublicId: null, certificateResourceType: null, certificateOriginalFilename: null };
export const credential: CredentialResponse = { ...credentialRequest, id: credentialId, status: 'ACTIVE', ceHoursEarned: 15, ceProgress: 1.5, ceRecords: [record] };
export const errorBody = (status: number) => ({ status, error: 'Fixture error', message: 'Fixture error message', timestamp: '2026-01-01T00:00:00Z' });
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
