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
