/**
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
        const args = ['-m', 'pip', 'install', ...packages.split(/\s+/).filter(p => p)];
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

/**
 * Check if pip is available
 * @returns {Promise<boolean>}
 */
function checkPipAvailable() {
    return new Promise((resolve) => {
        const pythonCmd = getPythonCommand();
        const proc = spawn(pythonCmd, ['-m', 'pip', '--version'], {
            timeout: 10000,
        });

        proc.on('close', (code) => {
            resolve(code === 0);
        });

        proc.on('error', () => {
            resolve(false);
        });
    });
}

async function init(router) {
    router.get('/status', async (req, res) => {
        const pipAvailable = await checkPipAvailable();
        res.json({
            status: 'ok',
            plugin: info.name,
            python: getPythonCommand(),
            pip: pipAvailable
        });
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

        const pipAvailable = await checkPipAvailable();
        if (!pipAvailable) {
            return res.status(400).json({ error: 'pip is not installed or not available. Please install pip first.' });
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

    router.post('/uninstall', async (req, res) => {
        const { packages } = req.body;
        if (!packages || typeof packages !== 'string') {
            return res.status(400).json({ error: 'No packages specified' });
        }

        const pipAvailable = await checkPipAvailable();
        if (!pipAvailable) {
            return res.status(400).json({ error: 'pip is not installed or not available.' });
        }

        try {
            const pythonCmd = getPythonCommand();
            const args = ['-m', 'pip', 'uninstall', '-y', ...packages.split(/\s+/).filter(p => p)];
            const proc = spawn(pythonCmd, args, {
                timeout: 120000,
                maxBuffer: 1024 * 1024,
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                if (code !== 0) {
                    return res.json({ output: stdout, error: stderr.trim() || 'Uninstall failed' });
                }
                res.json({ output: stdout.trim() });
            });

            proc.on('error', (err) => {
                res.status(500).json({ error: err.message });
            });
        } catch (error) {
            console.error('[PyRunner] Uninstall error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/packages', async (req, res) => {
        const pipAvailable = await checkPipAvailable();
        if (!pipAvailable) {
            return res.json({ packages: [], error: 'pip is not installed or not available.' });
        }

        try {
            // Use pip list --format=freeze which works universally
            const pythonCmd = getPythonCommand();
            const proc = spawn(pythonCmd, ['-m', 'pip', 'list', '--format=freeze'], {
                timeout: 30000,
                maxBuffer: 1024 * 1024,
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                if (code !== 0 && !stdout) {
                    return res.json({ packages: [], error: stderr.trim() || 'Failed to list packages' });
                }
                const packages = stdout.split('\n').filter(p => p.trim()).map(p => {
                    const [name, version] = p.split('==');
                    return { name: name || p, version: version || '' };
                });
                res.json({ packages });
            });

            proc.on('error', (err) => {
                res.status(500).json({ error: err.message });
            });
        } catch (error) {
            console.error('[PyRunner] List packages error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    console.log('[' + info.name + '] Plugin initialized');
}

async function exit() {
    console.log('[' + info.name + '] Plugin unloaded');
}

module.exports = { init, exit, info };
