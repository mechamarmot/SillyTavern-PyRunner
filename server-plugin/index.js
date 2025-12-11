/**
 * SillyTavern-PyRunner Server Plugin
 * Executes Python code on the local machine
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Plugin info
 */
const info = {
    id: 'pyrunner',
    name: 'PyRunner',
    description: 'Executes Python code on the local machine for the PyRunner extension',
};

/**
 * Find Python executable
 * @returns {string} Python command
 */
function getPythonCommand() {
    // Try common Python commands
    const commands = ['python3', 'python', 'py'];
    return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Execute Python code
 * @param {string} code - Python code to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{output: string, error: string|null}>}
 */
function executePython(code, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const pythonCmd = getPythonCommand();

        const process = spawn(pythonCmd, ['-c', code], {
            timeout: timeout,
            maxBuffer: 1024 * 1024, // 1MB buffer
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        const timeoutId = setTimeout(() => {
            process.kill('SIGTERM');
            reject(new Error('Execution timed out'));
        }, timeout);

        process.on('close', (code) => {
            clearTimeout(timeoutId);
            if (code !== 0 && stderr) {
                resolve({ output: stdout, error: stderr.trim() });
            } else {
                resolve({ output: stdout.trim(), error: null });
            }
        });

        process.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to execute Python: ${err.message}`));
        });
    });
}

/**
 * Initialize plugin routes
 * @param {import('express').Router} router - Express router
 */
async function init(router) {
    // Status endpoint
    router.get('/status', (req, res) => {
        res.json({
            status: 'ok',
            plugin: info.name,
            python: getPythonCommand(),
        });
    });

    // Execute endpoint
    router.post('/execute', async (req, res) => {
        const { code, timeout = 30000 } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Validate timeout
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

    console.log(`[${info.name}] Plugin initialized`);
}

/**
 * Cleanup on exit
 */
async function exit() {
    console.log(`[${info.name}] Plugin unloaded`);
}

module.exports = {
    init,
    exit,
    info,
};
