/**
 * Basic UI Tests for PyRunner Extension
 * Tests drawer panel, collapsible sections, and enable/disable toggle
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('PyRunner Basic UI', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
  });

  test.describe('Drawer Panel', () => {
    test('should open PyRunner drawer when clicked', async () => {
      await pyrunner.openDrawer();
      const isOpen = await pyrunner.isDrawerOpen();
      expect(isOpen).toBe(true);
    });

    test('should close PyRunner drawer when clicked again', async () => {
      await pyrunner.openDrawer();
      await pyrunner.closeDrawer();
      const isOpen = await pyrunner.isDrawerOpen();
      expect(isOpen).toBe(false);
    });

    test('should display PyRunner header in drawer', async ({ page }) => {
      await pyrunner.openDrawer();
      const header = await page.locator('.pyrunner-panel-header h2').textContent();
      expect(header.trim()).toBe('PyRunner');
    });

    test('should display warning message in drawer', async ({ page }) => {
      await pyrunner.openDrawer();
      const warning = page.locator('.pyrunner-warning');
      await expect(warning).toBeVisible();
      const warningText = await warning.textContent();
      expect(warningText).toContain('WARNING: USE AT YOUR OWN RISK');
    });
  });

  test.describe('Collapsible Sections', () => {
    const sections = ['mode', 'venv', 'functions', 'logging', 'settings', 'help'];

    test('should have all sections collapsed by default', async () => {
      await pyrunner.openDrawer();

      for (const section of sections) {
        const isExpanded = await pyrunner.isSectionExpanded(section);
        expect(isExpanded).toBe(false);
      }
    });

    test('should expand section when header is clicked', async () => {
      await pyrunner.openDrawer();

      for (const section of sections) {
        await pyrunner.expandSection(section);
        const isExpanded = await pyrunner.isSectionExpanded(section);
        expect(isExpanded).toBe(true);
      }
    });

    test('should collapse expanded section when header is clicked again', async () => {
      await pyrunner.openDrawer();

      for (const section of sections) {
        await pyrunner.expandSection(section);
        await pyrunner.collapseSection(section);
        const isExpanded = await pyrunner.isSectionExpanded(section);
        expect(isExpanded).toBe(false);
      }
    });

    test('should rotate chevron icon when toggling sections', async ({ page }) => {
      await pyrunner.openDrawer();
      const header = page.locator('[data-target="pyrunner_section_mode"]');
      const icon = header.locator('.pyrunner-collapse-icon');

      // Check collapsed state (rotated)
      let hasCollapsedClass = await header.evaluate(el => el.classList.contains('collapsed'));
      expect(hasCollapsedClass).toBe(true);

      // Expand
      await pyrunner.expandSection('mode');
      hasCollapsedClass = await header.evaluate(el => el.classList.contains('collapsed'));
      expect(hasCollapsedClass).toBe(false);
    });

    test('should display section badges', async ({ page }) => {
      await pyrunner.openDrawer();

      // Mode badge
      const modeBadge = await page.locator('#pyrunner_mode_badge').textContent();
      expect(modeBadge).toMatch(/pyodide|server/);

      // Function count badge
      const funcBadge = await page.locator('#pyrunner_func_count_badge').textContent();
      expect(funcBadge).toMatch(/\d+/);
    });
  });

  test.describe('Enable/Disable Toggle', () => {
    test('should toggle extension on when checkbox is checked', async () => {
      await pyrunner.enableExtension();
      const isEnabled = await pyrunner.isExtensionEnabled();
      expect(isEnabled).toBe(true);
    });

    test('should toggle extension off when checkbox is unchecked', async () => {
      await pyrunner.enableExtension();
      await pyrunner.disableExtension();
      const isEnabled = await pyrunner.isExtensionEnabled();
      expect(isEnabled).toBe(false);
    });

    test('should persist enabled state when drawer is closed and reopened', async () => {
      await pyrunner.enableExtension();
      await pyrunner.closeDrawer();
      await pyrunner.openDrawer();

      const isEnabled = await pyrunner.isExtensionEnabled();
      expect(isEnabled).toBe(true);
    });
  });

  test.describe('Execution Mode Selection', () => {
    test('should display mode radio buttons', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('mode');

      const pyodideRadio = page.locator(pyrunner.modeRadios.pyodide);
      const serverRadio = page.locator(pyrunner.modeRadios.server);

      await expect(pyodideRadio).toBeVisible();
      await expect(serverRadio).toBeVisible();
    });

    test('should switch to pyodide mode', async () => {
      await pyrunner.selectMode('pyodide');
      const mode = await pyrunner.getSelectedMode();
      expect(mode).toBe('pyodide');
    });

    test('should switch to server mode', async () => {
      await pyrunner.selectMode('server');
      const mode = await pyrunner.getSelectedMode();
      expect(mode).toBe('server');
    });

    test('should update mode badge when mode changes', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.selectMode('pyodide');

      const badge = await page.locator(pyrunner.modeBadge).textContent();
      expect(badge).toBe('pyodide');

      await pyrunner.selectMode('server');
      const newBadge = await page.locator(pyrunner.modeBadge).textContent();
      expect(newBadge).toBe('server');
    });

    test('should display server status indicator', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('mode');

      const statusLabel = page.locator('.pyrunner-server-status-row label');
      await expect(statusLabel).toHaveText('Server Status:');

      const status = page.locator(pyrunner.serverStatus);
      await expect(status).toBeVisible();
    });
  });

  test.describe('Settings Section', () => {
    test('should display timeout input', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('settings');

      const timeoutInput = page.locator(pyrunner.timeoutInput);
      await expect(timeoutInput).toBeVisible();
    });

    test('should update timeout value', async () => {
      await pyrunner.setTimeout(60000);
      const timeout = await pyrunner.getTimeout();
      expect(timeout).toBe(60000);
    });

    test('should have default timeout of 30000ms', async () => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('settings');

      const timeout = await pyrunner.getTimeout();
      expect(timeout).toBe(30000);
    });
  });

  test.describe('Help Section', () => {
    test('should display command examples', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('help');

      const helpSection = page.locator('.pyrunner-help');
      await expect(helpSection).toBeVisible();

      const commandsList = await helpSection.locator('code').allTextContents();
      expect(commandsList).toContain('/pyrun <code>');
      expect(commandsList).toContain('/pycall <func> [args]');
      expect(commandsList).toContain('/pyfunc [subcommand]');
    });

    test('should display command examples with syntax highlighting', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('help');

      const codeBlocks = page.locator('.pyrunner-help code');
      const count = await codeBlocks.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
