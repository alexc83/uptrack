import { useTheme } from '../../core/theme/use-theme';

export function DashboardPreview() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <section className="pb-28 max-[768px]:pb-[4.5rem]" aria-label="UpTrack dashboard preview">
      <div className="mx-auto w-[min(100%-2rem,76rem)]">
        <div className="overflow-hidden rounded-[1.25rem] border border-[var(--ut-landing-preview-border)] bg-[var(--ut-landing-surface-soft)] shadow-[var(--ut-landing-shadow)] max-[768px]:mx-auto max-[768px]:w-[min(100%,24rem)]">
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet={dark ? '/landing/mobile-dark-mode-dashboard.png' : '/landing/mobile-light-mode-dashboard.png'}
            />
            <img
              src={dark ? '/landing/dark-mode-dashboard.png' : '/landing/light-mode-dashboard.png'}
              alt="UpTrack dashboard preview"
              className="block h-auto w-full"
            />
          </picture>
        </div>
      </div>
    </section>
  );
}
