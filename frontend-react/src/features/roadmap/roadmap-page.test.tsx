import { screen, within } from '@testing-library/react';
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

  it('lists each entry once with Public Product Roadmap under Completed and Help Center as the only Now entry', async () => {
    renderWithProviders(null, { routes, path: '/roadmap' });
    expect(await screen.findByRole('heading', { level: 1, name: roadmapIntro.title })).toBeVisible();
    const titlesOf = (key: string) => roadmapSections.find((section) => section.key === key)?.entries.map((entry) => entry.title);
    expect(titlesOf('now')).toEqual(['Help Center']);
    expect(titlesOf('completed')).toEqual([
      'Public Product Roadmap',
      'Professional Credential Tracking',
      'Continuing Education Tracking',
      'Dashboard and Reports',
      'Refreshed Application Experience',
    ]);
    expect(roadmapSections.map((section) => section.entries.length)).toEqual([1, 2, 4, 5]);
    const allTitles = roadmapSections.flatMap((section) => section.entries.map((entry) => entry.title));
    expect(allTitles).toHaveLength(12);
    expect(new Set(allTitles).size).toBe(12);
    for (const title of allTitles) {
      expect(screen.getAllByRole('heading', { level: 3, name: title })).toHaveLength(1);
    }
  });

  it('provides accessible return links to the public landing page', async () => {
    renderWithProviders(null, { routes, path: '/roadmap' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'UpTrack home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Back to UpTrack' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Roadmap' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Roadmap' })).toBeVisible();
  });

  it('links to the Help Center from the footer without a self-referential Roadmap link', async () => {
    renderWithProviders(null, { routes, path: '/roadmap' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
    const footer = screen.getByRole('navigation', { name: 'Public pages' });
    expect(within(footer).getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/help');
    expect(within(footer).queryByRole('link', { name: 'Roadmap' })).not.toBeInTheDocument();
  });

  it('renders /roadmap for an authenticated session without redirecting', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/roadmap', session: 'authenticated' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/roadmap');
  });
});
