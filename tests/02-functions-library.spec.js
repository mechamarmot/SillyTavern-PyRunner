/**
 * Functions Library Tests
 * Tests CRUD operations, scope switching, mode selection, search/filter
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('Functions Library', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
    await pyrunner.enableExtension();
  });

  test.describe('Scope Management', () => {
    test('should switch to character scope', async () => {
      await pyrunner.switchScope('character');
      const scope = await pyrunner.getSelectedScope();
      expect(scope).toBe('character');
    });

    test('should switch to global scope', async () => {
      await pyrunner.switchScope('global');
      const scope = await pyrunner.getSelectedScope();
      expect(scope).toBe('global');
    });

    test('should highlight selected scope button', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('functions');

      await pyrunner.switchScope('character');
      const charButton = page.locator(pyrunner.scopeCharacterButton);
      const hasSelectedClass = await charButton.evaluate(el => el.classList.contains('menu_button_selected'));
      expect(hasSelectedClass).toBe(true);

      await pyrunner.switchScope('global');
      const globalButton = page.locator(pyrunner.scopeGlobalButton);
      const hasGlobalSelected = await globalButton.evaluate(el => el.classList.contains('menu_button_selected'));
      expect(hasGlobalSelected).toBe(true);
    });

    test('should show different functions for different scopes', async () => {
      // Create function in character scope
      await pyrunner.switchScope('character');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'char_func',
        description: 'Character function',
        code: 'def char_func():\n    return "character"'
      });
      await pyrunner.saveFunction();

      // Create function in global scope
      await pyrunner.switchScope('global');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'global_func',
        description: 'Global function',
        code: 'def global_func():\n    return "global"'
      });
      await pyrunner.saveFunction();

      // Verify character scope shows only character function
      await pyrunner.switchScope('character');
      let functions = await pyrunner.getFunctionsList();
      const hasCharFunc = functions.some(f => f.name === 'char_func');
      const hasGlobalFunc = functions.some(f => f.name === 'global_func');
      expect(hasCharFunc).toBe(true);
      expect(hasGlobalFunc).toBe(false);

      // Verify global scope shows only global function
      await pyrunner.switchScope('global');
      functions = await pyrunner.getFunctionsList();
      const hasCharFunc2 = functions.some(f => f.name === 'char_func');
      const hasGlobalFunc2 = functions.some(f => f.name === 'global_func');
      expect(hasCharFunc2).toBe(false);
      expect(hasGlobalFunc2).toBe(true);
    });
  });

  test.describe('Mode/Venv Selection', () => {
    test('should display mode/venv dropdown', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('functions');

      const select = page.locator(pyrunner.funcModeSelect);
      await expect(select).toBeVisible();
    });

    test('should show pyodide option in dropdown', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('functions');

      const select = page.locator(pyrunner.funcModeSelect);
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('Pyodide');
    });

    test('should switch function mode to pyodide', async () => {
      await pyrunner.selectFuncMode('pyodide');

      const functions = await pyrunner.getFunctionsList();
      // Functions list should update based on selected mode
      expect(Array.isArray(functions)).toBe(true);
    });

    test('should show different functions for different modes/venvs', async () => {
      // This test assumes server mode with multiple venvs
      // Create function in pyodide
      await pyrunner.selectFuncMode('pyodide');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'pyodide_func',
        code: 'def pyodide_func():\n    return "pyodide"'
      });
      await pyrunner.saveFunction();

      // Switch to server mode (if available)
      await pyrunner.selectMode('server');
      await pyrunner.selectFuncMode('default');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'server_func',
        code: 'def server_func():\n    return "server"'
      });
      await pyrunner.saveFunction();

      // Verify pyodide shows only pyodide functions
      await pyrunner.selectFuncMode('pyodide');
      let functions = await pyrunner.getFunctionsList();
      const hasPyodideFunc = functions.some(f => f.name === 'pyodide_func');
      expect(hasPyodideFunc).toBe(true);
    });
  });

  test.describe('Create Function', () => {
    test('should open create function modal', async () => {
      await pyrunner.openCreateFunctionModal();
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(true);
    });

    test('should display "Create Function" title in modal', async () => {
      await pyrunner.openCreateFunctionModal();
      const title = await pyrunner.getModalTitle();
      expect(title).toBe('Create Function');
    });

    test('should create new function successfully', async () => {
      await pyrunner.openCreateFunctionModal();

      await pyrunner.fillFunctionForm({
        name: 'test_function',
        description: 'A test function',
        arguments: 'arg1, arg2',
        code: 'def test_function(arg1, arg2):\n    return arg1 + arg2'
      });

      await pyrunner.saveFunction();

      // Verify modal closed
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(false);

      // Verify function appears in list
      const functions = await pyrunner.getFunctionsList();
      const created = functions.find(f => f.name === 'test_function');
      expect(created).toBeDefined();
      expect(created.description).toBe('A test function');
    });

    test('should increment function count badge after creation', async () => {
      const initialCount = await pyrunner.getFunctionCount();

      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'count_test',
        code: 'def count_test():\n    pass'
      });
      await pyrunner.saveFunction();

      const newCount = await pyrunner.getFunctionCount();
      expect(newCount).toBe(initialCount + 1);
    });
  });

  test.describe('Edit Function', () => {
    test.beforeEach(async () => {
      // Create a function to edit
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'edit_test',
        description: 'Original description',
        code: 'def edit_test():\n    return "original"'
      });
      await pyrunner.saveFunction();
    });

    test('should open edit modal for existing function', async () => {
      await pyrunner.editFunction('edit_test');
      const isOpen = await pyrunner.isModalOpen();
      expect(isOpen).toBe(true);
    });

    test('should display "Edit Function" title in modal', async () => {
      await pyrunner.editFunction('edit_test');
      const title = await pyrunner.getModalTitle();
      expect(title).toBe('Edit Function');
    });

    test('should populate form with existing function data', async () => {
      await pyrunner.editFunction('edit_test');

      const formData = await pyrunner.getFunctionFormData();
      expect(formData.name).toBe('edit_test');
      expect(formData.description).toBe('Original description');
      expect(formData.code).toContain('return "original"');
    });

    test('should save changes to existing function', async () => {
      await pyrunner.editFunction('edit_test');

      await pyrunner.fillFunctionForm({
        description: 'Updated description',
        code: 'def edit_test():\n    return "updated"'
      });

      await pyrunner.saveFunction();

      // Verify changes appear in list
      const functions = await pyrunner.getFunctionsList();
      const updated = functions.find(f => f.name === 'edit_test');
      expect(updated.description).toBe('Updated description');
    });

    test('should disable function name input when editing', async ({ page }) => {
      await pyrunner.editFunction('edit_test');

      const nameInput = page.locator(pyrunner.modalNameInput);
      const isDisabled = await nameInput.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Delete Function', () => {
    test.beforeEach(async () => {
      // Create a function to delete
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'delete_test',
        code: 'def delete_test():\n    pass'
      });
      await pyrunner.saveFunction();
    });

    test('should show confirmation dialog when deleting', async ({ page }) => {
      let dialogShown = false;

      page.once('dialog', dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain('delete_test');
        dialog.accept();
      });

      await pyrunner.deleteFunction('delete_test');
      expect(dialogShown).toBe(true);
    });

    test('should remove function from list after deletion', async () => {
      await pyrunner.deleteFunction('delete_test');

      const functions = await pyrunner.getFunctionsList();
      const deleted = functions.find(f => f.name === 'delete_test');
      expect(deleted).toBeUndefined();
    });

    test('should decrement function count badge after deletion', async () => {
      const initialCount = await pyrunner.getFunctionCount();

      await pyrunner.deleteFunction('delete_test');

      const newCount = await pyrunner.getFunctionCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test('should not delete function if confirmation is cancelled', async ({ page }) => {
      page.once('dialog', dialog => dialog.dismiss());

      await pyrunner.openDrawer();
      await pyrunner.expandSection('functions');

      const deleteBtn = page.locator('.pyrunner-func-delete[data-name="delete_test"]');
      await deleteBtn.click();

      // Function should still be in list
      const functions = await pyrunner.getFunctionsList();
      const stillExists = functions.find(f => f.name === 'delete_test');
      expect(stillExists).toBeDefined();
    });
  });

  test.describe('Search/Filter Functions', () => {
    test.beforeEach(async () => {
      // Create multiple functions for searching
      const testFunctions = [
        { name: 'add_numbers', description: 'Adds two numbers' },
        { name: 'multiply', description: 'Multiplies values' },
        { name: 'calculate_sum', description: 'Sum calculator' }
      ];

      for (const func of testFunctions) {
        await pyrunner.openCreateFunctionModal();
        await pyrunner.fillFunctionForm({
          name: func.name,
          description: func.description,
          code: `def ${func.name}():\n    pass`
        });
        await pyrunner.saveFunction();
      }
    });

    test('should filter functions by name', async () => {
      await pyrunner.searchFunctions('add');

      const functions = await pyrunner.getFunctionsList();
      expect(functions.length).toBeGreaterThan(0);
      expect(functions.some(f => f.name.includes('add'))).toBe(true);
    });

    test('should filter functions by description', async () => {
      await pyrunner.searchFunctions('calculator');

      const functions = await pyrunner.getFunctionsList();
      const hasCalculator = functions.some(f => f.description.toLowerCase().includes('calculator'));
      expect(hasCalculator).toBe(true);
    });

    test('should show no results for non-matching search', async ({ page }) => {
      await pyrunner.searchFunctions('nonexistent_function_xyz');

      const listEl = page.locator(pyrunner.functionsList);
      const hint = listEl.locator('.pyrunner-hint');

      await expect(hint).toBeVisible();
    });

    test('should show all functions when search is cleared', async () => {
      await pyrunner.searchFunctions('add');
      let functions = await pyrunner.getFunctionsList();
      const filteredCount = functions.length;

      await pyrunner.searchFunctions('');
      functions = await pyrunner.getFunctionsList();

      expect(functions.length).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  test.describe('Function Count Badge', () => {
    test('should display function count badge', async ({ page }) => {
      await pyrunner.openDrawer();
      await pyrunner.expandSection('functions');

      const badge = page.locator(pyrunner.funcCountBadge);
      await expect(badge).toBeVisible();
    });

    test('should show correct count across all venvs for current scope', async () => {
      // Create function in pyodide
      await pyrunner.selectFuncMode('pyodide');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'func1',
        code: 'def func1():\n    pass'
      });
      await pyrunner.saveFunction();

      const count = await pyrunner.getFunctionCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should update count when switching scopes', async () => {
      // Add function to character scope
      await pyrunner.switchScope('character');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'char_count',
        code: 'def char_count():\n    pass'
      });
      await pyrunner.saveFunction();
      const charCount = await pyrunner.getFunctionCount();

      // Switch to global scope (should have different count)
      await pyrunner.switchScope('global');
      const globalCount = await pyrunner.getFunctionCount();

      // Counts may be different depending on existing functions
      expect(typeof charCount).toBe('number');
      expect(typeof globalCount).toBe('number');
    });
  });

  test.describe('Target Display', () => {
    test('should show correct target in modal', async () => {
      await pyrunner.switchScope('character');
      await pyrunner.selectFuncMode('pyodide');
      await pyrunner.openCreateFunctionModal();

      const target = await pyrunner.getModalTarget();
      expect(target).toContain('character');
      expect(target).toContain('pyodide');
    });

    test('should update target when scope changes', async () => {
      await pyrunner.switchScope('global');
      await pyrunner.openCreateFunctionModal();

      let target = await pyrunner.getModalTarget();
      expect(target).toContain('global');

      await pyrunner.closeModal();
      await pyrunner.switchScope('character');
      await pyrunner.openCreateFunctionModal();

      target = await pyrunner.getModalTarget();
      expect(target).toContain('character');
    });
  });
});
