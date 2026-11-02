import { Progress } from 'flowbite-react';
export function ProgressBar({ value, label, tone = 'primary' }: { value: number; label: string; tone?: 'primary' | 'active' | 'expiring' | 'expired' }) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const colors = { primary: 'bg-ut-primary', active: 'bg-[var(--ut-status-active-text)]', expiring: 'bg-[var(--ut-status-expiring-text)]', expired: 'bg-[var(--ut-status-expired-text)]' };
  return <Progress progress={clamped} textLabel={label} aria-valuemin={0} aria-valuemax={100} color="uptrack" theme={{ base: 'w-full overflow-hidden rounded-full bg-ut-hover', color: { uptrack: colors[tone] } }} />;
}
