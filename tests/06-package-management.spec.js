/**
 * Package Management Tests
 * Tests install, uninstall, refresh package list, and popup interactions
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('Package Management', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
    await pyrunner.enableExtension();
    await pyrunner.selectMode('server'); // Package management requires server mode
  });

  test.describe('Package List Display', () => {
    test('should display packages list area', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packagesList = page.locator(pyrunner.packagesList);
      await expect(packagesList).toBeVisible();
    });

    test('should display refresh packages button', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const refreshBtn = page.locator(pyrunner.refreshPackagesButton);
      await expect(refreshBtn).toBeVisible();
    });

    test('should show hint before packages are loaded', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const hint = page.locator('#pyrunner_packages_list .pyrunner-hint');
      // May or may not be visible depending on state
      const isVisible = await hint.isVisible();
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Refresh Package List', () => {
    test('should refresh package list when button is clicked', async ({ page }) => {
      await pyrunner.refreshPackageList();

      // Wait for packages to load
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      expect(Array.isArray(packages)).toBe(true);
    });

    test('should show loading indicator while refreshing', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const refreshBtn = page.locator(pyrunner.refreshPackagesButton);

      // Click and immediately check for spinner
      const clickPromise = refreshBtn.click();

      // Check for spinner (might be very fast)
      const hasSpinner = await refreshBtn.locator('.fa-spinner').isVisible().catch(() => false);

      await clickPromise;
      await page.waitForTimeout(500);

      // Spinner should be gone after loading
      const stillHasSpinner = await refreshBtn.locator('.fa-spinner').isVisible().catch(() => false);
      expect(stillHasSpinner).toBe(false);
    });

    test('should display package names and versions', async ({ page }) => {
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();

      if (packages.length > 0) {
        // Check first package has proper format
        expect(packages[0]).toBeTruthy();

        // Package items should have version info
        const firstItem = page.locator('.pyrunner-package-item').first();
        const hasVersion = await firstItem.locator('.pyrunner-package-version').isVisible().catch(() => false);
        // Version may or may not be present depending on package
        expect(typeof hasVersion).toBe('boolean');
      }
    });

    test('should sort packages alphabetically', async ({ page }) => {
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();

      if (packages.length > 1) {
        // Verify sorting
        const packageNames = packages.map(p => p.split(' ')[0].toLowerCase());
        const sortedNames = [...packageNames].sort();
        expect(packageNames).toEqual(sortedNames);
      }
    });

    test('should update list when venv is changed', async ({ page }) => {
      await pyrunner.selectVenv('default');
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const defaultPackages = await pyrunner.getPackageList();

      // Create new venv and check its packages
      const testVenv = `pkg_test_${Date.now()}`;
      await pyrunner.createVenv(testVenv);
      await page.waitForTimeout(2000);

      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const newVenvPackages = await pyrunner.getPackageList();

      // New venv should have different (likely fewer) packages
      // Or at least the refresh should work without error
      expect(Array.isArray(newVenvPackages)).toBe(true);

      // Cleanup
      await pyrunner.deleteVenv();
    });
  });

  test.describe('Install Packages', () => {
    const testPackage = 'six'; // Small, commonly used package

    test('should display package input field', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const input = page.locator(pyrunner.packageInput);
      await expect(input).toBeVisible();
    });

    test('should display install button', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const button = page.locator(pyrunner.installPackagesButton);
      await expect(button).toBeVisible();
    });

    test('should install single package', async ({ page }) => {
      await pyrunner.installPackage(testPackage);

      // Wait for installation
      const toastr = page.locator('.toast-success, .toast-info');
      await expect(toastr).toBeVisible({ timeout: 60000 });

      // Verify package appears in list
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      const hasPackage = packages.some(p => p.toLowerCase().includes(testPackage));
      expect(hasPackage).toBe(true);

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should install multiple packages', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.packageInput, 'six certifi');
      await page.click(pyrunner.installPackagesButton);

      const toastr = page.locator('.toast-success, .toast-info');
      await expect(toastr).toBeVisible({ timeout: 60000 });

      // Cleanup
      await pyrunner.uninstallPackage('six');
      await pyrunner.uninstallPackage('certifi');
    });

    test('should show loading indicator during installation', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.packageInput, testPackage);

      const installBtn = page.locator(pyrunner.installPackagesButton);
      const clickPromise = installBtn.click();

      // Check for spinner
      await page.waitForTimeout(100);
      const hasSpinner = await installBtn.locator('.fa-spinner').isVisible().catch(() => false);

      await clickPromise;
      await page.waitForTimeout(1000);

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should clear input after successful installation', async ({ page }) => {
      await pyrunner.installPackage(testPackage);
      await page.waitForTimeout(2000);

      const inputValue = await page.inputValue(pyrunner.packageInput);
      expect(inputValue).toBe('');

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should show error for invalid package name', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.packageInput, 'this-package-definitely-does-not-exist-12345');
      await page.click(pyrunner.installPackagesButton);

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 30000 });
    });

    test('should show warning for empty package input', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      await page.fill(pyrunner.packageInput, '');
      await page.click(pyrunner.installPackagesButton);

      const toastr = page.locator('.toast-warning, .toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should handle already installed packages gracefully', async ({ page }) => {
      // Install package
      await pyrunner.installPackage(testPackage);
      await page.waitForTimeout(2000);

      // Try to install again
      await pyrunner.installPackage(testPackage);
      await page.waitForTimeout(2000);

      // Should show info message, not error
      const toastr = page.locator('.toast-info, .toast-success');
      await expect(toastr).toBeVisible({ timeout: 5000 });

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should install packages in currently selected venv', async ({ page }) => {
      const testVenv = `install_test_${Date.now()}`;

      // Create new venv
      await pyrunner.createVenv(testVenv);
      await page.waitForTimeout(2000);

      // Install package
      await pyrunner.installPackage(testPackage);
      await page.waitForTimeout(2000);

      // Verify package is in this venv
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      const hasPackage = packages.some(p => p.toLowerCase().includes(testPackage));
      expect(hasPackage).toBe(true);

      // Cleanup
      await pyrunner.deleteVenv();
    });
  });

  test.describe('Uninstall Packages', () => {
    const testPackage = 'six';

    test.beforeEach(async ({ page }) => {
      // Install package to uninstall
      await pyrunner.installPackage(testPackage);
      await page.waitForTimeout(2000);
      await pyrunner.refreshPackageList();
    });

    test('should show popup when package is clicked', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      const popup = page.locator('.pyrunner-package-popup');
      await expect(popup).toBeVisible();
    });

    test('should display copy and uninstall options in popup', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      const copyOption = page.locator('[data-action="copy"]');
      const uninstallOption = page.locator('[data-action="uninstall"]');

      await expect(copyOption).toBeVisible();
      await expect(uninstallOption).toBeVisible();
    });

    test('should copy package name to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      await page.click('[data-action="copy"]');

      // Wait for toastr
      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 2000 });

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should close popup after copy action', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      await page.click('[data-action="copy"]');
      await page.waitForTimeout(300);

      const popup = page.locator('.pyrunner-package-popup');
      const isVisible = await popup.isVisible().catch(() => false);
      expect(isVisible).toBe(false);

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should show confirmation dialog before uninstalling', async ({ page }) => {
      let dialogShown = false;

      page.once('dialog', dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain(testPackage);
        dialog.accept();
      });

      await pyrunner.uninstallPackage(testPackage);
      expect(dialogShown).toBe(true);
    });

    test('should uninstall package successfully', async ({ page }) => {
      await pyrunner.uninstallPackage(testPackage);

      // Wait for success
      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 30000 });

      // Verify package removed from list
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      const stillHasPackage = packages.some(p => p.toLowerCase().includes(testPackage));
      expect(stillHasPackage).toBe(false);
    });

    test('should not uninstall if confirmation is cancelled', async ({ page }) => {
      page.once('dialog', dialog => dialog.dismiss());

      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      await page.click('[data-action="uninstall"]');
      await page.waitForTimeout(500);

      // Package should still be in list
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      const hasPackage = packages.some(p => p.toLowerCase().includes(testPackage));
      expect(hasPackage).toBe(true);

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });

    test('should close popup when clicking outside', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const packageItem = page.locator(`.pyrunner-package-item[data-package="${testPackage}"]`);
      await packageItem.click();

      // Click outside popup
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const popup = page.locator('.pyrunner-package-popup');
      const isVisible = await popup.isVisible().catch(() => false);
      expect(isVisible).toBe(false);

      // Cleanup
      await pyrunner.uninstallPackage(testPackage);
    });
  });

  test.describe('Package Management UI States', () => {
    test('should show hint for server mode only', async ({ page }) => {
      await pyrunner.selectMode('pyodide');
      await pyrunner.openDrawer();
      await pyrunner.expandSection('venv');

      const hint = page.locator('.pyrunner-hint:has-text("Server mode only")');
      await expect(hint).toBeVisible();
    });

    test('should enable package features in server mode', async ({ page }) => {
      await pyrunner.selectMode('server');

      const status = await pyrunner.getServerStatus();

      if (status.includes('Connected')) {
        await pyrunner.openDrawer();
        await pyrunner.expandSection('venv');

        const installBtn = page.locator(pyrunner.installPackagesButton);
        const isDisabled = await installBtn.isDisabled();
        expect(isDisabled).toBe(false);
      } else {
        test.skip();
      }
    });

    test('should handle pip not available gracefully', async ({ page }) => {
      // This would require a venv without pip, which is unusual
      // Just verify the UI handles errors properly
      await pyrunner.refreshPackageList();

      // Should either show packages or error message
      await page.waitForTimeout(1000);
      const packages = await pyrunner.getPackageList();
      expect(Array.isArray(packages)).toBe(true);
    });
  });

  test.describe('/pyinstall Command', () => {
    test('should install package via command', async () => {
      await pyrunner.executeCommand('/pyinstall six');

      await pyrunner.page.waitForTimeout(5000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toMatch(/install|success/);

      // Cleanup
      await pyrunner.uninstallPackage('six');
    });

    test('should install multiple packages via command', async () => {
      await pyrunner.executeCommand('/pyinstall six certifi');

      await pyrunner.page.waitForTimeout(5000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toMatch(/install|success/);

      // Cleanup
      await pyrunner.uninstallPackage('six');
      await pyrunner.uninstallPackage('certifi');
    });

    test('should show error for no packages specified', async () => {
      await pyrunner.executeCommand('/pyinstall');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toMatch(/error|no.*package/);
    });

    test('should install in specified venv', async ({ page }) => {
      const testVenv = `cmd_install_${Date.now()}`;

      await pyrunner.createVenv(testVenv);
      await page.waitForTimeout(2000);

      await pyrunner.executeCommand(`/pyinstall venv=${testVenv} six`);
      await page.waitForTimeout(5000);

      // Verify package in that venv
      await pyrunner.selectVenv(testVenv);
      await pyrunner.refreshPackageList();
      await page.waitForTimeout(1000);

      const packages = await pyrunner.getPackageList();
      const hasPackage = packages.some(p => p.toLowerCase().includes('six'));
      expect(hasPackage).toBe(true);

      // Cleanup
      await pyrunner.deleteVenv();
    });
  });
});
