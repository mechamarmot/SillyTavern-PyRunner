/**
 * Modal Editor Tests
 * Tests modal validation, save/cancel behavior, and form interactions
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('Function Modal Editor', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
    await pyrunner.enableExtension();
  });

  test.describe('Modal Opening and Closing', () => {
    test('should open modal for new function', async () => {
      await pyrunner.openCreateFunctionModal();
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(true);
    });

    test('should close modal when close button is clicked', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.closeModal();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should close modal when cancel button is clicked', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.cancelModal();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should close modal when clicking overlay', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      // Click on the modal overlay (not the dialog)
      const overlay = page.locator(pyrunner.modal);
      await overlay.click({ position: { x: 10, y: 10 } });

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should not close modal when clicking inside dialog', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      // Click inside the modal dialog
      const dialogTitle = page.locator(pyrunner.modalTitle);
      await dialogTitle.click();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(true);
    });
  });

  test.describe('Form Validation - Function Name', () => {
    test('should show error for empty function name', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: '',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      // Check for toastr error message
      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for invalid identifier (starts with number)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: '123invalid',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for invalid identifier (contains spaces)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'invalid name',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for invalid identifier (special characters)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'invalid-name!',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for Python keyword (def)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'def',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
      const errorText = await toastr.textContent();
      expect(errorText.toLowerCase()).toContain('keyword');
    });

    test('should show error for Python keyword (class)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'class',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should show error for Python keyword (import)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'import',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should accept valid identifier (letters only)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'validname',
        code: 'def validname():\n    pass'
      });

      await pyrunner.saveFunction();

      // Modal should close on success
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should accept valid identifier (with underscores)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'valid_name_123',
        code: 'def valid_name_123():\n    pass'
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should accept valid identifier (starts with underscore)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: '_private_func',
        code: 'def _private_func():\n    pass'
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });
  });

  test.describe('Form Validation - Code', () => {
    test('should show error for empty code', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'test_func',
        code: ''
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
      const errorText = await toastr.textContent();
      expect(errorText.toLowerCase()).toContain('code');
    });

    test('should show error for whitespace-only code', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'test_func',
        code: '   \n   \n   '
      });

      await pyrunner.saveFunction();

      const toastr = page.locator('.toast-error');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should accept non-empty code', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'test_func',
        code: 'print("hello")'
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });
  });

  test.describe('Cancel Without Saving', () => {
    test('should discard changes when cancel is clicked', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'cancel_test',
        description: 'This should not be saved',
        code: 'def cancel_test():\n    pass'
      });

      await pyrunner.cancelModal();

      // Verify function was not created
      const functions = await pyrunner.getFunctionsList();
      const found = functions.find(f => f.name === 'cancel_test');
      expect(found).toBeUndefined();
    });

    test('should not save when close button is clicked', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'close_test',
        code: 'def close_test():\n    pass'
      });

      await pyrunner.closeModal();

      const functions = await pyrunner.getFunctionsList();
      const found = functions.find(f => f.name === 'close_test');
      expect(found).toBeUndefined();
    });

    test('should not save when overlay is clicked', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'overlay_test',
        code: 'def overlay_test():\n    pass'
      });

      // Click overlay
      const overlay = page.locator(pyrunner.modal);
      await overlay.click({ position: { x: 10, y: 10 } });

      const functions = await pyrunner.getFunctionsList();
      const found = functions.find(f => f.name === 'overlay_test');
      expect(found).toBeUndefined();
    });
  });

  test.describe('Form Fields', () => {
    test('should allow editing all form fields', async () => {
      await pyrunner.openCreateFunctionModal();

      const testData = {
        name: 'full_test',
        description: 'A complete test function',
        arguments: 'x, y, z',
        code: 'def full_test(x, y, z):\n    return x + y + z'
      };

      await pyrunner.fillFunctionForm(testData);

      const formData = await pyrunner.getFunctionFormData();
      expect(formData.name).toBe(testData.name);
      expect(formData.description).toBe(testData.description);
      expect(formData.arguments).toBe(testData.arguments);
      expect(formData.code).toBe(testData.code);
    });

    test('should preserve multiline code formatting', async () => {
      await pyrunner.openCreateFunctionModal();

      const multilineCode = `def test():
    if True:
        print("line 1")
        print("line 2")
    return "done"`;

      await pyrunner.fillFunctionForm({
        name: 'multiline_test',
        code: multilineCode
      });

      const formData = await pyrunner.getFunctionFormData();
      expect(formData.code).toBe(multilineCode);
    });

    test('should handle description field as optional', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'no_desc',
        code: 'def no_desc():\n    pass'
        // description omitted
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should handle arguments field as optional', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'no_args',
        code: 'def no_args():\n    pass'
        // arguments omitted
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });
  });

  test.describe('Target Display', () => {
    test('should display current target (scope/venv)', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      const target = page.locator(pyrunner.modalTarget);
      await expect(target).toBeVisible();

      const targetText = await target.textContent();
      expect(targetText).toMatch(/character|global/);
      expect(targetText).toMatch(/pyodide|default/);
    });

    test('should show character/pyodide as default target', async ({ page }) => {
      await pyrunner.switchScope('character');
      await pyrunner.selectFuncMode('pyodide');
      await pyrunner.openCreateFunctionModal();

      const targetText = await page.locator(pyrunner.modalTarget).textContent();
      expect(targetText).toContain('character');
      expect(targetText).toContain('pyodide');
    });

    test('should update target display based on selected scope', async ({ page }) => {
      await pyrunner.switchScope('global');
      await pyrunner.openCreateFunctionModal();

      const targetText = await page.locator(pyrunner.modalTarget).textContent();
      expect(targetText).toContain('global');
    });

    test('should update target display based on selected mode', async ({ page }) => {
      await pyrunner.selectMode('server');
      await pyrunner.selectFuncMode('default');
      await pyrunner.openCreateFunctionModal();

      const targetText = await page.locator(pyrunner.modalTarget).textContent();
      expect(targetText).toMatch(/default/);
    });
  });

  test.describe('Save Behavior', () => {
    test('should show success message on save', async ({ page }) => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'success_test',
        code: 'def success_test():\n    pass'
      });

      await pyrunner.saveFunction();

      // Look for success toastr
      const toastr = page.locator('.toast-success');
      await expect(toastr).toBeVisible({ timeout: 2000 });
    });

    test('should close modal on successful save', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'close_on_save',
        code: 'def close_on_save():\n    pass'
      });

      await pyrunner.saveFunction();

      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);
    });

    test('should not close modal on validation error', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'invalid name with spaces',
        code: 'def test():\n    pass'
      });

      await pyrunner.saveFunction();

      // Modal should still be open
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(true);
    });
  });

  test.describe('Editing Existing Function', () => {
    test.beforeEach(async () => {
      // Create function to edit
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'edit_me',
        description: 'Original',
        code: 'def edit_me():\n    return "old"'
      });
      await pyrunner.saveFunction();
    });

    test('should populate form when editing', async () => {
      await pyrunner.editFunction('edit_me');

      const formData = await pyrunner.getFunctionFormData();
      expect(formData.name).toBe('edit_me');
      expect(formData.description).toBe('Original');
      expect(formData.code).toContain('return "old"');
    });

    test('should show "Edit Function" title when editing', async () => {
      await pyrunner.editFunction('edit_me');

      const title = await pyrunner.getModalTitle();
      expect(title).toBe('Edit Function');
    });

    test('should save edited function', async () => {
      await pyrunner.editFunction('edit_me');

      await pyrunner.fillFunctionForm({
        description: 'Updated',
        code: 'def edit_me():\n    return "new"'
      });

      await pyrunner.saveFunction();

      // Re-open to verify
      await pyrunner.editFunction('edit_me');
      const formData = await pyrunner.getFunctionFormData();
      expect(formData.description).toBe('Updated');
      expect(formData.code).toContain('return "new"');
    });

    test('should not allow changing function name when editing', async ({ page }) => {
      await pyrunner.editFunction('edit_me');

      const nameInput = page.locator(pyrunner.modalNameInput);
      const isDisabled = await nameInput.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });
});
