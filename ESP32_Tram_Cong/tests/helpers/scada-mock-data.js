/**
 * SCADA Test Fixtures and Mock Data
 * Authoritative interface schemas and mock telemetry datasets.
 */

const SCADA_CONSTANTS = {
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyCgWv3tMBnArYx1JHuasH7Yg-RARRlcRb8",
        authDomain: "hethongcongthongminh.firebaseapp.com",
        databaseURL: "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "hethongcongthongminh",
        storageBucket: "hethongcongthongminh.firebasestorage.app",
        messagingSenderId: "1056991222410",
        appId: "1:1056991222410:web:36623d39ebbc5728e02b73",
        measurementId: "G-96J4Z5SFEQ"
    },
    APP_CONSTANTS: {
        DB_BASE_URL: "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app",
        GAS_URL: "https://script.google.com/macros/s/AKfycbzLw4G8i6Z36tU_n92g7X734_example/exec",
        WS_CAM_URL: "wss://esp32cam-p4ns.onrender.com",
        HEARTBEAT_TIMEOUT_MS: 20000,
        DIFF_ALERT_THRESHOLD_CM: 5.0,
        DEFAULT_STALL_CURRENT_A: 4.5
    },
    REQUIRED_ROUTES: [
        'monitor',
        'control',
        'broadcast',
        'settings',
        'alerts',
        'actions',
        'maintenance'
    ],
    REQUIRED_WINDOW_EXPORTS: [
        'switchTab',
        'setGateWithLoading',
        'setModeOptimistic',
        'executeToggleEmergency',
        'confirmEmergencyToggle',
        'toggleSimulation',
        'playAudioTrack',
        'stopAllAudio',
        'toggleLoopAudio',
        'sendVolumeControl',
        'updateSettingWithLoading',
        'toggleLockPhysical',
        'connectCamera',
        'stopCamera',
        'takeSnapshot',
        'setCamControl',
        'setCamFlipV',
        'setCamFlipH',
        'zoomCam',
        'resetCamTransform',
        'openModal',
        'closeModal',
        'showToast',
        'toggleTheme',
        'toggleUserMenu',
        'toggleToolsMenu',
        'toggleMobileSidebar',
        'openProfileModal',
        'closeProfileModal',
        'openAdminModal',
        'closeAdminModal',
        'openMaintConfirmModal',
        'openMaintSettingsModal',
        'saveMaintInterval',
        'hoanTatBaoTri',
        'exportLogsCSV',
        'deleteLogsData',
        'changePage',
        'onLogFilterChange',
        'toggleAdmin',
        'toggleBlock',
        'deleteUserRecord',
        'uploadAvatar',
        'logout'
    ],
    REQUIRED_DOM_IDS: [
        // Tab Containers
        'tab-monitor',
        'tab-control',
        'tab-settings',
        
        // Monitor Components
        'live-salinity-val',
        'live-temp-val',
        'live-water-in',
        'live-water-out',
        'live-delta-h',
        'sensor-status-badge',
        'buoy-node-badge',
        'station-node-badge',
        'chart-salinity',
        'chart-level',

        // Control Components
        'btn-gate-open',
        'btn-gate-close',
        'btn-mode-auto',
        'btn-mode-manual',
        'btn-emergency-stop',
        'gate-anim-container',
        'gate-pos-indicator',

        // Broadcast Components
        'slider-master-volume',
        'btn-loop-audio',
        'btn-stop-all-audio',

        // Settings Components
        'inp-threshold-salinity',
        'inp-threshold-flood',
        'inp-calib-salinity',
        'inp-calib-in',
        'inp-calib-out',
        'btn-lock-physical',

        // Logs & Modals
        'table-alerts-body',
        'btn-export-alerts-csv',
        'table-actions-body',
        'btn-export-actions-csv',
        'maint-countdown-ticker',
        'btn-open-maint-modal',
        'modal-admin',
        'modal-profile',
        'modal-confirm-emergency',
        'toast-container'
    ]
};

const MOCK_TELEMETRY = {
    // 1S Buoy Station (tram_phao)
    tram_phao: {
        do_man: 2.8,
        nhiet_do: 29.4,
        dien_ap_pin: 4.12,
        dien_ap_mat_troi: 12.8,
        thoi_gian: Date.now()
    },
    // 3S Gate Sluice Station (tram_cong)
    tram_cong: {
        muc_nuoc_ngoai: 145.0,
        muc_nuoc_trong: 110.0,
        dong_dien_dong_co: 1.25,
        dien_ap_pin: 12.6,
        dien_ap_mat_troi: 18.5,
        thoi_gian: Date.now()
    },
    // Actuator and control status (dieu_khien)
    dieu_khien: {
        cua_cong: 0.0,
        che_do: 1, // 1: Auto, 0: Manual
        khoa_nut_vat_ly: false,
        dung_khan_cap: false,
        loa_phat: {
            am_luong: 24,
            lap_vo_tan: false,
            bai_dang_phat: 0
        }
    },
    // Operational Thresholds & Calibration Offsets
    settings: {
        nguong_man: 4.0,
        nguong_ngap: 180.0,
        nguong_dong_ket: 4.5,
        calib_salinity: 0.1,
        calib_in: -1.0,
        calib_out: 0.5
    }
};

module.exports = {
    SCADA_CONSTANTS,
    MOCK_TELEMETRY
};
