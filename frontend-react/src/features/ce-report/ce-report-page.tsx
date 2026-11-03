import { Alert, Button } from 'flowbite-react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../../core/auth/session-context';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { StateBlock } from '../../shared/ui/state-block';
import { StatusBadge } from '../../shared/ui/status-badge';
import { CEReportSessionBoundary } from './ce-report-session-boundary';
import { useCEReport } from './use-ce-report';
import {
  formatCredentialHours,
  formatLongDate,
  formatShortDate,
  normalizeReportReturnTo,
  REPORT_MISSING_ID_MESSAGE,
  reportCertificateLabel,
  reportProgressPercent,
  reportSummaryFields,
  formatReportTimestamp,
} from './ce-report-view';

export function CEReportPage() {
  return <CEReportSessionBoundary><CEReportContent /></CEReportSessionBoundary>;
}

function CEReportContent() {
  const { credentialId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const query = useCEReport(credentialId);
  const returnTo = normalizeReportReturnTo(searchParams.get('returnTo'));
  const generatedAt = useMemo(() => new Date(), []);
  const [printing, setPrinting] = useState(false);

  useEffect(() => { document.title = 'CE Report — UpTrack'; }, []);

  const goBack = () => navigate(returnTo);
  const printReport = () => {
    setPrinting(true);
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains('dark');
    if (hadDarkClass) root.classList.remove('dark');
    const cleanup = () => {
      setPrinting(false);
      if (hadDarkClass) root.classList.add('dark');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    requestAnimationFrame(() => { window.print(); });
  };

  const report = query.data ?? null;
  const missingId = credentialId.length === 0;
  const errorMessage = missingId ? REPORT_MISSING_ID_MESSAGE : query.error?.message ?? null;
  const percent = report ? reportProgressPercent(report) : 0;
  const fields = report ? reportSummaryFields(report) : [];

  return (
    <main className={`ce-report min-h-dvh bg-ut-main py-6 text-ut-text print:bg-white print:py-0 print:text-gray-900${printing ? ' ce-report-printing' : ''}`}>
      <div className="mx-auto w-full max-w-[66rem] px-6 print:max-w-none print:px-0 [@media(max-width:720px)]:px-4">
        <header className="mb-4 flex items-center justify-between gap-4 print:hidden [@media(max-width:900px)]:flex-col [@media(max-width:900px)]:items-stretch">
          <Button type="button" color="alternative" onClick={goBack} className="min-h-11">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Back
          </Button>
          <Button type="button" color="blue" onClick={printReport} disabled={!report} className="min-h-11">
            <Printer aria-hidden="true" className="mr-2 h-4 w-4" />Print Report
          </Button>
        </header>

        {query.isLoading && !missingId && (
          <div className="rounded-3xl border border-ut-border bg-ut-surface p-6">
            <StateBlock kind="loading" message="Loading CE report…" />
          </div>
        )}

        {errorMessage && (
          <Alert color="failure" role="alert" theme={{ color: { failure: 'rounded-3xl border border-ut-border bg-[var(--ut-status-expired-bg)] p-6 text-[var(--ut-status-expired-text)]' } }}>
            <strong className="text-base">CE report unavailable</strong>
            <p className="mt-2 text-sm">{errorMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3 print:hidden">
              <Button type="button" color="alternative" onClick={goBack} className="min-h-11">Back</Button>
              {!missingId && <Button type="button" color="blue" onClick={() => void query.refetch()} className="min-h-11">Retry</Button>}
            </div>
          </Alert>
        )}

        {report && (
          <article className="ce-report-sheet rounded-3xl border border-ut-border bg-ut-surface p-6 shadow-[0_20px_48px_rgba(15,23,42,0.07)] print:rounded-none print:border-0 print:p-0 print:shadow-none [@media(max-width:720px)]:p-4">
            {query.isRefetchError && (
              <div className="mb-4 print:hidden">
                <StateBlock kind="error" title="Report may be out of date" message="We could not refresh this report. Showing the last data loaded." action={{ label: 'Retry', onClick: () => void query.refetch() }} />
              </div>
            )}
            <header className="ce-report-block flex items-start justify-between gap-5 border-b border-ut-border pb-4 [@media(max-width:900px)]:flex-col">
              <div className="min-w-0 space-y-2 break-words">
                <span className="inline-block text-xs font-extrabold uppercase tracking-wide text-ut-primary">UpTrack CE Report</span>
                <h1 className="text-4xl font-bold leading-none tracking-tight sm:text-5xl">{report.credential.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-base text-ut-muted">
                  <span>{report.credential.issuingOrganization}</span>
                  <span aria-hidden="true">•</span>
                  <StatusBadge status={report.credential.status} />
                </div>
              </div>
              <div className="min-w-56 space-y-1 text-sm">
                <p className="text-xl font-bold leading-snug"><span>Name:</span> {user?.name ?? 'UpTrack User'}</p>
                <p><span className="font-bold">Generated:</span> {formatLongDate(generatedAt)}</p>
              </div>
            </header>

            <section aria-label="CE progress" className="ce-report-block mt-4 rounded-2xl border border-ut-border bg-ut-main p-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">CE Progress</h2>
                <strong className="text-xl">{formatCredentialHours(report.summary.totalHoursEarned)} / {formatCredentialHours(report.credential.requiredCEHours)} hours</strong>
                <p className="font-bold text-[var(--ut-status-active-text)]">{percent}% Complete</p>
              </div>
              <div className="mt-3 w-full max-w-[22rem]">
                <ProgressBar value={percent} label="CE progress" tone="active" />
              </div>
            </section>

            <section aria-label="Credential summary" className="ce-report-block mt-4 rounded-2xl border border-ut-border bg-ut-main p-4">
              <h2 className="mb-3 text-base font-semibold">Credential Summary</h2>
              <div className="grid grid-cols-2 items-start gap-x-6 gap-y-2 [@media(max-width:720px)]:grid-cols-1" role="list">
                {fields.map(field => (
                  <div key={field.label} className="grid grid-cols-[minmax(8.5rem,10.5rem)_minmax(0,1fr)] items-baseline gap-3 [@media(max-width:720px)]:grid-cols-[minmax(7.5rem,9rem)_minmax(0,1fr)]" role="listitem">
                    <span className="whitespace-nowrap text-xs font-semibold text-ut-muted">{field.label}</span>
                    <strong className="text-sm leading-snug">{field.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="CE records" className="ce-report-records-card mt-4 rounded-2xl border border-ut-border bg-ut-main p-4">
              <h2 className="mb-3 text-base font-semibold">CE Records</h2>
              {report.records.length > 0 ? (
                <div className="ce-report-records overflow-x-auto">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup><col className="w-[32%]" /><col className="w-[22%]" /><col className="w-[18%]" /><col className="w-[8%]" /><col className="w-[20%]" /></colgroup>
                    <thead>
                      <tr>
                        <th scope="col" className="whitespace-nowrap px-3 py-3 text-left align-top text-xs font-extrabold text-ut-muted">Title</th>
                        <th scope="col" className="whitespace-nowrap px-3 py-3 text-left align-top text-xs font-extrabold text-ut-muted">Provider</th>
                        <th scope="col" className="whitespace-nowrap px-3 py-3 text-left align-top text-xs font-extrabold text-ut-muted">Completed Date</th>
                        <th scope="col" className="whitespace-nowrap px-3 py-3 text-right align-top text-xs font-extrabold text-ut-muted">Hours</th>
                        <th scope="col" className="min-w-30 whitespace-nowrap px-3 py-3 text-left align-top text-xs font-extrabold text-ut-muted">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.records.map(record => (
                        <tr key={`${record.title}${record.dateCompleted}`} className="border-b border-ut-border last:border-b-0">
                          <td data-label="Title" className="px-3 py-3 align-top text-sm leading-snug"><strong>{record.title}</strong></td>
                          <td data-label="Provider" className="break-words px-3 py-3 align-top text-sm leading-snug">{record.provider}</td>
                          <td data-label="Completed Date" className="whitespace-nowrap px-3 py-3 align-top text-sm leading-snug">{formatShortDate(record.dateCompleted)}</td>
                          <td data-label="Hours" className="whitespace-nowrap px-3 py-3 text-right align-top text-sm leading-snug">{formatCredentialHours(record.hours)}</td>
                          <td data-label="Certificate" className="min-w-30 whitespace-nowrap px-3 py-3 align-top text-sm leading-snug">{reportCertificateLabel(record.certificateUrl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pt-1">
                  <strong>No CE records on file</strong>
                  <p className="mt-2 text-sm leading-relaxed text-ut-muted">This credential report is ready, but there are no continuing education records attached yet.</p>
                </div>
              )}
            </section>

            <section aria-label="Report totals" className="ce-report-block mt-4 rounded-2xl border border-ut-border bg-ut-main p-4">
              <h2 className="mb-3 text-base font-semibold">Summary</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 [@media(max-width:720px)]:grid-cols-1">
                <div className="grid grid-cols-[minmax(8.5rem,10.5rem)_minmax(0,1fr)] items-baseline gap-3">
                  <span className="whitespace-nowrap text-xs font-semibold text-ut-muted">Total CE Hours</span>
                  <strong className="text-sm leading-snug">{formatCredentialHours(report.summary.totalHoursEarned)}</strong>
                </div>
                <div className="grid grid-cols-[minmax(8.5rem,10.5rem)_minmax(0,1fr)] items-baseline gap-3">
                  <span className="whitespace-nowrap text-xs font-semibold text-ut-muted">Total Records</span>
                  <strong className="text-sm leading-snug">{report.summary.recordCount}</strong>
                </div>
              </div>
            </section>

            <footer className="mt-4 flex justify-between gap-4 border-t border-ut-border pt-3 text-sm text-ut-muted [@media(max-width:900px)]:flex-col [@media(max-width:900px)]:items-start">
              <span>Generated from UpTrack</span>
              <span>{formatReportTimestamp(generatedAt)}</span>
            </footer>
          </article>
        )}
      </div>
    </main>
  );
}
