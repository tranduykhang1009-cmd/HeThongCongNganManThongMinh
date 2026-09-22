/**
 * SCADA Automated Test Framework Utilities
 * Zero-dependency testing harness using Node.js built-in modules.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

// ANSI color helpers
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m'
};

// Custom Assertion Engine
const assert = {
    ok(condition, message = 'Expected condition to be truthy') {
        if (!condition) {
            const err = new Error(message);
            err.name = 'AssertionError';
            throw err;
        }
    },
    equal(actual, expected, message) {
        if (actual !== expected) {
            const msg = message || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`;
            const err = new Error(msg);
            err.name = 'AssertionError';
            err.actual = actual;
            err.expected = expected;
            throw err;
        }
    },
    deepEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            const msg = message || `Expected deep equality:\nActual:   ${actualStr}\nExpected: ${expectedStr}`;
            const err = new Error(msg);
            err.name = 'AssertionError';
            throw err;
        }
    },
    isTrue(val, message = 'Expected value to be true') {
        assert.equal(val, true, message);
    },
    isFalse(val, message = 'Expected value to be false') {
        assert.equal(val, false, message);
    },
    contains(collection, item, message) {
        if (typeof collection === 'string') {
            if (!collection.includes(item)) {
                throw new Error(message || `Expected string to contain "${item}"`);
            }
        } else if (Array.isArray(collection)) {
            if (!collection.includes(item)) {
                throw new Error(message || `Expected array to contain item ${JSON.stringify(item)}`);
            }
        } else if (collection && typeof collection === 'object') {
            if (!(item in collection)) {
                throw new Error(message || `Expected object to have key "${item}"`);
            }
        } else {
            throw new Error(`Cannot check contains on ${typeof collection}`);
        }
    },
    throws(fn, message = 'Expected function to throw') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message);
        }
    },
    doesNotThrow(fn, message = 'Expected function not to throw') {
        try {
            fn();
        } catch (e) {
            throw new Error((message ? message + ': ' : '') + e.message);
        }
    }
};

/**
 * Suite & Test Runner Registry
 */
class TestRunner {
    constructor(suiteName = 'Test Suite') {
        this.suiteName = suiteName;
        this.tests = [];
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.results = [];
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    it(name, fn) {
        this.test(name, fn);
    }

    beforeEach(fn) {
        this.beforeEachHooks.push(fn);
    }

    afterEach(fn) {
        this.afterEachHooks.push(fn);
    }

    async run(options = { verbose: false, silent: false }) {
        const startTime = Date.now();
        this.results = [];
        let passed = 0;
        let failed = 0;

        if (!options.silent) {
            console.log(`\n${colors.bold}${colors.cyan}--- Running Suite: ${this.suiteName} ---${colors.reset}`);
        }

        for (const t of this.tests) {
            for (const hook of this.beforeEachHooks) {
                await hook();
            }

            const tStart = Date.now();
            let err = null;

            try {
                const res = t.fn();
                if (res && typeof res.then === 'function') {
                    await res;
                }
                passed++;
                const duration = Date.now() - tStart;
                this.results.push({ name: t.name, status: 'PASSED', duration });
                if (!options.silent) {
                    console.log(`  ${colors.green}√${colors.reset} ${t.name} ${colors.dim}(${duration}ms)${colors.reset}`);
                }
            } catch (e) {
                failed++;
                const duration = Date.now() - tStart;
                err = e;
                this.results.push({ name: t.name, status: 'FAILED', duration, error: e.message, stack: e.stack });
                if (!options.silent) {
                    console.log(`  ${colors.red}× ${t.name} (${duration}ms)${colors.reset}`);
                    console.log(`    ${colors.red}Error: ${e.message}${colors.reset}`);
                    if (options.verbose && e.stack) {
                        console.log(`    ${colors.dim}${e.stack}${colors.reset}`);
                    }
                }
            }

            for (const hook of this.afterEachHooks) {
                try {
                    await hook();
                } catch (e) {
                    console.error('Error in afterEach hook:', e);
                }
            }
        }

        const totalDuration = Date.now() - startTime;
        const summary = {
            suite: this.suiteName,
            total: this.tests.length,
            passed,
            failed,
            duration: totalDuration,
            results: this.results
        };

        if (!options.silent) {
            const summaryColor = failed === 0 ? colors.green : colors.red;
            console.log(`\n${colors.bold}Results for ${this.suiteName}:${colors.reset}`);
            console.log(`  Total: ${this.tests.length} | ${colors.green}Passed: ${passed}${colors.reset} | ${failed > 0 ? colors.red : colors.dim}Failed: ${failed}${colors.reset} | Duration: ${totalDuration}ms`);
            console.log(`  Status: ${summaryColor}${failed === 0 ? 'SUCCESS' : 'FAILURE'}${colors.reset}\n`);
        }

        return summary;
    }
}

/**
 * Ephemeral Static HTTP Server for E2E Routing & Asset Verification
 */
function startTestServer(rootDir, port = 0) {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.mp3': 'audio/mpeg'
    };

    const server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/' || reqPath === '') {
            reqPath = '/index.html';
        }

        const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(rootDir, safePath);

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 Not Found</h1>');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stats.size,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    });

    return new Promise((resolve, reject) => {
        server.listen(port, '127.0.0.1', () => {
            const address = server.address();
            const assignedPort = address.port;
            const baseUrl = `http://127.0.0.1:${assignedPort}`;
            resolve({
                server,
                port: assignedPort,
                baseUrl,
                close: () => new Promise(res => server.close(res))
            });
        });
        server.on('error', reject);
    });
}

/**
 * Lightweight HTTP GET Client
 */
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        }).on('error', reject);
    });
}

/**
 * JavaScript Syntax & Lexical Validator using Node V8
 */
function validateJsSyntax(filePathOrCode, isCode = false) {
    try {
        let code = filePathOrCode;
        let filename = 'inline_script.js';
        if (!isCode) {
            filename = filePathOrCode;
            code = fs.readFileSync(filePathOrCode, 'utf8');
        }

        // Check if module code (contains import / export)
        const isModule = /^\s*(import|export)\s/m.test(code);

        if (isModule) {
            if (vm.SourceTextModule) {
                // If experimental-vm-modules is enabled
                new vm.SourceTextModule(code, { identifier: filename });
            } else {
                // Validate syntax via node --check in child process
                if (!isCode) {
                    execSync(`node --check "${filePathOrCode}"`, { stdio: 'pipe' });
                } else {
                    // For snippet, create temp file and check
                    const tmpFile = path.join(__dirname, `_temp_syntax_test_${Date.now()}.mjs`);
                    fs.writeFileSync(tmpFile, code, 'utf8');
                    try {
                        execSync(`node --check "${tmpFile}"`, { stdio: 'pipe' });
                    } finally {
                        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
                    }
                }
            }
        } else {
            // Standard Script compilation
            new vm.Script(code, { filename });
        }
        return { valid: true };
    } catch (e) {
        return { valid: false, error: e.message, stack: e.stack };
    }
}

/**
 * Lightweight HTML & DOM Inspector
 */
class HtmlInspector {
    constructor(htmlContent) {
        this.html = htmlContent;
        // Markup without <script>...</script> tags to avoid false positives on dynamic template strings
        this.markupOnly = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    static fromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        return new HtmlInspector(content);
    }

    getElementById(id) {
        const idRegex = new RegExp(`id=["']${id}["']`, 'i');
        const match = idRegex.exec(this.markupOnly) || idRegex.exec(this.html);
        if (!match) return null;

        const source = idRegex.exec(this.markupOnly) ? this.markupOnly : this.html;
        const start = Math.max(0, match.index - 50);
        const end = Math.min(source.length, match.index + 200);
        const snippet = source.substring(start, end);

        const classMatch = snippet.match(/class=["']([^"']+)["']/i);
        const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];

        const tagMatch = source.substring(0, match.index).match(/<([a-zA-Z0-9\-]+)[^<]*$/);
        const tagName = tagMatch ? tagMatch[1].toLowerCase() : 'div';

        return {
            id,
            tagName,
            classes,
            hasAttribute: (attr) => new RegExp(`${attr}(=["'][^"']*["'])?`, 'i').test(snippet),
            getAttribute: (attr) => {
                const m = snippet.match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'));
                return m ? m[1] : null;
            }
        };
    }

    getAllIds() {
        const idRegex = /id=["']([^"']+)["']/gi;
        const ids = new Set();
        let match;
        while ((match = idRegex.exec(this.markupOnly)) !== null) {
            ids.add(match[1]);
        }
        return Array.from(ids);
    }

    getStylesheets() {
        const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
        const hrefRegex = /href=["']([^"']+)["']/i;
        const sheets = [];
        let match;
        while ((match = linkRegex.exec(this.html)) !== null) {
            const hrefMatch = match[0].match(hrefRegex);
            if (hrefMatch) sheets.push(hrefMatch[1]);
        }
        return sheets;
    }

    getModuleScripts() {
        const scriptRegex = /<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
        const scripts = [];
        let match;
        while ((match = scriptRegex.exec(this.html)) !== null) {
            scripts.push(match[1]);
        }
        return scripts;
    }

    getInlineEventHandlers() {
        // Inspect event handlers only in real HTML markup, not inside script strings
        // Using backreference \2 to match corresponding opening quote (' or ")
        const handlerRegex = /\s(on[a-z]+)=(["'])([\s\S]*?)\2/gi;
        const handlers = [];
        let match;
        while ((match = handlerRegex.exec(this.markupOnly)) !== null) {
            handlers.push({
                event: match[1],
                handlerCode: match[3]
            });
        }
        return handlers;
    }
}

/**
 * Headless Simulated Browser Environment for Client-Side Routing & State Tests
 */
function createSimulatedBrowser(initialHtml = '') {
    const listeners = {};
    const docListeners = {};
    let currentHash = '#/monitor';

    const domTree = {};

    const createElementStub = (tag, id = '') => {
        return {
            id,
            tagName: tag ? tag.toUpperCase() : 'DIV',
            classList: {
                _classes: new Set(['tab-content', 'hidden']),
                add(...cls) { cls.forEach(c => this._classes.add(c)); },
                remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
                contains(cls) { return this._classes.has(cls); },
                toggle(cls, force) {
                    if (force !== undefined) {
                        if (force) this.add(cls);
                        else this.remove(cls);
                    } else {
                        if (this.contains(cls)) this.remove(cls);
                        else this.add(cls);
                    }
                }
            },
            style: {},
            innerHTML: '',
            innerText: '',
            value: '',
            disabled: false,
            setAttribute(k, v) { this[k] = v; },
            getAttribute(k) { return this[k]; },
            appendChild(c) { return c; },
            removeChild(c) { return c; },
            addEventListener(evt, fn) {},
            removeEventListener(evt, fn) {},
            dispatchEvent(evt) {},
            click() {},
            focus() {},
            blur() {}
        };
    };

    const document = {
        documentElement: createElementStub('HTML'),
        body: createElementStub('BODY'),
        head: createElementStub('HEAD'),
        createElement(tag) {
            return createElementStub(tag);
        },
        addEventListener(event, fn) {
            if (!docListeners[event]) docListeners[event] = [];
            docListeners[event].push(fn);
        },
        removeEventListener(event, fn) {
            if (docListeners[event]) {
                docListeners[event] = docListeners[event].filter(f => f !== fn);
            }
        },
        dispatchEvent(evt) {
            if (docListeners[evt.type]) {
                docListeners[evt.type].forEach(fn => fn(evt));
            }
        },
        getElementById(id) {
            if (!domTree[id]) {
                domTree[id] = createElementStub('DIV', id);
            }
            return domTree[id];
        },
        querySelectorAll(selector) {
            if (selector === '.tab-content') {
                const tabs = [
                    'tab-monitor', 'tab-control', 'tab-phat-thanh', 'tab-broadcast',
                    'tab-settings', 'tab-canh-bao', 'tab-alerts', 'tab-thao-tac',
                    'tab-actions', 'tab-bao-tri', 'tab-maintenance'
                ];
                return tabs.map(id => this.getElementById(id));
            }
            return [];
        },
        querySelector(selector) {
            const list = this.querySelectorAll(selector);
            return list.length > 0 ? list[0] : null;
        }
    };

    const window = {
        location: {
            get hash() { return currentHash; },
            set hash(val) {
                currentHash = val;
                const evt = { type: 'hashchange', newURL: 'http://localhost/' + val };
                if (listeners['hashchange']) {
                    listeners['hashchange'].forEach(fn => fn(evt));
                }
            },
            href: 'http://localhost/#/monitor'
        },
        addEventListener(event, fn) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
        },
        removeEventListener(event, fn) {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(f => f !== fn);
            }
        },
        dispatchEvent(evt) {
            if (listeners[evt.type]) {
                listeners[evt.type].forEach(fn => fn(evt));
            }
        },
        requestAnimationFrame(cb) {
            return setTimeout(cb, 0);
        },
        cancelAnimationFrame(id) {
            clearTimeout(id);
        },
        document,
        localStorage: {
            _store: {},
            getItem(k) { return this._store[k] || null; },
            setItem(k, v) { this._store[k] = String(v); },
            removeItem(k) { delete this._store[k]; },
            clear() { this._store = {}; }
        }
    };

    return { window, document };
}

module.exports = {
    colors,
    assert,
    TestRunner,
    startTestServer,
    fetchUrl,
    validateJsSyntax,
    HtmlInspector,
    createSimulatedBrowser
};
