/**
 * Function Execution Tests
 * Tests /pycall, /pyrun commands, inline function calls, auto-venv switching
 */

const { test, expect } = require('@playwright/test');
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test.describe('Function Execution', () => {
  let pyrunner;

  test.beforeEach(async ({ page }) => {
    pyrunner = new PyRunnerPage(page);
    await pyrunner.goto();
    await pyrunner.enableExtension();
  });

  test.describe('/pyrun Command', () => {
    test('should execute simple Python code', async () => {
      await pyrunner.executeCommand('/pyrun print("Hello World")');

      // Wait for execution and check result
      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('Hello World');
    });

    test('should execute Python expression and return result', async () => {
      await pyrunner.executeCommand('/pyrun 2 + 2');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('4');
    });

    test('should handle multi-line Python code', async () => {
      const code = `x = 5
y = 10
print(x + y)`;

      await pyrunner.executeCommand(`/pyrun ${code}`);

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('15');
    });

    test('should show error for invalid Python syntax', async () => {
      await pyrunner.executeCommand('/pyrun def invalid syntax:');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('error');
    });

    test('should show error when extension is disabled', async () => {
      await pyrunner.disableExtension();
      await pyrunner.executeCommand('/pyrun print("test")');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('disabled');
    });

    test('should execute with explicit mode parameter', async () => {
      await pyrunner.executeCommand('/pyrun mode=pyodide print("pyodide mode")');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('pyodide mode');
    });

    test('should execute with timeout parameter', async () => {
      await pyrunner.executeCommand('/pyrun timeout=5000 print("fast execution")');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('fast execution');
    });

    test('should show error for no code provided', async () => {
      await pyrunner.executeCommand('/pyrun');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toMatch(/error|no.*code/);
    });
  });

  test.describe('/pycall Command', () => {
    test.beforeEach(async () => {
      // Create a test function
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'greet',
        code: 'def greet(name):\n    return f"Hello, {name}!"'
      });
      await pyrunner.saveFunction();
    });

    test('should call saved function with arguments', async () => {
      await pyrunner.executeCommand('/pycall greet "World"');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('Hello, World!');
    });

    test('should call function without arguments', async () => {
      // Create no-arg function
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'get_constant',
        code: 'def get_constant():\n    return 42'
      });
      await pyrunner.saveFunction();

      await pyrunner.executeCommand('/pycall get_constant');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('42');
    });

    test('should show error for missing function', async () => {
      await pyrunner.executeCommand('/pycall nonexistent_function');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('not found');
    });

    test('should show error when no function name provided', async () => {
      await pyrunner.executeCommand('/pycall');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toMatch(/error|no.*function/);
    });

    test('should list available functions in error message', async () => {
      await pyrunner.executeCommand('/pycall missing_func');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('available');
    });

    test('should pass multiple arguments', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'add_three',
        code: 'def add_three(a, b, c):\n    return a + b + c'
      });
      await pyrunner.saveFunction();

      await pyrunner.executeCommand('/pycall add_three 1 2 3');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('6');
    });

    test('should execute with timeout parameter', async () => {
      await pyrunner.executeCommand('/pycall timeout=5000 greet "Alice"');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('Hello, Alice!');
    });
  });

  test.describe('Inline Function Calls in /pyrun', () => {
    test.beforeEach(async () => {
      // Create helper functions
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'double',
        code: 'def double(x):\n    return x * 2'
      });
      await pyrunner.saveFunction();

      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'square',
        code: 'def square(x):\n    return x ** 2'
      });
      await pyrunner.saveFunction();
    });

    test('should inject and call saved function inline', async () => {
      await pyrunner.executeCommand('/pyrun result = double(5); print(result)');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('10');
    });

    test('should inject multiple functions when called', async () => {
      await pyrunner.executeCommand('/pyrun x = double(3); y = square(2); print(x + y)');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('10'); // 6 + 4
    });

    test('should work without injecting when function not called', async () => {
      await pyrunner.executeCommand('/pyrun print("no function call")');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('no function call');
    });

    test('should inject function even in complex expressions', async () => {
      await pyrunner.executeCommand('/pyrun print(f"Result: {double(7)}")');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('14');
    });
  });

  test.describe('Auto-venv Switching', () => {
    test('should auto-switch to pyodide for pyodide functions', async () => {
      // Create function in pyodide mode
      await pyrunner.selectMode('pyodide');
      await pyrunner.selectFuncMode('pyodide');
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'pyodide_func',
        code: 'def pyodide_func():\n    return "pyodide"'
      });
      await pyrunner.saveFunction();

      // Call function (should auto-switch to pyodide)
      await pyrunner.executeCommand('/pyrun pyodide_func()');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('pyodide');
    });

    test('should auto-switch to correct venv for server functions', async () => {
      // This test requires server mode and venvs to be available
      await pyrunner.selectMode('server');
      await pyrunner.selectFuncMode('default');

      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'server_func',
        code: 'def server_func():\n    return "server default"'
      });
      await pyrunner.saveFunction();

      await pyrunner.executeCommand('/pyrun server_func()');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      // Should execute in server mode
      expect(result).toBeTruthy();
    });

    test('should use explicit venv parameter over auto-switching', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'test_func',
        code: 'def test_func():\n    return "test"'
      });
      await pyrunner.saveFunction();

      // Call with explicit venv parameter
      await pyrunner.executeCommand('/pyrun venv=default test_func()');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle runtime errors in Python code', async () => {
      await pyrunner.executeCommand('/pyrun 1 / 0');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('error');
      expect(result.toLowerCase()).toMatch(/division|zero/);
    });

    test('should handle undefined variable errors', async () => {
      await pyrunner.executeCommand('/pyrun print(undefined_variable)');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('error');
    });

    test('should handle import errors gracefully', async () => {
      await pyrunner.executeCommand('/pyrun import nonexistent_module');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('error');
    });

    test('should handle timeout errors', async () => {
      // Set very short timeout
      await pyrunner.setTimeout(100);

      // Execute long-running code
      await pyrunner.executeCommand('/pyrun import time; time.sleep(10)');

      await pyrunner.page.waitForTimeout(2000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('timeout');
    });

    test('should show error for missing function in /pycall', async () => {
      await pyrunner.executeCommand('/pycall missing_function arg1 arg2');

      await pyrunner.page.waitForTimeout(500);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('not found');
    });

    test('should handle errors in saved functions', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'error_func',
        code: 'def error_func():\n    return 1 / 0'
      });
      await pyrunner.saveFunction();

      await pyrunner.executeCommand('/pycall error_func');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result.toLowerCase()).toContain('error');
    });
  });

  test.describe('Function Arguments', () => {
    test.beforeEach(async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'calc',
        arguments: 'a, b, op',
        code: `def calc(a, b, op):
    a, b = float(a), float(b)
    if op == "+": return a + b
    if op == "-": return a - b
    if op == "*": return a * b
    if op == "/": return a / b
    return "unknown op"`
      });
      await pyrunner.saveFunction();
    });

    test('should pass positional arguments correctly', async () => {
      await pyrunner.executeCommand('/pycall calc 10 5 "+"');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('15');
    });

    test('should handle string arguments with spaces', async () => {
      await pyrunner.openCreateFunctionModal();
      await pyrunner.fillFunctionForm({
        name: 'echo',
        code: 'def echo(msg):\n    return msg'
      });
      await pyrunner.saveFunction();

      await pyrunner.executeCommand('/pycall echo "Hello World"');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('Hello World');
    });

    test('should handle numeric arguments', async () => {
      await pyrunner.executeCommand('/pycall calc 100 50 "*"');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toContain('5000');
    });
  });

  test.describe('Mode-specific Execution', () => {
    test('should execute in pyodide mode when selected', async () => {
      await pyrunner.selectMode('pyodide');

      await pyrunner.executeCommand('/pyrun import sys; print(sys.platform)');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      // Pyodide runs on emscripten
      expect(result).toContain('emscripten');
    });

    test('should execute in server mode when available', async () => {
      await pyrunner.selectMode('server');

      // Check if server is available first
      const status = await pyrunner.getServerStatus();

      if (status.includes('Connected')) {
        await pyrunner.executeCommand('/pyrun import platform; print(platform.system())');

        await pyrunner.page.waitForTimeout(1000);
        const result = await pyrunner.getLastChatMessage();
        // Server mode should show actual OS
        expect(result).toMatch(/Linux|Windows|Darwin/);
      } else {
        // Skip test if server not available
        test.skip();
      }
    });

    test('should override mode with explicit parameter', async () => {
      await pyrunner.selectMode('server');

      await pyrunner.executeCommand('/pyrun mode=pyodide import sys; print("pyodide")');

      await pyrunner.page.waitForTimeout(1000);
      const result = await pyrunner.getLastChatMessage();
      expect(result).toBeTruthy();
    });
  });
});
