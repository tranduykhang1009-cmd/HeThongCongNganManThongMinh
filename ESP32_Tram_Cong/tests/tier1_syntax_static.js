/**
 * Tier 1: Feature Coverage — Syntax & Static Analysis Test
 * 
 * Verifications:
 * 1. Zero ReferenceError / SyntaxError across all JS files (via Node V8 compiler & AST check).
 * 2. HTML document structural integrity (DOCTYPE, charset, viewport, title, balanced tags).
 * 3. CSS syntax and stylesheet link validity.
 * 4. Inline HTML event handler static resolution check.
 */

const path = require('path');
const fs = require('fs');
const { assert, TestRunner, validateJsSyntax, HtmlInspector } = require('./helpers/test-utils');

const rootDir = path.resolve(__dirname, '..');
const suite = new TestRunner('Tier 1: Syntax & Static Analysis');

// Helper to recursively collect files by extension
function getFilesRecursively(dir, ext, excludes = ['node_modules', '.pio', '.vscode', '.git', 'tests']) {
    if (!fs.existsSync(dir)) return [];
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        if (excludes.includes(item.name)) continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath, ext, excludes));
        } else if (item.isFile() && item.name.endsWith(ext)) {
            // Filter out root legacy scratch files if js/ folder is the modular target
            const isRootScratch = dir === rootDir && (
                /^script\d/i.test(item.name) ||
                /^test_script/i.test(item.name) ||
                /^temp/i.test(item.name) ||
                /^apply_final/i.test(item.name) ||
                /^fix_/i.test(item.name) ||
                item.name === 'inspect_paths.js' ||
                item.name === 'test_all_syntax.js'
            );
            if (!isRootScratch) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

// 1. JavaScript Syntax & Compilation Test
suite.it('T1.1: All JavaScript files compile without SyntaxError or Lexical Errors', () => {
    // Scan both modular js/ directory (if exists) and root application js files
    const jsFiles = getFilesRecursively(rootDir, '.js');

    const errors = [];
    for (const file of jsFiles) {
        if (path.basename(file).startsWith('_temp_')) continue;

        const res = validateJsSyntax(file);
        if (!res.valid) {
            errors.push({
                file: path.relative(rootDir, file),
                error: res.error
            });
        }
    }

    // Also extract and validate any inline <script> blocks in index.html, login.html
    const htmlFiles = ['index.html', 'login.html', '404.html'];
    for (const htmlFile of htmlFiles) {
        const filePath = path.join(rootDir, htmlFile);
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        
        const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
        let match;
        let scriptIndex = 0;
        while ((match = scriptRegex.exec(content)) !== null) {
            scriptIndex++;
            const attrs = match[1];
            const code = match[2].trim();
            // Skip external src scripts
            if (/src=["']/i.test(attrs) || code.length === 0) continue;

            const isModule = /type=["']module["']/i.test(attrs);
            const res = validateJsSyntax(code, true);
            if (!res.valid) {
                errors.push({
                    file: `${htmlFile} (inline script #${scriptIndex})`,
                    error: res.error
                });
            }
        }
    }

    if (errors.length > 0) {
        const errMsg = errors.map(e => `[${e.file}] ${e.error}`).join('\n');
        assert.ok(false, `Detected ${errors.length} JS Syntax/Compilation errors:\n${errMsg}`);
    }
});

// 2. HTML Document Structure Validation
suite.it('T1.2: HTML documents (index.html, login.html, 404.html) have valid HTML5 structure', () => {
    const htmlFiles = ['index.html', 'login.html', '404.html'];

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        if (!fs.existsSync(filePath)) {
            // If optional fallback not yet created, assert only required index.html
            if (file === 'index.html') {
                assert.ok(false, `Required HTML file ${file} does not exist at root`);
            }
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.length > 100, `${file} should not be empty`);

        // Check DOCTYPE
        assert.ok(/<!DOCTYPE\s+html>/i.test(content), `${file} must include <!DOCTYPE html>`);

        // Check <html>, <head>, <body> tags
        assert.ok(/<html[^>]*>/i.test(content), `${file} must contain <html> tag`);
        assert.ok(/<head[^>]*>/i.test(content), `${file} must contain <head> tag`);
        assert.ok(/<\/head>/i.test(content), `${file} must close </head> tag`);
        assert.ok(/<body[^>]*>/i.test(content), `${file} must contain <body> tag`);
        assert.ok(/<\/body>/i.test(content), `${file} must close </body> tag`);
        assert.ok(/<\/html>/i.test(content), `${file} must close </html> tag`);

        // Check UTF-8 charset
        assert.ok(/<meta[^>]+charset=["']?utf-8["']?/i.test(content), `${file} must declare UTF-8 charset`);

        // Check viewport meta for responsive layout
        assert.ok(/<meta[^>]+name=["']viewport["']/i.test(content), `${file} must declare viewport meta tag`);
    }
});

// 3. Modular Links & Asset Integrity Verification
suite.it('T1.3: HTML asset references (CSS and JS) resolve to valid targets', () => {
    const indexPath = path.join(rootDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist');

    const inspector = HtmlInspector.fromFile(indexPath);
    const stylesheets = inspector.getStylesheets();
    const scripts = inspector.getModuleScripts();

    // Verify stylesheets that are local references (not CDN)
    for (const sheet of stylesheets) {
        if (sheet.startsWith('http://') || sheet.startsWith('https://') || sheet.startsWith('//')) {
            continue; // Remote CDN allowed (e.g. Tailwind, Lucide)
        }
        const cleanHref = sheet.split('?')[0];
        const sheetPath = path.join(rootDir, cleanHref);
        assert.ok(fs.existsSync(sheetPath), `Referenced local stylesheet does not exist: ${sheet}`);
    }

    // Verify local module scripts
    for (const script of scripts) {
        if (script.startsWith('http://') || script.startsWith('https://') || script.startsWith('//')) {
            continue; // Remote CDN allowed (e.g. Firebase)
        }
        const cleanSrc = script.split('?')[0];
        const scriptPath = path.join(rootDir, cleanSrc);
        assert.ok(fs.existsSync(scriptPath), `Referenced local script does not exist: ${script}`);
    }
});

// 4. CSS Syntax & Rule Verification
suite.it('T1.4: All CSS stylesheets have balanced brackets and valid rule syntax', () => {
    const cssFiles = getFilesRecursively(rootDir, '.css');

    for (const file of cssFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for unclosed comments /* ... */
        const commentOpenCount = (content.match(/\/\*/g) || []).length;
        const commentCloseCount = (content.match(/\*\//g) || []).length;
        assert.equal(commentOpenCount, commentCloseCount, `CSS file ${path.relative(rootDir, file)} has unclosed comments`);

        // Check balanced curly brackets {}
        // Strip string literals and comments first
        const stripped = content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, '');
        
        let depth = 0;
        for (let i = 0; i < stripped.length; i++) {
            if (stripped[i] === '{') depth++;
            else if (stripped[i] === '}') depth--;
            assert.ok(depth >= 0, `CSS file ${path.relative(rootDir, file)} has unexpected closing brace at pos ${i}`);
        }
        assert.equal(depth, 0, `CSS file ${path.relative(rootDir, file)} has unclosed opening brace(s)`);
    }
});

// 5. Inline HTML Event Handlers Static Verification
suite.it('T1.5: Inline event handlers in index.html call syntactically valid functions', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const inspector = HtmlInspector.fromFile(indexPath);
    const handlers = inspector.getInlineEventHandlers();

    assert.ok(handlers.length > 0, 'index.html should have interactive event handlers');

    for (const h of handlers) {
        const code = h.handlerCode.trim();
        // Skip simple void or return statements
        if (code === 'return false;' || code === 'void(0);' || code === '') continue;

        // Wrap in a function to validate JavaScript expression/statement syntax
        const testCode = `(function() { ${code} });`;
        const res = validateJsSyntax(testCode, true);
        assert.ok(res.valid, `Invalid JS syntax in ${h.event}="${h.handlerCode}": ${res.error}`);
    }
});

// 6. ES Module Import Resolution & Graph Execution Test
suite.it('T1.6: All ES modules in js/ and main entrypoint js/app.js resolve and link cleanly', async () => {
    const { pathToFileURL } = require('url');
    const jsDir = path.join(rootDir, 'js');

    // Collect all modular JS files
    const modularFiles = getFilesRecursively(jsDir, '.js');
    assert.ok(modularFiles.length >= 15, `Expected at least 15 modular JS files, found ${modularFiles.length}`);

    // Setup global window/document mock before loading app.js
    const { createSimulatedBrowser } = require('./helpers/test-utils');
    const { window, document } = createSimulatedBrowser();
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;
    global.location = window.location;
    global.requestAnimationFrame = window.requestAnimationFrame;

    const errors = [];
    for (const file of modularFiles) {
        const fileUrl = pathToFileURL(file).href;
        try {
            const mod = await import(fileUrl);
            assert.ok(mod !== null && typeof mod === 'object', `Module ${file} should export an object/namespace`);
        } catch (err) {
            errors.push({
                file: path.relative(rootDir, file),
                error: err.message,
                stack: err.stack
            });
        }
    }

    if (errors.length > 0) {
        const msg = errors.map(e => `[${e.file}] ${e.error}`).join('\n');
        assert.ok(false, `Detected ${errors.length} ES Module resolution/import errors:\n${msg}`);
    }
});

// Export runner function
async function runTier1(options = {}) {
    return await suite.run(options);
}

if (require.main === module) {
    runTier1().then(summary => {
        process.exit(summary.failed === 0 ? 0 : 1);
    });
}

module.exports = { runTier1 };
