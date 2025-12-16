# SillyTavern-PyRunner

Execute Python code directly from STScript and Quick Replies.

> **WARNING: USE AT YOUR OWN RISK**
> This extension executes code. Only run Python code you understand and trust.

## What's New

- **Functions Library** - Save reusable Python functions and call them with `/pycall` or inline
- **Virtual Environments** - Create isolated venvs with their own packages
- **Dedicated Panel** - PyRunner now has its own drawer panel in the top nav
- **Auto-Venv Execution** - Functions automatically run in the venv where they're stored
- **Global & Character Scope** - Store functions globally or per-character
- **Logging System** - Track script executions and errors (server mode)

## Features

- **Dual Execution Modes**
  - **Pyodide (Browser)** - Sandboxed Python in WebAssembly. No setup required.
  - **Server (Local Python)** - Full Python environment with all packages.

- **Functions Library**
  - Create reusable Python functions via UI modal editor
  - Store functions per venv (each venv has its own library)
  - Toggle between global and character-specific functions
  - Call via `/pycall func_name` or inline in `/pyrun func_name()`
  - Auto-detects which venv to use based on where function is stored

- **Virtual Environment Management**
  - Create/delete isolated Python environments
  - Each venv has its own installed packages
  - Switch between venvs from the UI or via `/pyvenv`

- **Package Management**
  - Install/uninstall packages per venv
  - Visual package list with one-click uninstall
  - Commands: `/pyinstall`, `/pyuninstall`

- **STScript Integration**
  - Results flow through STScript pipes
  - Configurable timeout per command

## Installation

### Via SillyTavern Extension Installer (Recommended)

Use the built-in extension installer with this URL:
```
https://github.com/mechamarmot/SillyTavern-PyRunner
```

### Manual Installation

```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/mechamarmot/SillyTavern-PyRunner
```

The server plugin installs automatically when you enable the extension.

Restart SillyTavern after installation.

## Setup

1. Open SillyTavern
2. Click the **microchip icon** in the top navigation bar to open PyRunner panel
3. **Check "Enable PyRunner"** (disabled by default for safety)
4. Choose your execution mode (Pyodide or Server)

## Slash Commands

| Command | Description |
|---------|-------------|
| `/pyrun <code>` | Execute Python code |
| `/pycall <func> [args]` | Call a saved function |
| `/pyfunc [subcommand]` | Manage functions library |
| `/pyinstall <packages>` | Install pip packages |
| `/pyuninstall <packages>` | Uninstall pip packages |
| `/pyvenv [name\|create\|delete]` | Manage virtual environments |

## Usage

### Basic Execution

```
/pyrun print("Hello, World!") | /echo {{pipe}}
```

```
/pyrun 2 + 2 | /echo {{pipe}}
```

```
/pyrun import random; print(random.randint(1, 20)) | /echo {{pipe}}
```

### Multi-Line Code

**Important:** Do NOT indent the first level of code. Python is indentation-sensitive.

```
/pyrun
import random
def roll_dice(sides=20):
    return random.randint(1, sides)
print(f"You rolled: {roll_dice()}") | /echo {{pipe}}
```

### Named Arguments

Override execution mode:
```
/pyrun mode=server import numpy as np; print(np.array([1,2,3])) | /echo {{pipe}}
```

Specify venv:
```
/pyrun venv=myenv print("Using myenv packages") | /echo {{pipe}}
```

Custom timeout (milliseconds):
```
/pyrun timeout=5000 print("Quick operation") | /echo {{pipe}}
```

## Functions Library

### Creating Functions

1. Open PyRunner panel (microchip icon)
2. Expand **Functions Library** section
3. Select scope (Character or Global) and target venv
4. Click **+ Create Function**
5. Fill in name, description, and code
6. Click **Save Function**

### Calling Functions

**Via /pycall:**
```
/pycall roll_dice | /echo {{pipe}}
/pycall roll_dice 6 | /echo {{pipe}}
/pycall calculate x=10 y=20 | /echo {{pipe}}
```

**Inline in /pyrun:**
```
/pyrun result = roll_dice(20); print(f"Rolled: {result}") | /echo {{pipe}}
```

When you call a function, PyRunner automatically:
1. Finds which venv the function is stored in
2. Switches to that venv
3. Executes using that venv's packages

### Managing Functions

```
/pyfunc                    # List functions for current venv
/pyfunc info roll_dice     # Show function details
/pyfunc delete roll_dice   # Delete a function
/pyfunc scope global       # Switch to global scope
/pyfunc scope character    # Switch to character scope
/pyfunc export             # Export all functions as JSON
/pyfunc import <json>      # Import functions from JSON
```

## Virtual Environments

### Via UI

1. Open PyRunner panel
2. Expand **Virtual Environments** section
3. Use dropdown to select venv
4. Enter name and click **Create** for new venv
5. Click trash icon to delete (except default)

### Via Command

```
/pyvenv                    # List venvs and show current
/pyvenv myenv              # Switch to myenv
/pyvenv create myenv       # Create new venv
/pyvenv delete myenv       # Delete venv
```

### Package Management

Packages install to the currently selected venv:

```
/pyinstall numpy pandas
/pyinstall venv=myenv requests
/pyuninstall matplotlib
```

Or use the UI in Virtual Environments section.

## Quick Reply Examples

### Dice Roll (D20)
```
/pyrun import random; print(f"You rolled: {random.randint(1, 20)}") | /echo {{pipe}}
```

### Coin Flip
```
/pyrun import random; print(random.choice(["Heads", "Tails"])) | /echo {{pipe}}
```

### Random Trait Generator
```
/pyrun import random; traits = ["brave", "cunning", "mysterious", "cheerful"]; print(random.choice(traits)) | /echo {{pipe}}
```

### Magic 8-Ball
```
/pyrun import random; answers = ["Yes", "No", "Maybe", "Ask again later", "Definitely", "Doubtful"]; print(f"🎱 {random.choice(answers)}") | /echo {{pipe}}
```

### Current Date/Time
```
/pyrun from datetime import datetime; print(datetime.now().strftime("%Y-%m-%d %H:%M")) | /echo {{pipe}}
```

### Using NumPy (Server Mode)
```
/pyrun mode=server import numpy as np; print(f"Sum: {np.array([1,2,3,4,5]).sum()}") | /echo {{pipe}}
```

## Execution Modes

### Pyodide (Browser)

- Runs entirely in your browser via WebAssembly
- **Sandboxed** - cannot access filesystem or network
- Includes Python standard library
- First execution may be slow (loading ~10MB runtime)
- Great for: random generation, math, string manipulation

### Server (Local Python)

- Runs on your machine using your installed Python
- Full access to **all installed packages**
- Can access filesystem and network
- Supports virtual environments
- Requires `enableServerPlugins: true` in config.yaml
- Great for: complex operations, specialized libraries, file I/O

## Security

**Pyodide Mode:** Relatively safe - runs in browser sandbox.

**Server Mode:** **DANGEROUS** - executes code directly on your machine with full access. Only use with code you completely trust.

## Troubleshooting

### "PyRunner is disabled"
Enable it in the PyRunner panel (microchip icon in top nav).

### Server mode shows "Not available"
1. Restart SillyTavern (plugin auto-installs on first enable)
2. Check that PyRunner extension is enabled
3. Verify `enableServerPlugins: true` in config.yaml

### "pip is not installed"
Your Python installation doesn't have pip. Install pip or use a distribution that includes it.

### IndentationError
Multi-line code must have no leading spaces on the first level. Only indent inside functions/loops/conditionals.

### First execution is slow (Pyodide)
Pyodide downloads ~10MB on first use. Subsequent executions are faster.

### Function not found
Check that:
1. You're in the correct scope (Character vs Global)
2. The function exists in the venv you're targeting
3. Use `/pyfunc` to list available functions

## Development

```bash
cd SillyTavern-PyRunner
npm install
npm run build
```

## License

AGPL-3.0
