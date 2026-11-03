import { test, expect, allowApi, e2eUser, mockCredentialReads, mockSettings, noOverflow, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await mockCredentialReads(page);
  await mockSettings(page);
});

test('settings page loads profile, validates changes, and saves trimmed profile', async ({ page }) => {
  let updatedPayload: unknown = null;
  allowApi(page, 'PUT', '/api/users/me');
  await page.route(/^http:\/\/localhost:5173\/api\/users\/me$/, async (route) => {
    if (route.request().method() === 'PUT') {
      updatedPayload = JSON.parse(route.request().postData() ?? '{}');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...e2eUser,
          name: 'Updated Name',
        }),
      });
    }
    return route.fallback();
  });

  await page.goto('/settings');
  await expect(page).toHaveTitle('Settings — UpTrack');

  await expect(page.getByText('Account', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

  const nameInput = page.getByLabel('Name');
  const emailInput = page.getByLabel('Email');
  const saveButton = page.getByRole('button', { name: 'Save Changes' });

  await expect(nameInput).toHaveValue(e2eUser.name);
  await expect(emailInput).toHaveValue(e2eUser.email);
  await expect(saveButton).toBeDisabled();

  // Edit name with trailing/leading whitespace
  await nameInput.fill('  Updated Name  ');
  await expect(saveButton).toBeEnabled();

  await saveButton.click();

  await expect(page.getByRole('status')).toHaveText('Profile updated');
  expect(updatedPayload).toEqual({
    name: 'Updated Name',
    email: e2eUser.email,
  });

  // Verify shell reflects updated user identity
  await expect(page.getByTestId('desktop-sidebar')).toContainText('Updated Name');

  await noOverflow(page);
});

test('change password dialog: validation, rejection, and success flow', async ({ page }) => {
  let passwordCallCount = 0;
  allowApi(page, 'PUT', '/api/users/me/password');
  await page.route(/^http:\/\/localhost:5173\/api\/users\/me\/password$/, async (route) => {
    if (route.request().method() === 'PUT') {
      passwordCallCount += 1;
      const body = JSON.parse(route.request().postData() ?? '{}');
      if (body.currentPassword === 'wrong-password') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Current password is incorrect.' }),
        });
      }
      return route.fulfill({ status: 204 });
    }
    return route.fallback();
  });

  await page.goto('/settings');

  // Open password dialog
  await page.getByRole('button', { name: 'Change Password' }).click();
  const dialog = page.getByRole('dialog', { name: 'Change Password' });
  await expect(dialog).toBeVisible();

  const currentInput = dialog.getByLabel('Current Password', { exact: true });
  const newInput = dialog.getByLabel('New Password', { exact: true });
  const confirmInput = dialog.getByLabel('Confirm New Password', { exact: true });
  const updateButton = dialog.getByRole('button', { name: 'Update Password' });

  // Test client validation: new password same as current password
  await currentInput.fill('current-secret-123');
  await newInput.fill('current-secret-123');
  await confirmInput.fill('current-secret-123');
  await confirmInput.blur();
  await expect(dialog.getByText('New password must be different from your current password.')).toBeVisible();
  await expect(updateButton).toBeDisabled();

  // Test wrong current password (400 from server)
  await currentInput.fill('wrong-password');
  await newInput.fill('valid-new-password-123');
  await confirmInput.fill('valid-new-password-123');
  await expect(updateButton).toBeEnabled();
  await updateButton.click();

  await expect(dialog.getByRole('alert')).toHaveText('Current password is incorrect.');
  await expect(dialog).toBeVisible();
  expect(passwordCallCount).toBe(1);

  // Test successful update (204 from server)
  await currentInput.fill('correct-password');
  await updateButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Password updated');
  expect(passwordCallCount).toBe(2);

  await noOverflow(page);
});

test('back button navigates to previous page', async ({ page }) => {
  await page.goto('/credentials');
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/credentials$/);
});
