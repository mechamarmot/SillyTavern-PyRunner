/**
 * Virtual Environments Tests
 * Tests venv creation, deletion, switching, and default venv protection
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('Virtual Environments', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
    await pyrunner.enableExtension();
    await pyrunner.selectMode('server'); // Venvs only work in server mode
  });

  test.describe('Venv Display and Selection', () => {
    test('should display venv selector', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const select = page.locator(pyrunner.venvSelect);
      await expect(select).toBeVisible();
    });

    test('should have default venv available', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const select = page.locator(pyrunner.venvSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('default');
    });

    test('should display selected venv in badge', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const badge = page.locator(pyrunner.venvBadge);
      const badgeText = await badge.textContent();
      expect(badgeText).toBeTruthy();
      expect(badgeText).toMatch(/default|\w+/);
    });

    test('should select venv from dropdown', async () => {
      await pyrunner.selectVenv('default');

      const selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe('default');
    });

    test('should update badge when venv is selected', async ({ page }) => {
      await pyrunner.selectVenv('default');

      await pyrunner.openDrawer();
      const badge = page.locator(pyrunner.venvBadge);
      const badgeText = await badge.textContent();
      expect(badgeText).toBe('default');
    });
  });

  test.describe('Create Venv', () => {
    const testVenvName = `test_${Date.now()}`;

    test.afterEach(async () => {
      // Cleanup: try to delete test venv
      try {
        await pyrunner.selectVenv(testVenvName);
        await pyrunner.deleteVenv();
      } catch (e) {
        // Venv might not exist
      }
    });

    test('should display venv creation inputs', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const nameInput = page.locator(pyrunner.venvNameInput);
      const createBtn = page.locator(pyrunner.createVenvButton);

      await expect(nameInput).toBeVisible();
      await expect(createBtn).toBeVisible();
    });

    test('should create new venv successfully', async ({ page }) => {
      await pyrunner.createVenv(testVenvName);

      // Wait for success message
      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 30000 }); // Venv creation can take time

      // Verify venv appears in dropdown
      const select = page.locator(pyrunner.venvSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).toContain(testVenvName);
    });

    test('should auto-select newly created venv', async () => {
      await pyrunner.createVenv(testVenvName);

      await pyrunner.page.waitForTimeout(2000);

      const selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe(testVenvName);
    });

    test('should clear input field after creation', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.venvNameInput, testVenvName);
      await page.click(pyrunner.createVenvButton);

      await page.waitForTimeout(2000);

      const inputValue = await page.inputValue(pyrunner.venvNameInput);
      expect(inputValue).toBe('');
    });

    test('should show error for invalid venv name (special characters)', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.venvNameInput, 'invalid-name!');
      await page.click(pyrunner.createVenvButton);

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for invalid venv name (spaces)', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.venvNameInput, 'invalid name');
      await page.click(pyrunner.createVenvButton);

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for empty venv name', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.venvNameInput, '');
      await page.click(pyrunner.createVenvButton);

      const toastr = page.locator('.toast-warning, .toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should accept alphanumeric venv names', async ({ page }) => {
      const validName = `test123abc${Date.now()}`;

      await pyrunner.createVenv(validName);

      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 30000 });

      // Cleanup
      await pyrunner.selectVenv(validName);
      await pyrunner.deleteVenv();
    });
  });

  test.describe('Delete Venv', () => {
    const testVenvName = `delete_test_${Date.now()}`;

    test.beforeEach(async () => {
      // Create venv to delete
      await pyrunner.createVenv(testVenvName);
      await pyrunner.page.waitForTimeout(2000);
    });

    test('should display delete button', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const deleteBtn = page.locator(pyrunner.deleteVenvButton);
      await expect(deleteBtn).toBeVisible();
    });

    test('should disable delete button for default venv', async () => {
      await pyrunner.selectVenv('default');

      const isDisabled = await pyrunner.isDeleteVenvButtonDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should enable delete button for non-default venv', async () => {
      await pyrunner.selectVenv(testVenvName);

      const isDisabled = await pyrunner.isDeleteVenvButtonDisabled();
      expect(isDisabled).toBe(false);
    });

    test('should show confirmation dialog before deleting', async ({ page }) => {
      await pyrunner.selectVenv(testVenvName);

      let dialogShown = false;
      page.once('dialog', dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain(testVenvName);
        dialog.accept();
      });

      await pyrunner.deleteVenv();
      expect(dialogShown).toBe(true);
    });

    test('should delete venv successfully', async ({ page }) => {
      await pyrunner.selectVenv(testVenvName);
      await pyrunner.deleteVenv();

      // Wait for success message
      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 5000 });

      // Verify venv removed from dropdown
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');
      const select = page.locator(pyrunner.venvSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).not.toContain(testVenvName);
    });

    test('should switch to default after deleting selected venv', async () => {
      await pyrunner.selectVenv(testVenvName);
      await pyrunner.deleteVenv();

      await pyrunner.page.waitForTimeout(1000);

      const selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe('default');
    });

    test('should not delete if confirmation is cancelled', async ({ page }) => {
      await pyrunner.selectVenv(testVenvName);

      page.once('dialog', dialog => dialog.dismiss());

      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');
      await page.click(pyrunner.deleteVenvButton);

      await pyrunner.page.waitForTimeout(500);

      // Verify venv still exists
      const select = page.locator(pyrunner.venvSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).toContain(testVenvName);

      // Cleanup
      await pyrunner.deleteVenv();
    });
  });

  test.describe('Switch Between Venvs', () => {
    const venv1 = `switch1_${Date.now()}`;
    const venv2 = `switch2_${Date.now()}`;

    test.beforeEach(async () => {
      // Create two test venvs
      await pyrunner.createVenv(venv1);
      await pyrunner.page.waitForTimeout(2000);
      await pyrunner.createVenv(venv2);
      await pyrunner.page.waitForTimeout(2000);
    });

    test.afterEach(async () => {
      // Cleanup
      try {
        await pyrunner.selectVenv(venv1);
        await pyrunner.deleteVenv();
        await pyrunner.selectVenv(venv2);
        await pyrunner.deleteVenv();
      } catch (e) {
        // Venvs might not exist
      }
    });

    test('should switch to different venv', async () => {
      await pyrunner.selectVenv(venv1);
      let selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe(venv1);

      await pyrunner.selectVenv(venv2);
      selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe(venv2);
    });

    test('should update badge when switching venvs', async ({ page }) => {
      await pyrunner.selectVenv(venv1);

      await pyrunner.openDrawer();
      const badge = page.locator(pyrunner.venvBadge);
      let badgeText = await badge.textContent();
      expect(badgeText).toBe(venv1);

      await pyrunner.selectVenv(venv2);
      badgeText = await badge.textContent();
      expect(badgeText).toBe(venv2);
    });

    test('should refresh package list when switching venvs', async () => {
      await pyrunner.selectVenv(venv1);
      await pyrunner.refreshPackageList();

      await pyrunner.selectVenv(venv2);
      // Package list should update automatically
      await pyrunner.page.waitForTimeout(500);

      // Just verify no errors occurred
      const packages = await pyrunner.getPackageList();
      expect(Array.isArray(packages)).toBe(true);
    });

    test('should persist selected venv across drawer close/open', async () => {
      await pyrunner.selectVenv(venv1);
      await pyrunner.closeDrawer();
      await pyrunner.openDrawer();

      const selected = await pyrunner.getSelectedVenv();
      expect(selected).toBe(venv1);
    });
  });

  test.describe('Default Venv Protection', () => {
    test('should not allow deleting default venv', async () => {
      await pyrunner.selectVenv('default');

      const isDisabled = await pyrunner.isDeleteVenvButtonDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should show appropriate tooltip for disabled delete button', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');
      await pyrunner.selectVenv('default');

      const deleteBtn = page.locator(pyrunner.deleteVenvButton);
      const title = await deleteBtn.getAttribute('title');
      expect(title?.toLowerCase()).toContain('cannot delete');
    });

    test('should always have default venv available', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const select = page.locator(pyrunner.venvSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('default');
    });
  });

  test.describe('Venv and Package Integration', () => {
    test('should show packages for selected venv', async () => {
      await pyrunner.selectVenv('default');
      await pyrunner.refreshPackageList();

      const packages = await pyrunner.getPackageList();
      expect(Array.isArray(packages)).toBe(true);
    });

    test('should update delete button when venv changes', async () => {
      const testVenv = `update_test_${Date.now()}`;

      // Create test venv
      await pyrunner.createVenv(testVenv);
      await pyrunner.page.waitForTimeout(2000);

      // Should be enabled for test venv
      await pyrunner.selectVenv(testVenv);
      let isDisabled = await pyrunner.isDeleteVenvButtonDisabled();
      expect(isDisabled).toBe(false);

      // Should be disabled for default
      await pyrunner.selectVenv('default');
      isDisabled = await pyrunner.isDeleteVenvButtonDisabled();
      expect(isDisabled).toBe(true);

      // Cleanup
      await pyrunner.selectVenv(testVenv);
      await pyrunner.deleteVenv();
    });
  });

  test.describe('Venv Server Mode Only', () => {
    test('should show venv section only in server mode', async ({ page }) => {
      await pyrunner.selectMode('pyodide');
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const hint = page.locator('.pyrunner-hint:has-text("Server mode only")');
      await expect(hint).toBeVisible();
    });

    test('should enable venv features in server mode', async ({ page }) => {
      await pyrunner.selectMode('server');

      // Check server status
      const status = await pyrunner.getServerStatus();

      if (status.includes('Connected')) {
        await pyrunner.openDrawer();
        await pyrunner.expandSection('venv');

        const createBtn = page.locator(pyrunner.createVenvButton);
        const isDisabled = await createBtn.isDisabled();
        expect(isDisabled).toBe(false);
      } else {
        test.skip();
      }
    });
  });
});
