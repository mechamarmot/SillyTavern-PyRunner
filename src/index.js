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
    selectedVenv: 'default', // Selected virtual environment for server mode
    functionScope: 'character', // 'global' or 'character'
    selectedCharacter: null, // Selected character ID for character scope
    functions: {
        global: {},    // Global functions shared across characters
        character: {}, // Character-specific functions keyed by character ID
    },
};

// Python keywords for function name validation
const PYTHON_KEYWORDS = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
    'while', 'with', 'yield'
];

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

    // Ensure functions structure exists
    if (!extensionSettings.functions) {
        extensionSettings.functions = { global: {}, character: {} };
    }
    if (!extensionSettings.functions.global) {
        extensionSettings.functions.global = {};
    }
    if (!extensionSettings.functions.character) {
        extensionSettings.functions.character = {};
    }
}

// =============================================================================
// FUNCTIONS LIBRARY - CRUD UTILITIES
// =============================================================================

/**
 * Validate a function name
 * @param {string} name - Function name to validate
 * @returns {{valid: boolean, error?: string}}
 */
function isValidFunctionName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Function name is required' };
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        return { valid: false, error: 'Function name must be a valid Python identifier (letters, numbers, underscores, cannot start with number)' };
    }
    if (PYTHON_KEYWORDS.includes(name)) {
        return { valid: false, error: `"${name}" is a Python keyword and cannot be used as a function name` };
    }
    return { valid: true };
}

/**
 * Get the current venv/mode key for function storage
 * @returns {string}
 */
function getCurrentFunctionKey() {
    const mode = extensionSettings.executionMode;
    return mode === 'server' ? (extensionSettings.selectedVenv || 'default') : 'pyodide';
}

/**
 * Get the list of available characters
 * @returns {Array<{id: string, name: string}>}
 */
function getCharacters() {
    const context = SillyTavern.getContext();
    const characters = context.characters || [];

    return characters.map((char, index) => ({
        id: char.avatar || `char_${index}`, // Use avatar as unique ID
        name: char.name || `Character ${index + 1}`,
    }));
}

/**
 * Get the current character ID
 * @returns {string | null}
 */
function getCurrentCharacterId() {
    const context = SillyTavern.getContext();
    const characterId = context.characterId;

    if (characterId !== undefined && characterId !== null) {
        const characters = context.characters || [];
        const char = characters[characterId];
        return char?.avatar || `char_${characterId}`;
    }

    return null;
}

/**
 * Get the selected character ID for function scope
 * @returns {string | null}
 */
function getSelectedCharacterId() {
    if (extensionSettings.functionScope !== 'character') {
        return null;
    }

    // Use selectedCharacter if set, otherwise use current character
    if (extensionSettings.selectedCharacter) {
        return extensionSettings.selectedCharacter;
    }

    const currentCharId = getCurrentCharacterId();
    if (currentCharId) {
        extensionSettings.selectedCharacter = currentCharId;
        saveSettingsDebounced();
    }

    return currentCharId;
}

/**
 * Get functions for a specific scope and key
 * @param {string} scope - 'global' or 'character'
 * @param {string} key - venv name or 'pyodide'
 * @param {string} [characterId] - character ID (only used when scope is 'character')
 * @returns {Array}
 */
function getFunctionsForKey(scope, key, characterId = null) {
    const scopeData = extensionSettings.functions[scope];
    if (!scopeData) return [];

    if (scope === 'character') {
        const charId = characterId || getSelectedCharacterId();
        if (!charId) return [];

        // Functions are stored as: character[characterId][key]
        const charData = scopeData[charId];
        if (!charData) return [];
        return charData[key] || [];
    }

    return scopeData[key] || [];
}

/**
 * Get all functions for the current scope and mode/venv
 * @returns {Array}
 */
function getCurrentFunctions() {
    const scope = extensionSettings.functionScope || 'character';
    const key = getCurrentFunctionKey();
    return getFunctionsForKey(scope, key);
}

/**
 * Get all functions across all venvs for the current scope
 * @returns {Object} - { venvKey: [functions], ... }
 */
function getAllFunctionsForScope() {
    const scope = extensionSettings.functionScope || 'character';

    if (scope === 'character') {
        const charId = getSelectedCharacterId();
        if (!charId) return {};
        return extensionSettings.functions[scope]?.[charId] || {};
    }

    return extensionSettings.functions[scope] || {};
}

/**
 * Find a function by name, searching current venv first, then others
 * @param {string} name - Function name
 * @returns {{func: object, key: string, scope: string} | null}
 */
function findFunctionByName(name) {
    const scope = extensionSettings.functionScope || 'character';
    const currentKey = getCurrentFunctionKey();

    let allFunctions = {};
    if (scope === 'character') {
        const charId = getSelectedCharacterId();
        if (!charId) return null;
        allFunctions = extensionSettings.functions[scope]?.[charId] || {};
    } else {
        allFunctions = extensionSettings.functions[scope] || {};
    }

    // Search current venv/mode first
    const currentFuncs = allFunctions[currentKey] || [];
    const inCurrent = currentFuncs.find(f => f.name === name);
    if (inCurrent) {
        return { func: inCurrent, key: currentKey, scope };
    }

    // Search other venvs
    for (const key of Object.keys(allFunctions)) {
        if (key === currentKey) continue;
        const funcs = allFunctions[key] || [];
        const found = funcs.find(f => f.name === name);
        if (found) {
            return { func: found, key, scope };
        }
    }

    return null;
}

/**
 * Save a function (create or update)
 * @param {object} func - Function object { name, description, code, arguments }
 * @param {string} [targetKey] - Optional venv/mode key (defaults to current)
 * @returns {{success: boolean, error?: string}}
 */
function saveFunction(func, targetKey = null) {
    const validation = isValidFunctionName(func.name);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    if (!func.code || !func.code.trim()) {
        return { success: false, error: 'Function code is required' };
    }

    const scope = extensionSettings.functionScope || 'character';
    const key = targetKey || getCurrentFunctionKey();

    // Ensure the structure exists
    if (!extensionSettings.functions[scope]) {
        extensionSettings.functions[scope] = {};
    }

    let funcs;
    if (scope === 'character') {
        const charId = getSelectedCharacterId();
        if (!charId) {
            return { success: false, error: 'No character selected' };
        }

        if (!extensionSettings.functions[scope][charId]) {
            extensionSettings.functions[scope][charId] = {};
        }
        if (!extensionSettings.functions[scope][charId][key]) {
            extensionSettings.functions[scope][charId][key] = [];
        }
        funcs = extensionSettings.functions[scope][charId][key];
    } else {
        if (!extensionSettings.functions[scope][key]) {
            extensionSettings.functions[scope][key] = [];
        }
        funcs = extensionSettings.functions[scope][key];
    }

    const existingIdx = funcs.findIndex(f => f.name === func.name);

    const now = Date.now();
    const funcData = {
        name: func.name,
        description: func.description || '',
        code: func.code,
        arguments: func.arguments || [],
        created: existingIdx >= 0 ? funcs[existingIdx].created : now,
        modified: now,
    };

    if (existingIdx >= 0) {
        funcs[existingIdx] = funcData;
    } else {
        funcs.push(funcData);
    }

    saveSettingsDebounced();
    return { success: true };
}

/**
 * Delete a function by name
 * @param {string} name - Function name
 * @param {string} [targetKey] - Optional venv/mode key (defaults to current)
 * @returns {{success: boolean, error?: string}}
 */
function deleteFunction(name, targetKey = null) {
    const scope = extensionSettings.functionScope || 'character';
    const key = targetKey || getCurrentFunctionKey();

    let funcs;
    if (scope === 'character') {
        const charId = getSelectedCharacterId();
        if (!charId) {
            return { success: false, error: 'No character selected' };
        }

        if (!extensionSettings.functions[scope]?.[charId]?.[key]) {
            return { success: false, error: 'Function not found' };
        }
        funcs = extensionSettings.functions[scope][charId][key];
    } else {
        if (!extensionSettings.functions[scope]?.[key]) {
            return { success: false, error: 'Function not found' };
        }
        funcs = extensionSettings.functions[scope][key];
    }

    const idx = funcs.findIndex(f => f.name === name);

    if (idx < 0) {
        return { success: false, error: `Function "${name}" not found` };
    }

    funcs.splice(idx, 1);
    saveSettingsDebounced();
    return { success: true };
}

/**
 * Get function count for display
 * @returns {number}
 */
function getFunctionCount() {
    const allFuncs = getAllFunctionsForScope();
    let count = 0;
    for (const key of Object.keys(allFuncs)) {
        count += (allFuncs[key] || []).length;
    }
    return count;
}

/**
 * Inject saved function code into user code if function calls are detected
 * @param {string} code - User's Python code
 * @returns {{code: string, targetKey: string | null, injectedFunctions: string[]}}
 */
function injectFunctionCode(code) {
    const scope = extensionSettings.functionScope || 'character';
    const allFunctions = extensionSettings.functions[scope] || {};
    const currentKey = getCurrentFunctionKey();

    let injectedCode = '';
    const injectedFunctions = [];
    let targetKey = null;

    // Search all venvs/modes for function calls, current first
    const keysToSearch = [currentKey, ...Object.keys(allFunctions).filter(k => k !== currentKey)];

    for (const key of keysToSearch) {
        const funcs = allFunctions[key] || [];
        for (const func of funcs) {
            // Check if function name appears as a call in the code
            const callPattern = new RegExp(`\\b${func.name}\\s*\\(`);
            if (callPattern.test(code) && !injectedFunctions.includes(func.name)) {
                injectedCode += func.code + '\n\n';
                injectedFunctions.push(func.name);
                // Set target key to first found function's venv (for auto-venv switching)
                if (targetKey === null) {
                    targetKey = key;
                }
            }
        }
    }

    return {
        code: injectedCode ? injectedCode + code : code,
        targetKey,
        injectedFunctions,
    };
}

/**
 * Initialize the extension
 */
async function init() {
    loadSettings();

    // Create PyRunner instance
    pyRunner = new PyRunner(extensionSettings);

    // Expose PyRunner instance globally for other extensions to use
    if (!window.SillyTavern) {
        window.SillyTavern = {};
    }
    window.SillyTavern.PyRunner = pyRunner;

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
                return 'Error: PyRunner is disabled. Enable it in the PyRunner panel.';
            }

            let code = unnamedArgs?.toString() || '';
            if (!code.trim()) {
                return 'Error: No Python code provided';
            }

            // Check for inline function calls and inject function code
            const injection = injectFunctionCode(code);
            code = injection.code;

            // Determine execution mode and venv
            let mode = namedArgs.mode || extensionSettings.executionMode;
            let venv = namedArgs.venv || extensionSettings.selectedVenv;

            // Auto-switch to the venv where the function is stored (if function was injected)
            if (injection.targetKey && !namedArgs.venv) {
                if (injection.targetKey === 'pyodide') {
                    mode = 'pyodide';
                } else {
                    mode = 'server';
                    venv = injection.targetKey;
                }
            }

            try {
                const result = await pyRunner.execute(code, {
                    timeout: namedArgs.timeout ? parseInt(namedArgs.timeout) : extensionSettings.timeout,
                    mode,
                    venv,
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
            SlashCommandNamedArgument.fromProps({
                name: 'venv',
                description: 'Virtual environment to use (server mode only)',
                typeList: [ARGUMENT_TYPE.STRING],
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
                    <li><code>/pyrun venv=myenv print("Using custom venv")</code></li>
                </ul>
                <br>
                <strong>Modes:</strong>
                <ul>
                    <li><code>pyodide</code> - Runs in browser using WebAssembly (sandboxed, limited packages)</li>
                    <li><code>server</code> - Runs on local machine via server plugin (full Python environment)</li>
                </ul>
                <br>
                <strong>Venv:</strong> In server mode, uses the selected venv by default. Override with <code>venv=name</code>.
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

            const venv = namedArgs.venv || extensionSettings.selectedVenv;

            try {
                const { getRequestHeaders } = SillyTavern.getContext();
                const response = await fetch(`${extensionSettings.serverUrl}/install`, {
                    method: 'POST',
                    headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages, venv }),
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
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'venv',
                description: 'Virtual environment to install packages into',
                typeList: [ARGUMENT_TYPE.STRING],
                defaultValue: null,
            }),
        ],
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
                    <li><code>/pyinstall venv=myenv requests</code></li>
                </ul>
                <br>
                Uses the selected venv by default. Override with <code>venv=name</code>.
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyinstall registered`);

    // Register /pyuninstall command
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pyuninstall',
        callback: async (namedArgs, unnamedArgs) => {
            const packages = unnamedArgs?.toString().trim() || '';
            if (!packages) {
                return 'Error: No packages specified. Usage: /pyuninstall numpy pandas';
            }

            const venv = namedArgs.venv || extensionSettings.selectedVenv || 'default';

            try {
                const { getRequestHeaders } = SillyTavern.getContext();
                const response = await fetch(`${extensionSettings.serverUrl}/uninstall`, {
                    method: 'POST',
                    headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages, venv }),
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(err || 'Server error');
                }

                const result = await response.json();
                if (result.error) {
                    return `Error: ${result.error}`;
                }
                return result.output || 'Packages uninstalled successfully';
            } catch (error) {
                console.error(`[${MODULE_NAME}] Uninstall error:`, error);
                return `Error: ${error.message}`;
            }
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'venv',
                description: 'Virtual environment to uninstall packages from',
                typeList: [ARGUMENT_TYPE.STRING],
                defaultValue: null,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Package names to uninstall (space-separated)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Uninstalls Python packages using pip (server mode only).
                <br><br>
                <strong>Examples:</strong>
                <ul>
                    <li><code>/pyuninstall numpy</code></li>
                    <li><code>/pyuninstall pandas matplotlib</code></li>
                    <li><code>/pyuninstall venv=myenv requests</code></li>
                </ul>
                <br>
                Uses the selected venv by default. Override with <code>venv=name</code>.
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyuninstall registered`);

    // Register /pyvenv command
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pyvenv',
        callback: async (namedArgs, unnamedArgs) => {
            const args = unnamedArgs?.toString().trim() || '';
            const parts = args.split(/\s+/).filter(p => p);

            // Check for subcommands: create, delete
            if (parts.length >= 2 && parts[0].toLowerCase() === 'create') {
                const venvName = parts[1];
                if (!/^[a-zA-Z0-9]+$/.test(venvName)) {
                    return 'Error: Venv name must be alphanumeric only (no spaces or special characters)';
                }

                try {
                    const { getRequestHeaders } = SillyTavern.getContext();
                    const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
                        method: 'POST',
                        headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: venvName }),
                    });

                    const result = await response.json();
                    if (!response.ok || result.error) {
                        return `Error: ${result.error || 'Failed to create venv'}`;
                    }

                    // Select the new venv in UI
                    extensionSettings.selectedVenv = venvName;
                    saveSettingsDebounced();
                    await refreshVenvList();

                    return `Venv "${venvName}" created and selected`;
                } catch (error) {
                    console.error(`[${MODULE_NAME}] Create venv error:`, error);
                    return `Error: ${error.message}`;
                }
            }

            if (parts.length >= 2 && parts[0].toLowerCase() === 'delete') {
                const venvName = parts[1];

                if (venvName === 'default') {
                    return 'Error: Cannot delete the default venv';
                }

                try {
                    const { getRequestHeaders } = SillyTavern.getContext();
                    const response = await fetch(`${extensionSettings.serverUrl}/venvs/${encodeURIComponent(venvName)}`, {
                        method: 'DELETE',
                        headers: getRequestHeaders(),
                    });

                    const result = await response.json();
                    if (!response.ok || result.error) {
                        return `Error: ${result.error || 'Failed to delete venv'}`;
                    }

                    // Switch to default if we deleted the selected venv
                    if (extensionSettings.selectedVenv === venvName) {
                        extensionSettings.selectedVenv = 'default';
                        saveSettingsDebounced();
                    }
                    await refreshVenvList();

                    return `Venv "${venvName}" deleted`;
                } catch (error) {
                    console.error(`[${MODULE_NAME}] Delete venv error:`, error);
                    return `Error: ${error.message}`;
                }
            }

            // No subcommand - select venv
            if (parts.length === 1) {
                const venvName = parts[0];

                // Check if venv exists
                try {
                    const { getRequestHeaders } = SillyTavern.getContext();
                    const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
                        method: 'GET',
                        headers: getRequestHeaders(),
                    });

                    const result = await response.json();
                    const venvs = result.venvs || [];

                    if (!venvs.includes(venvName)) {
                        return `Error: Venv "${venvName}" does not exist. Available: ${venvs.join(', ')}`;
                    }

                    extensionSettings.selectedVenv = venvName;
                    saveSettingsDebounced();

                    // Update UI dropdown
                    const select = document.querySelector('#pyrunner_venv_select');
                    if (select) select.value = venvName;
                    updateDeleteVenvButton();

                    return `Venv "${venvName}" selected`;
                } catch (error) {
                    console.error(`[${MODULE_NAME}] Select venv error:`, error);
                    return `Error: ${error.message}`;
                }
            }

            // No args - list venvs and show current
            try {
                const { getRequestHeaders } = SillyTavern.getContext();
                const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
                    method: 'GET',
                    headers: getRequestHeaders(),
                });

                const result = await response.json();
                const venvs = result.venvs || [];
                const current = extensionSettings.selectedVenv || 'default';

                return `Current venv: ${current}\nAvailable: ${venvs.join(', ')}`;
            } catch (error) {
                return `Current venv: ${extensionSettings.selectedVenv || 'default'}\nError fetching venv list: ${error.message}`;
            }
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Venv name to select, or "create [name]" / "delete [name]"',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        helpString: `
            <div>
                Manages Python virtual environments (server mode only).
                <br><br>
                <strong>Usage:</strong>
                <ul>
                    <li><code>/pyvenv</code> - List available venvs and current selection</li>
                    <li><code>/pyvenv [name]</code> - Select a venv</li>
                    <li><code>/pyvenv create [name]</code> - Create a new venv</li>
                    <li><code>/pyvenv delete [name]</code> - Delete a venv (not default)</li>
                </ul>
                <br>
                <strong>Examples:</strong>
                <ul>
                    <li><code>/pyvenv myenv</code> - Switch to myenv</li>
                    <li><code>/pyvenv create testing</code> - Create new venv called "testing"</li>
                    <li><code>/pyvenv delete testing</code> - Delete the "testing" venv</li>
                </ul>
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyvenv registered`);

    // Register /pycall command - Call saved functions
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pycall',
        callback: async (namedArgs, unnamedArgs) => {
            if (!extensionSettings.enabled) {
                return 'Error: PyRunner is disabled. Enable it in the PyRunner panel.';
            }

            const args = unnamedArgs?.toString().trim() || '';
            const parts = args.split(/\s+/);
            const funcName = parts[0];

            if (!funcName) {
                return 'Error: No function name provided. Usage: /pycall function_name [args]';
            }

            // Find the function
            const found = findFunctionByName(funcName);
            if (!found) {
                const availableFuncs = getCurrentFunctions().map(f => f.name).join(', ');
                return `Error: Function "${funcName}" not found. Available: ${availableFuncs || 'none'}`;
            }

            // Build the call code
            const funcArgs = parts.slice(1).join(', ');
            const callCode = `${found.func.code}\n\nresult = ${funcName}(${funcArgs})\nif result is not None:\n    print(result)`;

            // Determine mode and venv based on where function is stored
            let mode, venv;
            if (found.key === 'pyodide') {
                mode = 'pyodide';
                venv = 'default';
            } else {
                mode = 'server';
                venv = found.key;
            }

            try {
                const result = await pyRunner.execute(callCode, {
                    timeout: namedArgs.timeout ? parseInt(namedArgs.timeout) : extensionSettings.timeout,
                    mode,
                    venv,
                });
                return result;
            } catch (error) {
                console.error(`[${MODULE_NAME}] Execution error:`, error);
                return `Error: ${error.message}`;
            }
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'timeout',
                description: 'Execution timeout in milliseconds',
                typeList: [ARGUMENT_TYPE.NUMBER],
                defaultValue: null,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Function name followed by arguments',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Calls a saved function from the Functions Library.
                <br><br>
                <strong>Usage:</strong>
                <ul>
                    <li><code>/pycall function_name</code> - Call with no arguments</li>
                    <li><code>/pycall function_name arg1 arg2</code> - Positional arguments</li>
                    <li><code>/pycall function_name x=1 y=2</code> - Named arguments</li>
                </ul>
                <br>
                <strong>Auto-venv:</strong> Functions automatically execute in the venv where they are stored.
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pycall registered`);

    // Register /pyfunc command - Manage functions
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pyfunc',
        callback: async (namedArgs, unnamedArgs) => {
            const args = unnamedArgs?.toString().trim() || '';
            const parts = args.split(/\s+/).filter(p => p);
            const subcommand = parts[0]?.toLowerCase();

            // /pyfunc - List all functions
            if (!subcommand) {
                const funcs = getCurrentFunctions();
                const key = getCurrentFunctionKey();
                const scope = extensionSettings.functionScope || 'character';

                if (funcs.length === 0) {
                    return `No functions in ${scope}/${key}. Create one with /pyfunc create or via the UI.`;
                }

                const list = funcs.map(f => `  • ${f.name}${f.description ? ` - ${f.description}` : ''}`).join('\n');
                return `Functions in ${scope}/${key}:\n${list}`;
            }

            // /pyfunc create - Open modal (returns message to use UI)
            if (subcommand === 'create') {
                return 'Use the PyRunner panel to create functions via the UI modal editor.';
            }

            // /pyfunc delete <name>
            if (subcommand === 'delete') {
                const funcName = parts[1];
                if (!funcName) {
                    return 'Error: No function name provided. Usage: /pyfunc delete function_name';
                }

                const result = deleteFunction(funcName);
                if (result.success) {
                    return `Function "${funcName}" deleted successfully.`;
                } else {
                    return `Error: ${result.error}`;
                }
            }

            // /pyfunc scope <global|character>
            if (subcommand === 'scope') {
                const newScope = parts[1]?.toLowerCase();
                if (!newScope) {
                    return `Current scope: ${extensionSettings.functionScope || 'character'}`;
                }
                if (newScope !== 'global' && newScope !== 'character') {
                    return 'Error: Scope must be "global" or "character"';
                }
                extensionSettings.functionScope = newScope;
                saveSettingsDebounced();
                return `Function scope set to: ${newScope}`;
            }

            // /pyfunc export
            if (subcommand === 'export') {
                const allFuncs = getAllFunctionsForScope();
                const scope = extensionSettings.functionScope || 'character';
                const exportData = { scope, functions: allFuncs };
                return '```json\n' + JSON.stringify(exportData, null, 2) + '\n```';
            }

            // /pyfunc import <json> - Import functions
            if (subcommand === 'import') {
                const jsonStr = parts.slice(1).join(' ');
                if (!jsonStr) {
                    return 'Error: No JSON provided. Usage: /pyfunc import {"scope":"character","functions":{...}}';
                }

                try {
                    const importData = JSON.parse(jsonStr);
                    const scope = importData.scope || extensionSettings.functionScope || 'character';
                    const functions = importData.functions || {};

                    let importedCount = 0;
                    for (const key of Object.keys(functions)) {
                        const funcs = functions[key] || [];
                        for (const func of funcs) {
                            const saveResult = saveFunction(func, key);
                            if (saveResult.success) importedCount++;
                        }
                    }

                    return `Imported ${importedCount} function(s) to ${scope} scope.`;
                } catch (e) {
                    return `Error parsing JSON: ${e.message}`;
                }
            }

            // /pyfunc info <name> - Show function details
            if (subcommand === 'info') {
                const funcName = parts[1];
                if (!funcName) {
                    return 'Error: No function name provided. Usage: /pyfunc info function_name';
                }

                const found = findFunctionByName(funcName);
                if (!found) {
                    return `Error: Function "${funcName}" not found.`;
                }

                const f = found.func;
                return `Function: ${f.name}\nDescription: ${f.description || '(none)'}\nArguments: ${f.arguments?.length ? f.arguments.join(', ') : '(none)'}\nStored in: ${found.scope}/${found.key}\n\nCode:\n\`\`\`python\n${f.code}\n\`\`\``;
            }

            return `Unknown subcommand: ${subcommand}. Available: create, delete, scope, export, import, info`;
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Subcommand and arguments',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        helpString: `
            <div>
                Manages the Functions Library.
                <br><br>
                <strong>Usage:</strong>
                <ul>
                    <li><code>/pyfunc</code> - List all functions for current mode/venv</li>
                    <li><code>/pyfunc create</code> - Opens the UI modal editor</li>
                    <li><code>/pyfunc delete name</code> - Delete a function</li>
                    <li><code>/pyfunc info name</code> - Show function details</li>
                    <li><code>/pyfunc scope global|character</code> - Switch or view scope</li>
                    <li><code>/pyfunc export</code> - Export all functions as JSON</li>
                    <li><code>/pyfunc import {json}</code> - Import functions from JSON</li>
                </ul>
            </div>
        `,
    }));

    console.log(`[${MODULE_NAME}] Slash command /pyfunc registered`);
}

// Server plugin source code
// Server plugin code is now in server-plugin/index.js
// This embedded version is used for auto-install via Files API
const SERVER_PLUGIN_CODE = `/**
 * SillyTavern-PyRunner Server Plugin
 * Executes Python code on the local machine with venv support
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const info = {
    id: 'pyrunner',
    name: 'PyRunner',
    description: 'Executes Python code on the local machine for the PyRunner extension',
};

const VENVS_DIR = path.join(__dirname, 'venvs');
if (!fs.existsSync(VENVS_DIR)) {
    fs.mkdirSync(VENVS_DIR, { recursive: true });
}

function getPythonCommand() {
    return process.platform === 'win32' ? 'python' : 'python3';
}

function getVenvPython(venvName = 'default') {
    const venvPath = path.join(VENVS_DIR, venvName);
    return process.platform === 'win32'
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');
}

function venvExists(venvName) {
    return fs.existsSync(getVenvPython(venvName));
}

function isValidVenvName(name) {
    return /^[a-zA-Z0-9]+$/.test(name);
}

function createVenv(venvName) {
    return new Promise((resolve) => {
        const venvPath = path.join(VENVS_DIR, venvName);
        const proc = spawn(getPythonCommand(), ['-m', 'venv', venvPath], { timeout: 120000 });
        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        proc.on('close', (code) => {
            resolve(code === 0 ? { success: true } : { success: false, error: stderr.trim() || 'Failed to create venv' });
        });
        proc.on('error', (err) => resolve({ success: false, error: err.message }));
    });
}

function deleteVenv(venvName) {
    return new Promise((resolve) => {
        try {
            fs.rmSync(path.join(VENVS_DIR, venvName), { recursive: true, force: true });
            resolve({ success: true });
        } catch (err) {
            resolve({ success: false, error: err.message });
        }
    });
}

function listVenvs() {
    if (!fs.existsSync(VENVS_DIR)) return [];
    return fs.readdirSync(VENVS_DIR).filter(name => {
        return fs.statSync(path.join(VENVS_DIR, name)).isDirectory() && venvExists(name);
    });
}

async function ensureDefaultVenv() {
    if (!venvExists('default')) {
        console.log('[PyRunner] Creating default venv...');
        const result = await createVenv('default');
        if (result.success) console.log('[PyRunner] Default venv created');
        else console.error('[PyRunner] Failed:', result.error);
    }
}

function executePython(code, timeout = 30000, venvName = 'default') {
    return new Promise((resolve, reject) => {
        const proc = spawn(getVenvPython(venvName), ['-c', code], {
            timeout, maxBuffer: 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        const tid = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error('Timeout')); }, timeout);
        proc.on('close', (code) => {
            clearTimeout(tid);
            resolve(code !== 0 && stderr ? { output: stdout, error: stderr.trim() } : { output: stdout.trim(), error: null });
        });
        proc.on('error', (e) => { clearTimeout(tid); reject(new Error('Failed: ' + e.message)); });
    });
}

function pipInstall(packages, timeout = 120000, venvName = 'default') {
    return new Promise((resolve, reject) => {
        const args = ['-m', 'pip', 'install', ...packages.split(/\\s+/).filter(p => p)];
        const proc = spawn(getVenvPython(venvName), args, {
            timeout, maxBuffer: 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        const tid = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error('Timeout')); }, timeout);
        proc.on('close', (code) => {
            clearTimeout(tid);
            resolve(code !== 0 ? { output: stdout, error: stderr.trim() || 'Failed' } : { output: stdout.trim(), error: null });
        });
        proc.on('error', (e) => { clearTimeout(tid); reject(new Error('Failed: ' + e.message)); });
    });
}

function checkPipAvailable(venvName = 'default') {
    return new Promise((resolve) => {
        const proc = spawn(getVenvPython(venvName), ['-m', 'pip', '--version'], { timeout: 10000 });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
    });
}

async function init(router) {
    await ensureDefaultVenv();

    router.get('/status', async (req, res) => {
        res.json({ status: 'ok', plugin: info.name, python: getPythonCommand(), venvs: listVenvs(), defaultVenvReady: venvExists('default') });
    });

    router.get('/venvs', (req, res) => res.json({ venvs: listVenvs() }));

    router.post('/venvs', async (req, res) => {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'No name' });
        if (!isValidVenvName(name)) return res.status(400).json({ error: 'Invalid name' });
        if (venvExists(name)) return res.status(400).json({ error: 'Already exists' });
        const result = await createVenv(name);
        result.success ? res.json({ success: true }) : res.status(500).json({ error: result.error });
    });

    router.delete('/venvs/:name', async (req, res) => {
        const { name } = req.params;
        if (name === 'default') return res.status(400).json({ error: 'Cannot delete default' });
        if (!venvExists(name)) return res.status(404).json({ error: 'Not found' });
        const result = await deleteVenv(name);
        result.success ? res.json({ success: true }) : res.status(500).json({ error: result.error });
    });

    router.post('/execute', async (req, res) => {
        const { code, timeout = 30000, venv = 'default' } = req.body;
        if (!code) return res.status(400).json({ error: 'No code' });
        if (!venvExists(venv)) return res.status(400).json({ error: 'Venv not found' });
        try {
            const result = await executePython(code, Math.min(Math.max(parseInt(timeout) || 30000, 1000), 300000), venv);
            res.json(result.error ? { output: result.output, error: result.error } : { output: result.output });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/install', async (req, res) => {
        const { packages, venv = 'default' } = req.body;
        if (!packages) return res.status(400).json({ error: 'No packages' });
        if (!venvExists(venv)) return res.status(400).json({ error: 'Venv not found' });
        if (!(await checkPipAvailable(venv))) return res.status(400).json({ error: 'pip unavailable' });
        try {
            const result = await pipInstall(packages, 120000, venv);
            res.json(result.error ? { output: result.output, error: result.error } : { output: result.output });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/uninstall', async (req, res) => {
        const { packages, venv = 'default' } = req.body;
        if (!packages) return res.status(400).json({ error: 'No packages' });
        if (!venvExists(venv)) return res.status(400).json({ error: 'Venv not found' });
        if (!(await checkPipAvailable(venv))) return res.status(400).json({ error: 'pip unavailable' });
        const args = ['-m', 'pip', 'uninstall', '-y', ...packages.split(/\\s+/).filter(p => p)];
        const proc = spawn(getVenvPython(venv), args, { timeout: 120000, maxBuffer: 1024 * 1024 });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => res.json(code !== 0 ? { output: stdout, error: stderr.trim() || 'Failed' } : { output: stdout.trim() }));
        proc.on('error', (e) => res.status(500).json({ error: e.message }));
    });

    router.get('/packages', async (req, res) => {
        const venv = req.query.venv || 'default';
        if (!venvExists(venv)) return res.json({ packages: [], error: 'Venv not found' });
        if (!(await checkPipAvailable(venv))) return res.json({ packages: [], error: 'pip unavailable' });
        const proc = spawn(getVenvPython(venv), ['-m', 'pip', 'list', '--format=freeze'], { timeout: 30000, maxBuffer: 1024 * 1024 });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
            if (code !== 0 && !stdout) return res.json({ packages: [], error: stderr.trim() || 'Failed' });
            const packages = stdout.split('\\n').filter(p => p.trim()).map(p => {
                const [name, version] = p.split('==');
                return { name: name || p, version: version || '' };
            });
            res.json({ packages });
        });
        proc.on('error', (e) => res.status(500).json({ error: e.message }));
    });

    console.log('[' + info.name + '] Plugin initialized');
}

async function exit() { console.log('[' + info.name + '] Plugin unloaded'); }

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
 * Refresh the venv dropdown list
 */
async function refreshVenvList() {
    const select = document.querySelector('#pyrunner_venv_select');
    if (!select) return;

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch venvs');
        }

        const result = await response.json();
        const venvs = result.venvs || [];

        // Remember current selection
        const currentSelection = extensionSettings.selectedVenv || 'default';

        // Clear and repopulate
        select.innerHTML = '';
        venvs.forEach(venv => {
            const option = document.createElement('option');
            option.value = venv;
            option.textContent = venv;
            if (venv === currentSelection) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // If current selection not in list, select first available
        if (!venvs.includes(currentSelection) && venvs.length > 0) {
            extensionSettings.selectedVenv = venvs[0];
            select.value = venvs[0];
            saveSettingsDebounced();
        }

        // Update delete button state
        updateDeleteVenvButton();

    } catch (error) {
        console.error(`[${MODULE_NAME}] Venv list error:`, error);
    }
}

/**
 * Create a new venv
 */
async function createVenvFromUI() {
    const toastr = window.toastr;
    const nameInput = document.querySelector('#pyrunner_venv_name');
    const name = nameInput?.value?.trim();

    if (!name) {
        toastr.warning('Please enter a venv name');
        return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(name)) {
        toastr.error('Venv name must be alphanumeric only (no spaces or special characters)');
        return;
    }

    const createBtn = document.querySelector('#pyrunner_create_venv');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
            method: 'POST',
            headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            toastr.error(result.error || 'Failed to create venv');
            return;
        }

        toastr.success(`Venv "${name}" created successfully`);
        nameInput.value = '';

        // Refresh list and select the new venv
        await refreshVenvList();
        extensionSettings.selectedVenv = name;
        const select = document.querySelector('#pyrunner_venv_select');
        if (select) select.value = name;
        saveSettingsDebounced();

        // Refresh package list for new venv
        const refreshBtn = document.querySelector('#pyrunner_refresh_packages');
        if (refreshBtn) await refreshPackageList(refreshBtn);

    } catch (error) {
        console.error(`[${MODULE_NAME}] Create venv error:`, error);
        toastr.error(`Failed to create venv: ${error.message}`);
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create';
        }
    }
}

/**
 * Delete the selected venv
 */
async function deleteSelectedVenv() {
    const toastr = window.toastr;
    const venv = extensionSettings.selectedVenv;

    if (!venv || venv === 'default') {
        toastr.error('Cannot delete the default venv');
        return;
    }

    if (!confirm(`Are you sure you want to delete venv "${venv}"? All installed packages will be lost.`)) {
        return;
    }

    const deleteBtn = document.querySelector('#pyrunner_delete_venv');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/venvs/${encodeURIComponent(venv)}`, {
            method: 'DELETE',
            headers: getRequestHeaders(),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            toastr.error(result.error || 'Failed to delete venv');
            return;
        }

        toastr.success(`Venv "${venv}" deleted successfully`);

        // Switch to default and refresh
        extensionSettings.selectedVenv = 'default';
        saveSettingsDebounced();
        await refreshVenvList();

        // Refresh package list for default venv
        const refreshBtn = document.querySelector('#pyrunner_refresh_packages');
        if (refreshBtn) await refreshPackageList(refreshBtn);

    } catch (error) {
        console.error(`[${MODULE_NAME}] Delete venv error:`, error);
        toastr.error(`Failed to delete venv: ${error.message}`);
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
        }
        updateDeleteVenvButton();
    }
}

/**
 * Update delete venv button state (disable for default)
 */
function updateDeleteVenvButton() {
    const deleteBtn = document.querySelector('#pyrunner_delete_venv');
    if (deleteBtn) {
        const isDefault = extensionSettings.selectedVenv === 'default' || !extensionSettings.selectedVenv;
        deleteBtn.disabled = isDefault;
        deleteBtn.title = isDefault ? 'Cannot delete the default venv' : 'Delete selected venv';
    }
}

/**
 * Refresh the installed packages list
 * @param {HTMLElement} button - The refresh button
 */
async function refreshPackageList(button) {
    const listEl = document.querySelector('#pyrunner_packages_list');
    if (!listEl) return;

    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    button.disabled = true;

    const venv = extensionSettings.selectedVenv || 'default';

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/packages?venv=${encodeURIComponent(venv)}`, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch packages');
        }

        const result = await response.json();

        if (result.error) {
            listEl.innerHTML = `<span class="pyrunner-hint">Error: ${result.error}</span>`;
            return;
        }

        if (!result.packages || result.packages.length === 0) {
            listEl.innerHTML = '<span class="pyrunner-hint">No packages found</span>';
            return;
        }

        // Sort alphabetically
        result.packages.sort((a, b) => a.name.localeCompare(b.name));

        listEl.innerHTML = result.packages.map(pkg =>
            `<span class="pyrunner-package-item" data-package="${pkg.name}">${pkg.name}<span class="pyrunner-package-version">${pkg.version}</span></span>`
        ).join('');

        // Add click handlers to each package
        listEl.querySelectorAll('.pyrunner-package-item').forEach(item => {
            item.addEventListener('click', (e) => {
                showPackagePopup(e, item.dataset.package);
            });
        });

    } catch (error) {
        console.error(`[${MODULE_NAME}] Package list error:`, error);
        listEl.innerHTML = `<span class="pyrunner-hint">Error: ${error.message}</span>`;
    } finally {
        button.innerHTML = originalHtml;
        button.disabled = false;
    }
}

/**
 * Show popup menu for a package
 * @param {Event} e - Click event
 * @param {string} packageName - Package name
 */
function showPackagePopup(e, packageName) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.pyrunner-package-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.className = 'pyrunner-package-popup';
    popup.innerHTML = `
        <div class="pyrunner-package-popup-item" data-action="copy">
            <i class="fa-solid fa-copy"></i> Copy Name
        </div>
        <div class="pyrunner-package-popup-item danger" data-action="uninstall">
            <i class="fa-solid fa-trash"></i> Uninstall
        </div>
    `;

    // Position popup near click
    popup.style.left = `${e.clientX}px`;
    popup.style.top = `${e.clientY}px`;

    document.body.appendChild(popup);

    // Adjust if popup goes off screen
    const rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
        popup.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    // Handle actions
    popup.querySelector('[data-action="copy"]').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(packageName);
            window.toastr.success(`Copied: ${packageName}`);
        } catch {
            window.toastr.error('Failed to copy');
        }
        popup.remove();
    });

    popup.querySelector('[data-action="uninstall"]').addEventListener('click', async () => {
        popup.remove();
        await uninstallPackage(packageName);
    });

    // Close on click outside
    const closePopup = (event) => {
        if (!popup.contains(event.target)) {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
}

/**
 * Uninstall a Python package
 * @param {string} packageName - Package name
 */
async function uninstallPackage(packageName) {
    const toastr = window.toastr;

    if (!confirm(`Are you sure you want to uninstall "${packageName}"?`)) {
        return;
    }

    const venv = extensionSettings.selectedVenv || 'default';
    toastr.info(`Uninstalling ${packageName} from ${venv}...`);

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/uninstall`, {
            method: 'POST',
            headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ packages: packageName, venv }),
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const result = await response.json();

        if (result.error) {
            toastr.error(`Failed to uninstall ${packageName}: ${result.error}`);
        } else {
            toastr.success(`Uninstalled ${packageName}`);
            // Refresh the package list
            const refreshBtn = document.querySelector('#pyrunner_refresh_packages');
            if (refreshBtn) refreshPackageList(refreshBtn);
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] Uninstall error:`, error);
        toastr.error(`Failed to uninstall ${packageName}: ${error.message}`);
    }
}

// =============================================================================
// LOGGING FUNCTIONS
// =============================================================================

// Cache for log config
let cachedLogConfig = null;

/**
 * Fetch logging configuration from server
 * @returns {Promise<object|null>}
 */
async function fetchLogConfig() {
    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/logs/config`, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (!response.ok) return null;

        cachedLogConfig = await response.json();
        return cachedLogConfig;
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to fetch log config:`, error);
        return null;
    }
}

/**
 * Save logging configuration to server
 */
async function saveLogConfigToServer() {
    const toastr = window.toastr;

    const enabled = document.querySelector('#pyrunner_log_enabled')?.checked ?? true;
    const directory = document.querySelector('#pyrunner_log_directory')?.value || 'logs';
    const maxSizeMB = parseInt(document.querySelector('#pyrunner_log_max_size')?.value) || 5;
    const maxFileSize = maxSizeMB * 1024 * 1024;

    const levels = {
        ERROR: document.querySelector('#pyrunner_log_error')?.checked ?? true,
        WARN: document.querySelector('#pyrunner_log_warn')?.checked ?? true,
        INFO: document.querySelector('#pyrunner_log_info')?.checked ?? true,
        DEBUG: document.querySelector('#pyrunner_log_debug')?.checked ?? false,
    };

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/logs/config`, {
            method: 'POST',
            headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, directory, maxFileSize, levels }),
        });

        if (!response.ok) {
            throw new Error('Failed to save log config');
        }

        const result = await response.json();
        cachedLogConfig = result.config;
        toastr.success('Logging configuration saved');
    } catch (error) {
        console.error(`[${MODULE_NAME}] Save log config error:`, error);
        toastr.error(`Failed to save log config: ${error.message}`);
    }
}

/**
 * Fetch list of log files from server
 * @returns {Promise<Array>}
 */
async function fetchLogFiles() {
    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/logs/files`, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (!response.ok) return [];

        const result = await response.json();
        return result.files || [];
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to fetch log files:`, error);
        return [];
    }
}

/**
 * Fetch log content from server
 * @param {string} filename - Log filename
 * @param {number} lines - Number of lines to fetch
 * @returns {Promise<object>}
 */
async function fetchLogContent(filename, lines = 100) {
    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const url = `${extensionSettings.serverUrl}/logs?file=${encodeURIComponent(filename)}&lines=${lines}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (!response.ok) throw new Error('Failed to fetch logs');

        return await response.json();
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to fetch log content:`, error);
        return { entries: [], error: error.message };
    }
}

/**
 * Show the log viewer panel
 */
async function showLogViewer() {
    const viewer = document.querySelector('#pyrunner_log_viewer');
    const fileSelect = document.querySelector('#pyrunner_log_file_select');
    const contentEl = document.querySelector('#pyrunner_log_content');

    if (!viewer || !fileSelect || !contentEl) return;

    viewer.style.display = 'block';
    contentEl.innerHTML = '<span class="pyrunner-hint">Loading log files...</span>';

    // Fetch available log files
    const files = await fetchLogFiles();

    if (files.length === 0) {
        fileSelect.innerHTML = '<option value="">No log files found</option>';
        contentEl.innerHTML = '<span class="pyrunner-hint">No log files available</span>';
        return;
    }

    // Populate file select
    fileSelect.innerHTML = files.map(f => {
        const sizeKB = Math.round(f.size / 1024);
        return `<option value="${f.name}">${f.name} (${sizeKB} KB)</option>`;
    }).join('');

    // Load first file
    await loadLogFile(files[0].name);
}

/**
 * Load and display a log file
 * @param {string} filename - Log filename
 */
async function loadLogFile(filename) {
    const contentEl = document.querySelector('#pyrunner_log_content');
    if (!contentEl) return;

    contentEl.innerHTML = '<span class="pyrunner-hint">Loading...</span>';

    const result = await fetchLogContent(filename, 200);

    if (result.error) {
        contentEl.innerHTML = `<span class="pyrunner-hint">Error: ${result.error}</span>`;
        return;
    }

    if (!result.entries || result.entries.length === 0) {
        contentEl.innerHTML = '<span class="pyrunner-hint">No log entries found</span>';
        return;
    }

    // Format and display log entries
    contentEl.innerHTML = result.entries.map(entry => {
        // Determine log level for styling
        let levelClass = '';
        if (entry.includes('[ERROR]')) levelClass = 'error';
        else if (entry.includes('[WARN]')) levelClass = 'warn';
        else if (entry.includes('[INFO]')) levelClass = 'info';
        else if (entry.includes('[DEBUG]')) levelClass = 'debug';

        return `<div class="pyrunner-log-entry ${levelClass}">${escapeHtml(entry)}</div>`;
    }).join('');

    // Scroll to top (most recent)
    contentEl.scrollTop = 0;
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Install Python packages via pip
 * @param {string} packages - Space-separated package names
 * @param {HTMLElement} button - The button element
 */
async function installPythonPackages(packages, button) {
    const toastr = window.toastr;

    packages = packages?.trim();
    if (!packages) {
        toastr.warning('Please enter package names to install');
        return;
    }

    const venv = extensionSettings.selectedVenv || 'default';

    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Installing...';
    button.disabled = true;

    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/install`, {
            method: 'POST',
            headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ packages, venv }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Server error');
        }

        const result = await response.json();

        if (result.error) {
            // Check if it's an "already satisfied" message
            if (result.error.includes('already satisfied') || result.output?.includes('already satisfied')) {
                toastr.info(`Package(s) already installed: ${packages}`);
            } else {
                toastr.error(`Installation failed: ${result.error}`);
            }
        } else if (result.output) {
            // Check for "already satisfied" in output
            if (result.output.includes('already satisfied')) {
                toastr.info(`Package(s) already installed: ${packages}`);
            } else if (result.output.includes('Successfully installed')) {
                toastr.success(`Successfully installed: ${packages}`);
            } else {
                toastr.success(`Installation complete: ${packages}`);
            }
        } else {
            toastr.success(`Installation complete: ${packages}`);
        }

        // Clear input on success
        const input = document.querySelector('#pyrunner_package_input');
        if (input) input.value = '';

    } catch (error) {
        console.error(`[${MODULE_NAME}] Package install error:`, error);
        toastr.error(`Installation failed: ${error.message}`);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * Render extension settings UI as a top-level navigation panel
 */
async function renderSettings() {
    // Fetch log config from server if in server mode
    const logConfig = extensionSettings.executionMode === 'server' ? await fetchLogConfig() : cachedLogConfig;

    // Get characters list
    const characters = getCharacters();
    const selectedCharacter = getSelectedCharacterId();

    const settingsHtml = Settings({
        enabled: extensionSettings.enabled,
        executionMode: extensionSettings.executionMode,
        timeout: extensionSettings.timeout,
        selectedVenv: extensionSettings.selectedVenv,
        logConfig: logConfig,
        functionScope: extensionSettings.functionScope,
        functionCount: getFunctionCount(),
        selectedCharacter: selectedCharacter,
        characters: characters,
    });

    // Create the drawer structure (matching Sorcery extension pattern)
    const drawerWrapper = document.createElement('div');
    drawerWrapper.id = 'pyrunner-button';
    drawerWrapper.className = 'drawer';
    drawerWrapper.innerHTML = `
        <div class="drawer-toggle drawer-header">
            <div class="drawer-icon fa-solid fa-microchip fa-fw closedIcon" title="PyRunner"></div>
        </div>
        <div id="pyrunner_drawer" class="drawer-content closedDrawer">
            ${settingsHtml}
        </div>
    `;

    // Insert after the extensions settings button
    const extensionsButton = document.getElementById('extensions-settings-button');
    if (extensionsButton) {
        extensionsButton.after(drawerWrapper);
    }

    // Copy the click handler from an existing drawer toggle (needed since we're added late)
    const existingToggle = document.querySelector('#extensions-settings-button .drawer-toggle');
    if (existingToggle && window.jQuery) {
        const $ = window.jQuery;
        const events = $._data(existingToggle, 'events');
        if (events && events.click && events.click[0]) {
            const doNavbarIconClick = events.click[0].handler;
            $('#pyrunner-button .drawer-toggle').on('click', doNavbarIconClick);
        }
    }

    const drawerPanel = drawerWrapper.querySelector('#pyrunner_drawer');

    // Add event listeners
    const enabledCheckbox = drawerPanel.querySelector('#pyrunner_enabled');
    if (enabledCheckbox) {
        enabledCheckbox.addEventListener('change', (e) => {
            extensionSettings.enabled = e.target.checked;
            saveSettingsDebounced();
        });
    }

    const modeRadios = drawerPanel.querySelectorAll('input[name="pyrunner_mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            extensionSettings.executionMode = e.target.value;
            pyRunner.setMode(e.target.value);
            saveSettingsDebounced();
            updateServerStatus();
            // Refresh venv list when switching to server mode
            if (e.target.value === 'server') {
                refreshVenvList();
            }
        });
    });

    const timeoutInput = drawerPanel.querySelector('#pyrunner_timeout');
    if (timeoutInput) {
        timeoutInput.addEventListener('change', (e) => {
            extensionSettings.timeout = parseInt(e.target.value) || defaultSettings.timeout;
            saveSettingsDebounced();
        });
    }

    // Install plugin button (uses Files API)
    const installBtn = drawerPanel.querySelector('#pyrunner_install_plugin');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            await installServerPlugin(installBtn);
        });
    }

    // Copy install command button
    const copyBtn = drawerPanel.querySelector('#pyrunner_copy_install_cmd');
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

    // Install packages button
    const installPkgBtn = drawerPanel.querySelector('#pyrunner_install_packages');
    const packageInput = drawerPanel.querySelector('#pyrunner_package_input');
    if (installPkgBtn && packageInput) {
        installPkgBtn.addEventListener('click', async () => {
            await installPythonPackages(packageInput.value, installPkgBtn);
        });
        // Allow Enter key to install
        packageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await installPythonPackages(packageInput.value, installPkgBtn);
            }
        });
    }

    // Refresh packages button
    const refreshPkgBtn = drawerPanel.querySelector('#pyrunner_refresh_packages');
    if (refreshPkgBtn) {
        refreshPkgBtn.addEventListener('click', async () => {
            await refreshPackageList(refreshPkgBtn);
        });
    }

    // Venv select change handler
    const venvSelect = drawerPanel.querySelector('#pyrunner_venv_select');
    if (venvSelect) {
        venvSelect.addEventListener('change', async (e) => {
            extensionSettings.selectedVenv = e.target.value;
            saveSettingsDebounced();
            updateDeleteVenvButton();
            // Refresh package list for new venv
            if (refreshPkgBtn) {
                await refreshPackageList(refreshPkgBtn);
            }
        });
    }

    // Create venv button
    const createVenvBtn = drawerPanel.querySelector('#pyrunner_create_venv');
    if (createVenvBtn) {
        createVenvBtn.addEventListener('click', async () => {
            await createVenvFromUI();
        });
    }

    // Create venv on Enter key
    const venvNameInput = drawerPanel.querySelector('#pyrunner_venv_name');
    if (venvNameInput) {
        venvNameInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await createVenvFromUI();
            }
        });
    }

    // Delete venv button
    const deleteVenvBtn = drawerPanel.querySelector('#pyrunner_delete_venv');
    if (deleteVenvBtn) {
        deleteVenvBtn.addEventListener('click', async () => {
            await deleteSelectedVenv();
        });
    }

    // ==========================================================================
    // COLLAPSIBLE SECTIONS
    // ==========================================================================

    // Set up collapsible section click handlers
    const collapsibleHeaders = drawerPanel.querySelectorAll('.pyrunner-collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target;
            const content = document.getElementById(targetId);
            if (content) {
                header.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            }
        });
    });

    // Start with all sections collapsed by default
    const sectionsToCollapse = ['pyrunner_section_mode', 'pyrunner_section_venv', 'pyrunner_section_functions', 'pyrunner_section_logging', 'pyrunner_section_settings', 'pyrunner_section_help'];
    sectionsToCollapse.forEach(id => {
        const content = document.getElementById(id);
        const header = drawerPanel.querySelector(`[data-target="${id}"]`);
        if (content && header) {
            content.classList.add('collapsed');
            header.classList.add('collapsed');
        }
    });

    // ==========================================================================
    // LOGGING EVENT HANDLERS
    // ==========================================================================

    // Save log config button
    const saveLogConfigBtn = drawerPanel.querySelector('#pyrunner_save_log_config');
    if (saveLogConfigBtn) {
        saveLogConfigBtn.addEventListener('click', async () => {
            await saveLogConfigToServer();
        });
    }

    // View logs button
    const viewLogsBtn = drawerPanel.querySelector('#pyrunner_view_logs');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', async () => {
            await showLogViewer();
        });
    }

    // Close log viewer button
    const closeLogViewerBtn = drawerPanel.querySelector('#pyrunner_close_log_viewer');
    if (closeLogViewerBtn) {
        closeLogViewerBtn.addEventListener('click', () => {
            const viewer = drawerPanel.querySelector('#pyrunner_log_viewer');
            if (viewer) viewer.style.display = 'none';
        });
    }

    // Log file select change
    const logFileSelect = drawerPanel.querySelector('#pyrunner_log_file_select');
    if (logFileSelect) {
        logFileSelect.addEventListener('change', async (e) => {
            if (e.target.value) {
                await loadLogFile(e.target.value);
            }
        });
    }

    // Refresh logs button
    const refreshLogsBtn = drawerPanel.querySelector('#pyrunner_refresh_logs');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', async () => {
            const logFileSelect = drawerPanel.querySelector('#pyrunner_log_file_select');
            if (logFileSelect && logFileSelect.value) {
                await loadLogFile(logFileSelect.value);
            }
        });
    }

    // Check server status on load
    updateServerStatus();

    // Refresh venv list if in server mode
    if (extensionSettings.executionMode === 'server') {
        refreshVenvList();
    }

    // ==========================================================================
    // FUNCTIONS LIBRARY EVENT HANDLERS
    // ==========================================================================

    // Scope toggle buttons
    const scopeCharacterBtn = drawerPanel.querySelector('#pyrunner_scope_character');
    const scopeGlobalBtn = drawerPanel.querySelector('#pyrunner_scope_global');
    const characterRow = drawerPanel.querySelector('.pyrunner-func-character-row');

    if (scopeCharacterBtn && scopeGlobalBtn) {
        scopeCharacterBtn.addEventListener('click', () => {
            extensionSettings.functionScope = 'character';
            saveSettingsDebounced();
            scopeCharacterBtn.classList.add('menu_button_selected');
            scopeGlobalBtn.classList.remove('menu_button_selected');
            if (characterRow) characterRow.style.display = 'flex';
            renderFunctionsList();
            updateFunctionCountBadge();
        });

        scopeGlobalBtn.addEventListener('click', () => {
            extensionSettings.functionScope = 'global';
            saveSettingsDebounced();
            scopeGlobalBtn.classList.add('menu_button_selected');
            scopeCharacterBtn.classList.remove('menu_button_selected');
            if (characterRow) characterRow.style.display = 'none';
            renderFunctionsList();
            updateFunctionCountBadge();
        });
    }

    // Character select for character scope
    const funcCharacterSelect = drawerPanel.querySelector('#pyrunner_func_character_select');
    if (funcCharacterSelect) {
        funcCharacterSelect.addEventListener('change', () => {
            extensionSettings.selectedCharacter = funcCharacterSelect.value;
            saveSettingsDebounced();
            renderFunctionsList();
            updateFunctionCountBadge();
        });
    }

    // Mode/venv select for functions
    const funcModeSelect = drawerPanel.querySelector('#pyrunner_func_mode_select');
    if (funcModeSelect) {
        // Populate with available venvs
        populateFuncModeSelect();

        funcModeSelect.addEventListener('change', () => {
            renderFunctionsList();
        });
    }

    // Search input
    const funcSearchInput = drawerPanel.querySelector('#pyrunner_func_search');
    if (funcSearchInput) {
        funcSearchInput.addEventListener('input', () => {
            renderFunctionsList(funcSearchInput.value);
        });
    }

    // Create function button
    const createFuncBtn = drawerPanel.querySelector('#pyrunner_create_function');
    if (createFuncBtn) {
        createFuncBtn.addEventListener('click', () => {
            openFunctionModal();
        });
    }

    // Modal close buttons
    const modalCloseBtn = drawerPanel.querySelector('#pyrunner_modal_close');
    const modalCancelBtn = drawerPanel.querySelector('#pyrunner_modal_cancel');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeFunctionModal);
    }
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeFunctionModal);
    }

    // Modal save button
    const modalSaveBtn = drawerPanel.querySelector('#pyrunner_modal_save');
    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', saveFunctionFromModal);
    }

    // Close modal on overlay click
    const modalOverlay = drawerPanel.querySelector('#pyrunner_func_modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeFunctionModal();
            }
        });
    }

    // Initial render of functions list
    renderFunctionsList();
}

// =============================================================================
// FUNCTIONS LIBRARY UI HELPERS
// =============================================================================

// Track which function is being edited (null for new)
let editingFunctionName = null;

/**
 * Populate the mode/venv select for functions
 */
async function populateFuncModeSelect() {
    const select = document.querySelector('#pyrunner_func_mode_select');
    if (!select) return;

    const currentMode = extensionSettings.executionMode;
    const currentVenv = extensionSettings.selectedVenv || 'default';

    // Start with pyodide option
    let options = '<option value="pyodide">Pyodide</option>';

    // Always try to fetch server venvs (so user can create functions for server even if in pyodide mode)
    let venvs = ['default']; // Always include default
    try {
        const { getRequestHeaders } = SillyTavern.getContext();
        const response = await fetch(`${extensionSettings.serverUrl}/venvs`, {
            method: 'GET',
            headers: getRequestHeaders(),
        });

        if (response.ok) {
            const result = await response.json();
            if (result.venvs && result.venvs.length > 0) {
                venvs = result.venvs;
            }
        }
    } catch (e) {
        console.log(`[SillyTavern-PyRunner] Could not fetch venvs for function select: ${e.message}`);
    }

    // Add all venvs as options
    venvs.forEach(venv => {
        const isSelected = currentMode === 'server' && venv === currentVenv;
        options += `<option value="${venv}"${isSelected ? ' selected' : ''}>${venv}</option>`;
    });

    select.innerHTML = options;

    // Select the appropriate option based on current mode
    if (currentMode === 'pyodide') {
        select.value = 'pyodide';
    } else if (venvs.includes(currentVenv)) {
        select.value = currentVenv;
    } else {
        select.value = 'default';
    }
}

/**
 * Get the currently selected function mode/venv key
 */
function getSelectedFuncKey() {
    const select = document.querySelector('#pyrunner_func_mode_select');
    return select?.value || getCurrentFunctionKey();
}

/**
 * Render the functions list
 * @param {string} [searchFilter] - Optional search filter
 */
function renderFunctionsList(searchFilter = '') {
    const listEl = document.querySelector('#pyrunner_functions_list');
    if (!listEl) return;

    const scope = extensionSettings.functionScope || 'character';
    const key = getSelectedFuncKey();
    const funcs = getFunctionsForKey(scope, key);

    // Filter by search
    const filteredFuncs = searchFilter
        ? funcs.filter(f =>
            f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (f.description && f.description.toLowerCase().includes(searchFilter.toLowerCase()))
        )
        : funcs;

    if (filteredFuncs.length === 0) {
        listEl.innerHTML = '<span class="pyrunner-hint">No functions defined. Create one below.</span>';
        return;
    }

    listEl.innerHTML = filteredFuncs.map(f => `
        <div class="pyrunner-function-item" data-name="${f.name}">
            <div class="pyrunner-function-info">
                <div class="pyrunner-function-name">${f.name}</div>
                <div class="pyrunner-function-desc">${f.description || '(no description)'}</div>
            </div>
            <div class="pyrunner-function-actions">
                <button class="menu_button menu_button_icon pyrunner-func-edit" data-name="${f.name}" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="menu_button menu_button_icon pyrunner-func-delete" data-name="${f.name}" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Add click handlers
    listEl.querySelectorAll('.pyrunner-func-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            const func = funcs.find(f => f.name === name);
            if (func) openFunctionModal(func);
        });
    });

    listEl.querySelectorAll('.pyrunner-func-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            deleteFunctionWithConfirm(name);
        });
    });

    // Click on item to edit
    listEl.querySelectorAll('.pyrunner-function-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.dataset.name;
            const func = funcs.find(f => f.name === name);
            if (func) openFunctionModal(func);
        });
    });
}

/**
 * Update the function count badge
 */
function updateFunctionCountBadge() {
    const badge = document.querySelector('#pyrunner_func_count_badge');
    if (badge) {
        badge.textContent = getFunctionCount();
    }
}

/**
 * Open the function editor modal
 * @param {object} [func] - Function to edit (null for new)
 */
function openFunctionModal(func = null) {
    const modal = document.querySelector('#pyrunner_func_modal');
    const titleEl = document.querySelector('#pyrunner_modal_title');
    const nameInput = document.querySelector('#pyrunner_func_name');
    const descInput = document.querySelector('#pyrunner_func_desc');
    const argsInput = document.querySelector('#pyrunner_func_args');
    const codeInput = document.querySelector('#pyrunner_func_code');
    const targetEl = document.querySelector('#pyrunner_func_target');

    if (!modal) return;

    editingFunctionName = func ? func.name : null;

    // Set title
    if (titleEl) {
        titleEl.textContent = func ? 'Edit Function' : 'Create Function';
    }

    // Fill form
    if (nameInput) {
        nameInput.value = func ? func.name : '';
        nameInput.disabled = !!func; // Can't rename
    }
    if (descInput) descInput.value = func ? (func.description || '') : '';
    if (argsInput) argsInput.value = func ? (func.arguments || []).join(', ') : '';
    if (codeInput) codeInput.value = func ? func.code : '';

    // Update target display
    if (targetEl) {
        const scope = extensionSettings.functionScope || 'character';
        const key = getSelectedFuncKey();
        targetEl.textContent = `${scope} / ${key}`;
    }

    modal.style.display = 'flex';
}

/**
 * Close the function editor modal
 */
function closeFunctionModal() {
    const modal = document.querySelector('#pyrunner_func_modal');
    if (modal) {
        modal.style.display = 'none';
    }
    editingFunctionName = null;
}

/**
 * Save function from modal form
 */
function saveFunctionFromModal() {
    const toastr = window.toastr;

    const nameInput = document.querySelector('#pyrunner_func_name');
    const descInput = document.querySelector('#pyrunner_func_desc');
    const argsInput = document.querySelector('#pyrunner_func_args');
    const codeInput = document.querySelector('#pyrunner_func_code');

    const name = nameInput?.value?.trim();
    const description = descInput?.value?.trim() || '';
    const argsStr = argsInput?.value?.trim() || '';
    const code = codeInput?.value || '';

    // Parse arguments
    const args = argsStr ? argsStr.split(',').map(a => a.trim()).filter(a => a) : [];

    // Save with target key from select
    const key = getSelectedFuncKey();
    const result = saveFunction({ name, description, code, arguments: args }, key);

    if (result.success) {
        toastr.success(`Function "${name}" saved successfully`);
        closeFunctionModal();
        renderFunctionsList();
        updateFunctionCountBadge();
    } else {
        toastr.error(result.error);
    }
}

/**
 * Delete function with confirmation
 * @param {string} name - Function name
 */
function deleteFunctionWithConfirm(name) {
    const toastr = window.toastr;

    if (!confirm(`Are you sure you want to delete the function "${name}"?`)) {
        return;
    }

    const key = getSelectedFuncKey();
    const result = deleteFunction(name, key);

    if (result.success) {
        toastr.success(`Function "${name}" deleted`);
        renderFunctionsList();
        updateFunctionCountBadge();
    } else {
        toastr.error(result.error);
    }
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
