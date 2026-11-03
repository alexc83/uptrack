import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app/router';
import { renderWithProviders } from '../../test/render-with-providers';
import { roadmapAbout, roadmapIntro, roadmapSections } from './roadmap-content';

describe('RoadmapPage', () => {
  it('renders all frozen content in the approved order for a guest at /roadmap', async () => {
    renderWithProviders(null, { routes, path: '/roadmap' });
    expect(await screen.findByRole('heading', { level: 1, name: roadmapIntro.title })).toBeVisible();
    expect(document.title).toBe('Product Roadmap — UpTrack');
    expect(screen.getByText(roadmapIntro.tagline)).toBeVisible();
    for (const paragraph of roadmapIntro.paragraphs) {
      expect(screen.getByText(paragraph)).toBeVisible();
    }
    const sectionHeadings = await screen.findAllByRole('heading', { level: 2 });
    expect(sectionHeadings.map((heading) => heading.textContent)).toEqual([
      ...roadmapSections.map((section) => section.title),
      roadmapAbout.title,
    ]);
    expect(roadmapSections.map((section) => section.title)).toEqual(['Now', 'Next', 'Later', 'Completed']);
    for (const section of roadmapSections) {
      expect(screen.getByText(section.subtitle)).toBeVisible();
      for (const entry of section.entries) {
        expect(screen.getByRole('heading', { level: 3, name: entry.title })).toBeVisible();
        expect(screen.getByText(entry.description)).toBeVisible();
      }
    }
    expect(roadmapSections.flatMap((section) => section.entries)).toHaveLength(12);
    for (const paragraph of roadmapAbout.paragraphs) {
      expect(screen.getByText(paragraph)).toBeVisible();
    }
  });

  it('provides accessible return links to the public landing page', async () => {
    renderWithProviders(null, { routes, path: '/roadmap' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'UpTrack home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Back to UpTrack' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Roadmap' })).toHaveAttribute('href', '/roadmap');
    expect(screen.getByRole('navigation', { name: 'Roadmap' })).toBeVisible();
  });

  it('renders /roadmap for an authenticated session without redirecting', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/roadmap', session: 'authenticated' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/roadmap');
  });
});
