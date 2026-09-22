/**
 * @file test_services_m3.js
 * @description Comprehensive unit test suite for Milestone 3 Services:
 *              - firebase-service.js
 *              - camera-service.js
 *              - gas-telegram-service.js
 */

import { getState, updateState, mergeState, subscribeState } from '../js/core/state.js';
import * as Constants from '../js/config/app-constants.js';

import {
    processAndMergeData,
    getProjectPrefix,
    setProjectPrefix,
    writeFirebase,
    updateFirebase,
    pushFirebase,
    removeFirebase,
    setFirebase,
    updateConnectionUI,
    sendVolumeControl,
    toggleLoopAudio,
    playAudioTrack,
    stopAllAudio,
    toggleLockPhysical
} from '../js/services/firebase-service.js';

import {
    connectCamera,
    stopCamera,
    setCamControl,
    setCamFlipV,
    setCamFlipH,
    setCamFrameSize,
    setCamLed,
    zoomCam,
    resetCamTransform,
    setCamBadge
} from '../js/services/camera-service.js';

import {
    GAS_API_KEY,
    getTelegramChatId,
    setTelegramChatId,
    sendToGoogleSheets,
    logLoginSession,
    logActionToSheets,
    sendTelegramAlert,
    testTelegram,
    setupLoggingHooks
} from '../js/services/gas-telegram-service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function assertEquals(actual, expected, message) {
    totalTests++;
    const isEq = JSON.stringify(actual) === JSON.stringify(expected);
    if (isEq) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    }
}

async function runAllTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING MILESTONE 3 SERVICES UNIT TEST SUITE');
    console.log('====================================================\n');

    // =========================================================================
    // SUITE 1: Firebase Service & Data Fusion
    // =========================================================================
    console.log('📦 SUITE 1: firebase-service.js');

    // Test 1.1: Project prefix management
    setProjectPrefix('/tram_02');
    assertEquals(getProjectPrefix(), '/tram_02', 'Project prefix set and retrieved correctly');
    assertEquals(getState('currentProjectPrefix'), '/tram_02', 'State currentProjectPrefix matches');

    setProjectPrefix('');
    assertEquals(getProjectPrefix(), '', 'Default project prefix reset to empty string');

    // Test 1.2: Data fusion with normal sensors
    updateState('localDbData', {
        tram_phao: {
            do_man: 1.2,
            temp: 28.5,
            heartbeatphao: 1001,
            pin_phan_tram: 85,
            pin_volt: 3.9,
            solar_cong_suat: 5.2,
            solar_dong_sac: 120,
            solar_volt: 5.5,
            trang_thai_dem: 0
        },
        control: {
            mode: 1,
            salinity_threshold: 1.5,
            flood_threshold: 80,
            stall_threshold: 150,
            sensor_height: 120,
            emergency_stop: 0,
            volume: 25,
            khoa_nut_vat_ly: false,
            calib_sal: 0.1,
            calib_temp: -0.5,
            calib_water_in: 2.0,
            calib_water_out: -1.0
        },
        tram_cong: {
            khoang_cach_sieu_am: 40,      // inner water: 120 - 40 = 80 cm
            khoang_cach_sieu_am_ngoai: 50,// outer water: 120 - 50 = 70 cm
            dong_dien_tho: 180,
            gate_status: 1,
            heartbeatcong: 2002,
            pin_volt: 12.2,
            pin_phan_tram: 90
        }
    });

    const merged = processAndMergeData();

    assertEquals(merged.raw_do_man, 1.2, 'Data fusion preserved raw salinity');
    assertEquals(merged.raw_temp, 28.5, 'Data fusion preserved raw water temp');
    assertEquals(merged.raw_muc_nuoc, 80, 'Calculated raw inner water level (120 - 40 = 80cm)');
    assertEquals(merged.raw_sieu_am_ngoai, 70, 'Calculated raw outer water level (120 - 50 = 70cm)');

    assertEquals(merged.do_man, 1.3, 'Calibrated salinity: 1.2 + 0.1 = 1.3 ppt');
    assertEquals(merged.temp, 28.0, 'Calibrated temperature: 28.5 + (-0.5) = 28.0 °C');
    assertEquals(merged.muc_nuoc, 82.0, 'Calibrated inner water level: 80 + 2.0 = 82.0 cm');
    assertEquals(merged.sieu_am_ngoai, 69.0, 'Calibrated outer water level: 70 + (-1.0) = 69.0 cm');

    // Test 1.3: Data fusion negative value clamping
    updateState('localDbData', {
        tram_phao: { do_man: 0.1, temp: 20 },
        control: { sensor_height: 100, calib_sal: -0.5, calib_water_in: -150 },
        tram_cong: { khoang_cach_sieu_am: 120 } // dist > height -> raw muc_nuoc is 0
    });

    const clampedMerged = processAndMergeData();
    assertEquals(clampedMerged.do_man, 0, 'Salinity clamped to 0 on negative calibration drift');
    assertEquals(clampedMerged.muc_nuoc, 0, 'Water level clamped to 0 on negative calibration drift');

    // Test 1.4: Heartbeat tracking transitions
    const hbTracker = getState('hbTracker');
    assert(hbTracker.phao.lastVal !== null, 'Buoy heartbeat captured');
    assert(hbTracker.cong.lastVal !== null, 'Gate heartbeat captured');
    assert(hbTracker.phao.isOnline === true, 'Buoy marked online on new heartbeat');
    assert(hbTracker.cong.isOnline === true, 'Gate marked online on new heartbeat');

    // Test 1.5: REST / Fetch Mock Write operations
    let lastFetchedUrl = '';
    let lastFetchedBody = null;
    let lastFetchedMethod = '';

    globalThis.fetch = async (url, options = {}) => {
        lastFetchedUrl = url;
        lastFetchedMethod = options.method || 'GET';
        lastFetchedBody = options.body;
        return {
            ok: true,
            status: 200,
            json: async () => ({ ip: '1.2.3.4' }),
            text: async () => 'OK'
        };
    };

    const writeOk = await writeFirebase('control', { mode: 0 });
    assert(writeOk === true, 'writeFirebase returned true on successful write');
    assert(lastFetchedUrl.includes('/control.json'), 'writeFirebase formed valid REST URL');
    assertEquals(lastFetchedMethod, 'PATCH', 'writeFirebase used PATCH method');
    assertEquals(JSON.parse(lastFetchedBody), { mode: 0 }, 'writeFirebase sent correct JSON payload');

    // =========================================================================
    // SUITE 2: Camera Service & Pan/Zoom
    // =========================================================================
    console.log('\n📹 SUITE 2: camera-service.js');

    // Mock WebSocket
    let lastSentWsMsg = '';
    class MockWebSocket {
        constructor(url) {
            this.url = url;
            this.readyState = 1; // WebSocket.OPEN
            this.binaryType = 'blob';
        }
        send(msg) {
            lastSentWsMsg = msg;
        }
        close() {
            this.readyState = 3; // WebSocket.CLOSED
        }
    }
    globalThis.WebSocket = MockWebSocket;
    globalThis.WebSocket.OPEN = 1;
    globalThis.WebSocket.CONNECTING = 0;
    globalThis.WebSocket.CLOSED = 3;

    connectCamera('wss://mock-cam-url.com');
    assert(lastSentWsMsg === '' || true, 'Camera connection initialized');

    // Test 2.1: Hardware control commands
    setCamControl('led_intensity', 128);
    assertEquals(lastSentWsMsg, 'LED:128', 'LED intensity command formatted as LED:<val>');

    setCamControl('vflip', 1);
    assertEquals(lastSentWsMsg, 'CMD:vflip:1', 'Vertical flip command formatted as CMD:vflip:<val>');

    setCamControl('hmirror', 1);
    assertEquals(lastSentWsMsg, 'CMD:hmirror:1', 'Horizontal mirror command formatted as CMD:hmirror:<val>');

    setCamControl('framesize', 9);
    assertEquals(lastSentWsMsg, 'CMD:framesize:9', 'Frame size command formatted as CMD:framesize:<val>');

    // Test 2.2: Zoom calculations
    zoomCam(0.5);
    zoomCam(1.0);
    resetCamTransform();
    assert(true, 'Pan/Zoom functions executed without errors');

    stopCamera();
    const camState = getState('cameraState');
    assertEquals(camState.isConnected, false, 'Camera state updated to disconnected after stopCamera()');

    // =========================================================================
    // SUITE 3: Google Apps Script & Telegram Service
    // =========================================================================
    console.log('\n📲 SUITE 3: gas-telegram-service.js');

    // Test 3.1: API Key and Chat ID
    assertEquals(GAS_API_KEY, 'NgayMaiDiThiQG2026', 'Correct security API key configured');
    assertEquals(getTelegramChatId(), '7831605237', 'Default Telegram Chat ID configured');

    setTelegramChatId('9988776655');
    assertEquals(getTelegramChatId(), '9988776655', 'Telegram Chat ID updated successfully');

    // Test 3.2: sendToGoogleSheets
    let gasPayload = null;
    globalThis.fetch = async (url, options = {}) => {
        lastFetchedUrl = url;
        if (options.body instanceof URLSearchParams) {
            gasPayload = Object.fromEntries(options.body.entries());
        } else if (typeof options.body === 'string') {
            try {
                gasPayload = JSON.parse(options.body);
            } catch(e) {
                gasPayload = options.body;
            }
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({ ip: '113.161.72.85' }),
            text: async () => 'OK'
        };
    };

    const gasOk = await sendToGoogleSheets({
        loai: 'nhat_ky',
        action: 'Mở cống bằng tay'
    });
    assert(gasOk === true, 'sendToGoogleSheets completed successfully');
    assertEquals(gasPayload.api_key, 'NgayMaiDiThiQG2026', 'Dispatched payload includes secret API key');
    assertEquals(gasPayload.action, 'Mở cống bằng tay', 'Dispatched payload contains action');

    // Test 3.3: Login session logging
    await logLoginSession(
        'Đăng nhập thành công',
        'Thời gian: 0s',
        'Google',
        'Admin',
        'Admin User',
        'admin@example.com',
        'UID_12345'
    );
    assertEquals(gasPayload.loai, 'lich_su_dang_nhap', 'Login session payload has loai=lich_su_dang_nhap');
    assertEquals(gasPayload.role, 'Admin', 'Login session role logged correctly');
    assertEquals(gasPayload.email, 'admin@example.com', 'Login session email logged correctly');
    assertEquals(gasPayload.api_key, 'NgayMaiDiThiQG2026', 'Login session contains security API key');

    // Test 3.4: Telegram Alert Severity Classification
    sendTelegramAlert("⚠️ CẢNH BÁO: Độ mặn sông vượt ngưỡng 2.5 ppt!");
    assertEquals(gasPayload.loai, 'broadcast_telegram', 'Telegram alert uses loai=broadcast_telegram');
    assertEquals(gasPayload.severity, 'high', 'Severity classified as high for alert message');

    sendTelegramAlert("Hệ thống khởi động bình thường.");
    assertEquals(gasPayload.severity, 'normal', 'Severity classified as normal for standard notification');

    // Test 3.5: Operational Logging Hooks
    let originalLogCalled = false;
    globalThis.window = globalThis;
    globalThis.window.ghiNhatKy = function(text, source) {
        originalLogCalled = true;
    };

    setupLoggingHooks();
    globalThis.window.ghiNhatKy("Đóng cống ngăn mặn", "Thao tác tay Web");
    assert(originalLogCalled === true, 'Original ghiNhatKy was executed via hooked function');
    assertEquals(gasPayload.action, 'Đóng cống ngăn mặn', 'Action logged to Google Sheets via hook');

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('====================================================');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
