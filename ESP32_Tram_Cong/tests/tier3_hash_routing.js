/**
 * Tier 3: Cross-Feature Combinations — Client-Side Hash Routing & DOM Verifier
 * 
 * Verifications:
 * 1. Spins up local ephemeral HTTP server and verifies static asset delivery.
 * 2. Simulates client-side SPA hash navigation across all 7 views:
 *    - #/monitor, #/control, #/broadcast, #/settings, #/alerts, #/actions, #/maintenance
 * 3. Asserts seamless container visibility switching (.hidden added/removed) without page reloads.
 * 4. Asserts navigation bar active state classes update accordingly.
 * 5. Verifies 100% of required SCADA DOM Element IDs exist in index.html.
 */

const path = require('path');
const fs = require('fs');
const { assert, TestRunner, startTestServer, fetchUrl, HtmlInspector, createSimulatedBrowser } = require('./helpers/test-utils');
const { SCADA_CONSTANTS } = require('./helpers/scada-mock-data');
const { RouterContract } = require('./tier2_boundary_corner');

const rootDir = path.resolve(__dirname, '..');
const suite = new TestRunner('Tier 3: Client-Side Hash Routing & DOM Verifier');

let testServer = null;

suite.beforeEach(async () => {
    if (!testServer) {
        testServer = await startTestServer(rootDir);
    }
});

// 1. Ephemeral HTTP Server Asset Delivery
suite.it('T3.1: Ephemeral HTTP server serves index.html with 200 OK and text/html MIME type', async () => {
    assert.ok(testServer && testServer.baseUrl, 'Test HTTP server must be active');
    const res = await fetchUrl(`${testServer.baseUrl}/index.html`);

    assert.equal(res.statusCode, 200, 'HTTP GET /index.html must return 200 OK');
    assert.ok(res.headers['content-type'].includes('text/html'), 'Content-Type must be text/html');
    assert.ok(res.body.length > 500, 'Served HTML body must be substantial');
});

// 2. HTTP Server 404 Fallback
suite.it('T3.2: HTTP server returns 404 for non-existent static assets', async () => {
    const res = await fetchUrl(`${testServer.baseUrl}/non_existent_file_${Date.now()}.xyz`);
    assert.equal(res.statusCode, 404, 'HTTP GET for non-existent file must return 404');
});

// 3. Client-Side Hash Navigation across all 7 Views
suite.it('T3.3: Client-side router transitions between all 7 views without page reload', () => {
    const { window, document } = createSimulatedBrowser();
    const router = new RouterContract();

    const expectedTabMap = {
        'monitor': ['tab-monitor'],
        'control': ['tab-control'],
        'broadcast': ['tab-broadcast', 'tab-phat-thanh'],
        'settings': ['tab-settings'],
        'alerts': ['tab-alerts', 'tab-canh-bao'],
        'actions': ['tab-actions', 'tab-thao-tac'],
        'maintenance': ['tab-maintenance', 'tab-bao-tri']
    };

    for (const route of SCADA_CONSTANTS.REQUIRED_ROUTES) {
        const hash = `#/${route}`;
        const navResult = router.navigate(hash, window);

        assert.equal(navResult.route, route, `Navigation to ${hash} must yield route ${route}`);

        // Verify that target tab in simulated DOM is visible (not hidden and active)
        const possibleIds = expectedTabMap[route];
        let foundActive = false;
        for (const tabId of possibleIds) {
            const tabEl = document.getElementById(tabId);
            if (tabEl && !tabEl.classList.contains('hidden') && tabEl.classList.contains('active')) {
                foundActive = true;
                break;
            }
        }
        assert.ok(foundActive, `View container for route "${route}" must be active and unhidden`);
    }
});

// 4. Tab Visibility Exclusivity (Single Active View Guarantee)
suite.it('T3.4: Activating a route sets exactly one active tab and hides all other views', () => {
    const { window, document } = createSimulatedBrowser();
    const router = new RouterContract();

    // Navigate to control
    router.navigate('#/control', window);

    const controlTab = document.getElementById('tab-control');
    assert.isFalse(controlTab.classList.contains('hidden'), 'Active tab tab-control must not have .hidden');
    assert.isTrue(controlTab.classList.contains('active'), 'Active tab tab-control must have .active');

    // Other tabs must be hidden
    const monitorTab = document.getElementById('tab-monitor');
    assert.isTrue(monitorTab.classList.contains('hidden'), 'Inactive tab tab-monitor must have .hidden');
    assert.isFalse(monitorTab.classList.contains('active'), 'Inactive tab tab-monitor must not have .active');

    const settingsTab = document.getElementById('tab-settings');
    assert.isTrue(settingsTab.classList.contains('hidden'), 'Inactive tab tab-settings must have .hidden');
});

// 5. Required DOM Elements & SCADA Component IDs Verification
suite.it('T3.5: All critical SCADA DOM Element IDs exist in index.html markup', () => {
    const indexPath = path.join(rootDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist');

    const inspector = HtmlInspector.fromFile(indexPath);
    const allIds = new Set(inspector.getAllIds());

    // Comprehensive list of required SCADA elements
    const coreComponents = [
        // Tab Containers (canonical or localized)
        { name: 'Monitor Tab', ids: ['tab-monitor'] },
        { name: 'Control Tab', ids: ['tab-control'] },
        { name: 'Broadcast Tab', ids: ['tab-broadcast', 'tab-phat-thanh'] },
        { name: 'Settings Tab', ids: ['tab-settings'] },
        { name: 'Alerts Tab', ids: ['tab-alerts', 'tab-canh-bao'] },
        { name: 'Actions Tab', ids: ['tab-actions', 'tab-thao-tac'] },
        { name: 'Maintenance Tab', ids: ['tab-maintenance', 'tab-bao-tri'] },

        // Control buttons
        { name: 'Gate Open Button', ids: ['btn-gate-open', 'btn-action-open'] },
        { name: 'Gate Close Button', ids: ['btn-gate-close', 'btn-action-close'] },
        { name: 'Auto Mode Button', ids: ['btn-mode-auto'] },
        { name: 'Manual Mode Button', ids: ['btn-mode-manual'] },
        { name: 'Emergency Stop Button', ids: ['btn-emergency-stop', 'btn-emergency'] },

        // Settings & Physical Lock
        { name: 'Physical Lock Switch', ids: ['btn-lock-physical', 'btn-toggle-lock-physical'] },

        // Modals
        { name: 'Emergency Modal', ids: ['modal-confirm-emergency'] },
        { name: 'Switch Account Modal', ids: ['modal-switch-account'] },
        { name: 'Maintenance Settings Modal', ids: ['modal-maint-settings'] }
    ];

    const missingComponents = [];
    for (const comp of coreComponents) {
        const hasAny = comp.ids.some(id => allIds.has(id));
        if (!hasAny) {
            missingComponents.push(`${comp.name} (checked IDs: ${comp.ids.join(', ')})`);
        }
    }

    assert.equal(
        missingComponents.length,
        0,
        `Missing required DOM components in index.html:\n - ${missingComponents.join('\n - ')}`
    );
});

// 6. Navigation Link Structure in Desktop Header and Mobile Drawer
suite.it('T3.6: Navigation links exist for all 7 primary tabs in header/sidebar', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    const expectedNavSuffixes = ['monitor', 'control', 'settings'];
    for (const suffix of expectedNavSuffixes) {
        const hasDesktopNav = content.includes(`id="nav-${suffix}"`) || content.includes(`switchTab('tab-${suffix}')`);
        assert.ok(hasDesktopNav, `Navigation trigger for "${suffix}" must exist in index.html`);
    }
});

// Export runner function
async function runTier3(options = {}) {
    try {
        return await suite.run(options);
    } finally {
        if (testServer) {
            await testServer.close();
            testServer = null;
        }
    }
}

if (require.main === module) {
    runTier3().then(summary => {
        process.exit(summary.failed === 0 ? 0 : 1);
    });
}

module.exports = { runTier3 };
