import { describe, expect, it } from 'vitest';
import type { DashboardResponse } from '../../lib/dto/dashboard';
import { dashboardNow, emptyDashboard, makeActivity, makeCredential, overflowDashboard, populatedDashboard } from '../../test/fixtures/dashboard-fixtures';
import { activityIconKey, buildDashboardView, buildGreeting, daysUntil, formatHours, formatRelativeDayLabel, formatShortDate } from './dashboard-view';

const user = { name: 'Demo Main' };
const build = (data: DashboardResponse) => buildDashboardView(data, user, dashboardNow);

describe('helpers', () => {
  it.each([[0, 'Good morning'], [11, 'Good morning'], [12, 'Good afternoon'], [17, 'Good afternoon'], [18, 'Good evening'], [23, 'Good evening']])('greets at hour %i with %s', (hour, text) => {
    expect(buildGreeting(new Date(2026, 10, 2, hour, 59))).toBe(text);
  });
  it('counts whole local days from the start of today', () => {
    expect(daysUntil('2026-11-02', dashboardNow)).toBe(0);
    expect(daysUntil('2026-12-02', dashboardNow)).toBe(30);
    expect(daysUntil('2026-10-23', dashboardNow)).toBe(-10);
  });
  it.each([[0, 'Today'], [-1, 'Today'], [1, 'Yesterday'], [2, '2 days ago'], [6, '6 days ago'], [7, '1 week ago'], [13, '1 week ago'], [14, '2 weeks ago'], [60, '9 weeks ago']])('labels %i days ago as %s', (days, label) => {
    expect(formatRelativeDayLabel(days)).toBe(label);
  });
  it.each([[4, '4'], [4.5, '4.5'], [8 - 3.3, '4.7'], [15.555, '15.56'], [0.1 + 0.2, '0.3'], [20, '20'], [Number.NaN, '0'], [-0, '0']])('formats %s hours as %s', (value, text) => {
    expect(formatHours(value)).toBe(text);
  });
  it('formats short dates and tolerates a malformed one', () => {
    expect(formatShortDate('2026-12-02')).toBe('Dec 2, 2026');
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
  });
  it('maps only known server icon classes and falls back safely', () => {
    expect(activityIconKey('pi pi-file')).toBe('file');
    expect(activityIconKey('pi pi-plus')).toBe('plus');
    expect(activityIconKey('pi pi-unknown')).toBe('generic');
    expect(activityIconKey('<script>')).toBe('generic');
  });
});

describe('buildDashboardView', () => {
  it('maps the populated demo shape', () => {
    const view = build(populatedDashboard());
    expect(view.firstName).toBe('Demo');
    expect(view.greeting).toBe('Good morning');
    expect(view.dateLabel).toBe('Monday, November 2, 2026');
    expect(view.isEmpty).toBe(false);
    expect(view.stats.map(stat => [stat.label, stat.value, stat.tone])).toEqual([['Total Credentials', 4, 'primary'], ['Active', 2, 'active'], ['Expiring Soon', 1, 'expiring'], ['Expired', 1, 'expired']]);
    expect(view.expirations).toMatchObject([{ name: 'A ACLS Certification', badgeLabel: '30d left', badgeTone: 'expiring', dateLabel: 'Dec 2, 2026', highlighted: true, ceStillNeeded: '4', typeLabel: 'Certification', href: '/credentials?credentialId=A-acls' }]);
    expect(view.ceNeeded.map(row => [row.name, row.percentLabel, row.hoursLabel, row.tone, row.dueLabel])).toEqual([
      ['A ACLS Certification', '50%', '4/8 hrs', 'expiring', 'Due Dec 2, 2026'],
      ['A RN License', '78%', '15.5/20 hrs', 'primary', 'Due Nov 2, 2027'],
    ]);
    expect(view.ceNeededTotal).toBe(2);
  });
  it('caps panels at three and activity at four, newest first, without losing the overflow', () => {
    const view = build({ ...overflowDashboard(), recentActivity: [-1, -9, -3, -30, -2, -5].map((days, index) => makeActivity(`a${index}`, days)) });
    expect(view.expirations).toHaveLength(3);
    expect(view.expirationsOverflow).toBe(2);
    expect(view.ceNeeded).toHaveLength(3);
    expect(view.ceNeededOverflow).toBe(2);
    expect(view.expirationsDrawer.rows).toHaveLength(5);
    expect(view.expirationsDrawer.subtitle).toBe('5 credentials · sorted by urgency');
    expect(view.activity.map(row => row.id)).toEqual(['a0', 'a4', 'a2', 'a5']);
    expect(view.activity.map(row => row.relativeTime)).toEqual(['Yesterday', '2 days ago', '3 days ago', '5 days ago']);
  });
  it('shows the real CE-attention count, not the number of visible rows', () => {
    const view = build(overflowDashboard());
    expect(view.ceNeeded).toHaveLength(3);
    expect(view.ceNeededTotal).toBe(5);
  });
  it('orders the CE drawer by lowest completion and the panel by expiration date', () => {
    const late = makeCredential('late', 'Late', 80, { requiredCEHours: 10, ceHoursEarned: 1 });
    const early = makeCredential('early', 'Early', 10, { requiredCEHours: 10, ceHoursEarned: 9 });
    const view = build({ ...emptyDashboard, stats: { ...emptyDashboard.stats, totalCredentials: 2, needsCEAttentionCount: 2 }, ceAttention: [late, early] });
    expect(view.ceNeeded.map(row => row.id)).toEqual(['early', 'late']);
    expect(view.ceNeededDrawer.rows.map(row => row.id)).toEqual(['late', 'early']);
    expect(view.ceNeededDrawer.subtitle).toBe('2 credentials · lowest completion first');
  });
  it('marks past due credentials as expired and uses expired tone for their CE bar', () => {
    const past = makeCredential('p', 'Past', -3, { requiredCEHours: 4, ceHoursEarned: 1 });
    const view = build({ ...emptyDashboard, stats: { ...emptyDashboard.stats, totalCredentials: 1 }, upcomingExpirations: [past], ceAttention: [past] });
    expect(view.expirations[0]).toMatchObject({ badgeLabel: 'Expired', badgeTone: 'expired' });
    expect(view.ceNeeded[0]?.tone).toBe('expired');
  });
  it('treats complete progress as active and clamps over-complete progress', () => {
    const done = makeCredential('d', 'Done', 40, { requiredCEHours: 4, ceHoursEarned: 6, ceProgress: 1.5 });
    const view = build({ ...emptyDashboard, stats: { ...emptyDashboard.stats, totalCredentials: 1 }, ceAttention: [done] });
    expect(view.ceNeeded[0]).toMatchObject({ percent: 100, tone: 'active' });
  });
  it('reports an empty account without treating it as an error', () => {
    const view = build(emptyDashboard);
    expect(view.isEmpty).toBe(true);
    expect(view.stats.every(stat => stat.value === 0)).toBe(true);
    expect(view.expirations).toEqual([]);
    expect(view.activity).toEqual([]);
  });
  it('does not mutate the DTO arrays it sorts and maps', () => {
    const data = overflowDashboard();
    data.ceAttention.reverse();
    data.recentActivity = [makeActivity('x', -9), makeActivity('y', -1)];
    const snapshot = JSON.stringify(data);
    const frozen = structuredClone(data);
    for (const list of [frozen.upcomingExpirations, frozen.ceAttention, frozen.recentActivity]) { Object.freeze(list); }
    build(frozen);
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });
  it('falls back to a neutral name when no identity is available', () => {
    expect(buildDashboardView(emptyDashboard, null, dashboardNow).firstName).toBe('UpTrack');
    expect(buildDashboardView(emptyDashboard, { name: '   ' }, dashboardNow).firstName).toBe('UpTrack');
  });
});
