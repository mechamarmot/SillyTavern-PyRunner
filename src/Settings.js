/**
 * Generate settings HTML for PyRunner extension
 * @param {object} props - Settings props
 * @returns {string} - HTML string
 */
export function Settings(props) {
    const { enabled, executionMode, timeout, selectedVenv, logConfig, functionScope, functionCount, selectedCharacter, characters } = props;

    // Default log config values
    const logEnabled = logConfig?.enabled ?? true;
    const logDirectory = logConfig?.directory ?? 'logs';
    const logMaxSize = logConfig?.maxFileSize ? Math.round(logConfig.maxFileSize / (1024 * 1024)) : 5;
    const logLevels = logConfig?.levels ?? { ERROR: true, WARN: true, INFO: true, DEBUG: false };

    return `
        <div class="pyrunner-panel">
            <div class="pyrunner-panel-header">
                <h2>PyRunner</h2>
            </div>
            <div class="pyrunner-panel-content">
                <div class="pyrunner-settings-content">
                    <div class="pyrunner-warning">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>WARNING: USE AT YOUR OWN RISK</span>
                    </div>

                    <div class="pyrunner-toggle-row">
                        <label for="pyrunner_enabled">Enable PyRunner</label>
                        <input type="checkbox" id="pyrunner_enabled" ${enabled ? 'checked' : ''}>
                    </div>

                    <!-- Execution Mode Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_mode">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Execution Mode</span>
                            <span class="pyrunner-section-badge" id="pyrunner_mode_badge">${executionMode}</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_mode">
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

                            <div class="pyrunner-plugin-install">
                                <button id="pyrunner_install_plugin" class="menu_button" title="Reinstall server plugin using Files API">
                                    <i class="fa-solid fa-rotate"></i> Reinstall Plugin
                                </button>
                                <button id="pyrunner_copy_install_cmd" class="menu_button" title="Copy manual install instructions">
                                    <i class="fa-solid fa-copy"></i> Manual
                                </button>
                            </div>
                            <small class="pyrunner-hint">Reinstall if plugin is outdated. Restart after reinstall.</small>
                        </div>
                    </div>

                    <!-- Virtual Environments Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_venv">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Virtual Environments</span>
                            <span class="pyrunner-section-badge" id="pyrunner_venv_badge">${selectedVenv || 'default'}</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_venv">
                            <div class="pyrunner-venv-select-row">
                                <select id="pyrunner_venv_select" class="text_pole">
                                    <option value="default" ${selectedVenv === 'default' ? 'selected' : ''}>default</option>
                                </select>
                                <button id="pyrunner_delete_venv" class="menu_button menu_button_icon" title="Delete selected venv" ${selectedVenv === 'default' ? 'disabled' : ''}>
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                            <div class="pyrunner-venv-create-row">
                                <input type="text" id="pyrunner_venv_name" class="text_pole" placeholder="New venv name (alphanumeric)">
                                <button id="pyrunner_create_venv" class="menu_button">
                                    <i class="fa-solid fa-plus"></i> Create
                                </button>
                            </div>
                            <small class="pyrunner-hint">Server mode only. Select venv to manage its packages.</small>

                            <hr class="pyrunner-section-divider">

                            <label class="pyrunner-label">Packages</label>
                            <div class="pyrunner-packages-input-row">
                                <input type="text" id="pyrunner_package_input" class="text_pole" placeholder="e.g. numpy pandas requests">
                                <button id="pyrunner_install_packages" class="menu_button">
                                    <i class="fa-solid fa-download"></i> Install
                                </button>
                            </div>
                            <small class="pyrunner-hint">Space-separated package names. Uses pip.</small>

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
                    </div>

                    <!-- Functions Library Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_functions">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Functions Library</span>
                            <span class="pyrunner-section-badge" id="pyrunner_func_count_badge">${functionCount || 0}</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_functions">
                            <div class="pyrunner-func-scope-row">
                                <label>Scope:</label>
                                <div class="pyrunner-func-scope-toggle">
                                    <button id="pyrunner_scope_character" class="menu_button ${functionScope !== 'global' ? 'menu_button_selected' : ''}" data-scope="character">
                                        <i class="fa-solid fa-user"></i> Character
                                    </button>
                                    <button id="pyrunner_scope_global" class="menu_button ${functionScope === 'global' ? 'menu_button_selected' : ''}" data-scope="global">
                                        <i class="fa-solid fa-globe"></i> Global
                                    </button>
                                </div>
                            </div>

                            <div class="pyrunner-func-character-row" style="display: ${functionScope !== 'global' ? 'flex' : 'none'};">
                                <label>Character:</label>
                                <select id="pyrunner_func_character_select" class="text_pole">
                                    ${characters && characters.length > 0
                                        ? characters.map(char => `<option value="${char.id}" ${selectedCharacter === char.id ? 'selected' : ''}>${char.name}</option>`).join('')
                                        : '<option value="">No characters available</option>'}
                                </select>
                            </div>

                            <div class="pyrunner-func-mode-row">
                                <label>Mode/Venv:</label>
                                <select id="pyrunner_func_mode_select" class="text_pole">
                                    <option value="pyodide" ${executionMode === 'pyodide' ? 'selected' : ''}>Pyodide</option>
                                    <option value="${selectedVenv || 'default'}" ${executionMode === 'server' ? 'selected' : ''}>${selectedVenv || 'default'}</option>
                                </select>
                            </div>

                            <div class="pyrunner-func-search-row">
                                <input type="text" id="pyrunner_func_search" class="text_pole" placeholder="Search functions...">
                            </div>

                            <div id="pyrunner_functions_list" class="pyrunner-functions-list">
                                <span class="pyrunner-hint">No functions defined. Create one below.</span>
                            </div>

                            <button id="pyrunner_create_function" class="menu_button pyrunner-create-func-btn">
                                <i class="fa-solid fa-plus"></i> Create Function
                            </button>

                            <small class="pyrunner-hint">Reusable Python code snippets. Use with /pycall or inline in /pyrun.</small>
                        </div>
                    </div>

                    <!-- Function Editor Modal -->
                    <div id="pyrunner_func_modal" class="pyrunner-modal-overlay" style="display: none;">
                        <div class="pyrunner-modal-dialog">
                            <div class="pyrunner-modal-header">
                                <h3 id="pyrunner_modal_title">Create Function</h3>
                                <button id="pyrunner_modal_close" class="menu_button menu_button_icon" title="Close">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                            <div class="pyrunner-modal-body">
                                <div class="pyrunner-modal-row">
                                    <label for="pyrunner_func_name">Name:</label>
                                    <input type="text" id="pyrunner_func_name" class="text_pole" placeholder="my_function">
                                </div>
                                <div class="pyrunner-modal-row">
                                    <label for="pyrunner_func_desc">Description:</label>
                                    <input type="text" id="pyrunner_func_desc" class="text_pole" placeholder="What this function does...">
                                </div>
                                <div class="pyrunner-modal-row">
                                    <label for="pyrunner_func_args">Arguments:</label>
                                    <input type="text" id="pyrunner_func_args" class="text_pole" placeholder="arg1, arg2 (comma-separated, optional)">
                                </div>
                                <div class="pyrunner-modal-row pyrunner-modal-code-row">
                                    <label for="pyrunner_func_code">Code:</label>
                                    <textarea id="pyrunner_func_code" class="text_pole pyrunner-code-editor" placeholder="def my_function(arg1, arg2):&#10;    # Your Python code here&#10;    return result"></textarea>
                                </div>
                                <div class="pyrunner-modal-row">
                                    <label>Target:</label>
                                    <span id="pyrunner_func_target" class="pyrunner-func-target">character / pyodide</span>
                                </div>
                            </div>
                            <div class="pyrunner-modal-footer">
                                <button id="pyrunner_modal_cancel" class="menu_button">Cancel</button>
                                <button id="pyrunner_modal_save" class="menu_button menu_button_primary">
                                    <i class="fa-solid fa-save"></i> Save Function
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Logging Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_logging">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Logging</span>
                            <span class="pyrunner-section-badge ${logEnabled ? 'pyrunner-badge-on' : 'pyrunner-badge-off'}">${logEnabled ? 'ON' : 'OFF'}</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_logging">
                            <div class="pyrunner-logging-toggle">
                                <label class="pyrunner-toggle-inline">
                                    <input type="checkbox" id="pyrunner_log_enabled" ${logEnabled ? 'checked' : ''}>
                                    <span>Enable Logging</span>
                                </label>
                            </div>

                            <div class="pyrunner-log-row">
                                <label for="pyrunner_log_directory">Log Directory:</label>
                                <input type="text" id="pyrunner_log_directory" class="text_pole" value="${logDirectory}" placeholder="logs">
                            </div>

                            <div class="pyrunner-log-row">
                                <label for="pyrunner_log_max_size">Max File Size (MB):</label>
                                <input type="number" id="pyrunner_log_max_size" class="text_pole" value="${logMaxSize}" min="1" max="100" step="1">
                            </div>

                            <label class="pyrunner-label">Log Levels:</label>
                            <div class="pyrunner-log-levels">
                                <label class="pyrunner-checkbox-label">
                                    <input type="checkbox" id="pyrunner_log_error" ${logLevels.ERROR ? 'checked' : ''}>
                                    <span class="pyrunner-level-error">ERROR</span>
                                    <small>Script failures, system errors</small>
                                </label>
                                <label class="pyrunner-checkbox-label">
                                    <input type="checkbox" id="pyrunner_log_warn" ${logLevels.WARN ? 'checked' : ''}>
                                    <span class="pyrunner-level-warn">WARN</span>
                                    <small>Warnings, timeouts</small>
                                </label>
                                <label class="pyrunner-checkbox-label">
                                    <input type="checkbox" id="pyrunner_log_info" ${logLevels.INFO ? 'checked' : ''}>
                                    <span class="pyrunner-level-info">INFO</span>
                                    <small>Normal operations</small>
                                </label>
                                <label class="pyrunner-checkbox-label">
                                    <input type="checkbox" id="pyrunner_log_debug" ${logLevels.DEBUG ? 'checked' : ''}>
                                    <span class="pyrunner-level-debug">DEBUG</span>
                                    <small>Detailed debugging</small>
                                </label>
                            </div>

                            <div class="pyrunner-log-actions">
                                <button id="pyrunner_save_log_config" class="menu_button">
                                    <i class="fa-solid fa-save"></i> Save Config
                                </button>
                                <button id="pyrunner_view_logs" class="menu_button">
                                    <i class="fa-solid fa-file-lines"></i> View Logs
                                </button>
                            </div>

                            <div id="pyrunner_log_viewer" class="pyrunner-log-viewer" style="display: none;">
                                <div class="pyrunner-log-viewer-header">
                                    <select id="pyrunner_log_file_select" class="text_pole"></select>
                                    <button id="pyrunner_refresh_logs" class="menu_button menu_button_icon" title="Refresh logs">
                                        <i class="fa-solid fa-refresh"></i>
                                    </button>
                                    <button id="pyrunner_close_log_viewer" class="menu_button menu_button_icon" title="Close">
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </div>
                                <div id="pyrunner_log_content" class="pyrunner-log-content">
                                    <span class="pyrunner-hint">Select a log file to view</span>
                                </div>
                            </div>

                            <small class="pyrunner-hint">Server mode only. Logs script executions and errors.</small>
                        </div>
                    </div>

                    <!-- Settings Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_settings">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Settings</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_settings">
                            <label class="pyrunner-label" for="pyrunner_timeout">Timeout (ms)</label>
                            <input type="number" id="pyrunner_timeout" class="text_pole" value="${timeout}" min="1000" max="300000" step="1000">
                            <small class="pyrunner-hint">Maximum execution time before timeout (1000-300000 ms)</small>
                        </div>
                    </div>

                    <!-- Help Section -->
                    <div class="pyrunner-collapsible">
                        <div class="pyrunner-collapsible-header" data-target="pyrunner_section_help">
                            <i class="fa-solid fa-chevron-down pyrunner-collapse-icon"></i>
                            <span>Help</span>
                        </div>
                        <div class="pyrunner-collapsible-content" id="pyrunner_section_help">
                            <div class="pyrunner-help">
                                <div class="pyrunner-help-title">Commands:</div>
                                <ul>
                                    <li><code>/pyrun &lt;code&gt;</code> - Execute Python code</li>
                                    <li><code>/pycall &lt;func&gt; [args]</code> - Call saved function</li>
                                    <li><code>/pyfunc [subcommand]</code> - Manage functions</li>
                                    <li><code>/pyinstall &lt;packages&gt;</code> - Install packages</li>
                                    <li><code>/pyuninstall &lt;packages&gt;</code> - Uninstall packages</li>
                                    <li><code>/pyvenv [name|create|delete]</code> - Manage venvs</li>
                                </ul>
                                <br>
                                <div class="pyrunner-help-title">Examples:</div>
                                <ul>
                                    <li><code>/pyrun print("Hello!")</code></li>
                                    <li><code>/pyrun my_func()</code> - Calls saved function inline</li>
                                    <li><code>/pycall roll_dice 20</code></li>
                                    <li><code>/pyfunc info my_func</code></li>
                                    <li><code>/pyinstall venv=myenv numpy pandas</code></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .pyrunner-panel {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .pyrunner-panel-header {
                padding: 10px 15px;
                border-bottom: 1px solid var(--SmartThemeBorderColor, #555);
            }

            .pyrunner-panel-header h2 {
                margin: 0;
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pyrunner-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px 15px;
            }

            .pyrunner-settings-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .pyrunner-warning {
                background: #8b0000;
                color: #fff;
                padding: 8px 12px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
                font-size: 0.9em;
            }

            .pyrunner-warning i {
                font-size: 1.1em;
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

            /* Collapsible Sections */
            .pyrunner-collapsible {
                border: 1px solid var(--SmartThemeBorderColor, #444);
                border-radius: 5px;
                overflow: hidden;
            }

            .pyrunner-collapsible-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                cursor: pointer;
                user-select: none;
                font-weight: bold;
                font-size: 0.95em;
            }

            .pyrunner-collapsible-header:hover {
                background: rgba(0, 0, 0, 0.3);
            }

            .pyrunner-collapse-icon {
                font-size: 0.8em;
                transition: transform 0.2s;
                width: 12px;
            }

            .pyrunner-collapsible-header.collapsed .pyrunner-collapse-icon {
                transform: rotate(-90deg);
            }

            .pyrunner-section-badge {
                margin-left: auto;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.75em;
                font-weight: normal;
                background: rgba(255, 255, 255, 0.15);
            }

            .pyrunner-badge-on {
                background: rgba(76, 175, 80, 0.3);
                color: #4caf50;
            }

            .pyrunner-badge-off {
                background: rgba(158, 158, 158, 0.3);
                color: #9e9e9e;
            }

            .pyrunner-collapsible-content {
                padding: 10px 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .pyrunner-collapsible-content.collapsed {
                display: none;
            }

            .pyrunner-section-divider {
                border: none;
                border-top: 1px solid var(--SmartThemeBorderColor, #444);
                margin: 10px 0;
            }

            .pyrunner-label {
                font-weight: bold;
                margin-top: 5px;
                font-size: 0.9em;
            }

            .pyrunner-radio-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
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
                font-size: 0.8em;
                margin-left: 20px;
            }

            .pyrunner-server-status-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 5px 0;
                font-size: 0.9em;
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
                font-size: 0.85em;
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
                font-size: 0.9em;
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
                gap: 8px;
                flex-wrap: wrap;
                margin: 5px 0;
            }

            .pyrunner-plugin-install .menu_button {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                text-decoration: none;
                font-size: 0.85em;
            }

            .pyrunner-venv-select-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .pyrunner-venv-select-row select {
                flex: 1;
            }

            .pyrunner-venv-select-row .menu_button_icon {
                padding: 5px 10px;
                min-width: unset;
            }

            .pyrunner-venv-create-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .pyrunner-venv-create-row input {
                flex: 1;
            }

            .pyrunner-packages-input-row {
                display: flex;
                gap: 8px;
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
                font-size: 0.85em;
            }

            .pyrunner-packages-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 5px;
            }

            .pyrunner-packages-list-header .menu_button_icon {
                padding: 3px 8px;
                min-width: unset;
            }

            .pyrunner-packages-list {
                max-height: 120px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 5px;
                padding: 8px;
                font-size: 0.8em;
            }

            .pyrunner-package-item {
                display: inline-block;
                background: rgba(0, 0, 0, 0.3);
                padding: 2px 8px;
                border-radius: 3px;
                margin: 2px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .pyrunner-package-version {
                opacity: 0.7;
                margin-left: 3px;
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

            /* Logging Section Styles */
            .pyrunner-logging-toggle {
                margin-bottom: 5px;
            }

            .pyrunner-toggle-inline {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }

            .pyrunner-log-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pyrunner-log-row label {
                min-width: 110px;
                font-size: 0.85em;
            }

            .pyrunner-log-row input {
                flex: 1;
                max-width: 180px;
            }

            .pyrunner-log-levels {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-left: 5px;
            }

            .pyrunner-checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 0.85em;
            }

            .pyrunner-checkbox-label small {
                opacity: 0.7;
                font-size: 0.9em;
            }

            .pyrunner-level-error {
                color: #f44336;
                font-weight: bold;
                min-width: 50px;
            }

            .pyrunner-level-warn {
                color: #ff9800;
                font-weight: bold;
                min-width: 50px;
            }

            .pyrunner-level-info {
                color: #2196f3;
                font-weight: bold;
                min-width: 50px;
            }

            .pyrunner-level-debug {
                color: #9e9e9e;
                font-weight: bold;
                min-width: 50px;
            }

            .pyrunner-log-actions {
                display: flex;
                gap: 8px;
                margin-top: 5px;
            }

            .pyrunner-log-actions .menu_button {
                font-size: 0.85em;
            }

            .pyrunner-log-viewer {
                margin-top: 8px;
                border: 1px solid var(--SmartThemeBorderColor, #555);
                border-radius: 5px;
                overflow: hidden;
            }

            .pyrunner-log-viewer-header {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 5px;
                background: rgba(0, 0, 0, 0.2);
            }

            .pyrunner-log-viewer-header select {
                flex: 1;
            }

            .pyrunner-log-content {
                max-height: 200px;
                overflow-y: auto;
                padding: 8px;
                background: rgba(0, 0, 0, 0.3);
                font-family: monospace;
                font-size: 0.75em;
                white-space: pre-wrap;
                word-break: break-all;
            }

            .pyrunner-log-entry {
                padding: 2px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .pyrunner-log-entry:last-child {
                border-bottom: none;
            }

            .pyrunner-log-entry.error {
                color: #f44336;
            }

            .pyrunner-log-entry.warn {
                color: #ff9800;
            }

            .pyrunner-log-entry.info {
                color: #2196f3;
            }

            .pyrunner-log-entry.debug {
                color: #9e9e9e;
            }

            /* Functions Library Section */
            .pyrunner-func-scope-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pyrunner-func-scope-row > label {
                font-size: 0.85em;
                min-width: 50px;
            }

            .pyrunner-func-scope-toggle {
                display: flex;
                gap: 5px;
                flex: 1;
            }

            .pyrunner-func-scope-toggle .menu_button {
                flex: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                font-size: 0.8em;
                padding: 5px 10px;
            }

            .pyrunner-func-scope-toggle .menu_button_selected {
                background: var(--SmartThemeQuoteColor, #4a7c59);
                border-color: var(--SmartThemeQuoteColor, #4a7c59);
            }

            .pyrunner-func-character-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pyrunner-func-character-row > label {
                font-size: 0.85em;
                min-width: 70px;
            }

            .pyrunner-func-character-row select {
                flex: 1;
            }

            .pyrunner-func-mode-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pyrunner-func-mode-row > label {
                font-size: 0.85em;
                min-width: 70px;
            }

            .pyrunner-func-mode-row select {
                flex: 1;
            }

            .pyrunner-func-search-row {
                margin-top: 5px;
            }

            .pyrunner-func-search-row input {
                width: 100%;
            }

            .pyrunner-functions-list {
                max-height: 150px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 5px;
                padding: 8px;
                min-height: 60px;
            }

            .pyrunner-function-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                margin-bottom: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .pyrunner-function-item:last-child {
                margin-bottom: 0;
            }

            .pyrunner-function-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .pyrunner-function-info {
                flex: 1;
                min-width: 0;
            }

            .pyrunner-function-name {
                font-weight: bold;
                font-size: 0.9em;
                color: var(--SmartThemeQuoteColor, #4a7c59);
            }

            .pyrunner-function-desc {
                font-size: 0.75em;
                opacity: 0.7;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .pyrunner-function-actions {
                display: flex;
                gap: 4px;
                margin-left: 8px;
            }

            .pyrunner-function-actions .menu_button_icon {
                padding: 3px 6px;
                min-width: unset;
                font-size: 0.8em;
            }

            .pyrunner-create-func-btn {
                width: 100%;
                margin-top: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
            }

            /* Modal Styles */
            .pyrunner-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }

            .pyrunner-modal-dialog {
                background: var(--SmartThemeBlurTintColor, #1a1a1a);
                border: 1px solid var(--SmartThemeBorderColor, #555);
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .pyrunner-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 15px;
                border-bottom: 1px solid var(--SmartThemeBorderColor, #555);
            }

            .pyrunner-modal-header h3 {
                margin: 0;
                font-size: 1.1em;
            }

            .pyrunner-modal-body {
                padding: 15px;
                overflow-y: auto;
                flex: 1;
            }

            .pyrunner-modal-row {
                margin-bottom: 12px;
            }

            .pyrunner-modal-row:last-child {
                margin-bottom: 0;
            }

            .pyrunner-modal-row > label {
                display: block;
                font-weight: bold;
                font-size: 0.85em;
                margin-bottom: 4px;
            }

            .pyrunner-modal-row input,
            .pyrunner-modal-row textarea {
                width: 100%;
            }

            .pyrunner-modal-code-row {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .pyrunner-code-editor {
                min-height: 150px;
                font-family: monospace;
                font-size: 0.85em;
                resize: vertical;
                white-space: pre;
                tab-size: 4;
            }

            .pyrunner-func-target {
                font-size: 0.85em;
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                display: inline-block;
            }

            .pyrunner-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 12px 15px;
                border-top: 1px solid var(--SmartThemeBorderColor, #555);
            }

            .pyrunner-modal-footer .menu_button_primary {
                background: var(--SmartThemeQuoteColor, #4a7c59);
            }
        </style>
    `;
}
