/**
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

// Venv storage directory
const VENVS_DIR = path.join(__dirname, 'venvs');

// Ensure venvs directory exists
if (!fs.existsSync(VENVS_DIR)) {
    fs.mkdirSync(VENVS_DIR, { recursive: true });
}

// =============================================================================
// LOGGING SYSTEM
// =============================================================================

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

// Default logging configuration
let logConfig = {
    enabled: true,
    directory: path.join(__dirname, 'logs'),
    maxFileSize: 5 * 1024 * 1024, // 5MB default
    levels: {
        ERROR: true,
        WARN: true,
        INFO: true,
        DEBUG: false,
    },
};

// Config file path
const LOG_CONFIG_FILE = path.join(__dirname, 'log-config.json');

/**
 * Load logging configuration from file
 */
function loadLogConfig() {
    try {
        if (fs.existsSync(LOG_CONFIG_FILE)) {
            const data = fs.readFileSync(LOG_CONFIG_FILE, 'utf-8');
            const saved = JSON.parse(data);
            logConfig = { ...logConfig, ...saved };
            // Ensure levels object has all keys
            for (const level of LOG_LEVEL_NAMES) {
                if (logConfig.levels[level] === undefined) {
                    logConfig.levels[level] = level !== 'DEBUG';
                }
            }
        }
    } catch (err) {
        console.error('[PyRunner] Failed to load log config:', err.message);
    }
}

/**
 * Save logging configuration to file
 */
function saveLogConfig() {
    try {
        fs.writeFileSync(LOG_CONFIG_FILE, JSON.stringify(logConfig, null, 2));
    } catch (err) {
        console.error('[PyRunner] Failed to save log config:', err.message);
    }
}

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
    if (!fs.existsSync(logConfig.directory)) {
        fs.mkdirSync(logConfig.directory, { recursive: true });
    }
}

/**
 * Get current log file path
 * @returns {string}
 */
function getLogFilePath() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logConfig.directory, `pyrunner-${date}.log`);
}

/**
 * Rotate log file if it exceeds max size
 * @param {string} logPath
 */
function rotateLogIfNeeded(logPath) {
    try {
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.size >= logConfig.maxFileSize) {
                const timestamp = Date.now();
                const rotatedPath = logPath.replace('.log', `-${timestamp}.log`);
                fs.renameSync(logPath, rotatedPath);
            }
        }
    } catch (err) {
        console.error('[PyRunner] Log rotation error:', err.message);
    }
}

/**
 * Write a log entry
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} category - Log category (SCRIPT, SYSTEM, VENV, PACKAGE)
 * @param {string} message - Log message
 * @param {object} [details] - Additional details
 */
function writeLog(level, category, message, details = null) {
    if (!logConfig.enabled) return;
    if (!logConfig.levels[level]) return;

    try {
        ensureLogDirectory();
        const logPath = getLogFilePath();
        rotateLogIfNeeded(logPath);

        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] [${level}] [${category}] ${message}`;

        if (details) {
            if (typeof details === 'string') {
                logEntry += `\n  Details: ${details}`;
            } else {
                logEntry += `\n  Details: ${JSON.stringify(details, null, 2).split('\n').join('\n  ')}`;
            }
        }
        logEntry += '\n';

        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('[PyRunner] Logging error:', err.message);
    }
}

// Convenience logging functions
const log = {
    error: (category, message, details) => writeLog('ERROR', category, message, details),
    warn: (category, message, details) => writeLog('WARN', category, message, details),
    info: (category, message, details) => writeLog('INFO', category, message, details),
    debug: (category, message, details) => writeLog('DEBUG', category, message, details),
};

// Load config on module load
loadLogConfig();

/**
 * Get the system Python command
 */
function getPythonCommand() {
    return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Get the Python executable path for a venv
 * @param {string} venvName - Name of the venv (default: 'default')
 * @returns {string} Path to Python executable
 */
function getVenvPython(venvName = 'default') {
    const venvPath = path.join(VENVS_DIR, venvName);
    return process.platform === 'win32'
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');
}

/**
 * Check if a venv exists
 * @param {string} venvName - Name of the venv
 * @returns {boolean}
 */
function venvExists(venvName) {
    const pythonPath = getVenvPython(venvName);
    return fs.existsSync(pythonPath);
}

/**
 * Validate venv name (alphanumeric only)
 * @param {string} name - Venv name to validate
 * @returns {boolean}
 */
function isValidVenvName(name) {
    return /^[a-zA-Z0-9]+$/.test(name);
}

/**
 * Create a new venv
 * @param {string} venvName - Name of the venv
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function createVenv(venvName) {
    return new Promise((resolve) => {
        const venvPath = path.join(VENVS_DIR, venvName);
        const pythonCmd = getPythonCommand();
        log.info('VENV', `Creating venv: ${venvName}`, { path: venvPath });

        const proc = spawn(pythonCmd, ['-m', 'venv', venvPath], {
            timeout: 120000,
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                const error = stderr.trim() || 'Failed to create venv';
                log.error('VENV', `Failed to create venv: ${venvName}`, { error, exitCode: code });
                resolve({ success: false, error });
            } else {
                log.info('VENV', `Venv created successfully: ${venvName}`);
                resolve({ success: true });
            }
        });

        proc.on('error', (err) => {
            log.error('SYSTEM', `Spawn error creating venv: ${venvName}`, { error: err.message });
            resolve({ success: false, error: err.message });
        });
    });
}

/**
 * Delete a venv directory recursively
 * @param {string} venvName - Name of the venv
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function deleteVenv(venvName) {
    return new Promise((resolve) => {
        const venvPath = path.join(VENVS_DIR, venvName);
        log.info('VENV', `Deleting venv: ${venvName}`, { path: venvPath });
        try {
            fs.rmSync(venvPath, { recursive: true, force: true });
            log.info('VENV', `Venv deleted successfully: ${venvName}`);
            resolve({ success: true });
        } catch (err) {
            log.error('VENV', `Failed to delete venv: ${venvName}`, { error: err.message });
            resolve({ success: false, error: err.message });
        }
    });
}

/**
 * List all venvs
 * @returns {string[]} Array of venv names
 */
function listVenvs() {
    if (!fs.existsSync(VENVS_DIR)) {
        return [];
    }
    return fs.readdirSync(VENVS_DIR).filter(name => {
        const venvPath = path.join(VENVS_DIR, name);
        return fs.statSync(venvPath).isDirectory() && venvExists(name);
    });
}

/**
 * Ensure default venv exists
 * @returns {Promise<void>}
 */
async function ensureDefaultVenv() {
    if (!venvExists('default')) {
        console.log('[PyRunner] Creating default venv...');
        const result = await createVenv('default');
        if (result.success) {
            console.log('[PyRunner] Default venv created successfully');
        } else {
            console.error('[PyRunner] Failed to create default venv:', result.error);
        }
    }
}

function executePython(code, timeout = 30000, venvName = 'default') {
    return new Promise((resolve, reject) => {
        const pythonCmd = getVenvPython(venvName);
        const codePreview = code.length > 100 ? code.substring(0, 100) + '...' : code;
        log.debug('SCRIPT', `Executing Python code in venv: ${venvName}`, { codePreview, timeout });

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
            log.error('SCRIPT', `Execution timed out in venv: ${venvName}`, { timeout, codePreview });
            reject(new Error('Execution timed out'));
        }, timeout);

        proc.on('close', (exitCode) => {
            clearTimeout(timeoutId);
            if (exitCode !== 0 && stderr) {
                log.error('SCRIPT', `Script execution failed in venv: ${venvName}`, {
                    exitCode,
                    error: stderr.trim(),
                    codePreview,
                });
                resolve({ output: stdout, error: stderr.trim() });
            } else {
                log.info('SCRIPT', `Script executed successfully in venv: ${venvName}`, {
                    exitCode,
                    outputLength: stdout.length,
                });
                resolve({ output: stdout.trim(), error: null });
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            log.error('SYSTEM', `Spawn error executing Python in venv: ${venvName}`, { error: err.message });
            reject(new Error('Failed to execute Python: ' + err.message));
        });
    });
}

function pipInstall(packages, timeout = 120000, venvName = 'default') {
    return new Promise((resolve, reject) => {
        const pythonCmd = getVenvPython(venvName);
        const packageList = packages.split(/\s+/).filter(p => p);
        log.info('PACKAGE', `Installing packages in venv: ${venvName}`, { packages: packageList });

        const args = ['-m', 'pip', 'install', ...packageList];
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
            log.error('PACKAGE', `Package installation timed out in venv: ${venvName}`, { packages: packageList, timeout });
            reject(new Error('Installation timed out'));
        }, timeout);

        proc.on('close', (exitCode) => {
            clearTimeout(timeoutId);
            if (exitCode !== 0) {
                const error = stderr.trim() || 'Installation failed';
                log.error('PACKAGE', `Package installation failed in venv: ${venvName}`, { packages: packageList, exitCode, error });
                resolve({ output: stdout, error });
            } else {
                log.info('PACKAGE', `Packages installed successfully in venv: ${venvName}`, { packages: packageList });
                resolve({ output: stdout.trim(), error: null });
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            log.error('SYSTEM', `Spawn error running pip in venv: ${venvName}`, { error: err.message });
            reject(new Error('Failed to run pip: ' + err.message));
        });
    });
}

/**
 * Check if pip is available for a venv
 * @param {string} venvName - Name of the venv
 * @returns {Promise<boolean>}
 */
function checkPipAvailable(venvName = 'default') {
    return new Promise((resolve) => {
        const pythonCmd = getVenvPython(venvName);
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
    // Ensure default venv exists on startup
    await ensureDefaultVenv();

    // Status endpoint - includes venv list
    router.get('/status', async (req, res) => {
        const venvs = listVenvs();
        const defaultExists = venvExists('default');
        res.json({
            status: 'ok',
            plugin: info.name,
            python: getPythonCommand(),
            venvs: venvs,
            defaultVenvReady: defaultExists
        });
    });

    // Venv CRUD endpoints
    router.get('/venvs', (req, res) => {
        const venvs = listVenvs();
        res.json({ venvs });
    });

    router.post('/venvs', async (req, res) => {
        const { name } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'No venv name provided' });
        }
        if (!isValidVenvName(name)) {
            return res.status(400).json({ error: 'Invalid venv name. Use alphanumeric characters only.' });
        }
        if (venvExists(name)) {
            return res.status(400).json({ error: `Venv "${name}" already exists` });
        }

        console.log(`[PyRunner] Creating venv: ${name}`);
        const result = await createVenv(name);
        if (result.success) {
            res.json({ success: true, message: `Venv "${name}" created successfully` });
        } else {
            res.status(500).json({ error: result.error });
        }
    });

    router.delete('/venvs/:name', async (req, res) => {
        const { name } = req.params;
        if (!name) {
            return res.status(400).json({ error: 'No venv name provided' });
        }
        if (name === 'default') {
            return res.status(400).json({ error: 'Cannot delete the default venv' });
        }
        if (!venvExists(name)) {
            return res.status(404).json({ error: `Venv "${name}" does not exist` });
        }

        console.log(`[PyRunner] Deleting venv: ${name}`);
        const result = await deleteVenv(name);
        if (result.success) {
            res.json({ success: true, message: `Venv "${name}" deleted successfully` });
        } else {
            res.status(500).json({ error: result.error });
        }
    });

    // Execute Python code (with venv support)
    router.post('/execute', async (req, res) => {
        const { code, timeout = 30000, venv = 'default' } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'No code provided' });
        }
        if (!venvExists(venv)) {
            return res.status(400).json({ error: `Venv "${venv}" does not exist` });
        }

        const safeTimeout = Math.min(Math.max(parseInt(timeout) || 30000, 1000), 300000);
        try {
            const result = await executePython(code, safeTimeout, venv);
            if (result.error) {
                return res.json({ output: result.output, error: result.error });
            }
            res.json({ output: result.output });
        } catch (error) {
            console.error('[PyRunner] Execution error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Install packages (with venv support)
    router.post('/install', async (req, res) => {
        const { packages, venv = 'default' } = req.body;
        if (!packages || typeof packages !== 'string') {
            return res.status(400).json({ error: 'No packages specified' });
        }
        if (!venvExists(venv)) {
            return res.status(400).json({ error: `Venv "${venv}" does not exist` });
        }

        const pipAvailable = await checkPipAvailable(venv);
        if (!pipAvailable) {
            return res.status(400).json({ error: 'pip is not available in this venv.' });
        }

        try {
            const result = await pipInstall(packages, 120000, venv);
            if (result.error) {
                return res.json({ output: result.output, error: result.error });
            }
            res.json({ output: result.output });
        } catch (error) {
            console.error('[PyRunner] Install error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Uninstall packages (with venv support)
    router.post('/uninstall', async (req, res) => {
        const { packages, venv = 'default' } = req.body;
        if (!packages || typeof packages !== 'string') {
            return res.status(400).json({ error: 'No packages specified' });
        }
        if (!venvExists(venv)) {
            return res.status(400).json({ error: `Venv "${venv}" does not exist` });
        }

        const pipAvailable = await checkPipAvailable(venv);
        if (!pipAvailable) {
            return res.status(400).json({ error: 'pip is not available in this venv.' });
        }

        const packageList = packages.split(/\s+/).filter(p => p);
        log.info('PACKAGE', `Uninstalling packages from venv: ${venv}`, { packages: packageList });

        try {
            const pythonCmd = getVenvPython(venv);
            const args = ['-m', 'pip', 'uninstall', '-y', ...packageList];
            const proc = spawn(pythonCmd, args, {
                timeout: 120000,
                maxBuffer: 1024 * 1024,
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (exitCode) => {
                if (exitCode !== 0) {
                    log.error('PACKAGE', `Package uninstall failed in venv: ${venv}`, { packages: packageList, exitCode, error: stderr.trim() });
                    return res.json({ output: stdout, error: stderr.trim() || 'Uninstall failed' });
                }
                log.info('PACKAGE', `Packages uninstalled successfully from venv: ${venv}`, { packages: packageList });
                res.json({ output: stdout.trim() });
            });

            proc.on('error', (err) => {
                log.error('SYSTEM', `Spawn error uninstalling packages in venv: ${venv}`, { error: err.message });
                res.status(500).json({ error: err.message });
            });
        } catch (error) {
            console.error('[PyRunner] Uninstall error:', error);
            log.error('SYSTEM', `Uninstall exception in venv: ${venv}`, { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // List packages (with venv support)
    router.get('/packages', async (req, res) => {
        const venv = req.query.venv || 'default';
        if (!venvExists(venv)) {
            return res.json({ packages: [], error: `Venv "${venv}" does not exist` });
        }

        const pipAvailable = await checkPipAvailable(venv);
        if (!pipAvailable) {
            return res.json({ packages: [], error: 'pip is not available in this venv.' });
        }

        try {
            const pythonCmd = getVenvPython(venv);
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

    // ==========================================================================
    // LOGGING API ENDPOINTS
    // ==========================================================================

    // Get logging configuration
    router.get('/logs/config', (req, res) => {
        res.json({
            enabled: logConfig.enabled,
            directory: logConfig.directory,
            maxFileSize: logConfig.maxFileSize,
            levels: logConfig.levels,
        });
    });

    // Update logging configuration
    router.post('/logs/config', (req, res) => {
        const { enabled, directory, maxFileSize, levels } = req.body;

        if (enabled !== undefined) {
            logConfig.enabled = Boolean(enabled);
        }

        if (directory && typeof directory === 'string') {
            // Validate directory path - must be absolute or relative to plugin
            const resolvedDir = path.isAbsolute(directory)
                ? directory
                : path.join(__dirname, directory);
            logConfig.directory = resolvedDir;
        }

        if (maxFileSize !== undefined) {
            const size = parseInt(maxFileSize);
            if (size >= 1024 * 100) { // Minimum 100KB
                logConfig.maxFileSize = Math.min(size, 100 * 1024 * 1024); // Max 100MB
            }
        }

        if (levels && typeof levels === 'object') {
            for (const level of LOG_LEVEL_NAMES) {
                if (levels[level] !== undefined) {
                    logConfig.levels[level] = Boolean(levels[level]);
                }
            }
        }

        saveLogConfig();
        log.info('SYSTEM', 'Logging configuration updated', logConfig);

        res.json({
            success: true,
            config: {
                enabled: logConfig.enabled,
                directory: logConfig.directory,
                maxFileSize: logConfig.maxFileSize,
                levels: logConfig.levels,
            },
        });
    });

    // List available log files
    router.get('/logs/files', (req, res) => {
        try {
            ensureLogDirectory();
            const files = fs.readdirSync(logConfig.directory)
                .filter(f => f.endsWith('.log'))
                .map(f => {
                    const filePath = path.join(logConfig.directory, f);
                    const stats = fs.statSync(filePath);
                    return {
                        name: f,
                        size: stats.size,
                        modified: stats.mtime.toISOString(),
                    };
                })
                .sort((a, b) => new Date(b.modified) - new Date(a.modified));

            res.json({ files, directory: logConfig.directory });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get log file contents (with pagination)
    router.get('/logs', (req, res) => {
        const { file, lines = 100, offset = 0 } = req.query;

        try {
            ensureLogDirectory();

            // If no file specified, use current day's log
            const logFile = file || `pyrunner-${new Date().toISOString().split('T')[0]}.log`;
            const logPath = path.join(logConfig.directory, logFile);

            if (!fs.existsSync(logPath)) {
                return res.json({ entries: [], total: 0, file: logFile });
            }

            const content = fs.readFileSync(logPath, 'utf-8');
            const allLines = content.split('\n').filter(l => l.trim());
            const total = allLines.length;

            // Parse offset and lines
            const offsetNum = Math.max(0, parseInt(offset) || 0);
            const linesNum = Math.min(500, Math.max(1, parseInt(lines) || 100));

            // Get lines from end (most recent first)
            const startIdx = Math.max(0, total - offsetNum - linesNum);
            const endIdx = total - offsetNum;
            const selectedLines = allLines.slice(startIdx, endIdx).reverse();

            res.json({
                entries: selectedLines,
                total,
                file: logFile,
                offset: offsetNum,
                returned: selectedLines.length,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Clear a specific log file
    router.delete('/logs/:filename', (req, res) => {
        const { filename } = req.params;

        if (!filename || !filename.endsWith('.log')) {
            return res.status(400).json({ error: 'Invalid log filename' });
        }

        try {
            const logPath = path.join(logConfig.directory, filename);
            if (fs.existsSync(logPath)) {
                fs.unlinkSync(logPath);
                log.info('SYSTEM', `Log file deleted: ${filename}`);
                res.json({ success: true, message: `Log file ${filename} deleted` });
            } else {
                res.status(404).json({ error: 'Log file not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    log.info('SYSTEM', 'PyRunner plugin initialized');
    console.log('[' + info.name + '] Plugin initialized');
}

async function exit() {
    console.log('[' + info.name + '] Plugin unloaded');
}

module.exports = { init, exit, info };
