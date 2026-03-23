export function buildGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function daysUntil(value: string, now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(`${value}T00:00:00`);

  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

export function formatRelativeDayLabel(daysAgo: number): string {
  if (daysAgo <= 0) {
    return 'Today';
  }

  if (daysAgo === 1) {
    return 'Yesterday';
  }

  if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  }

  if (daysAgo < 14) {
    return '1 week ago';
  }

  return `${Math.round(daysAgo / 7)} weeks ago`;
}
