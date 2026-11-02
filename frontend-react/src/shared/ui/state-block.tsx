import { Alert, Button, Spinner } from 'flowbite-react';
import { Skeleton } from './skeleton';

type StateBlockProps =
  | { kind: 'loading'; message: string }
  | { kind: 'empty' | 'error'; title: string; message: string; action?: { label: string; onClick: () => void } };

export function StateBlock(props: StateBlockProps) {
  if (props.kind === 'loading') {
    return (
      <section aria-busy="true" className="space-y-4">
        <p role="status" className="flex items-center gap-3 text-sm text-ut-muted">
          <Spinner size="sm" aria-hidden="true" />{props.message}
        </p>
        <Skeleton />
      </section>
    );
  }
  const body = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="font-semibold">{props.title}</h2>
        <p className={`mt-1 text-sm ${props.kind === 'error' ? '' : 'text-ut-muted'}`}>{props.message}</p>
      </div>
      {props.action && <Button color="alternative" onClick={props.action.onClick}>{props.action.label}</Button>}
    </div>
  );
  return props.kind === 'error' ? (
    <Alert color="failure" theme={{ color: { failure: 'bg-[var(--ut-status-expired-bg)] text-[var(--ut-status-expired-text)]' } }} role="alert">{body}</Alert>
  ) : (
    <section className="rounded-2xl border border-ut-border bg-ut-surface p-5">{body}</section>
  );
}
