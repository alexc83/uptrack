import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../core/api/api-error';
import { uploadsApi } from '../../core/api/uploads-api';
import type { CertificateUploadResponse } from '../../lib/dto/uploads';
import { CERTIFICATE_TYPE_ERROR } from './ce-record-view';
import { useCertificateUpload } from './use-certificate-upload';

const session = vi.hoisted(() => ({ current: true }));
vi.mock('../../core/auth/session-context', () => ({
  useSession: () => ({ captureSession: () => ({ isCurrent: () => session.current }) }),
}));

const response: CertificateUploadResponse = {
  assetId: '00000000-0000-4000-8000-0000000000aa',
  url: 'https://files.example.test/new.pdf',
  publicId: 'uptrack/users/u/certificates/new',
  originalFilename: 'new.pdf',
  resourceType: 'raw',
};
const pdf = () => new File(['%PDF'], 'new.pdf', { type: 'application/pdf' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useCertificateUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.current = true;
  });

  it('uploads a supported file and reports status and filename', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue(response);
    const { result } = renderHook(() => useCertificateUpload());

    let returned: CertificateUploadResponse | null = null;
    await act(async () => { returned = await result.current.upload(pdf()); });

    expect(returned).toEqual(response);
    expect(result.current.status).toBe('Certificate uploaded successfully.');
    expect(result.current.uploadedFileName).toBe('new.pdf');
    expect(result.current.error).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });

  it('treats a null original filename as no uploaded filename', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue({ ...response, originalFilename: null });
    const { result } = renderHook(() => useCertificateUpload());

    await act(async () => { await result.current.upload(pdf()); });

    expect(result.current.uploadedFileName).toBeUndefined();
  });

  it('rejects unsupported files client-side without calling the API', async () => {
    const api = vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue(response);
    const { result } = renderHook(() => useCertificateUpload());

    let returned: CertificateUploadResponse | null = response;
    await act(async () => { returned = await result.current.upload(new File(['x'], 'notes.txt', { type: 'text/plain' })); });

    expect(returned).toBeNull();
    expect(api).not.toHaveBeenCalled();
    expect(result.current.error).toBe(CERTIFICATE_TYPE_ERROR);
  });

  it('shows the ApiError message for API failures and clears status and filename', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockRejectedValue(new ApiError('http', 413, 'Certificate files must be 5 MiB or smaller.'));
    const { result } = renderHook(() => useCertificateUpload());

    await act(async () => { await result.current.upload(pdf()); });

    expect(result.current.error).toBe('Certificate files must be 5 MiB or smaller.');
    expect(result.current.status).toBeUndefined();
    expect(result.current.uploadedFileName).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });

  it('uses the generic fallback for non-ApiError failures without leaking the original message', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockRejectedValue(new TypeError('socket hang up at 10.0.0.5'));
    const { result } = renderHook(() => useCertificateUpload());

    await act(async () => { await result.current.upload(pdf()); });

    expect(result.current.error).toBe('We could not upload that certificate right now. Please try again.');
  });

  it('ignores a second upload while one is pending (busy guard) and allows retry afterwards', async () => {
    const first = deferred<CertificateUploadResponse>();
    const api = vi.spyOn(uploadsApi, 'uploadCertificate').mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useCertificateUpload());

    let firstResult: Promise<CertificateUploadResponse | null> | undefined;
    act(() => { firstResult = result.current.upload(pdf()); });
    expect(result.current.pending).toBe(true);
    expect(result.current.status).toBe('Uploading new.pdf...');

    let second: CertificateUploadResponse | null = response;
    await act(async () => { second = await result.current.upload(pdf()); });
    expect(second).toBeNull();
    expect(api).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(response); await firstResult; });
    expect(result.current.pending).toBe(false);

    api.mockResolvedValueOnce(response);
    await act(async () => { await result.current.upload(pdf()); });
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('does not start an upload when the session is no longer current', async () => {
    const api = vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue(response);
    session.current = false;
    const { result } = renderHook(() => useCertificateUpload());

    let returned: CertificateUploadResponse | null = response;
    await act(async () => { returned = await result.current.upload(pdf()); });

    expect(returned).toBeNull();
    expect(api).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it('discards a successful response when the session is replaced during the upload', async () => {
    const pendingUpload = deferred<CertificateUploadResponse>();
    vi.spyOn(uploadsApi, 'uploadCertificate').mockReturnValue(pendingUpload.promise);
    const { result } = renderHook(() => useCertificateUpload());

    let outcome: Promise<CertificateUploadResponse | null> | undefined;
    act(() => { outcome = result.current.upload(pdf()); });
    session.current = false;
    let returned: CertificateUploadResponse | null = response;
    await act(async () => { pendingUpload.resolve(response); returned = (await outcome) ?? null; });

    expect(returned).toBeNull();
    expect(result.current.status).toBe('Uploading new.pdf...'); // never advanced to "uploaded"
    expect(result.current.uploadedFileName).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });

  it('suppresses the error message when the session is replaced and the upload then fails', async () => {
    const pendingUpload = deferred<CertificateUploadResponse>();
    vi.spyOn(uploadsApi, 'uploadCertificate').mockReturnValue(pendingUpload.promise);
    const { result } = renderHook(() => useCertificateUpload());

    let outcome: Promise<CertificateUploadResponse | null> | undefined;
    act(() => { outcome = result.current.upload(pdf()); });
    session.current = false;
    await act(async () => { pendingUpload.reject(new ApiError('http', 502, 'Certificate upload failed.')); await outcome; });

    expect(result.current.error).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });

  it('removePending clears error and filename and announces removal', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue(response);
    const { result } = renderHook(() => useCertificateUpload());
    await act(async () => { await result.current.upload(pdf()); });
    expect(result.current.uploadedFileName).toBe('new.pdf');

    act(() => result.current.removePending());

    expect(result.current.uploadedFileName).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.status).toBe('Certificate removed.');
  });

  it('reset clears every piece of state', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockRejectedValue(new ApiError('http', 502, 'Certificate upload failed.'));
    const { result } = renderHook(() => useCertificateUpload());
    await act(async () => { await result.current.upload(pdf()); });
    expect(result.current.error).toBe('Certificate upload failed.');

    act(() => result.current.reset());

    expect(result.current.error).toBeUndefined();
    expect(result.current.status).toBeUndefined();
    expect(result.current.uploadedFileName).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });
});
