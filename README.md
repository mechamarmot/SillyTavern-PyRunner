# SillyTavern-PyRunner

Execute Python code from STScript and Quick Replies using the `/pyrun` slash command.

## Features

- **Dual Execution Modes:**
  - **Pyodide (Browser)** - Sandboxed Python running in WebAssembly. No setup required, works out of the box.
  - **Server (Local Python)** - Full Python environment with access to all installed packages. Requires server plugin.

- **STScript Integration** - Use `/pyrun` in any STScript or Quick Reply
- **Pipe Support** - Results flow through STScript pipes like any other command
- **Configurable Timeout** - Set execution time limits to prevent runaway scripts

## Installation

### UI Extension

Install via the SillyTavern extension installer:
```
https://github.com/mechamarmot/SillyTavern-PyRunner
```

Or manually clone into `public/scripts/extensions/third-party/`:
```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/mechamarmot/SillyTavern-PyRunner
```

### Server Plugin (Optional)

For local Python execution with full package access:

1. Enable server plugins in `config.yaml`:
   ```yaml
   enableServerPlugins: true
   ```

2. Copy the server plugin:
   ```bash
   cp -r SillyTavern-PyRunner/server-plugin SillyTavern/plugins/pyrunner
   ```

3. Restart SillyTavern

## Usage

### Basic Usage

```
/pyrun print("Hello, World!")
```

```
/pyrun 2 + 2
```

### Multi-line Code

```
/pyrun
def greet(name):
    return f"Hello, {name}!"
print(greet("SillyTavern"))
```

### With Named Arguments

```
/pyrun mode=server import numpy as np; print(np.array([1,2,3]))
```

```
/pyrun timeout=5000 print("Quick operation")
```

### In STScript

```
/pyrun 2 * {{getvar::multiplier}} | /echo Result: {{pipe}}
```

### In Quick Replies

Create a QR with:
```
/pyrun import random; print(random.choice(["heads", "tails"]))
```

## Configuration

Open the Extensions panel and find **PyRunner** settings:

- **Execution Mode** - Choose between Pyodide (browser) or Server (local Python)
- **Timeout** - Maximum execution time in milliseconds (1000-300000)

## Execution Modes

### Pyodide (Browser)

- Runs entirely in your browser using WebAssembly
- Sandboxed - cannot access your filesystem or network
- Includes Python standard library
- Can load pure-Python packages via micropip
- First execution may be slow (loading Pyodide)

### Server (Local Python)

- Runs on your machine using your installed Python
- Full access to all installed packages (numpy, pandas, requests, etc.)
- Can access filesystem and network (use with caution)
- Requires the server plugin to be installed
- Faster execution for complex operations

## Security Considerations

**Pyodide Mode:** Safe for untrusted code - runs in a sandboxed environment.

**Server Mode:** ⚠️ Executes code directly on your machine. Only use with code you trust. The server plugin has access to your filesystem and network.

## Development

```bash
npm install
npm run build
```

## License

AGPL-3.0
