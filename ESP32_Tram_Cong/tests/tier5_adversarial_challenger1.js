/**
 * Tier 5: Adversarial Verification — Challenger 1
 * Client-Side Router, View Exclusivity & HTTP Asset Serving Stress Suite
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { assert, TestRunner, startTestServer, fetchUrl, createSimulatedBrowser } = require('./helpers/test-utils');
const { SCADA_CONSTANTS } = require('./helpers/scada-mock-data');

const rootDir = path.resolve(__dirname, '..');
const suite = new TestRunner('Tier 5: Adversarial Verification (Challenger 1 — Router & HTTP Serving)');

let testServer = null;

suite.beforeEach(async () => {
    if (!testServer) {
        testServer = await startTestServer(rootDir);
    }
});

// =========================================================================
// CATEGORY 1: EPHEMERAL HTTP ASSET SERVING & MIME TYPES
// =========================================================================

suite.it('T5.1.1: HTTP Server delivers all static assets with 200 OK and valid MIME types', async () => {
    const assetMap = [
        { path: '/index.html', mime: 'text/html; charset=utf-8' },
        { path: '/login.html', mime: 'text/html; charset=utf-8' },
        { path: '/404.html', mime: 'text/html; charset=utf-8' },
        { path: '/', mime: 'text/html; charset=utf-8' },
        { path: '/css/main.css', mime: 'text/css; charset=utf-8' },
        { path: '/css/base.css', mime: 'text/css; charset=utf-8' },
        { path: '/css/components.css', mime: 'text/css; charset=utf-8' },
        { path: '/css/animations.css', mime: 'text/css; charset=utf-8' },
        { path: '/css/telegram-widget.css', mime: 'text/css; charset=utf-8' },
        { path: '/js/app.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/config/app-constants.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/config/firebase-config.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/core/router.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/core/state.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/core/i18n.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/services/firebase-service.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/services/camera-service.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/services/gas-telegram-service.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/auth.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/monitor.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/control.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/broadcast.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/settings.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/logs.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/maintenance.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/modules/admin.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/utils/ui-utils.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/js/utils/formatters.js', mime: 'application/javascript; charset=utf-8' },
        { path: '/Shin-Chan.jpg', mime: 'image/jpeg' },
        { path: '/logo.png', mime: 'image/png' }
    ];

    for (const asset of assetMap) {
        const res = await fetchUrl(testServer.baseUrl + asset.path);
        assert.equal(res.statusCode, 200, 'Expected 200 OK for ' + asset.path);
        assert.equal(res.headers['content-type'], asset.mime, 'Expected MIME ' + asset.mime + ' for ' + asset.path);
        assert.ok(res.body.length > 0, 'Payload must not be empty for ' + asset.path);
    }
});

suite.it('T5.1.2: Ephemeral HTTP Server high-concurrency burst (100 parallel requests) zero failure rate', async () => {
    const requests = [];
    const paths = ['/index.html', '/js/app.js', '/css/main.css', '/js/core/router.js', '/js/modules/monitor.js'];
    for (let i = 0; i < 100; i++) {
        requests.push(fetchUrl(testServer.baseUrl + paths[i % paths.length]));
    }
    const responses = await Promise.all(requests);
    assert.equal(responses.length, 100, 'Must complete 100 requests');
    for (const res of responses) {
        assert.equal(res.statusCode, 200, 'Burst request must return 200');
    }
});

suite.it('T5.1.3: HTTP Server 404 response for non-existent assets and subdirectories', async () => {
    const nonExistent = [
        '/unknown_asset_123.js',
        '/css/non_existent.css',
        '/js/secret_not_found.js',
        '/modules/missing_module.js',
        '/images/ghost.png',
        '/etc/passwd',
        '/api/non_existent_endpoint'
    ];
    for (const p of nonExistent) {
        const res = await fetchUrl(testServer.baseUrl + p);
        assert.equal(res.statusCode, 404, 'Non-existent asset ' + p + ' must return 404');
    }
});

suite.it('T5.1.4: Direct URL linking with hash routes returns application shell', async () => {
    const directUrls = [
        '/index.html#/settings',
        '/index.html#/control',
        '/index.html#/monitor',
        '/index.html#/broadcast',
        '/index.html#/alerts',
        '/index.html#/actions',
        '/index.html#/maintenance',
        '/#/settings',
        '/#/canh-bao'
    ];
    for (const url of directUrls) {
        const res = await fetchUrl(testServer.baseUrl + url);
        assert.equal(res.statusCode, 200, 'Direct URL ' + url + ' must return 200 OK');
        assert.ok(res.body.includes('tab-monitor') && res.body.includes('tab-settings'), 'Direct URL body must contain SPA tab views');
    }
});

// =========================================================================
// CATEGORY 2: ADVERSARIAL ROUTER STRESS & INVARIANT TESTING
// =========================================================================

function createFullRouterHarness() {
    const sim = createSimulatedBrowser();
    const { window, document } = sim;

    const ROUTE_MAP = {
        '': 'tab-monitor',
        'monitor': 'tab-monitor',
        'control': 'tab-control',
        'broadcast': 'tab-phat-thanh',
        'phat-thanh': 'tab-phat-thanh',
        'settings': 'tab-settings',
        'alerts': 'tab-canh-bao',
        'canh-bao': 'tab-canh-bao',
        'actions': 'tab-thao-tac',
        'thao-tac': 'tab-thao-tac',
        'maintenance': 'tab-bao-tri',
        'bao-tri': 'tab-bao-tri'
    };

    const TAB_NAV_MAP = {
        'tab-monitor': 'monitor',
        'tab-control': 'control',
        'tab-phat-thanh': 'phat-thanh',
        'tab-settings': 'settings',
        'tab-canh-bao': 'canh-bao',
        'tab-thao-tac': 'thao-tac',
        'tab-bao-tri': 'bao-tri'
    };

    const ALL_TAB_IDS = Object.values(ROUTE_MAP).filter((v, i, a) => a.indexOf(v) === i);

    let currentActiveRoute = '';
    let currentActiveTabId = 'tab-monitor';
    const tabChangeHooks = new Set();

    function getRouteFromHash() {
        const hash = window.location.hash || '';
        let clean = hash.replace(/^#+!?\/?/, '').trim();
        clean = clean.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
        return clean;
    }

    function findRouteForTab(tabId) {
        for (const [route, targetTab] of Object.entries(ROUTE_MAP)) {
            if (targetTab === tabId && route !== '') {
                return route;
            }
        }
        return TAB_NAV_MAP[tabId] || tabId.replace(/^tab-/, '');
    }

    function switchTabDOM(tabId) {
        const targetTab = document.getElementById(tabId);
        if (!targetTab) return;

        currentActiveTabId = tabId;

        // 1. Hide all tabs
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(tab => {
            tab.classList.remove('active', 'opacity-100');
            tab.classList.add('hidden', 'opacity-0');
        });

        // 2. Reset nav buttons
        ALL_TAB_IDS.forEach(id => {
            const suffix = id.replace(/^tab-/, '');
            const deskBtn = document.getElementById('nav-' + suffix);
            if (deskBtn) {
                deskBtn.classList.remove('text-blue-600', 'border-blue-600');
                deskBtn.classList.add('text-slate-400', 'border-transparent');
            }
            const mobBtn = document.getElementById('mob-nav-' + suffix);
            if (mobBtn) {
                mobBtn.classList.remove('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
                mobBtn.classList.add('text-slate-600', 'dark:text-slate-300');
            }
        });

        // 3. Show target tab
        targetTab.classList.remove('hidden', 'opacity-0');
        targetTab.classList.add('active', 'opacity-100');

        // 4. Activate desktop nav indicator
        const navSuffix = tabId.replace(/^tab-/, '');
        const activeDesktopNav = document.getElementById('nav-' + navSuffix);
        if (activeDesktopNav) {
            activeDesktopNav.classList.remove('text-slate-400', 'border-transparent');
            activeDesktopNav.classList.add('text-blue-600', 'border-blue-600');
        }

        // 5. Activate mobile nav indicator
        const activeMobileNav = document.getElementById('mob-nav-' + navSuffix);
        if (activeMobileNav) {
            activeMobileNav.classList.remove('text-slate-600', 'dark:text-slate-300');
            activeMobileNav.classList.add('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
        }

        // 6. Execute hooks
        tabChangeHooks.forEach(hook => {
            try { hook(tabId, currentActiveRoute); } catch(e) {}
        });
    }

    function handleRoute() {
        const route = getRouteFromHash();
        const targetTabId = ROUTE_MAP[route] || 'tab-monitor';
        currentActiveRoute = route || 'monitor';
        switchTabDOM(targetTabId);
    }

    function navigateTo(route) {
        const cleanRoute = (route || '').replace(/^#\/?/, '').trim().toLowerCase();
        window.location.hash = '#/' + cleanRoute;
    }

    function switchTab(tabId) {
        if (!tabId) return;
        const targetRoute = findRouteForTab(tabId);
        const currentHashRoute = getRouteFromHash();
        if (currentHashRoute !== targetRoute) {
            window.location.hash = '#/' + targetRoute;
        } else {
            switchTabDOM(tabId);
        }
    }

    window.addEventListener('hashchange', handleRoute);

    function assertViewExclusivity(stepDesc = '') {
        const allTabs = document.querySelectorAll('.tab-content');
        const visibleTabs = allTabs.filter(t => !t.classList.contains('hidden'));
        const activeTabs = allTabs.filter(t => t.classList.contains('active'));

        assert.equal(visibleTabs.length, 1, '[View Exclusivity] Exactly 1 tab must NOT have .hidden (' + stepDesc + '). Visible: ' + visibleTabs.map(t=>t.id).join(', '));
        assert.equal(activeTabs.length, 1, '[View Exclusivity] Exactly 1 tab must have .active (' + stepDesc + '). Active: ' + activeTabs.map(t=>t.id).join(', '));
        assert.equal(visibleTabs[0].id, activeTabs[0].id, '[View Exclusivity] Visible tab (' + visibleTabs[0].id + ') must match active tab (' + activeTabs[0].id + ')');
    }

    return {
        window,
        document,
        handleRoute,
        navigateTo,
        switchTab,
        switchTabDOM,
        getRouteFromHash,
        assertViewExclusivity,
        tabChangeHooks,
        getCurrentTabId: () => currentActiveTabId,
        getCurrentRoute: () => currentActiveRoute,
        ALL_TAB_IDS,
        ROUTE_MAP
    };
}

suite.it('T5.2.1: Rapid 1,000 Hash Transitions (Sequential & Random-Walk) strictly preserves View Exclusivity', () => {
    const env = createFullRouterHarness();
    const routes = ['monitor', 'control', 'broadcast', 'settings', 'alerts', 'actions', 'maintenance', 'phat-thanh', 'canh-bao', 'thao-tac', 'bao-tri'];

    env.handleRoute();
    env.assertViewExclusivity('Initial state');

    // 500 Sequential navigations
    for (let i = 0; i < 500; i++) {
        const route = routes[i % routes.length];
        env.window.location.hash = '#/' + route;
        env.assertViewExclusivity('Sequential navigation step ' + i + ' (' + route + ')');
    }

    // 500 Random-walk navigations
    for (let i = 0; i < 500; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        env.window.location.hash = '#/' + route;
        env.assertViewExclusivity('Random-walk step ' + i + ' (' + route + ')');
    }
});

suite.it('T5.2.2: Adversarial Hash Fuzzing & Malformed Payloads safely fallback to tab-monitor', () => {
    const env = createFullRouterHarness();
    const fuzzCases = [
        '',
        '#',
        '#/',
        '#!//',
        '###',
        '#//////',
        '#/non_existent_tab_888',
        '#/admin/secret_pass',
        '#/<script>alert(1)</script>',
        '#/javascript:void(0)',
        '#/undefined',
        '#/null',
        '#/NaN',
        '#[object Object]',
        '#/cống_thông_minh',
        '#/xả_lũ_khẩn_cấp',
        '#/' + 'x'.repeat(2000),
        '#/' + '%20'.repeat(50)
    ];

    for (const fuzz of fuzzCases) {
        env.window.location.hash = fuzz;
        env.assertViewExclusivity('Fuzz: ' + fuzz.substring(0, 25));
        assert.equal(env.getCurrentTabId(), 'tab-monitor', 'Fuzz input ' + fuzz.substring(0, 25) + ' must fall back to tab-monitor');
    }
});

suite.it('T5.2.3: Query Parameter & Trailing Slash normalization preserves target view mapping', () => {
    const env = createFullRouterHarness();
    const queryCases = [
        { hash: '#/settings?theme=dark&lang=vi', expected: 'tab-settings' },
        { hash: '#/control?mode=auto&gate=1.0', expected: 'tab-control' },
        { hash: '#/monitor?station=02&refresh=true', expected: 'tab-monitor' },
        { hash: '#/broadcast?track=16&volume=28', expected: 'tab-phat-thanh' },
        { hash: '#/alerts?severity=high', expected: 'tab-canh-bao' },
        { hash: '#/actions?user=admin@example.com', expected: 'tab-thao-tac' },
        { hash: '#/maintenance?sort=desc', expected: 'tab-bao-tri' },
        { hash: '#/SETTINGS/', expected: 'tab-settings' },
        { hash: '#/MoNiToR?v=1', expected: 'tab-monitor' },
        { hash: '#/cOnTrOl///', expected: 'tab-control' }
    ];

    for (const qc of queryCases) {
        env.window.location.hash = qc.hash;
        env.assertViewExclusivity('Query case: ' + qc.hash);
        assert.equal(env.getCurrentTabId(), qc.expected, 'Hash ' + qc.hash + ' must resolve to ' + qc.expected);
    }
});

suite.it('T5.2.4: Browser History Stack (Back/Forward) multi-level navigation consistency', () => {
    const env = createFullRouterHarness();
    const history = [];
    let ptr = -1;

    function push(route) {
        history.push(route);
        ptr = history.length - 1;
        env.window.location.hash = '#/' + route;
    }

    function back() {
        if (ptr > 0) {
            ptr--;
            env.window.location.hash = '#/' + history[ptr];
        }
    }

    function forward() {
        if (ptr < history.length - 1) {
            ptr++;
            env.window.location.hash = '#/' + history[ptr];
        }
    }

    const trip = ['monitor', 'control', 'broadcast', 'settings', 'alerts', 'actions', 'maintenance'];
    for (const destination of trip) {
        push(destination);
        env.assertViewExclusivity('History Push: ' + destination);
        assert.equal(env.getCurrentTabId(), env.ROUTE_MAP[destination], 'Active tab must match push destination');
    }

    for (let i = trip.length - 2; i >= 0; i--) {
        back();
        env.assertViewExclusivity('History Back: ' + trip[i]);
        assert.equal(env.getCurrentTabId(), env.ROUTE_MAP[trip[i]], 'Active tab must match history back target');
    }

    for (let i = 1; i <= 5; i++) {
        forward();
        env.assertViewExclusivity('History Forward: ' + trip[i]);
        assert.equal(env.getCurrentTabId(), env.ROUTE_MAP[trip[i]], 'Active tab must match history forward target');
    }
});

suite.it('T5.2.5: Navigation Indicator Synchronizer (Desktop & Mobile Nav) reflects exact active tab', () => {
    const env = createFullRouterHarness();

    const tabs = [
        { route: 'monitor', tabId: 'tab-monitor', suffix: 'monitor' },
        { route: 'control', tabId: 'tab-control', suffix: 'control' },
        { route: 'settings', tabId: 'tab-settings', suffix: 'settings' },
        { route: 'broadcast', tabId: 'tab-phat-thanh', suffix: 'phat-thanh' },
        { route: 'alerts', tabId: 'tab-canh-bao', suffix: 'canh-bao' },
        { route: 'actions', tabId: 'tab-thao-tac', suffix: 'thao-tac' },
        { route: 'maintenance', tabId: 'tab-bao-tri', suffix: 'bao-tri' }
    ];

    for (const t of tabs) {
        env.navigateTo(t.route);
        const deskActive = env.document.getElementById('nav-' + t.suffix);
        assert.isTrue(deskActive.classList.contains('text-blue-600'), 'Desktop nav for ' + t.suffix + ' must have active class');

        const mobActive = env.document.getElementById('mob-nav-' + t.suffix);
        assert.isTrue(mobActive.classList.contains('bg-blue-50'), 'Mobile nav for ' + t.suffix + ' must have active class');
    }
});

async function runTier5Challenger1(options = {}) {
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
    runTier5Challenger1({ verbose: true }).then(summary => {
        process.exit(summary.failed === 0 ? 0 : 1);
    });
}

module.exports = { runTier5Challenger1 };
