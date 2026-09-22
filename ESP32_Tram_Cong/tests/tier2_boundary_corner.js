/**
 * Tier 2: Boundary & Corner Cases Test
 * 
 * Verifications:
 * 1. Missing hash fallback: empty string "", "#", "#/", "#!/" gracefully routes to default "#/monitor".
 * 2. Invalid routes: unknown or non-existent hash paths fall back to default or 404 handler without crashing.
 * 3. Edge-case URL parameters: extracts query parameters and normalizes encoded characters.
 * 4. Empty and corrupted state resilience: handles null, undefined, empty objects, missing telemetry fields safely.
 * 5. Sensor mathematical boundaries: clamps negative values, handles extreme values and NaN without throwing.
 * 6. Table pagination & filter boundaries: handles page 0, negative page numbers, out-of-bounds pages, and empty queries.
 */

const path = require('path');
const fs = require('fs');
const { assert, TestRunner, createSimulatedBrowser } = require('./helpers/test-utils');
const { SCADA_CONSTANTS, MOCK_TELEMETRY } = require('./helpers/scada-mock-data');

const suite = new TestRunner('Tier 2: Boundary & Corner Cases');

/**
 * Universal Router Specification Engine
 * Implements and validates the router contract defined in PROJECT.md
 */
class RouterContract {
    constructor(routes = SCADA_CONSTANTS.REQUIRED_ROUTES, defaultRoute = 'monitor') {
        this.routes = new Set(routes);
        this.defaultRoute = defaultRoute;
        this.currentRoute = defaultRoute;
        this.currentParams = {};
        
        // Route aliases for backward compatibility
        this.aliases = {
            'phat-thanh': 'broadcast',
            'canh-bao': 'alerts',
            'thao-tac': 'actions',
            'bao-tri': 'maintenance'
        };
    }

    parseHash(hash) {
        if (!hash || typeof hash !== 'string') {
            return { route: this.defaultRoute, params: {} };
        }

        // Clean leading hashes and slashes: "", "#", "#/", "#!/", "###", "##/"
        let clean = hash.replace(/^#+!?\/?/, '').trim();
        
        // Remove trailing slashes
        clean = clean.replace(/\/+$/, '');

        if (!clean) {
            return { route: this.defaultRoute, params: {} };
        }

        // Parse query string if present
        let [routePart, queryPart] = clean.split('?');
        routePart = decodeURIComponent(routePart).trim().toLowerCase();

        // Handle path slashes (e.g. "monitor/overview" -> "monitor")
        const primarySegment = routePart.split('/')[0];

        // Resolve aliases
        const resolvedRoute = this.aliases[primarySegment] || primarySegment;

        const params = {};
        if (queryPart) {
            const pairs = queryPart.split('&');
            for (const pair of pairs) {
                if (!pair) continue;
                const [k, v] = pair.split('=');
                if (k) {
                    params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : true;
                }
            }
        }

        // Route existence check
        const finalRoute = this.routes.has(resolvedRoute) ? resolvedRoute : this.defaultRoute;
        return { route: finalRoute, params, rawRoute: routePart };
    }

    navigate(hash, windowObj = null) {
        const { route, params } = this.parseHash(hash);
        this.currentRoute = route;
        this.currentParams = params;

        if (windowObj && windowObj.document) {
            // Update DOM tab visibility
            const tabs = windowObj.document.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.classList.add('hidden');
                tab.classList.remove('active');
            });

            // Target tab can be tab-{route} or tab-{alias}
            let activeTab = windowObj.document.getElementById(`tab-${route}`);
            if (!activeTab) {
                // Check reverse alias (e.g. alerts -> canh-bao)
                for (const [alias, canonical] of Object.entries(this.aliases)) {
                    if (canonical === route) {
                        activeTab = windowObj.document.getElementById(`tab-${alias}`);
                        if (activeTab) break;
                    }
                }
            }

            if (activeTab) {
                activeTab.classList.remove('hidden');
                activeTab.classList.add('active');
            }
        }

        return { route, params };
    }
}

/**
 * SCADA Data Fusion Engine Specification Contract
 */
function processAndMergeDataContract(data, settings = {}) {
    const safeData = data || {};
    const safeSettings = settings || {};

    const phao = safeData.tram_phao || {};
    const cong = safeData.tram_cong || {};
    const dk = safeData.dieu_khien || {};

    // Calibrations with fallbacks
    const calibSalinity = Number(safeSettings.calib_salinity) || 0;
    const calibIn = Number(safeSettings.calib_in) || 0;
    const calibOut = Number(safeSettings.calib_out) || 0;

    // Raw readings with NaN guards
    const rawSalinity = Number(phao.do_man) || 0;
    const rawTemp = Number(phao.nhiet_do) || 0;
    const rawWaterIn = Number(cong.muc_nuoc_trong) || 0;
    const rawWaterOut = Number(cong.muc_nuoc_ngoai) || 0;
    const rawMotorCurrent = Number(cong.dong_dien_dong_co) || 0;

    // Apply calibrations and clamp non-physical negatives
    const salinity = Math.max(0, parseFloat((rawSalinity + calibSalinity).toFixed(2)));
    const temp = parseFloat(rawTemp.toFixed(1));
    const waterIn = Math.max(0, parseFloat((rawWaterIn + calibIn).toFixed(1)));
    const waterOut = Math.max(0, parseFloat((rawWaterOut + calibOut).toFixed(1)));
    const motorCurrent = Math.max(0, parseFloat(rawMotorCurrent.toFixed(2)));

    // Hydraulic Differential: ΔH = |outer - inner|
    const deltaH = parseFloat(Math.abs(waterOut - waterIn).toFixed(1));
    const diffAlertThreshold = Number(safeSettings.diff_alert_threshold) || SCADA_CONSTANTS.APP_CONSTANTS.DIFF_ALERT_THRESHOLD_CM;
    const isDiffAlert = deltaH > diffAlertThreshold;

    // Node Heartbeat staleness detection (20s)
    const now = Date.now();
    const timeoutMs = SCADA_CONSTANTS.APP_CONSTANTS.HEARTBEAT_TIMEOUT_MS;
    const phaoTimestamp = Number(phao.thoi_gian) || 0;
    const congTimestamp = Number(cong.thoi_gian) || 0;

    const isPhaoOnline = phaoTimestamp > 0 && (now - phaoTimestamp <= timeoutMs);
    const isCongOnline = congTimestamp > 0 && (now - congTimestamp <= timeoutMs);

    // Motor Stall Detection
    const stallThreshold = Number(safeSettings.nguong_dong_ket) || SCADA_CONSTANTS.APP_CONSTANTS.DEFAULT_STALL_CURRENT_A;
    const isMotorStall = motorCurrent > stallThreshold;

    return {
        salinity,
        temp,
        waterIn,
        waterOut,
        deltaH,
        isDiffAlert,
        motorCurrent,
        isMotorStall,
        gatePosition: Number(dk.cua_cong) || 0.0,
        isAutoMode: dk.che_do === 1,
        isEmergency: !!dk.dung_khan_cap,
        isLockPhysical: !!dk.khoa_nut_vat_ly,
        hb: {
            phao: { isOnline: isPhaoOnline, lastSeen: phaoTimestamp },
            cong: { isOnline: isCongOnline, lastSeen: congTimestamp }
        }
    };
}

/**
 * Table Pagination Boundary Filter Helper
 */
function paginateItems(items = [], page = 1, pageSize = 10, searchQuery = '', searchKeys = ['thaoTac', 'chiTiet']) {
    let list = Array.isArray(items) ? [...items] : [];

    // Filter by search query
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(item => {
            return searchKeys.some(key => {
                const val = item[key];
                return val && String(val).toLowerCase().includes(q);
            });
        });
    }

    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Clamp page to valid boundary [1, totalPages]
    const validPage = Math.max(1, Math.min(Math.floor(Number(page) || 1), totalPages));

    const startIndex = (validPage - 1) * pageSize;
    const pageItems = list.slice(startIndex, startIndex + pageSize);

    return {
        items: pageItems,
        page: validPage,
        pageSize,
        totalItems,
        totalPages
    };
}

// ----------------------------------------------------
// TIER 2 TESTS
// ----------------------------------------------------

// 1. Missing Hash Fallback
suite.it('T2.1: Missing or empty hash falls back to default route (#/monitor)', () => {
    const router = new RouterContract();

    const emptyCases = ['', '#', '#/', '#!/', '###', '#///', null, undefined];
    for (const testHash of emptyCases) {
        const result = router.parseHash(testHash);
        assert.equal(result.route, 'monitor', `Expected hash "${testHash}" to fall back to 'monitor'`);
    }
});

// 2. Invalid & Malformed Route Fallback
suite.it('T2.2: Invalid and unknown routes gracefully fall back to default route without crash', () => {
    const router = new RouterContract();

    const invalidRoutes = [
        '#/non-existent-tab',
        '#/unknown-route-12345',
        '#/../../etc/passwd',
        '#/<script>alert(1)</script>',
        '#/dashboard/nested/sub/sub',
        '#/404'
    ];

    for (const testHash of invalidRoutes) {
        const result = router.parseHash(testHash);
        assert.equal(result.route, 'monitor', `Expected invalid route "${testHash}" to safely resolve to 'monitor'`);
    }
});

// 3. Query Parameter Extraction & Special Characters
suite.it('T2.3: URL query parameters are extracted cleanly from hash routes', () => {
    const router = new RouterContract();

    const res1 = router.parseHash('#/monitor?lang=vi&theme=dark&debug=true');
    assert.equal(res1.route, 'monitor');
    assert.equal(res1.params.lang, 'vi');
    assert.equal(res1.params.theme, 'dark');
    assert.equal(res1.params.debug, 'true');

    const res2 = router.parseHash('#/settings?section=calibration&offset=0.5');
    assert.equal(res2.route, 'settings');
    assert.equal(res2.params.section, 'calibration');
    assert.equal(res2.params.offset, '0.5');

    // Route with URL-encoded characters
    const res3 = router.parseHash('#/alerts?q=C%E1%BA%A3nh%20b%C3%A1o');
    assert.equal(res3.route, 'alerts');
    assert.equal(res3.params.q, 'Cảnh báo');
});

// 4. Backward Compatibility Route Aliases
suite.it('T2.4: Backward compatible route aliases resolve correctly', () => {
    const router = new RouterContract();

    assert.equal(router.parseHash('#/phat-thanh').route, 'broadcast');
    assert.equal(router.parseHash('#/canh-bao').route, 'alerts');
    assert.equal(router.parseHash('#/thao-tac').route, 'actions');
    assert.equal(router.parseHash('#/bao-tri').route, 'maintenance');
});

// 5. Empty State & Corrupted Telemetry Resilience
suite.it('T2.5: Data fusion engine handles null, undefined, empty state without throwing', () => {
    assert.doesNotThrow(() => {
        const emptyResult = processAndMergeDataContract(null, null);
        assert.equal(emptyResult.salinity, 0);
        assert.equal(emptyResult.deltaH, 0);
        assert.equal(emptyResult.motorCurrent, 0);
        assert.equal(emptyResult.isDiffAlert, false);
        assert.equal(emptyResult.isMotorStall, false);
        assert.equal(emptyResult.hb.phao.isOnline, false);
        assert.equal(emptyResult.hb.cong.isOnline, false);
    }, 'Empty state must not throw');

    assert.doesNotThrow(() => {
        const partialData = {
            tram_phao: { do_man: 'not_a_number', nhiet_do: null },
            tram_cong: { muc_nuoc_trong: undefined, muc_nuoc_ngoai: NaN }
        };
        const res = processAndMergeDataContract(partialData);
        assert.equal(res.salinity, 0);
        assert.equal(res.temp, 0);
        assert.equal(res.waterIn, 0);
        assert.equal(res.waterOut, 0);
        assert.equal(res.deltaH, 0);
    }, 'Corrupted data types must be safely sanitized');
});

// 6. Sensor Mathematical Boundaries & Clamping
suite.it('T2.6: Sensor calculations apply correct clamping and differential alerting', () => {
    // Normal readings with ΔH > 5cm
    const data = {
        tram_cong: { muc_nuoc_ngoai: 150.0, muc_nuoc_trong: 120.0, dong_dien_dong_co: 2.1 }
    };
    const res = processAndMergeDataContract(data);
    assert.equal(res.deltaH, 30.0, 'ΔH should equal |150 - 120| = 30.0');
    assert.equal(res.isDiffAlert, true, 'ΔH of 30.0cm must trigger diff alert (> 5cm)');

    // Negative raw salinity with negative offset clamped to 0
    const negData = {
        tram_phao: { do_man: -5.0 }
    };
    const negRes = processAndMergeDataContract(negData, { calib_salinity: -2.0 });
    assert.equal(negRes.salinity, 0.0, 'Salinity cannot be negative and must be clamped to 0.0');

    // Motor Stall Current Boundary
    const stallData = {
        tram_cong: { dong_dien_dong_co: 5.2 }
    };
    const stallRes = processAndMergeDataContract(stallData, { nguong_dong_ket: 4.5 });
    assert.equal(stallRes.isMotorStall, true, 'Current of 5.2A must trigger stall alert (> 4.5A)');
});

// 7. Table Pagination & Filter Boundaries
suite.it('T2.7: Table pagination clamps negative pages, out-of-bound pages, and handles empty datasets', () => {
    const sampleItems = [
        { thaoTac: 'Đóng cống', chiTiet: 'Thủ công', time: 1000 },
        { thaoTac: 'Mở cống', chiTiet: 'Tự động', time: 2000 },
        { thaoTac: 'Dừng khẩn cấp', chiTiet: 'Báo động', time: 3000 }
    ];

    // Page < 1 clamps to 1
    const p1 = paginateItems(sampleItems, -5, 2);
    assert.equal(p1.page, 1);
    assert.equal(p1.items.length, 2);

    // Page > totalPages clamps to totalPages
    const p2 = paginateItems(sampleItems, 999, 2);
    assert.equal(p2.page, 2);
    assert.equal(p2.items.length, 1);

    // Empty dataset returns 1 page with 0 items
    const p3 = paginateItems([], 1, 10);
    assert.equal(p3.page, 1);
    assert.equal(p3.totalItems, 0);
    assert.equal(p3.items.length, 0);

    // Search query filter
    const p4 = paginateItems(sampleItems, 1, 10, 'khẩn cấp');
    assert.equal(p4.totalItems, 1);
    assert.equal(p4.items[0].thaoTac, 'Dừng khẩn cấp');
});

// Export runner function
async function runTier2(options = {}) {
    return await suite.run(options);
}

if (require.main === module) {
    runTier2().then(summary => {
        process.exit(summary.failed === 0 ? 0 : 1);
    });
}

module.exports = { runTier2, RouterContract, processAndMergeDataContract, paginateItems };
