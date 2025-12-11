/**
 * Generate settings HTML for PyRunner extension
 * @param {object} props - Settings props
 * @returns {string} - HTML string
 */
export function Settings(props) {
    const { executionMode, timeout } = props;

    return `
        <div class="pyrunner-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>PyRunner</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="pyrunner-settings-content">
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

                        <div class="pyrunner-server-status-row">
                            <label>Server Status:</label>
                            <span id="pyrunner_server_status" class="pyrunner-status-na">N/A</span>
                        </div>

                        <label class="pyrunner-label" for="pyrunner_timeout">Timeout (ms)</label>
                        <input type="number" id="pyrunner_timeout" class="text_pole" value="${timeout}" min="1000" max="300000" step="1000">
                        <small class="pyrunner-hint">Maximum execution time before timeout (1000-300000 ms)</small>

                        <hr>
                        <div class="pyrunner-help">
                            <b>Usage:</b>
                            <code>/pyrun &lt;python code&gt;</code>
                            <br><br>
                            <b>Examples:</b>
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
                color: var(--SmartThemeQuoteColor);
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
                color: var(--SmartThemeQuoteColor);
            }

            .pyrunner-help {
                background: var(--SmartThemeBlurTintColor);
                padding: 10px;
                border-radius: 5px;
                font-size: 0.9em;
            }

            .pyrunner-help code {
                background: var(--SmartThemeBodyColor);
                padding: 2px 5px;
                border-radius: 3px;
            }

            .pyrunner-help ul {
                margin: 5px 0;
                padding-left: 20px;
            }

            .pyrunner-help li {
                margin: 3px 0;
            }
        </style>
    `;
}
