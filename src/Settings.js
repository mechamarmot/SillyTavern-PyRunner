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
                            <button id="pyrunner_install_plugin" class="menu_button" title="Reinstall server plugin using Files API (requires LennySuite Files plugin)">
                                <i class="fa-solid fa-rotate"></i> Reinstall Plugin
                            </button>
                            <button id="pyrunner_copy_install_cmd" class="menu_button" title="Copy manual install instructions">
                                <i class="fa-solid fa-copy"></i> Manual
                            </button>
                        </div>
                        <small class="pyrunner-hint">Reinstall if plugin is outdated. Requires Files plugin. Restart after reinstall.</small>

                        <div class="pyrunner-server-status-row">
                            <label>Server Status:</label>
                            <span id="pyrunner_server_status" class="pyrunner-status-na">N/A</span>
                        </div>

                        <div class="pyrunner-packages-section">
                            <label class="pyrunner-label">Install Python Packages</label>
                            <div class="pyrunner-packages-input-row">
                                <input type="text" id="pyrunner_package_input" class="text_pole" placeholder="e.g. numpy pandas requests">
                                <button id="pyrunner_install_packages" class="menu_button">
                                    <i class="fa-solid fa-download"></i> Install
                                </button>
                            </div>
                            <small class="pyrunner-hint">Space-separated package names. Uses pip install (server mode only).</small>

                            <div class="pyrunner-packages-list-header">
                                <label class="pyrunner-label">Installed Packages</label>
                                <button id="pyrunner_refresh_packages" class="menu_button menu_button_icon" title="Refresh package list">
                                    <i class="fa-solid fa-refresh"></i>
                                </button>
                            </div>
                            <div id="pyrunner_packages_list" class="pyrunner-packages-list">
                                <span class="pyrunner-hint">Click refresh to load packages</span>
                            </div>
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

            .pyrunner-packages-section {
                margin: 10px 0;
            }

            .pyrunner-packages-input-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .pyrunner-packages-input-row input {
                flex: 1;
            }

            .pyrunner-packages-input-row .menu_button {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
            }

            .pyrunner-packages-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
            }

            .pyrunner-packages-list-header .menu_button_icon {
                padding: 3px 8px;
                min-width: unset;
            }

            .pyrunner-packages-list {
                max-height: 150px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 5px;
                padding: 8px;
                margin-top: 5px;
                font-size: 0.85em;
            }

            .pyrunner-package-item {
                display: inline-block;
                background: rgba(0, 0, 0, 0.3);
                padding: 2px 8px;
                border-radius: 3px;
                margin: 2px;
            }

            .pyrunner-package-version {
                opacity: 0.7;
                margin-left: 3px;
            }

            .pyrunner-package-item {
                cursor: pointer;
                transition: background 0.2s;
            }

            .pyrunner-package-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .pyrunner-package-popup {
                position: fixed;
                background: var(--SmartThemeBlurTintColor, #333);
                border: 1px solid var(--SmartThemeBorderColor, #555);
                border-radius: 5px;
                padding: 5px 0;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                min-width: 120px;
            }

            .pyrunner-package-popup-item {
                padding: 8px 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .pyrunner-package-popup-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .pyrunner-package-popup-item.danger {
                color: #f44336;
            }

            .pyrunner-package-popup-item.danger:hover {
                background: rgba(244, 67, 54, 0.2);
            }
        </style>
    `;
}
