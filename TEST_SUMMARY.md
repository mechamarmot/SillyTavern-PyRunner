# PyRunner Playwright Test Suite - Summary

## Overview

A comprehensive end-to-end test suite for the SillyTavern-PyRunner extension using Playwright. The test suite covers all major features and includes Docker setup for isolated testing.

## Files Created

### Configuration Files
- `playwright.config.js` - Playwright test configuration
- `docker-compose.test.yml` - Docker Compose configuration for testing
- `Dockerfile.test` - Docker image with SillyTavern and PyRunner pre-installed
- `.github/workflows/playwright.yml` - GitHub Actions CI/CD workflow

### Test Files (tests/)
- `pages/PyRunnerPage.js` - Page Object Model for PyRunner UI
- `01-basic-ui.spec.js` - Basic UI interaction tests (17 tests)
- `02-functions-library.spec.js` - Function CRUD and library tests (30+ tests)
- `03-modal-editor.spec.js` - Modal validation and behavior tests (40+ tests)
- `04-function-execution.spec.js` - Command execution tests (30+ tests)
- `05-virtual-environments.spec.js` - Virtual environment tests (25+ tests)
- `06-package-management.spec.js` - Package management tests (30+ tests)

### Documentation
- `tests/README.md` - Comprehensive test documentation
- `TESTING.md` - Quick start guide for running tests
- `TEST_SUMMARY.md` - This file

## Test Coverage

### 1. Basic UI Tests (17 tests)

**Drawer Panel**
- Open/close drawer
- Display header
- Display warning message

**Collapsible Sections**
- All sections collapsed by default
- Expand/collapse functionality
- Chevron icon rotation
- Section badges display

**Enable/Disable Toggle**
- Toggle on/off
- Persist state

**Mode Selection**
- Display radio buttons
- Switch between modes
- Update mode badge
- Server status indicator

**Settings**
- Timeout configuration
- Default values

**Help Section**
- Command examples display

### 2. Functions Library Tests (30+ tests)

**Scope Management**
- Switch character/global scope
- Highlight selected scope
- Show different functions per scope

**Mode/Venv Selection**
- Display dropdown
- Show available modes/venvs
- Filter functions by mode/venv

**Create Function**
- Open modal
- Create successfully
- Update function count

**Edit Function**
- Open edit modal
- Populate existing data
- Save changes
- Disable name editing

**Delete Function**
- Confirmation dialog
- Remove from list
- Update count
- Cancel deletion

**Search/Filter**
- Filter by name
- Filter by description
- No results handling
- Clear search

**Function Count Badge**
- Display count
- Update on changes
- Count per scope

### 3. Modal Editor Tests (40+ tests)

**Opening/Closing**
- Open for new function
- Close via close button
- Close via cancel button
- Close via overlay
- Click inside doesn't close

**Function Name Validation**
- Empty name error
- Invalid identifier (starts with number)
- Invalid identifier (spaces)
- Invalid identifier (special chars)
- Python keyword (def, class, import, etc.)
- Valid identifiers (letters, underscores, numbers)

**Code Validation**
- Empty code error
- Whitespace-only error
- Accept non-empty code

**Cancel Without Saving**
- Discard via cancel
- Discard via close
- Discard via overlay

**Form Fields**
- Edit all fields
- Multiline code formatting
- Optional description
- Optional arguments

**Target Display**
- Show current scope/venv
- Update on scope change
- Update on mode change

**Save Behavior**
- Success message
- Close on save
- Stay open on error

**Editing Existing**
- Populate form
- Edit function title
- Save edited
- Disable name field

### 4. Function Execution Tests (30+ tests)

**/pyrun Command**
- Execute simple code
- Expression evaluation
- Multi-line code
- Syntax errors
- Disabled extension error
- Mode parameter
- Timeout parameter
- No code error

**/pycall Command**
- Call with arguments
- Call without arguments
- Missing function error
- No function name error
- List available functions
- Multiple arguments
- Timeout parameter

**Inline Function Calls**
- Inject saved function
- Inject multiple functions
- No injection when not called
- Complex expressions

**Auto-venv Switching**
- Switch to pyodide
- Switch to server venv
- Override with explicit parameter

**Error Handling**
- Runtime errors
- Undefined variables
- Import errors
- Timeout errors
- Missing functions
- Errors in saved functions

**Function Arguments**
- Positional arguments
- String with spaces
- Numeric arguments

**Mode-specific Execution**
- Pyodide mode
- Server mode
- Override mode

### 5. Virtual Environment Tests (25+ tests)

**Display and Selection**
- Display selector
- Default venv available
- Badge display
- Select venv
- Update badge

**Create Venv**
- Display inputs
- Create successfully
- Auto-select new venv
- Clear input
- Invalid name errors (special chars, spaces)
- Empty name error
- Alphanumeric names

**Delete Venv**
- Display button
- Disable for default
- Enable for non-default
- Confirmation dialog
- Delete successfully
- Switch to default after deletion
- Cancel deletion

**Switch Between Venvs**
- Switch venvs
- Update badge
- Refresh packages
- Persist selection

**Default Venv Protection**
- Cannot delete default
- Tooltip on disabled button
- Always available

**Integration**
- Show packages per venv
- Update delete button

**Server Mode Only**
- Show hint in pyodide mode
- Enable in server mode

### 6. Package Management Tests (30+ tests)

**Display**
- Packages list area
- Refresh button
- Initial hint

**Refresh Package List**
- Refresh functionality
- Loading indicator
- Display names and versions
- Alphabetical sorting
- Update on venv change

**Install Packages**
- Display input and button
- Install single package
- Install multiple packages
- Loading indicator
- Clear input after install
- Invalid package error
- Empty input warning
- Already installed handling
- Install in selected venv

**Uninstall Packages**
- Show popup on click
- Copy/uninstall options
- Copy to clipboard
- Close popup after copy
- Confirmation dialog
- Uninstall successfully
- Cancel uninstall
- Close popup on outside click

**UI States**
- Server mode only hint
- Enable in server mode
- Handle pip unavailable

**/pyinstall Command**
- Install via command
- Multiple packages
- No packages error
- Install in specific venv

## Test Organization

```
tests/
├── pages/
│   └── PyRunnerPage.js          # Page Object Model (400+ lines)
├── 01-basic-ui.spec.js          # 17 tests
├── 02-functions-library.spec.js # 30+ tests
├── 03-modal-editor.spec.js      # 40+ tests
├── 04-function-execution.spec.js# 30+ tests
├── 05-virtual-environments.spec.js # 25+ tests
├── 06-package-management.spec.js # 30+ tests
└── README.md                     # Documentation
```

**Total: 170+ comprehensive tests**

## Key Features

### Page Object Model
- Clean separation of UI interactions
- Reusable methods across tests
- Easy to maintain and extend
- Type-safe interactions

### Best Practices
- Sequential execution (no parallel conflicts)
- Proper cleanup in afterEach
- Screenshot on failure
- Video recording on failure
- Trace recording for debugging
- Descriptive test names
- Error handling

### Docker Support
- Isolated test environment
- Pre-installed SillyTavern
- Pre-installed PyRunner extension
- Server plugin configured
- One-command test execution

### CI/CD Ready
- GitHub Actions workflow included
- Artifact upload (reports, screenshots)
- Retry on failure
- HTML report generation
- Works in headless mode

## Running Tests

### Quick Start
```bash
# Install and run
npm install
npx playwright install chromium
npm test
```

### Docker
```bash
# Isolated testing
npm run test:docker
```

### Debug
```bash
# Interactive debugging
npm run test:ui
npm run test:debug
```

### CI/CD
```bash
# Automated testing
CI=true npm test
```

## Test Results Format

### HTML Report
- Visual test results
- Screenshots and videos
- Trace viewer integration
- Filter by pass/fail

### Console Output
- Real-time test progress
- Pass/fail indicators
- Execution time
- Error messages

### Artifacts
- Screenshots (on failure)
- Videos (on failure)
- Traces (for debugging)
- JSON results

## Requirements

### Development
- Node.js 16+
- npm or yarn
- Chromium browser (auto-installed)

### Server Mode Tests
- Python 3.8+
- pip
- PyRunner server plugin installed
- Server plugins enabled in config.yaml

### Docker Testing
- Docker 20+
- Docker Compose 2+
- 4GB RAM minimum

## Maintenance

### Adding New Tests
1. Identify feature area
2. Add test to appropriate spec file
3. Use Page Object Model methods
4. Include setup/teardown
5. Update documentation

### Updating Page Object
1. Add new UI selectors
2. Create helper methods
3. Maintain consistent naming
4. Document complex interactions

### Debugging Failures
1. Check screenshots
2. View video recording
3. Inspect trace file
4. Run in debug mode
5. Check console logs

## Known Limitations

1. **Server Mode**: Some tests require server plugin and skip if unavailable
2. **Timing**: Package installation and venv creation can be slow (30-60s)
3. **Cleanup**: Tests attempt cleanup but may leave artifacts if interrupted
4. **Python**: Server tests require Python 3.8+ with pip

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance benchmarks
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile viewport testing
- [ ] Accessibility testing (ARIA, keyboard navigation)
- [ ] Load testing (many functions/packages)
- [ ] Multi-language support testing
- [ ] Offline mode testing

## Conclusion

This comprehensive test suite provides:
- **Full coverage** of PyRunner features
- **Reliable** execution with proper cleanup
- **Maintainable** code with Page Object Model
- **CI/CD ready** with GitHub Actions
- **Docker support** for isolated testing
- **Excellent debugging** with screenshots, videos, and traces

The tests follow Playwright best practices and are ready for integration into continuous integration pipelines.
