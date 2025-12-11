# SillyTavern-PyRunner

Execute Python code from STScript and Quick Replies using the `/pyrun` slash command.

> **WARNING: USE AT YOUR OWN RISK**
> This extension executes code. Only run Python code you understand and trust.

## Features

- **Dual Execution Modes:**
  - **Pyodide (Browser)** - Sandboxed Python running in WebAssembly. No setup required.
  - **Server (Local Python)** - Full Python environment with all installed packages.
- **STScript Integration** - Use `/pyrun` in any STScript or Quick Reply
- **Pipe Support** - Results flow through STScript pipes
- **Package Management** - Install/uninstall Python packages from the UI or via `/pyinstall`
- **Configurable Timeout** - Prevent runaway scripts

## Installation

### Via SillyTavern Extension Installer (Recommended)

Use the built-in extension installer with this URL:
```
https://github.com/mechamarmot/SillyTavern-PyRunner
```

This installs both the UI extension and server plugin automatically.

### Manual Installation

```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/mechamarmot/SillyTavern-PyRunner
```

Then copy the server plugin:
```bash
cp -r SillyTavern-PyRunner/server-plugin SillyTavern/plugins/pyrunner
```

### Enable Server Plugins

In your `config.yaml`, set:
```yaml
enableServerPlugins: true
```

Then restart SillyTavern.

## Setup

1. Open SillyTavern
2. Go to **Extensions** panel
3. Find **PyRunner** settings
4. **Check "Enable PyRunner"** (disabled by default for safety)
5. Choose your execution mode (Pyodide or Server)

## Usage

### Basic Syntax

```
/pyrun <python code> | /echo {{pipe}}
```

Note: `/pyrun` returns output to the pipe, so use `/echo` or another command to display it.

### One-Liners

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

**Correct:**
```
/pyrun
import random
traits = ["brave", "cunning", "mysterious"]
print(random.choice(traits)) | /echo {{pipe}}
```

**Wrong** (has leading spaces):
```
/pyrun
  import random
  print("this will fail")
```

### Functions and Blocks

Indent only inside functions, loops, and conditionals:

```
/pyrun
import random
def roll_dice(sides=20):
    return random.randint(1, sides)
result = roll_dice()
print(f"You rolled a {result}!") | /echo {{pipe}}
```

### Using Variables

```
/pyrun print(2 + 2) | /setvar key=result {{pipe}} | /echo The answer is {{getvar::result}}
```

### Named Arguments

Override execution mode per-command:
```
/pyrun mode=server import numpy as np; print(np.array([1,2,3])) | /echo {{pipe}}
```

Set custom timeout (in milliseconds):
```
/pyrun timeout=5000 print("Quick operation") | /echo {{pipe}}
```

### Installing Packages

Use the `/pyinstall` command (server mode only):
```
/pyinstall numpy
/pyinstall pandas matplotlib requests
```

Or use the UI in Extensions > PyRunner > Install Python Packages.

## Quick Reply Examples

### Coin Flip
```
/pyrun import random; print(random.choice(["heads", "tails"])) | /echo {{pipe}}
```

### Dice Roll (D20)
```
/pyrun import random; print(f"You rolled: {random.randint(1, 20)}") | /echo {{pipe}}
```

### Random Character Trait
```
/pyrun import random; traits = ["brave", "cunning", "mysterious", "cheerful", "melancholic", "sarcastic"]; mood = ["excited", "nervous", "calm", "agitated"]; print(f"{random.choice(traits)} and {random.choice(mood)}") | /echo {{pipe}}
```

### Magic 8-Ball
```
/pyrun import random; answers = ["Yes", "No", "Maybe", "Ask again later", "Definitely", "Doubtful"]; print(f"The Magic 8-Ball says: {random.choice(answers)}") | /echo {{pipe}}
```

### Current Date/Time
```
/pyrun from datetime import datetime; print(datetime.now().strftime("%Y-%m-%d %H:%M")) | /echo {{pipe}}
```

### Using NumPy (Server Mode)
```
/pyrun mode=server import numpy as np; arr = np.array([1,2,3,4,5]); print(f"Sum: {arr.sum()}, Mean: {arr.mean()}") | /echo {{pipe}}
```

## Package Management

### Via UI
1. Go to Extensions > PyRunner
2. Use "Install Python Packages" input field
3. Click on any installed package to see options (Copy Name, Uninstall)
4. Click refresh button to update the package list

### Via Slash Command
```
/pyinstall <package names>
```

Examples:
```
/pyinstall numpy
/pyinstall pandas matplotlib seaborn
```

## Execution Modes

### Pyodide (Browser)

- Runs entirely in your browser via WebAssembly
- **Sandboxed** - cannot access filesystem or network
- Includes Python standard library
- First execution may be slow (loading ~10MB Pyodide runtime)
- Great for: random generation, math, string manipulation, simple logic

### Server (Local Python)

- Runs on your machine using your installed Python
- Full access to **all installed packages** (numpy, pandas, requests, etc.)
- Can access filesystem and network
- Requires `enableServerPlugins: true` in config.yaml
- Great for: complex operations, using specialized libraries, file I/O

## Security

**Pyodide Mode:** Relatively safe - runs in browser sandbox. Cannot access your files or network.

**Server Mode:** **DANGEROUS** - executes code directly on your machine with full access. Only use with code you completely trust and understand.

## Troubleshooting

### "PyRunner is disabled"
Enable it in Extensions > PyRunner settings.

### "pip is not installed or not available"
Your Python installation doesn't have pip. Install pip or use a Python distribution that includes it.

### IndentationError
Make sure your multi-line code has no leading spaces on the first level. Only indent inside functions/loops/conditionals.

### Server mode shows "Not available"
1. Check `enableServerPlugins: true` in config.yaml
2. Verify plugin is in `SillyTavern/plugins/pyrunner/`
3. Restart SillyTavern

### First execution is slow (Pyodide)
Pyodide needs to download ~10MB on first use. Subsequent executions are faster.

### 403 Forbidden errors
This was a CSRF issue in older versions. Update to the latest version.

## Development

```bash
cd SillyTavern-PyRunner
npm install
npm run build
```

## License

AGPL-3.0
