import { useRef, useState } from 'react';
import { ApiError } from '../../core/api/api-error';
import { uploadsApi } from '../../core/api/uploads-api';
import { useSession } from '../../core/auth/session-context';
import type { CertificateUploadResponse } from '../../lib/dto/uploads';
import { CERTIFICATE_TYPE_ERROR, isSupportedCertificateFile } from './ce-record-view';

/**
 * Angular parity: handleFileSelected in ce-record-form-dialog / ce-record-detail-drawer-container.
 * Client-side type guard first, then POST /uploads/certificates; the response seeds the form's certificate fields.
 */
export function useCertificateUpload() {
  const { captureSession } = useSession();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [uploadedFileName, setUploadedFileName] = useState<string>();
  async function upload(file: File): Promise<CertificateUploadResponse | null> {
    if (busy.current) return null;
    const guard = captureSession();
    if (!guard.isCurrent()) return null;
    if (!isSupportedCertificateFile(file)) {
      setError(CERTIFICATE_TYPE_ERROR);
      setStatus(undefined);
      setUploadedFileName(undefined);
      return null;
    }
    busy.current = true;
    setPending(true);
    setError(undefined);
    setStatus(`Uploading ${file.name}...`);
    try {
      const response = await uploadsApi.uploadCertificate(file);
      if (!guard.isCurrent()) return null;
      setStatus('Certificate uploaded successfully.');
      setUploadedFileName(response.originalFilename ?? undefined);
      return response;
    } catch (cause) {
      if (guard.isCurrent()) setError(cause instanceof ApiError ? cause.message : 'We could not upload that certificate right now. Please try again.');
      setStatus(undefined);
      setUploadedFileName(undefined);
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function removePending() {
    setError(undefined);
    setUploadedFileName(undefined);
    setStatus('Certificate removed.');
  }
  function reset() {
    setPending(false);
    setError(undefined);
    setStatus(undefined);
    setUploadedFileName(undefined);
  }
  return { upload, removePending, reset, pending, error, status, uploadedFileName };
}
