const fs = require('fs');
const path = require('path');
const { assert } = require('./test-utils');

const rootDir = path.resolve(__dirname, '../..');
const indexPath = path.join(rootDir, 'index.html');
const content = fs.readFileSync(indexPath, 'utf8');

console.log('=== VERIFYING LEAN INDEX.HTML SPECIFICATION COMPLIANCE ===\n');

// 1. Check <head>
console.log('1. Checking <head>...');
assert.ok(content.includes('<link rel="stylesheet" href="css/main.css">'), 'Must include link to css/main.css');
assert.ok(!content.includes('<style>'), 'Must not contain any <style> tags');
assert.ok(!content.includes('</style>'), 'Must not contain any </style> tags');
assert.ok(content.includes('cdn.tailwindcss.com'), 'Must include Tailwind CDN');
assert.ok(content.includes('lucide@latest'), 'Must include Lucide CDN');
assert.ok(content.includes('hammer.js'), 'Must include Hammer.js CDN');
assert.ok(content.includes('chart.js'), 'Must include Chart.js CDN');
console.log('  √ Head checks passed');

// 2. Check 7 Tabs
console.log('2. Checking 7 Tab Containers...');
const requiredTabs = [
    'tab-monitor',
    'tab-control',
    'tab-phat-thanh',
    'tab-settings',
    'tab-canh-bao',
    'tab-thao-tac',
    'tab-bao-tri'
];

for (const tabId of requiredTabs) {
    const regex = new RegExp(`<div[^>]*id=["']${tabId}["'][^>]*>`, 'i');
    const match = content.match(regex);
    assert.ok(match, `Tab container #${tabId} must exist in index.html`);
    const tag = match[0];
    assert.ok(tag.includes('tab-content'), `Tab #${tabId} must have 'tab-content' class. Got: ${tag}`);
    assert.ok(tag.includes('hidden'), `Tab #${tabId} must have default 'hidden' class. Got: ${tag}`);
    console.log(`  √ #${tabId}: class includes tab-content & hidden`);
}

// 3. Check Script Entrypoint
console.log('3. Checking JavaScript Entrypoint...');
assert.ok(content.includes('<script type="module" src="js/app.js"></script>'), 'Must include modular entrypoint js/app.js');

// Count inline scripts
const inlineScriptMatches = content.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi) || [];
console.log(`  Total script tags: ${inlineScriptMatches.length}`);
for (const s of inlineScriptMatches) {
    console.log(`    Tag: ${s.substring(0, 80).replace(/\n/g, ' ')}...`);
}

// 4. Check All Modals
console.log('4. Checking Modal Dialogs...');
const requiredModals = [
    'modal-add-project',
    'modal-confirm-emergency',
    'modal-confirm-clear',
    'modal-switch-account',
    'modal-maint-settings',
    'modal-maint-confirm',
    'modal-admin',
    'modal-profile'
];

for (const mId of requiredModals) {
    assert.ok(content.includes(`id="${mId}"`), `Modal #${mId} must exist in index.html`);
    console.log(`  √ Modal #${mId} exists`);
}

// 5. Check Layout Elements
console.log('5. Checking Layout Elements...');
const requiredElements = [
    'toast-container',
    'swipe-area',
    'admin-floating-action-menu'
];

for (const eId of requiredElements) {
    assert.ok(content.includes(`id="${eId}"`), `Element #${eId} must exist in index.html`);
    console.log(`  √ Element #${eId} exists`);
}

console.log('\n=== ALL M5 VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
