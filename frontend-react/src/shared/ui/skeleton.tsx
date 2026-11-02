export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-gradient-to-r from-ut-surface via-ut-hover to-ut-surface ${className}`} />;
}
