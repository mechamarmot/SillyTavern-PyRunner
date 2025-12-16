# PyRunner Testing Guide

This document provides a quick start guide for running the Playwright test suite for the SillyTavern-PyRunner extension.

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Run Tests

#### Option A: Against Running SillyTavern Instance

If you have SillyTavern running locally:

```bash
# Make sure SillyTavern is running on http://localhost:8000
# with PyRunner extension installed

# Run all tests
npm test

# Run with UI
npm run test:ui
```

#### Option B: Using Docker (Recommended for Isolation)

Docker will set up SillyTavern with PyRunner automatically:

```bash
# Build and run tests in isolated Docker environment
npm run test:docker

# Clean up Docker containers
npm run test:docker:clean
```

## Test Structure

The test suite covers 6 main areas:

1. **Basic UI** (`01-basic-ui.spec.js`)
   - Drawer panel interactions
   - Collapsible sections
   - Enable/disable toggle

2. **Functions Library** (`02-functions-library.spec.js`)
   - Create, edit, delete functions
   - Scope and mode switching
   - Search and filtering

3. **Modal Editor** (`03-modal-editor.spec.js`)
   - Form validation
   - Python keyword checking
   - Save/cancel behavior

4. **Function Execution** (`04-function-execution.spec.js`)
   - `/pyrun` and `/pycall` commands
   - Inline function calls
   - Auto-venv switching

5. **Virtual Environments** (`05-virtual-environments.spec.js`)
   - Venv creation and deletion
   - Venv switching
   - Default venv protection

6. **Package Management** (`06-package-management.spec.js`)
   - Package installation
   - Package uninstallation
   - Refresh package list

## Running Specific Tests

```bash
# Run single test file
npx playwright test 01-basic-ui

# Run specific test by name
npx playwright test -g "should open PyRunner drawer"

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode
npm run test:debug
```

## Test Configuration

Tests are configured in `playwright.config.js`:

- **Browser**: Chromium only (for consistency)
- **Timeout**: 60 seconds per test
- **Workers**: 1 (sequential execution)
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure

## Prerequisites for Server Mode Tests

Some tests require server mode and will skip if unavailable. To enable server mode tests:

### 1. Install Server Plugin

```bash
# Copy server plugin to SillyTavern
cp server-plugin/index.js /path/to/SillyTavern/plugins/pyrunner/index.js
```

### 2. Enable Server Plugins

In SillyTavern's `config.yaml`:

```yaml
enableServerPlugins: true
```

### 3. Restart SillyTavern

```bash
# Restart SillyTavern for plugin to load
```

### 4. Verify Server Status

Open PyRunner drawer and check that "Server Status" shows "✓ Connected"

## Environment Variables

Customize test execution:

```bash
# Use different SillyTavern URL
BASE_URL=http://localhost:3000 npm test

# Run in CI mode (more retries, different reporting)
CI=true npm test
```

## Viewing Test Results

### HTML Report

```bash
# Generate and view HTML report
npm run test:report
```

### Test Artifacts

After running tests, artifacts are saved to:

```
test-results/
├── <test-name>/
│   ├── test-failed-1.png    # Screenshot on failure
│   ├── video.webm           # Video recording
│   └── trace.zip            # Playwright trace
```

### View Trace

```bash
# View detailed trace of test execution
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Debugging Tests

### Debug Mode

```bash
# Open Playwright Inspector
npm run test:debug

# Or for specific test
npx playwright test --debug 01-basic-ui
```

### Console Logs

Enable console logs in tests:

```javascript
page.on('console', msg => console.log(msg.text()));
```

### Slow Motion

Run tests in slow motion to see what's happening:

```javascript
// In playwright.config.js
use: {
  launchOptions: {
    slowMo: 1000 // milliseconds
  }
}
```

## Common Issues

### Issue: Tests fail with "Extension not found"

**Solution**: Ensure PyRunner is installed in SillyTavern:

```bash
# Check extension directory exists
ls /path/to/SillyTavern/public/scripts/extensions/third-party/SillyTavern-PyRunner/
```

### Issue: Server mode tests skip

**Solution**: Install and enable server plugin (see prerequisites above)

### Issue: Package tests fail

**Solution**: Ensure Python and pip are available:

```bash
python3 --version
python3 -m pip --version
```

### Issue: Docker build fails

**Solution**: Ensure Docker is running and has sufficient resources:

```bash
# Check Docker
docker info

# Increase memory in Docker Desktop: Settings > Resources
```

### Issue: Tests are flaky

**Solution**:
- Tests run sequentially to avoid conflicts
- Increase timeouts in `playwright.config.js` if needed
- Check for proper cleanup in `afterEach` hooks

## Best Practices

1. **Clean State**: Tests should clean up created resources (venvs, functions, packages)
2. **Idempotent**: Tests should be able to run multiple times
3. **Independent**: Tests should not depend on each other
4. **Descriptive**: Use clear test names that explain what is tested
5. **Timeout Awareness**: Some operations (venv creation, package install) take longer

## CI/CD Integration

The test suite is designed for CI/CD:

```yaml
# .github/workflows/test.yml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Page Object Model

Tests use the Page Object Model for maintainability. All UI interactions go through `tests/pages/PyRunnerPage.js`:

```javascript
const { PyRunnerPage } = require('./pages/PyRunnerPage');

test('example', async ({ page }) => {
  const pyrunner = new PyRunnerPage(page);

  await pyrunner.goto();
  await pyrunner.openDrawer();
  await pyrunner.enableExtension();
  await pyrunner.openCreateFunctionModal();
  // ... etc
});
```

## Contributing

When adding new tests:

1. Add tests to appropriate spec file (or create new one)
2. Use Page Object Model methods
3. Include setup/teardown for clean state
4. Add descriptive test names
5. Document new test coverage in `tests/README.md`

## Support

For issues with tests:

1. Check this guide and `tests/README.md`
2. View test artifacts (screenshots, videos, traces)
3. Run in debug mode: `npm run test:debug`
4. Open an issue on GitHub with reproduction steps

## License

Same as SillyTavern-PyRunner extension.
