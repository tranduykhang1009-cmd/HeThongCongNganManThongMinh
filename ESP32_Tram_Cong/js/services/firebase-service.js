/**
 * @file firebase-service.js
 * @description Realtime Database subscriptions, data fusion algorithm, heartbeat tracking, and write utilities.
 * @module services/firebase-service
 */

import {
    DB_BASE_URL,
    DB_AUTH,
    DEFAULT_THRESHOLDS,
    TIMING
} from '../config/app-constants.js';

import {
    db,
    ref,
    set,
    get,
    push,
    remove,
    update,
    onValue,
    serverTimestamp,
    onDisconnect,
    query,
    limitToLast
} from '../config/firebase-config.js';

import {
    getState,
    updateState,
    mergeState,
    subscribeState
} from '../core/state.js';

import { showToast } from '../utils/ui-utils.js';
import { t } from '../core/i18n.js';

/**
 * Registry for active Firebase RTDB listener unsubscriptions.
 * Map<string, Function>
 */
const activeListeners = new Map();

/**
 * Global timer identifiers
 */
let heartbeatIntervalId = null;
let volumeDebounceTimer = null;
let lastFetchTime = Date.now();

/**
 * Get current project namespace prefix (e.g. "" or "/tram_02")
 * @returns {string}
 */
export function getProjectPrefix() {
    const statePrefix = getState('currentProjectPrefix');
    if (typeof statePrefix === 'string') return statePrefix;
    if (typeof window !== 'undefined' && typeof window.currentProjectPrefix === 'string') {
        return window.currentProjectPrefix;
    }
    return '';
}

/**
 * Set and switch the active project prefix, then rebind all RTDB listeners.
 * @param {string} prefix - Project path prefix (e.g. "" or "/tram_02")
 */
export function setProjectPrefix(prefix) {
    const formattedPrefix = prefix ? (prefix.startsWith('/') ? prefix : `/${prefix}`) : '';
    updateState('currentProjectPrefix', formattedPrefix);
    if (typeof window !== 'undefined') {
        window.currentProjectPrefix = formattedPrefix;
    }
    console.log(`[Firebase Service] Project prefix changed to: "${formattedPrefix}"`);
    
    // Re-initialize listeners for the new project prefix
    stopFirebaseListeners();
    initFirebaseListeners();
}

/**
 * Initialize Realtime Database listeners for telemetry and control nodes.
 */
export function initFirebaseListeners() {
    stopFirebaseListeners();

    const prefix = getProjectPrefix();
    const targetNodes = ['tram_phao', 'control', 'dieu_khien', 'tram_cong', 'nang_luong'];

    targetNodes.forEach(nodeName => {
        const fullPath = prefix ? `${prefix.replace(/^\//, '')}/${nodeName}` : nodeName;
        try {
            const nodeRef = ref(db, fullPath);
            const unsubscribe = onValue(nodeRef, (snapshot) => {
                const val = snapshot.val() || {};
                
                // Update localDbData state
                const localData = getState('localDbData') || {};
                localData[nodeName] = val;
                updateState('localDbData', localData);

                // Run data fusion
                processAndMergeData();
            }, (error) => {
                console.error(`[Firebase Service] Error listening to node "${fullPath}":`, error);
                
                const hbTracker = getState('hbTracker') || {
                    phao: { lastVal: null, lastTime: 0, isOnline: false },
                    cong: { lastVal: null, lastTime: 0, isOnline: false }
                };

                if (nodeName === 'tram_phao' && hbTracker.phao) {
                    hbTracker.phao.isOnline = false;
                }
                if (nodeName === 'tram_cong' && hbTracker.cong) {
                    hbTracker.cong.isOnline = false;
                }
                updateState('hbTracker', hbTracker);
                updateConnectionUI();

                const errMsg = typeof t === 'function' ? t('err_firebase_conn') : 'Lỗi kết nối Firebase';
                if (typeof showToast === 'function') {
                    showToast(errMsg, 'error');
                }
            });

            activeListeners.set(nodeName, unsubscribe);
        } catch (err) {
            console.error(`[Firebase Service] Failed to attach listener for "${fullPath}":`, err);
        }
    });

    // Start background heartbeat tracking ticker
    startHeartbeatTracker();
}

/**
 * Stop and unsubscribe all active Realtime Database listeners.
 */
export function stopFirebaseListeners() {
    activeListeners.forEach((unsub, nodeName) => {
        try {
            if (typeof unsub === 'function') {
                unsub();
            }
        } catch (err) {
            console.warn(`[Firebase Service] Error unregistering listener for "${nodeName}":`, err);
        }
    });
    activeListeners.clear();
}

/**
 * Data Fusion Algorithm: Merges partitioned RTDB nodes into unified telemetry,
 * calculates ultrasonic water levels with sensor height, applies calibration offsets,
 * clamps boundary values, and detects online heartbeat transitions.
 * 
 * @returns {Object} The fused dataCache object
 */
export function processAndMergeData() {
    const dbData = getState('localDbData') || {};
    const hbTracker = getState('hbTracker') || {
        phao: { lastVal: null, lastTime: 0, isOnline: false },
        cong: { lastVal: null, lastTime: 0, isOnline: false }
    };

    const merged = {};
    const now = Date.now();
    let bestTs = 0;

    if (dbData.tram_phao) {
        bestTs = Math.max(bestTs, dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0);
    }
    if (dbData.tram_cong) {
        bestTs = Math.max(bestTs, dbData.tram_cong.heartbeatcong ?? dbData.tram_cong.heartbeat ?? 0);
    }
    lastFetchTime = bestTs > 0 ? bestTs : now;

    // 1. DỮ LIỆU TRẠM PHAO (Buoy Station)
    if (dbData.tram_phao) {
        merged.do_man = dbData.tram_phao.do_man ?? dbData.tram_phao.salinity ?? 0;
        merged.temp = dbData.tram_phao.nhiet_do ?? dbData.tram_phao.temp ?? dbData.tram_phao.temperature ?? 0;

        // Bắt nhịp tim trạm phao liên tục trong nền
        merged.heartbeat_phao = dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0;
        if (merged.heartbeat_phao && hbTracker.phao.lastVal !== merged.heartbeat_phao) {
            hbTracker.phao.lastVal = merged.heartbeat_phao;
            hbTracker.phao.lastTime = now;
            if (!hbTracker.phao.isOnline) {
                hbTracker.phao.isOnline = true;
                if (typeof window !== 'undefined') {
                    if (typeof window.pushAlert === 'function') {
                        window.pushAlert("ĐÃ KẾT NỐI LẠI", "Trạm Phao đã khôi phục kết nối thành công.");
                    }
                    if (typeof window.ghiNhatKyTuDong === 'function') {
                        window.ghiNhatKyTuDong("KHÔI PHỤC KẾT NỐI", "Trạm Phao trực tuyến trở lại");
                    }
                }
                updateConnectionUI();
            }
        }

        merged.pin_phan_tram = dbData.tram_phao.pin_phan_tram ?? 0;
        merged.pin_volt = dbData.tram_phao.pin_volt ?? 0;
        merged.solar_cong_suat = dbData.tram_phao.solar_cong_suat ?? 0;
        merged.solar_dong_sac = dbData.tram_phao.solar_dong_sac ?? dbData.tram_phao.solar_current ?? 0;
        merged.solar_volt = dbData.tram_phao.solar_volt ?? 0;
        merged.trang_thai_dem = dbData.tram_phao.trang_thai_dem ?? 0;
    }

    // 2. DỮ LIỆU ĐIỀU KHIỂN & CÀI ĐẶT (Control Node)
    if (dbData.control) {
        merged.mode = dbData.control.mode ?? 0;
        merged.salinity_threshold = dbData.control.salinity_threshold ?? dbData.control.threshold ?? DEFAULT_THRESHOLDS.salinity ?? 0.4;
        merged.flood_threshold = dbData.control.flood_threshold ?? DEFAULT_THRESHOLDS.waterLevel ?? 30;
        merged.stall_threshold = dbData.control.stall_threshold ?? DEFAULT_THRESHOLDS.stallCurrent ?? 700;
        merged.sensor_height = dbData.control.sensor_height ?? DEFAULT_THRESHOLDS.sensorHeight ?? 18;

        merged.emergency_stop = dbData.control.emergency_stop ?? 0;
        merged.panel_unlocked = dbData.control.panel_unlocked ?? 0;
        merged.volume = dbData.control.volume ?? 20;
        merged.khoa_nut_vat_ly = dbData.control.khoa_nut_vat_ly ?? false;
        merged.loop_audio = dbData.control.loop_audio ?? dbData.control.audio_loop ?? 0;
        merged.use_ultrasonic = dbData.control.use_ultrasonic ?? 0;
    }

    // 3. DỮ LIỆU ĐIỀU KHIỂN BỔ SUNG (dieu_khien Node fallback)
    if (dbData.dieu_khien) {
        merged.khoa_nut_vat_ly = dbData.dieu_khien.khoa_nut_vat_ly ?? merged.khoa_nut_vat_ly ?? false;
    }

    // 4. DỮ LIỆU TRẠM CỐNG (Gate Sluice Station)
    if (dbData.tram_cong) {
        const sensorHeight = merged.sensor_height || 18;
        const distIn = dbData.tram_cong.khoang_cach_sieu_am ?? 0;
        const distOut = dbData.tram_cong.khoang_cach_sieu_am_ngoai ?? 0;

        merged.muc_nuoc = distIn > 0 ? Math.max(0, sensorHeight - distIn) : (dbData.tram_cong.muc_nuoc ?? 0);
        merged.sieu_am_ngoai = distOut > 0 ? Math.max(0, sensorHeight - distOut) : 0;
        merged.dong_dien_tho = dbData.tram_cong.dong_dien_tho ?? 0;
        merged.gate_status = dbData.tram_cong.gate_status ?? dbData.tram_cong.servo_state ?? 1;

        // Bắt nhịp tim trạm cống liên tục trong nền
        merged.heartbeat_cong = dbData.tram_cong.heartbeatcong ?? dbData.tram_cong.heartbeat ?? 0;
        if (merged.heartbeat_cong && hbTracker.cong.lastVal !== merged.heartbeat_cong) {
            hbTracker.cong.lastVal = merged.heartbeat_cong;
            hbTracker.cong.lastTime = now;
            if (!hbTracker.cong.isOnline) {
                hbTracker.cong.isOnline = true;
                if (typeof window !== 'undefined') {
                    if (typeof window.pushAlert === 'function') {
                        window.pushAlert("ĐÃ KẾT NỐI LẠI", "Trạm Cống đã khôi phục kết nối thành công. Mở khóa điều khiển.");
                    }
                    if (typeof window.ghiNhatKyTuDong === 'function') {
                        window.ghiNhatKyTuDong("KHÔI PHỤC KẾT NỐI", "Trạm Cống trực tuyến trở lại");
                    }
                }
                updateConnectionUI();
            }
        }

        merged.emergency_ket_cong = dbData.tram_cong.emergency_ket_cong ?? 0;
        merged.cong_dien_ap = dbData.tram_cong.pin_volt ?? dbData.tram_cong.dien_ap ?? 0;
        merged.cong_pin_phan_tram = dbData.tram_cong.pin_phan_tram ?? 0;
        merged.cong_dong_dien = dbData.tram_cong.solar_dong_sac ?? dbData.tram_cong.dong_dien ?? 0;
        merged.cong_cong_suat = dbData.tram_cong.solar_cong_suat ?? dbData.tram_cong.cong_suat ?? 0;
    }

    // 5. DỮ LIỆU NĂNG LƯỢNG MẶT TRỜI (nang_luong Node)
    if (dbData.nang_luong) {
        if (dbData.nang_luong.phao) {
            merged.pin_volt = dbData.nang_luong.phao.pin_volt ?? dbData.nang_luong.phao.dien_ap ?? dbData.nang_luong.phao.v ?? merged.pin_volt;
            merged.pin_phan_tram = dbData.nang_luong.phao.pin_phan_tram ?? dbData.nang_luong.phao.pct ?? merged.pin_phan_tram;
            merged.solar_volt = dbData.nang_luong.phao.solar_volt ?? dbData.nang_luong.phao.solar_v ?? merged.solar_volt;
            merged.solar_dong_sac = dbData.nang_luong.phao.solar_dong_sac ?? dbData.nang_luong.phao.dong_sac ?? dbData.nang_luong.phao.ma ?? merged.solar_dong_sac;
            merged.solar_cong_suat = dbData.nang_luong.phao.solar_cong_suat ?? dbData.nang_luong.phao.cong_suat ?? dbData.nang_luong.phao.w ?? merged.solar_cong_suat;
        }
        if (dbData.nang_luong.cong) {
            merged.cong_dien_ap = dbData.nang_luong.cong.dien_ap ?? dbData.nang_luong.cong.pin_volt ?? dbData.nang_luong.cong.v ?? merged.cong_dien_ap ?? 0;
            merged.cong_dong_dien = dbData.nang_luong.cong.dong_dien ?? dbData.nang_luong.cong.dong_sac ?? dbData.nang_luong.cong.ma ?? merged.cong_dong_dien ?? 0;
            merged.cong_cong_suat = dbData.nang_luong.cong.cong_suat ?? dbData.nang_luong.cong.w ?? merged.cong_cong_suat ?? 0;
            merged.cong_pin_phan_tram = dbData.nang_luong.cong.pin_phan_tram ?? dbData.nang_luong.cong.pct ?? merged.cong_pin_phan_tram ?? 0;
        }
    }

    // 6. TRÍCH XUẤT SAI SỐ HIỆU CHUẨN (Calibration Offsets)
    if (dbData.control) {
        merged.calib_sal = typeof dbData.control.calib_sal === 'number' ? dbData.control.calib_sal : 0;
        merged.calib_temp = typeof dbData.control.calib_temp === 'number' ? dbData.control.calib_temp : 0;
        merged.calib_water_in = typeof dbData.control.calib_water_in === 'number' ? dbData.control.calib_water_in : 0;
        merged.calib_water_out = typeof dbData.control.calib_water_out === 'number' ? dbData.control.calib_water_out : 0;
    } else {
        merged.calib_sal = 0;
        merged.calib_temp = 0;
        merged.calib_water_in = 0;
        merged.calib_water_out = 0;
    }

    // 7. BẢO LƯU DỮ LIỆU GỐC TRƯỚC KHI BÙ TRỪ
    merged.raw_do_man = merged.do_man ?? 0;
    merged.raw_temp = merged.temp ?? 0;
    merged.raw_muc_nuoc = merged.muc_nuoc ?? 0;
    merged.raw_sieu_am_ngoai = merged.sieu_am_ngoai ?? 0;

    // 8. CỘNG/TRỪ SAI SỐ HIỆU CHUẨN & CLAMP DƯỚI 0
    merged.do_man = Math.max(0, merged.raw_do_man + merged.calib_sal);
    merged.temp = merged.raw_temp + merged.calib_temp;
    merged.muc_nuoc = Math.max(0, merged.raw_muc_nuoc + merged.calib_water_in);
    merged.sieu_am_ngoai = Math.max(0, merged.raw_sieu_am_ngoai + merged.calib_water_out);

    // Update central state
    updateState('dataCache', merged);
    updateState('hbTracker', hbTracker);

    // Call updateDOM hook if present in global scope
    if (typeof window !== 'undefined' && typeof window.updateDOM === 'function') {
        window.updateDOM(merged);
    }

    return merged;
}

/**
 * Start the 1-second interval heartbeat watchdog tracking buoy and gate connectivity.
 */
export function startHeartbeatTracker() {
    if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
    }

    heartbeatIntervalId = setInterval(() => {
        const now = Date.now();
        const hbTracker = getState('hbTracker') || {
            phao: { lastVal: null, lastTime: 0, isOnline: false },
            cong: { lastVal: null, lastTime: 0, isOnline: false }
        };
        let changed = false;

        // Cập nhật text "x giây trước" cho Last Sync
        const diffSecs = Math.floor((now - lastFetchTime) / 1000);
        let syncText = "Vừa xong";
        if (diffSecs > 0 && diffSecs < 60) {
            syncText = `${diffSecs} giây trước`;
        } else if (diffSecs >= 60) {
            syncText = `${Math.floor(diffSecs / 60)} phút trước`;
        }

        if (typeof document !== 'undefined') {
            const deskSync = document.getElementById('last-sync-time');
            const mobSync = document.getElementById('mob-last-sync-time');
            if (deskSync) deskSync.innerText = syncText;
            if (mobSync) mobSync.innerText = syncText;
        }

        // Heartbeat timeout detection (20s)
        const timeoutMs = TIMING.HEARTBEAT_TIMEOUT_MS || 20000;

        if (hbTracker.phao.isOnline && (now - hbTracker.phao.lastTime > timeoutMs)) {
            hbTracker.phao.isOnline = false;
            changed = true;
            if (typeof window !== 'undefined') {
                if (typeof window.pushAlert === 'function') {
                    window.pushAlert("MẤT KẾT NỐI", "Trạm Phao đã ngừng gửi dữ liệu. Đang chờ khôi phục...");
                }
                if (typeof window.ghiNhatKyTuDong === 'function') {
                    window.ghiNhatKyTuDong("MẤT KẾT NỐI PHAO", "Mất tín hiệu từ Trạm Phao");
                }
            }
        }

        if (hbTracker.cong.isOnline && (now - hbTracker.cong.lastTime > timeoutMs)) {
            hbTracker.cong.isOnline = false;
            changed = true;
            if (typeof window !== 'undefined') {
                if (typeof window.pushAlert === 'function') {
                    window.pushAlert("MẤT KẾT NỐI", "Trạm Cống rớt mạng. Tạm khóa điều khiển để đảm bảo an toàn.");
                }
                if (typeof window.ghiNhatKyTuDong === 'function') {
                    window.ghiNhatKyTuDong("MẤT KẾT NỐI CỐNG", "Mất tín hiệu từ Trạm Cống");
                }
            }
        }

        if (changed) {
            updateState('hbTracker', hbTracker);
            updateConnectionUI();
        }
    }, TIMING.HEARTBEAT_CHECK_INTERVAL_MS || 1000);
}

/**
 * Stop background heartbeat tracking interval.
 */
export function stopHeartbeatTracker() {
    if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
    }
}

/**
 * Update UI connection status indicators based on current heartbeat status.
 */
export function updateConnectionUI() {
    if (typeof document === 'undefined') return;

    const hbTracker = getState('hbTracker') || {
        phao: { isOnline: false },
        cong: { isOnline: false }
    };

    const statusCongEl = document.getElementById('status-cong');
    if (statusCongEl) {
        statusCongEl.innerHTML = hbTracker.cong.isOnline
            ? `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>`
            : `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`;
    }

    const statusPhaoEl = document.getElementById('status-phao');
    if (statusPhaoEl) {
        statusPhaoEl.innerHTML = hbTracker.phao.isOnline
            ? `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>`
            : `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`;
    }

    const linkDot = document.getElementById('link-dot');
    const linkDotDesk = document.getElementById('link-dot-desktop');
    const linkText = document.getElementById('link-text');
    const linkTextDesk = document.getElementById('link-text-desktop');

    const isSystemOnline = hbTracker.cong.isOnline || hbTracker.phao.isOnline;
    const onlineText = typeof t === 'function' ? t('status_online') : 'ONLINE';

    if (isSystemOnline) {
        if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
        if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
        if (linkText) linkText.innerText = onlineText;
        if (linkTextDesk) linkTextDesk.innerText = onlineText;
    } else {
        if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-red-500";
        if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-red-500";
        if (linkText) linkText.innerText = "OFFLINE";
        if (linkTextDesk) linkTextDesk.innerText = "OFFLINE";
    }

    // Refresh data merge when connection status flips
    processAndMergeData();
}

/**
 * Fast Database REST PATCH write helper.
 * @param {string} path - Node path (e.g. "control", "tram_cong")
 * @param {Object} dataObj - Key-value map to patch
 * @returns {Promise<boolean>} True if write succeeded
 */
export async function writeFirebase(path, dataObj) {
    const prefix = getProjectPrefix();
    const cleanPath = prefix ? `${prefix.replace(/^\//, '')}/${path}` : path;

    try {
        // Attempt REST PATCH for maximum compatibility and firmware-matched speed
        const url = `${DB_BASE_URL}/${cleanPath}.json?${DB_AUTH}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataObj)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        return true;
    } catch (restErr) {
        console.warn(`[Firebase Service] REST PATCH failed for "${cleanPath}", attempting SDK fallback:`, restErr);
        try {
            const nodeRef = ref(db, cleanPath);
            await update(nodeRef, dataObj);
            return true;
        } catch (sdkErr) {
            console.error(`[Firebase Service] SDK write failed for "${cleanPath}":`, sdkErr);
            const errMsg = typeof t === 'function' ? t('err_firebase_conn') : 'Lỗi kết nối Firebase';
            if (typeof showToast === 'function') {
                showToast(errMsg, 'error');
            }
            return false;
        }
    }
}

/**
 * SDK-based update helper with REST fallback.
 * @param {string} path
 * @param {Object} dataObj
 * @returns {Promise<boolean>}
 */
export async function updateFirebase(path, dataObj) {
    const prefix = getProjectPrefix();
    const cleanPath = prefix ? `${prefix.replace(/^\//, '')}/${path}` : path;
    try {
        const nodeRef = ref(db, cleanPath);
        await update(nodeRef, dataObj);
        return true;
    } catch (err) {
        return writeFirebase(path, dataObj);
    }
}

/**
 * SDK-based push helper.
 * @param {string} path
 * @param {Object} dataObj
 * @returns {Promise<*>}
 */
export async function pushFirebase(path, dataObj) {
    const prefix = getProjectPrefix();
    const cleanPath = prefix ? `${prefix.replace(/^\//, '')}/${path}` : path;
    const nodeRef = ref(db, cleanPath);
    return push(nodeRef, dataObj);
}

/**
 * SDK-based remove helper.
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function removeFirebase(path) {
    const prefix = getProjectPrefix();
    const cleanPath = prefix ? `${prefix.replace(/^\//, '')}/${path}` : path;
    const nodeRef = ref(db, cleanPath);
    return remove(nodeRef);
}

/**
 * SDK-based set helper.
 * @param {string} path
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setFirebase(path, value) {
    const prefix = getProjectPrefix();
    const cleanPath = prefix ? `${prefix.replace(/^\//, '')}/${path}` : path;
    const nodeRef = ref(db, cleanPath);
    return set(nodeRef, value);
}

/**
 * Update system thresholds or calibration offsets with button spinner feedback.
 * @param {string} type - Parameter key type ('sal', 'flood', 'stall', 'height', 'calib_sal', etc.)
 * @param {HTMLElement} btn - The submit button triggering the action
 */
export async function updateSettingWithLoading(type, btn) {
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    const originalClass = btn.className;

    // Loading State
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang lưu...`;
    btn.className = "scada-control-btn px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 opacity-80 cursor-not-allowed";
    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: btn });
    }
    btn.disabled = true;

    let path = 'control';
    let data = {};

    switch (type) {
        case 'sal': {
            const val = parseFloat(document.getElementById('inp-sal')?.value);
            data = { salinity_threshold: val };
            break;
        }
        case 'flood': {
            const val = parseFloat(document.getElementById('inp-flood')?.value);
            data = { flood_threshold: val };
            break;
        }
        case 'stall': {
            const val = parseInt(document.getElementById('inp-stall')?.value, 10);
            data = { stall_threshold: val };
            break;
        }
        case 'height': {
            const val = parseFloat(document.getElementById('inp-height')?.value);
            data = { sensor_height: val };
            break;
        }
        case 'calib_sal': {
            const val = parseFloat(document.getElementById('inp-calib-sal')?.value) || 0;
            data = { calib_sal: val };
            break;
        }
        case 'calib_temp': {
            const val = parseFloat(document.getElementById('inp-calib-temp')?.value) || 0;
            data = { calib_temp: val };
            break;
        }
        case 'calib_water_in': {
            const val = parseFloat(document.getElementById('inp-calib-water-in')?.value) || 0;
            data = { calib_water_in: val };
            break;
        }
        case 'calib_water_out': {
            const val = parseFloat(document.getElementById('inp-calib-water-out')?.value) || 0;
            data = { calib_water_out: val };
            break;
        }
        default:
            break;
    }

    try {
        const success = await writeFirebase(path, data);
        if (success) {
            setTimeout(() => {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Đã lưu`;
                btn.className = "scada-control-btn px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors";
                if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons({ root: btn });
                }

                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.className = originalClass;
                    btn.disabled = false;
                    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
                        window.lucide.createIcons({ root: btn });
                    }
                    if (typeof showToast === 'function') {
                        showToast('Cập nhật thông số thành công!', 'success');
                    }
                }, 2000);
            }, 500);
        } else {
            throw new Error('Ghi dữ liệu không thành công');
        }
    } catch (err) {
        btn.innerHTML = `<i data-lucide="x" class="w-4 h-4"></i> Lỗi`;
        btn.className = "scada-control-btn px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0";
        if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ root: btn });
        }

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.className = originalClass;
            btn.disabled = false;
            if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons({ root: btn });
            }
        }, 3000);

        if (typeof showToast === 'function') {
            showToast(`Lỗi cập nhật: ${err.message}`, 'error');
        }
    }
}

/**
 * Send volume level to DYPlayer master volume with 300ms debounce.
 * @param {number|string} val - Volume 0–30
 */
export function sendVolumeControl(val) {
    if (volumeDebounceTimer) clearTimeout(volumeDebounceTimer);
    volumeDebounceTimer = setTimeout(() => {
        writeFirebase('control', { volume: parseInt(val, 10) })
            .then(success => {
                if (success && typeof showToast === 'function') {
                    showToast('Cập nhật âm lượng thành công', 'success');
                }
            })
            .catch(err => {
                if (typeof showToast === 'function') {
                    showToast('Lỗi cập nhật âm lượng', 'error');
                }
            });
    }, 300);
}

/**
 * Toggle infinite loop mode for emergency audio broadcast.
 * @param {HTMLInputElement} cb
 */
export function toggleLoopAudio(cb) {
    if (!cb) return;
    const isLoop = cb.checked ? 1 : 0;
    const statusTxt = document.getElementById('txt-loop-status');

    if (statusTxt) {
        statusTxt.innerText = isLoop ? "BẬT (Lặp vô hạn)" : "TẮT (1 Lần)";
        statusTxt.className = isLoop
            ? "text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400"
            : "text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }

    writeFirebase('control', { loop_audio: isLoop, audio_loop: isLoop })
        .catch(err => {
            if (typeof showToast === 'function') {
                showToast('Lỗi cấu hình vòng lặp', 'error');
            }
            cb.checked = !cb.checked;
        });
}

/**
 * Trigger playback of a specific audio track on DYPlayer.
 * @param {number} trackNum - Track number (9–17)
 * @param {string} title - Human-readable track title
 */
export function playAudioTrack(trackNum, title) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        if (typeof showToast === 'function') {
            showToast("Bạn đang ở chế độ Xem (Khách), không thể phát loa!", "error");
        }
        return;
    }

    writeFirebase('control', {
        play_audio: trackNum,
        play_track: trackNum,
        track_title: title || `Track ${trackNum}`
    }).then(success => {
        if (success) {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction(`Phát thanh: ${title}`);
            }
            if (typeof showToast === 'function') {
                showToast(`Đang phát: ${title}`, 'success');
            }
        }
    }).catch(err => {
        if (typeof showToast === 'function') {
            showToast('Lỗi phát âm thanh', 'error');
        }
    });
}

/**
 * Send emergency mute command to DYPlayer.
 */
export function stopAllAudio() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        if (typeof showToast === 'function') {
            showToast("Bạn đang ở chế độ Xem (Khách), không thể tắt loa!", "error");
        }
        return;
    }

    writeFirebase('control', { stop_audio: 1 })
        .then(success => {
            if (success) {
                if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                    window.logAction("Dừng phát loa");
                }
                if (typeof showToast === 'function') {
                    showToast('Đã gửi lệnh dừng âm thanh', 'success');
                }
            }
        })
        .catch(err => {
            if (typeof showToast === 'function') {
                showToast('Lỗi dừng âm thanh', 'error');
            }
        });
}

/**
 * Lock or unlock physical push-buttons on the SCADA electrical cabinet.
 * @param {boolean} locked
 */
export function toggleLockPhysical(locked) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        if (typeof showToast === 'function') {
            showToast("Bạn đang ở chế độ Xem (Khách), không thể khóa tủ điện!", "error");
        }
        return;
    }

    if (locked === undefined) {
        const dataCache = getState('dataCache') || {};
        locked = !(dataCache.khoa_nut_vat_ly === true);
    }

    Promise.all([
        writeFirebase('control', { khoa_nut_vat_ly: locked }),
        writeFirebase('dieu_khien', { khoa_nut_vat_ly: locked })
    ]).then(() => {
        if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
            window.logAction(locked ? "Khóa nút bấm vật lý tủ điện" : "Mở khóa nút bấm vật lý tủ điện");
        }
        if (typeof showToast === 'function') {
            showToast(locked ? "Đã khóa nút bấm tại tủ!" : "Đã mở khóa nút bấm tại tủ!", "success");
        }
    }).catch(err => {
        if (typeof showToast === 'function') {
            showToast("Lỗi cập nhật khóa vật lý", "error");
        }
    });
}

// Public Window Bridge for backward compatibility
if (typeof window !== 'undefined') {
    window.initFirebaseListeners = initFirebaseListeners;
    window.stopFirebaseListeners = stopFirebaseListeners;
    window.processAndMergeData = processAndMergeData;
    window.writeFirebase = writeFirebase;
    window.updateFirebase = updateFirebase;
    window.pushFirebase = pushFirebase;
    window.removeFirebase = removeFirebase;
    window.setFirebase = setFirebase;
    window.getProjectPrefix = getProjectPrefix;
    window.setProjectPrefix = setProjectPrefix;
    window.updateConnectionUI = updateConnectionUI;
    window.updateSettingWithLoading = updateSettingWithLoading;
    window.sendVolumeControl = sendVolumeControl;
    window.toggleLoopAudio = toggleLoopAudio;
    window.playAudioTrack = playAudioTrack;
    window.stopAllAudio = stopAllAudio;
    window.toggleLockPhysical = toggleLockPhysical;
    window.startHeartbeatTracker = startHeartbeatTracker;
    window.stopHeartbeatTracker = stopHeartbeatTracker;
}

export default {
    initFirebaseListeners,
    stopFirebaseListeners,
    processAndMergeData,
    writeFirebase,
    updateFirebase,
    pushFirebase,
    removeFirebase,
    setFirebase,
    getProjectPrefix,
    setProjectPrefix,
    updateConnectionUI,
    updateSettingWithLoading,
    sendVolumeControl,
    toggleLoopAudio,
    playAudioTrack,
    stopAllAudio,
    toggleLockPhysical,
    startHeartbeatTracker,
    stopHeartbeatTracker
};
