# SillyTavern-PyRunner

Execute Python code from STScript and Quick Replies using the `/pyrun` slash command.

> **WARNING: USE AT YOUR OWN RISK**
> This extension executes code. Only run Python code you understand and trust.

## Features

- **Dual Execution Modes:**
  - **Pyodide (Browser)** - Sandboxed Python running in WebAssembly. No setup required.
  - **Server (Local Python)** - Full Python environment with all installed packages. Requires server plugin.
- **STScript Integration** - Use `/pyrun` in any STScript or Quick Reply
- **Pipe Support** - Results flow through STScript pipes
- **Configurable Timeout** - Prevent runaway scripts

## Installation

### UI Extension

**Option 1: SillyTavern Extension Installer**

Use the built-in extension installer with this URL:
```
https://github.com/mechamarmot/SillyTavern-PyRunner
```

**Option 2: Manual Installation**

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

## Setup

1. Open SillyTavern
2. Go to **Extensions** panel
3. Find **PyRunner** settings
4. **Check "Enable PyRunner"** (disabled by default for safety)
5. Choose your execution mode

## Usage

### Basic Syntax

```
/pyrun <python code>
```

### One-Liners

```
/pyrun print("Hello, World!")
```

```
/pyrun 2 + 2
```

```
/pyrun import random; print(random.randint(1, 20))
```

### Multi-Line Code

**Important:** Do NOT indent the first level of code. Python is indentation-sensitive.

**Correct:**
```
/pyrun
import random
traits = ["brave", "cunning", "mysterious"]
print(random.choice(traits))
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
print(f"You rolled a {result}!")
```

### Using Pipes

Chain with other STScript commands:

```
/pyrun import random; print(random.choice(["heads", "tails"])) | /echo Coin flip: {{pipe}}
```

```
/pyrun print(2 + 2) | /setvar key=result {{pipe}} | /echo The answer is {{getvar::result}}
```

### Named Arguments

Override execution mode per-command:
```
/pyrun mode=server import numpy as np; print(np.array([1,2,3]))
```

Set custom timeout (in milliseconds):
```
/pyrun timeout=5000 print("Quick operation")
```

## Quick Reply Examples

### Coin Flip
```
/pyrun import random; print(random.choice(["heads", "tails"]))
```

### Dice Roll (D20)
```
/pyrun import random; print(f"🎲 {random.randint(1, 20)}")
```

### Random Character Trait
```
/pyrun import random; traits = ["brave", "cunning", "mysterious", "cheerful", "melancholic", "sarcastic"]; mood = ["excited", "nervous", "calm", "agitated"]; print(f"{random.choice(traits)} and {random.choice(mood)}")
```

### Random Number in Range
```
/pyrun import random; print(random.randint(1, 100))
```

### Shuffle a List
```
/pyrun import random; items = ["sword", "shield", "potion", "scroll"]; random.shuffle(items); print(", ".join(items))
```

### Current Date/Time
```
/pyrun from datetime import datetime; print(datetime.now().strftime("%Y-%m-%d %H:%M"))
```

### Simple Calculator
```
/pyrun print(eval("{{input}}"))
```
*(Use with caution - eval can be dangerous with untrusted input)*

### Magic 8-Ball
```
/pyrun import random; answers = ["Yes", "No", "Maybe", "Ask again later", "Definitely", "Doubtful"]; print(f"🎱 {random.choice(answers)}")
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
- Requires server plugin installation
- Great for: complex operations, using specialized libraries, file I/O

## Security

**Pyodide Mode:** Relatively safe - runs in browser sandbox. Cannot access your files or network.

**Server Mode:** ⚠️ **Dangerous** - executes code directly on your machine with full access. Only use with code you completely trust and understand.

## Troubleshooting

### "PyRunner is disabled"
Enable it in Extensions > PyRunner settings.

### IndentationError
Make sure your multi-line code has no leading spaces on the first level. Only indent inside functions/loops/conditionals.

### Server mode shows "Not available"
1. Check `enableServerPlugins: true` in config.yaml
2. Verify plugin is in `SillyTavern/plugins/pyrunner/`
3. Restart SillyTavern

### First execution is slow
Pyodide needs to download ~10MB on first use. Subsequent executions are faster.

## Development

```bash
cd SillyTavern-PyRunner
npm install
npm run build
```

## License

AGPL-3.0
