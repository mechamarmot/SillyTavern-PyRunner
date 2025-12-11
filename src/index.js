/* global SillyTavern */
import { PyRunner } from './PyRunner';
import { Settings } from './Settings';

const MODULE_NAME = 'SillyTavern-PyRunner';

const {
    eventSource,
    event_types,
    saveSettingsDebounced,
} = SillyTavern.getContext();

// Extension settings
const defaultSettings = {
    enabled: false,
    executionMode: 'pyodide', // 'pyodide' or 'server'
    serverUrl: '/api/plugins/pyrunner',
    timeout: 30000,
};

let extensionSettings = {};
let pyRunner = null;

/**
 * Load extension settings
 */
function loadSettings() {
    const context = SillyTavern.getContext();
    extensionSettings = context.extensionSettings[MODULE_NAME];
    if (!extensionSettings) {
        extensionSettings = { ...defaultSettings };
        context.extensionSettings[MODULE_NAME] = extensionSettings;
        saveSettingsDebounced();
    }

    // Fill in any missing settings with defaults
    for (const key in defaultSettings) {
        if (extensionSettings[key] === undefined) {
            extensionSettings[key] = defaultSettings[key];
        }
    }
}

/**
 * Initialize the extension
 */
async function init() {
    loadSettings();

    // Create PyRunner instance
    pyRunner = new PyRunner(extensionSettings);

    // Register slash command
    registerSlashCommand();

    // Render settings UI
    renderSettings();

    console.log(`[${MODULE_NAME}] Extension loaded`);
}

/**
 * Register the /pyrun slash command
 */
function registerSlashCommand() {
    const { SlashCommand, SlashCommandParser, SlashCommandArgument, ARGUMENT_TYPE, SlashCommandNamedArgument } = SillyTavern.getContext();

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pyrun',
        callback: async (namedArgs, unnamedArgs) => {
            if (!extensionSettings.enabled) {
                return 'Error: PyRunner is disabled. Enable it in Extensions > PyRunner settings.';
            }

            const code = unnamedArgs?.toString() || '';
            if (!code.trim()) {
                return 'Error: No Python code provided';
            }

            try {
                const result = await pyRunner.execute(code, {
                    timeout: namedArgs.timeout ? parseInt(namedArgs.timeout) : extensionSettings.timeout,
                    mode: namedArgs.mode || extensionSettings.executionMode,
                });
                return result;
            } catch (error) {
                console.error(`[${MODULE_NAME}] Execution error:`, error);
                return `Error: ${error.message}`;
            }
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'mode',
                description: 'Execution mode: "pyodide" (browser) or "server" (local Python)',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: ['pyodide', 'server'],
                defaultValue: null,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'timeout',
                description: 'Execution timeout in milliseconds',
                typeList: [ARGUMENT_TYPE.NUMBER],
                defaultValue: null,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Python code to execute',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Executes Python code and returns the result.
                <br><br>
                <strong>Examples:</strong>
                <ul>
                    <li><code>/pyrun print("Hello, World!")</code></li>
                    <li><code>/pyrun 2 + 2</code></li>
                    <li><code>/pyrun mode=server import os; print(os.getcwd())</code></li>
                </ul>
                <br>
                <strong>Modes:</strong>
                <ul>
                    <li><code>pyodide</code> - Runs in browser using WebAssembly (sandboxed, limited packages)</li>
                    <li><code>server</code> - Runs on local machine via server plugin (full Python environment)</li>
                </ul>
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyrun registered`);

    // Register /pyinstall command
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pyinstall',
        callback: async (namedArgs, unnamedArgs) => {
            const packages = unnamedArgs?.toString().trim() || '';
            if (!packages) {
                return 'Error: No packages specified. Usage: /pyinstall numpy pandas';
            }

            try {
                const response = await fetch(`${extensionSettings.serverUrl}/install`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages }),
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(err || 'Server error');
                }

                const result = await response.json();
                if (result.error) {
                    return `Error: ${result.error}`;
                }
                return result.output || 'Packages installed successfully';
            } catch (error) {
                console.error(`[${MODULE_NAME}] Install error:`, error);
                return `Error: ${error.message}`;
            }
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Package names to install (space-separated)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Installs Python packages using pip (server mode only).
                <br><br>
                <strong>Examples:</strong>
                <ul>
                    <li><code>/pyinstall numpy</code></li>
                    <li><code>/pyinstall pandas matplotlib</code></li>
                </ul>
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyinstall registered`);
}

// Server plugin source code
const SERVER_PLUGIN_CODE = `/**
 * SillyTavern-PyRunner Server Plugin
 * Executes Python code on the local machine
 */

const { spawn } = require('child_process');

const info = {
    id: 'pyrunner',
    name: 'PyRunner',
    description: 'Executes Python code on the local machine for the PyRunner extension',
};

function getPythonCommand() {
    return process.platform === 'win32' ? 'python' : 'python3';
}

function executePython(code, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const pythonCmd = getPythonCommand();
        const proc = spawn(pythonCmd, ['-c', code], {
            timeout: timeout,
            maxBuffer: 1024 * 1024,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        const timeoutId = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error('Execution timed out'));
        }, timeout);

        proc.on('close', (code) => {
            clearTimeout(timeoutId);
            if (code !== 0 && stderr) {
                resolve({ output: stdout, error: stderr.trim() });
            } else {
                resolve({ output: stdout.trim(), error: null });
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error('Failed to execute Python: ' + err.message));
        });
    });
}

function pipInstall(packages, timeout = 120000) {
    return new Promise((resolve, reject) => {
        const pythonCmd = getPythonCommand();
        const args = ['-m', 'pip', 'install', ...packages.split(/\\s+/).filter(p => p)];
        const proc = spawn(pythonCmd, args, {
            timeout: timeout,
            maxBuffer: 1024 * 1024,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        const timeoutId = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error('Installation timed out'));
        }, timeout);

        proc.on('close', (code) => {
            clearTimeout(timeoutId);
            if (code !== 0) {
                resolve({ output: stdout, error: stderr.trim() || 'Installation failed' });
            } else {
                resolve({ output: stdout.trim(), error: null });
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error('Failed to run pip: ' + err.message));
        });
    });
}

async function init(router) {
    router.get('/status', (req, res) => {
        res.json({ status: 'ok', plugin: info.name, python: getPythonCommand() });
    });

    router.post('/execute', async (req, res) => {
        const { code, timeout = 30000 } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'No code provided' });
        }
        const safeTimeout = Math.min(Math.max(parseInt(timeout) || 30000, 1000), 300000);
        try {
            const result = await executePython(code, safeTimeout);
            if (result.error) {
                return res.json({ output: result.output, error: result.error });
            }
            res.json({ output: result.output });
        } catch (error) {
            console.error('[PyRunner] Execution error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/install', async (req, res) => {
        const { packages } = req.body;
        if (!packages || typeof packages !== 'string') {
            return res.status(400).json({ error: 'No packages specified' });
        }
        try {
            const result = await pipInstall(packages);
            if (result.error) {
                return res.json({ output: result.output, error: result.error });
            }
            res.json({ output: result.output });
        } catch (error) {
            console.error('[PyRunner] Install error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    console.log('[' + info.name + '] Plugin initialized');
}

async function exit() {
    console.log('[' + info.name + '] Plugin unloaded');
}

module.exports = { init, exit, info };
`;

/**
 * Try to write a file using Files API (tries both v1 and v2 endpoints)
 * @param {string} path - File path
 * @param {string} text - File content
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function writeFileViaFilesApi(path, text) {
    // Try files v1 first
    try {
        const response = await fetch('/api/plugins/files/put', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, text, overwrite: true }),
        });
        if (response.ok) {
            const result = await response.json();
            if (result.ok !== false) return { ok: true };
            if (result.error) return { ok: false, error: result.error };
        }
    } catch (e) { /* try v2 */ }

    // Try files v2
    try {
        const response = await fetch('/api/plugins/files-v2/put', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, text, overwrite: true }),
        });
        if (response.ok) {
            const result = await response.json();
            if (result.ok !== false) return { ok: true };
            if (result.error) return { ok: false, error: result.error };
        }
    } catch (e) { /* failed */ }

    return { ok: false, error: 'Files plugin not available. Please install LennySuite Files plugin first.' };
}

/**
 * Try to read a file using Files API (tries both v1 and v2 endpoints)
 * @param {string} path - File path
 * @returns {Promise<{ok: boolean, text?: string, error?: string}>}
 */
async function readFileViaFilesApi(path) {
    // Try files v1 first
    try {
        const response = await fetch('/api/plugins/files/get?path=' + encodeURIComponent(path));
        if (response.ok) {
            const result = await response.json();
            if (result.ok !== false && result.data?.text) return { ok: true, text: result.data.text };
        }
    } catch (e) { /* try v2 */ }

    // Try files v2
    try {
        const response = await fetch('/api/plugins/files-v2/get?path=' + encodeURIComponent(path));
        if (response.ok) {
            const result = await response.json();
            if (result.ok !== false && result.data?.text) return { ok: true, text: result.data.text };
        }
    } catch (e) { /* failed */ }

    return { ok: false, error: 'Could not read file' };
}

/**
 * Install server plugin using Files API
 * @param {HTMLElement} button - The button element
 */
async function installServerPlugin(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Installing...';
    button.disabled = true;

    try {
        const result = await writeFileViaFilesApi('plugins/pyrunner/index.js', SERVER_PLUGIN_CODE);

        if (!result.ok) {
            throw new Error(result.error || 'Failed to write plugin file');
        }

        button.innerHTML = '<i class="fa-solid fa-check"></i> Installed!';
        alert('Server plugin installed successfully!\\n\\nPlease restart SillyTavern and enable server plugins in config.yaml:\\n\\nenableServerPlugins: true');

    } catch (error) {
        console.error('[PyRunner] Install error:', error);
        button.innerHTML = '<i class="fa-solid fa-times"></i> Failed';
        alert('Installation failed: ' + error.message);
    } finally {
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
}

/**
 * Enable server plugins in config.yaml
 * @param {HTMLElement} button - The button element
 */
async function enableServerPlugins(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    button.disabled = true;

    try {
        // Read config.yaml
        const readResult = await readFileViaFilesApi('config.yaml');
        if (!readResult.ok) {
            throw new Error('Files plugin not available. Please manually edit config.yaml and set enableServerPlugins: true');
        }

        let configContent = readResult.text || '';

        // Check if already enabled
        if (/enableServerPlugins:\s*true/i.test(configContent)) {
            button.innerHTML = '<i class="fa-solid fa-check"></i> Already Enabled';
            alert('Server plugins are already enabled in config.yaml');
            return;
        }

        // Update or add the setting
        if (/enableServerPlugins:\s*false/i.test(configContent)) {
            configContent = configContent.replace(/enableServerPlugins:\s*false/i, 'enableServerPlugins: true');
        } else if (/enableServerPlugins:/i.test(configContent)) {
            configContent = configContent.replace(/enableServerPlugins:\s*\S*/i, 'enableServerPlugins: true');
        } else {
            // Add to end of file
            configContent = configContent.trimEnd() + '\\nenableServerPlugins: true\\n';
        }

        // Write back
        const writeResult = await writeFileViaFilesApi('config.yaml', configContent);
        if (!writeResult.ok) {
            throw new Error(writeResult.error || 'Failed to update config.yaml');
        }

        button.innerHTML = '<i class="fa-solid fa-check"></i> Enabled!';
        alert('Server plugins enabled!\\n\\nPlease restart SillyTavern for changes to take effect.');

    } catch (error) {
        console.error('[PyRunner] Config update error:', error);
        button.innerHTML = '<i class="fa-solid fa-times"></i> Failed';
        alert('Failed to update config: ' + error.message);
    } finally {
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
}

/**
 * Render extension settings UI
 */
function renderSettings() {
    const settingsHtml = Settings({
        enabled: extensionSettings.enabled,
        executionMode: extensionSettings.executionMode,
        timeout: extensionSettings.timeout,
    });

    const settingsContainer = document.getElementById('extensions_settings');
    const extensionDiv = document.createElement('div');
    extensionDiv.id = 'pyrunner_settings';
    extensionDiv.innerHTML = settingsHtml;
    settingsContainer.appendChild(extensionDiv);

    // Add event listeners
    const enabledCheckbox = extensionDiv.querySelector('#pyrunner_enabled');
    if (enabledCheckbox) {
        enabledCheckbox.addEventListener('change', (e) => {
            extensionSettings.enabled = e.target.checked;
            saveSettingsDebounced();
        });
    }

    const modeRadios = extensionDiv.querySelectorAll('input[name="pyrunner_mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            extensionSettings.executionMode = e.target.value;
            pyRunner.setMode(e.target.value);
            saveSettingsDebounced();
            updateServerStatus();
        });
    });

    const timeoutInput = extensionDiv.querySelector('#pyrunner_timeout');
    if (timeoutInput) {
        timeoutInput.addEventListener('change', (e) => {
            extensionSettings.timeout = parseInt(e.target.value) || defaultSettings.timeout;
            saveSettingsDebounced();
        });
    }

    // Install plugin button (uses Files API)
    const installBtn = extensionDiv.querySelector('#pyrunner_install_plugin');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            await installServerPlugin(installBtn);
        });
    }

    // Enable in config button
    const enableBtn = extensionDiv.querySelector('#pyrunner_enable_plugins');
    if (enableBtn) {
        enableBtn.addEventListener('click', async () => {
            await enableServerPlugins(enableBtn);
        });
    }

    // Copy install command button
    const copyBtn = extensionDiv.querySelector('#pyrunner_copy_install_cmd');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const installCmd = 'Copy the server-plugin/index.js file to SillyTavern/plugins/pyrunner/index.js';
            try {
                await navigator.clipboard.writeText(installCmd);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                alert('Install instructions:\n\n' + installCmd);
            }
        });
    }

    // Check server status on load
    updateServerStatus();
}

/**
 * Update server plugin status indicator
 */
async function updateServerStatus() {
    const statusEl = document.querySelector('#pyrunner_server_status');
    if (!statusEl) return;

    if (extensionSettings.executionMode === 'server') {
        try {
            const available = await pyRunner.checkServerAvailable();
            statusEl.textContent = available ? '✓ Connected' : '✗ Not available';
            statusEl.className = available ? 'pyrunner-status-ok' : 'pyrunner-status-error';
        } catch {
            statusEl.textContent = '✗ Error';
            statusEl.className = 'pyrunner-status-error';
        }
    } else {
        statusEl.textContent = 'N/A';
        statusEl.className = 'pyrunner-status-na';
    }
}

// Initialize when SillyTavern is ready
eventSource.on(event_types.APP_READY, init);
