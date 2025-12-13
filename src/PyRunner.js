/* global SillyTavern */

/**
 * PyRunner - Handles Python code execution via Pyodide (browser) or server plugin
 */
export class PyRunner {
    constructor(settings) {
        this.settings = settings;
        this.mode = settings.executionMode || 'pyodide';
        this.pyodide = null;
        this.pyodideReady = false;
        this.pyodideLoading = false;
    }

    /**
     * Get request headers including CSRF token
     * @returns {object}
     */
    getHeaders() {
        const headers = SillyTavern.getContext().getRequestHeaders();
        return {
            ...headers,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Set execution mode
     * @param {string} mode - 'pyodide' or 'server'
     */
    setMode(mode) {
        this.mode = mode;
    }

    /**
     * Execute Python code
     * @param {string} code - Python code to execute
     * @param {object} options - Execution options
     * @returns {Promise<string>} - Execution result
     */
    async execute(code, options = {}) {
        const mode = options.mode || this.mode;
        const timeout = options.timeout || this.settings.timeout || 30000;
        const venv = options.venv || this.settings.selectedVenv || 'default';

        if (mode === 'pyodide') {
            return this.executePyodide(code, timeout);
        } else {
            return this.executeServer(code, timeout, venv);
        }
    }

    /**
     * Execute code using Pyodide (browser-based Python)
     * @param {string} code - Python code
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<string>}
     */
    async executePyodide(code, timeout) {
        if (!this.pyodideReady) {
            await this.initPyodide();
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Execution timed out'));
            }, timeout);

            try {
                // Capture stdout
                this.pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

                // Execute the user's code
                let result;
                try {
                    result = this.pyodide.runPython(code);
                } catch (pyError) {
                    clearTimeout(timeoutId);
                    // Get stderr if available
                    const stderr = this.pyodide.runPython('sys.stderr.getvalue()');
                    reject(new Error(stderr || pyError.message));
                    return;
                }

                // Get stdout
                const stdout = this.pyodide.runPython('sys.stdout.getvalue()');

                clearTimeout(timeoutId);

                // Return stdout if there's output, otherwise return the result
                if (stdout && stdout.trim()) {
                    resolve(stdout.trim());
                } else if (result !== undefined && result !== null) {
                    resolve(String(result));
                } else {
                    resolve('');
                }
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Initialize Pyodide
     * @returns {Promise<void>}
     */
    async initPyodide() {
        if (this.pyodideLoading) {
            // Wait for existing load to complete
            while (this.pyodideLoading) {
                await new Promise(r => setTimeout(r, 100));
            }
            return;
        }

        if (this.pyodideReady) {
            return;
        }

        this.pyodideLoading = true;

        try {
            // Load Pyodide from CDN
            if (!window.loadPyodide) {
                await this.loadScript('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
            }

            this.pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
            });

            this.pyodideReady = true;
            console.log('[PyRunner] Pyodide initialized');
        } catch (error) {
            console.error('[PyRunner] Failed to initialize Pyodide:', error);
            throw new Error('Failed to initialize Pyodide: ' + error.message);
        } finally {
            this.pyodideLoading = false;
        }
    }

    /**
     * Load a script dynamically
     * @param {string} src - Script URL
     * @returns {Promise<void>}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Execute code via server plugin
     * @param {string} code - Python code
     * @param {number} timeout - Timeout in ms
     * @param {string} venv - Virtual environment name
     * @returns {Promise<string>}
     */
    async executeServer(code, timeout, venv = 'default') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${this.settings.serverUrl}/execute`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code, timeout, venv }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            return result.output || '';
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Execution timed out');
            }
            throw error;
        }
    }

    /**
     * Check if server plugin is available
     * @returns {Promise<boolean>}
     */
    async checkServerAvailable() {
        try {
            const response = await fetch(`${this.settings.serverUrl}/status`, {
                method: 'GET',
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
