# PyRunner Playwright Test Suite

Comprehensive end-to-end test suite for the SillyTavern-PyRunner extension using Playwright.

## Test Coverage

### 1. Basic UI Tests (`01-basic-ui.spec.js`)
- Drawer panel opening/closing
- Collapsible sections expand/collapse
- Enable/disable toggle functionality
- Mode selection (Pyodide/Server)
- Settings configuration
- Help section display

### 2. Functions Library Tests (`02-functions-library.spec.js`)
- Create new functions
- Edit existing functions
- Delete functions with confirmation
- Scope switching (Character/Global)
- Mode/venv dropdown selection
- Search and filter functions
- Function count badge updates

### 3. Modal Editor Tests (`03-modal-editor.spec.js`)
- Open modal for new/edit function
- Close modal via cancel, close button, or overlay
- Validate function names (Python identifiers, not keywords)
- Validate code is not empty
- Display correct target (scope/venv)
- Save behavior and error handling

### 4. Function Execution Tests (`04-function-execution.spec.js`)
- `/pyrun` command execution
- `/pycall` command for saved functions
- Inline function calls in `/pyrun`
- Auto-venv switching
- Error handling for missing functions
- Timeout handling
- Multi-argument functions

### 5. Virtual Environment Tests (`05-virtual-environments.spec.js`)
- Create new venv
- Delete venv (not default)
- Switch between venvs
- Default venv protection
- Venv selection persistence
- Badge updates

### 6. Package Management Tests (`06-package-management.spec.js`)
- Install packages
- Refresh package list
- Uninstall packages via popup
- Package popup interactions
- Copy package name
- `/pyinstall` command
- Venv-specific package management

## Setup

### Prerequisites
- Node.js 16+
- Python 3.8+ (for server mode tests)
- Docker (optional, for isolated testing)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Local Testing

```bash
# Run all tests
npm test

# Run tests with UI (headed mode)
npm run test:headed

# Run tests in interactive UI mode
npm run test:ui

# Debug specific test
npm run test:debug

# Show test report
npm run test:report
```

### Run Specific Test Files

```bash
# Run only basic UI tests
npx playwright test 01-basic-ui

# Run only functions library tests
npx playwright test 02-functions-library

# Run only modal editor tests
npx playwright test 03-modal-editor

# Run only function execution tests
npx playwright test 04-function-execution

# Run only virtual environment tests
npx playwright test 05-virtual-environments

# Run only package management tests
npx playwright test 06-package-management
```

### Docker Testing

Run tests in an isolated Docker container with SillyTavern pre-installed:

```bash
# Build and run tests in Docker
npm run test:docker

# Clean up Docker containers and volumes
npm run test:docker:clean
```

### Environment Variables

```bash
# Custom SillyTavern URL
BASE_URL=http://localhost:8000 npm test

# Run in CI mode
CI=true npm test
```

## Test Configuration

The test suite is configured via `playwright.config.js`:

- **Timeout**: 60 seconds per test
- **Retries**: 2 retries in CI mode, 0 in local
- **Workers**: 1 (sequential execution to avoid conflicts)
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Trace**: On first retry

## Page Object Model

The test suite uses the Page Object Model pattern for maintainability:

- `tests/pages/PyRunnerPage.js` - Main page object encapsulating all PyRunner UI interactions

Key methods:
- `openDrawer()` / `closeDrawer()`
- `enableExtension()` / `disableExtension()`
- `expandSection(name)` / `collapseSection(name)`
- `selectMode(mode)`
- `createVenv(name)` / `deleteVenv()`
- `openCreateFunctionModal()` / `editFunction(name)`
- `installPackage(name)` / `uninstallPackage(name)`
- `executeCommand(command)`

## Test Organization

Tests are organized by feature area:

```
tests/
├── pages/
│   └── PyRunnerPage.js          # Page object model
├── 01-basic-ui.spec.js          # Basic UI interactions
├── 02-functions-library.spec.js # Function CRUD operations
├── 03-modal-editor.spec.js      # Modal validation & behavior
├── 04-function-execution.spec.js# Command execution
├── 05-virtual-environments.spec.js # Venv management
├── 06-package-management.spec.js # Package install/uninstall
└── README.md                     # This file
```

## Best Practices

### Writing Tests

1. **Use Page Objects**: Always use the PyRunnerPage methods instead of direct selectors
2. **Wait for Actions**: Use appropriate waits (`waitForTimeout`, `waitForSelector`) after async operations
3. **Clean Up**: Use `beforeEach` / `afterEach` to ensure clean state
4. **Handle Dialogs**: Use `page.once('dialog', ...)` for confirmation dialogs
5. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested

### Running Tests

1. **Sequential Execution**: Tests run sequentially to avoid conflicts with shared state
2. **Server Mode**: Some tests require server mode and will skip if unavailable
3. **Timeouts**: Package installation and venv creation have longer timeouts (30-60s)
4. **Cleanup**: Tests clean up created resources (venvs, functions, packages) in `afterEach`

## Debugging

### View Test Trace

```bash
# After a test failure, view the trace
npx playwright show-trace test-results/<test-name>/trace.zip
```

### Debug Mode

```bash
# Run in debug mode with Playwright Inspector
npm run test:debug

# Or specific test
npx playwright test --debug 01-basic-ui
```

### Screenshots

Screenshots are automatically captured on test failure and saved to:
```
test-results/<test-name>/test-failed-<timestamp>.png
```

### Videos

Videos are recorded for failed tests and saved to:
```
test-results/<test-name>/video.webm
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Run tests
        run: npm test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Fail with "Extension not found"

Ensure SillyTavern is running and the PyRunner extension is installed:

```bash
# Check BASE_URL is correct
echo $BASE_URL

# Verify extension files exist
ls -la /path/to/SillyTavern/public/scripts/extensions/third-party/SillyTavern-PyRunner/
```

### Server Mode Tests Skip

Server mode tests require the PyRunner server plugin to be installed and running:

```bash
# Install server plugin
cp server-plugin/index.js /path/to/SillyTavern/plugins/pyrunner/index.js

# Enable server plugins in config.yaml
echo "enableServerPlugins: true" >> /path/to/SillyTavern/config.yaml

# Restart SillyTavern
```

### Package Installation Tests Fail

Ensure Python and pip are available:

```bash
# Check Python
python3 --version

# Check pip
python3 -m pip --version
```

### Docker Tests Fail to Build

Ensure Docker is running and has sufficient resources:

```bash
# Check Docker status
docker info

# Increase Docker memory limit if needed (Settings > Resources)
```

## Contributing

When adding new tests:

1. Follow the existing naming convention (`NN-feature-name.spec.js`)
2. Use the Page Object Model
3. Add descriptive test names
4. Include proper setup/teardown
5. Update this README with new test coverage

## License

Same as SillyTavern-PyRunner extension.
