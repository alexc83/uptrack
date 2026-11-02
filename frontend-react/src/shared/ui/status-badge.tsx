import { Badge } from 'flowbite-react';
const statuses = {
  ACTIVE: { label: 'Active', color: 'bg-[var(--ut-status-active-bg)] text-[var(--ut-status-active-text)]' },
  EXPIRING_SOON: { label: 'Expiring Soon', color: 'bg-[var(--ut-status-expiring-bg)] text-[var(--ut-status-expiring-text)]' },
  EXPIRED: { label: 'Expired', color: 'bg-[var(--ut-status-expired-bg)] text-[var(--ut-status-expired-text)]' },
};
export function StatusBadge({ status, label }: { status: keyof typeof statuses; label?: string }) {
  return <Badge color="uptrack" theme={{ root: { color: { uptrack: statuses[status].color } } }} className="w-fit rounded-full px-3 py-1">{label ?? statuses[status].label}</Badge>;
}
