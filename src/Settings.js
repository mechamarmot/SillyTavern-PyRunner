/**
 * Generate settings HTML for PyRunner extension
 * @param {object} props - Settings props
 * @returns {string} - HTML string
 */
export function Settings(props) {
    const { enabled, executionMode, timeout } = props;

    return `
        <div class="pyrunner-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>PyRunner</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="pyrunner-settings-content">
                        <div class="pyrunner-warning">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>WARNING: USE AT YOUR OWN RISK</span>
                        </div>

                        <div class="pyrunner-toggle-row">
                            <label for="pyrunner_enabled">Enable PyRunner</label>
                            <input type="checkbox" id="pyrunner_enabled" ${enabled ? 'checked' : ''}>
                        </div>

                        <hr>

                        <label class="pyrunner-label">Execution Mode</label>
                        <div class="pyrunner-radio-group">
                            <label class="radio-label">
                                <input type="radio" name="pyrunner_mode" value="pyodide" ${executionMode === 'pyodide' ? 'checked' : ''}>
                                <span>Pyodide (Browser)</span>
                                <small class="pyrunner-hint">Sandboxed, runs in WebAssembly. Limited to pure Python packages.</small>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="pyrunner_mode" value="server" ${executionMode === 'server' ? 'checked' : ''}>
                                <span>Server (Local Python)</span>
                                <small class="pyrunner-hint">Requires server plugin. Full Python environment with all packages.</small>
                            </label>
                        </div>

                        <div class="pyrunner-plugin-install">
                            <button id="pyrunner_install_plugin" class="menu_button" title="Install server plugin using Files API (requires LennySuite Files plugin)">
                                <i class="fa-solid fa-download"></i> Install Server Plugin
                            </button>
                            <button id="pyrunner_copy_install_cmd" class="menu_button" title="Copy manual install command to clipboard">
                                <i class="fa-solid fa-copy"></i> Copy Command
                            </button>
                        </div>

                        <div class="pyrunner-server-status-row">
                            <label>Server Status:</label>
                            <span id="pyrunner_server_status" class="pyrunner-status-na">N/A</span>
                        </div>

                        <label class="pyrunner-label" for="pyrunner_timeout">Timeout (ms)</label>
                        <input type="number" id="pyrunner_timeout" class="text_pole" value="${timeout}" min="1000" max="300000" step="1000">
                        <small class="pyrunner-hint">Maximum execution time before timeout (1000-300000 ms)</small>

                        <hr>
                        <div class="pyrunner-help">
                            <div class="pyrunner-help-title">Usage:</div>
                            <code>/pyrun &lt;python code&gt;</code>
                            <br><br>
                            <div class="pyrunner-help-title">Examples:</div>
                            <ul>
                                <li><code>/pyrun print("Hello!")</code></li>
                                <li><code>/pyrun 2 + 2</code></li>
                                <li><code>/pyrun mode=server import os; print(os.getcwd())</code></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .pyrunner-settings-content {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 10px 0;
            }

            .pyrunner-warning {
                background: #8b0000;
                color: #fff;
                padding: 10px 15px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
            }

            .pyrunner-warning i {
                font-size: 1.2em;
            }

            .pyrunner-toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 5px 0;
            }

            .pyrunner-toggle-row label {
                font-weight: bold;
            }

            .pyrunner-label {
                font-weight: bold;
                margin-top: 5px;
            }

            .pyrunner-radio-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-left: 5px;
            }

            .pyrunner-radio-group .radio-label {
                display: flex;
                flex-direction: column;
                gap: 2px;
                cursor: pointer;
            }

            .pyrunner-radio-group .radio-label > span {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .pyrunner-radio-group input[type="radio"] {
                margin-right: 5px;
            }

            .pyrunner-hint {
                color: var(--SmartThemeBodyColor);
                opacity: 0.7;
                font-size: 0.85em;
                margin-left: 20px;
            }

            .pyrunner-server-status-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 5px 0;
            }

            .pyrunner-status-ok {
                color: #4caf50;
                font-weight: bold;
            }

            .pyrunner-status-error {
                color: #f44336;
                font-weight: bold;
            }

            .pyrunner-status-na {
                opacity: 0.7;
            }

            .pyrunner-help {
                background: rgba(0, 0, 0, 0.2);
                padding: 10px;
                border-radius: 5px;
                font-size: 0.9em;
            }

            .pyrunner-help-title {
                font-weight: bold;
                margin-bottom: 5px;
            }

            .pyrunner-help code {
                background: rgba(0, 0, 0, 0.3);
                color: inherit;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
            }

            .pyrunner-help ul {
                margin: 5px 0;
                padding-left: 20px;
            }

            .pyrunner-help li {
                margin: 3px 0;
            }

            .pyrunner-plugin-install {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin: 5px 0;
            }

            .pyrunner-plugin-install .menu_button {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                text-decoration: none;
            }
        </style>
    `;
}
