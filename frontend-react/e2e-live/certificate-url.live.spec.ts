import { test, expect } from '@playwright/test';

/** Hostile certificateUrl values are stored by the API for the owner's own record; the UI must not render them as executable links. */
const API = `${process.env.LIVE_BACKEND ?? 'http://localhost:18081'}/api`;
const run = Date.now().toString(36);
const email = `live-url-${run}@example.test`;
const pw = 'Live-Throwaway-1!';
const iso = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

for (const [label, url] of [['javascript scheme', 'javascript:window.__pwned=1'], ['data scheme', 'data:text/html,<script>window.__pwned=1</script>']] as const) {
  test(`certificateUrl with ${label} is never rendered as an executable link`, async ({ page, request }) => {
    const reg = await request.post(`${API}/auth/register`, { data: { name: 'URL Tester', email: `${label.split(' ')[0]}-${email}`, password: pw } });
    const { token, user } = await reg.json();
    const h = { Authorization: `Bearer ${token}` };
    const cred = await (await request.post(`${API}/credentials`, { headers: h, data: { name: `URL cred ${run}`, type: 'LICENSE', issuingOrganization: 'Org', expirationDate: iso(300), renewalCycleMonths: 12, requiredCEHours: 5 } })).json();
    const ce = await request.post(`${API}/ce-records`, { headers: h, data: { title: `URL course ${run}`, provider: 'P', hours: 1, dateCompleted: iso(-2), credentialId: cred.id, certificateUrl: url, certificatePublicId: `uptrack/users/${user.id}/certificates/x`, certificateResourceType: 'raw', certificateOriginalFilename: 'x.pdf' } });
    expect(ce.status()).toBe(201);
    await page.addInitScript(t => localStorage.setItem('uptrack_token', t), token);
    await page.goto('/ce-records');
    await page.getByRole('row', { name: new RegExp(`URL course ${run}`) }).click();
    const drawer = page.getByRole('dialog', { name: 'CE record details' });
    await expect(drawer.getByRole('heading', { name: new RegExp(`URL course ${run}`) })).toBeVisible();
    await expect(drawer.getByText('Certificate link unavailable')).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'View certificate' })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
}
