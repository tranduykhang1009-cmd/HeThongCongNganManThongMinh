/**
 * @file state.js
 * @description Centralized reactive application state store with event-driven subscriber pattern.
 * @module core/state
 */

/**
 * Global reactive application state
 */
const appState = {
    // Merged live telemetry and sensor values
    dataCache: {},

    // Raw node-partitioned snapshots from Firebase RTDB
    localDbData: {
        tram_phao: {},
        control: {},
        dieu_khien: {},
        tram_cong: {},
        nang_luong: {}
    },

    // Node heartbeat tracking state
    hbTracker: {
        phao: { lastVal: null, lastTime: 0, isOnline: false },
        cong: { lastVal: null, lastTime: 0, isOnline: false }
    },

    // Pagination, search, and filter states for tabular logs
    tableState: {
        alert: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
        action: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
        maint: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] }
    },

    // UI input lock trackers during async saving
    saveLocks: {},

    // Active project namespace prefix (e.g. "" for Project 1, "/tram_02" for Project 2)
    currentProjectPrefix: "",

    // Current user SCADA admin authorization flag
    isScadaAdmin: false,

    // Parsed operation logs from Firebase RTDB (nhat_ky)
    allFirebaseLogs: [],

    // In-memory client incident alerts buffer (up to 50 items)
    alertsLog: [],

    // Maintenance countdown metadata
    langMaintenanceData: {
        last_maintenance_timestamp: Date.now(),
        interval_ms: 30 * 24 * 60 * 60 * 1000,
        interval_days: 30
    },

    // Admin dashboard user directory
    allAdminUsers: [],

    // Admin table pagination and filtering
    adminTableState: {
        currentPage: 1,
        itemsPerPage: 10,
        sortCol: 'login',
        sortOrder: 'desc',
        filterValue: 'all',
        filterLabel: 'Tất cả',
        openActionMenuUid: null
    },

    // ESP32-CAM stream and controls state
    cameraState: {
        isConnected: false,
        isConnecting: false,
        vFlip: false,
        hFlip: false,
        manuallyStopped: false,
        streamUrl: ''
    }
};

/**
 * Event-driven subscriber callback registry
 * Map<string, Set<Function>>
 */
const subscribers = new Map();

/**
 * Subscribe to state changes for a specific key or '*' for all changes.
 * @param {string} key - State key to observe or '*'
 * @param {Function} callback - Callback function receiving (newValue, oldValue, key)
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeState(key, callback) {
    if (typeof callback !== 'function') {
        throw new TypeError('State subscriber callback must be a function.');
    }
    if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
    }
    subscribers.get(key).add(callback);

    return () => {
        const set = subscribers.get(key);
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                subscribers.delete(key);
            }
        }
    };
}

/**
 * Retrieve the current value of a state property.
 * @param {string} [key] - State key. If omitted, returns a shallow copy of full state.
 * @returns {*} Current state value
 */
export function getState(key) {
    if (!key) return { ...appState };
    return appState[key];
}

/**
 * Update a state property and notify all registered subscribers.
 * @param {string} key - State property name
 * @param {*} value - New state value
 */
export function updateState(key, value) {
    const oldValue = appState[key];
    appState[key] = value;

    // Sync to window globals for backward compatibility
    syncToWindow(key, value);

    // Notify key-specific listeners
    if (subscribers.has(key)) {
        subscribers.get(key).forEach(cb => {
            try {
                cb(value, oldValue, key);
            } catch (err) {
                console.error(`[State Error] Subscriber error on key "${key}":`, err);
            }
        });
    }

    // Notify wildcard global listeners
    if (subscribers.has('*')) {
        subscribers.get('*').forEach(cb => {
            try {
                cb(value, oldValue, key);
            } catch (err) {
                console.error(`[State Error] Global subscriber error on key "${key}":`, err);
            }
        });
    }
}

/**
 * Helper to shallow-merge an object into an existing state property.
 * @param {string} key - State property name
 * @param {Object} partial - Partial object to merge
 */
export function mergeState(key, partial) {
    if (typeof partial !== 'object' || partial === null) {
        updateState(key, partial);
        return;
    }
    const current = appState[key] || {};
    const merged = Array.isArray(current)
        ? [...(Array.isArray(partial) ? partial : current)]
        : { ...current, ...partial };
    updateState(key, merged);
}

/**
 * Synchronize state changes to window properties for seamless backward compatibility.
 * @param {string} key
 * @param {*} val
 */
function syncToWindow(key, val) {
    if (typeof window === 'undefined') return;

    switch (key) {
        case 'isScadaAdmin':
            window.isScadaAdmin = val;
            break;
        case 'tableState':
            window.tableState = val;
            break;
        case 'saveLocks':
            window.saveLocks = val;
            break;
        case 'hbTracker':
            window.hbTracker = val;
            break;
        case 'allFirebaseLogs':
            window.allFirebaseLogs = val;
            break;
        case 'langMaintenanceData':
            window.langMaintenanceData = val;
            break;
        case 'dataCache':
            window.dataCache = val;
            break;
        case 'localDbData':
            window.localDbData = val;
            break;
        default:
            break;
    }
}

// Initial binding to window
if (typeof window !== 'undefined') {
    window.appState = appState;
    window.getState = getState;
    window.updateState = updateState;
    window.subscribeState = subscribeState;

    window.isScadaAdmin = appState.isScadaAdmin;
    window.tableState = appState.tableState;
    window.saveLocks = appState.saveLocks;
    window.hbTracker = appState.hbTracker;
    window.allFirebaseLogs = appState.allFirebaseLogs;
    window.langMaintenanceData = appState.langMaintenanceData;
    window.dataCache = appState.dataCache;
    window.localDbData = appState.localDbData;
}

export default {
    getState,
    updateState,
    mergeState,
    subscribeState
};
