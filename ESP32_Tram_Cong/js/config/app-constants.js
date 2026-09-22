/**
 * @file app-constants.js
 * @description Central application configuration constants, endpoints, and default settings.
 * @module config/app-constants
 */

/**
 * Firebase Realtime Database Base REST Endpoint
 */
export const DB_BASE_URL = "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app";

/**
 * Firebase Realtime Database Secret/Auth query param
 */
export const DB_AUTH = "auth=tB2xm09anJWcnva5gz1NBvDS6VDGh7sjPvuURNEx";

/**
 * Google Apps Script Webhook URL for audit logging and external integrations
 */
export const GAS_URL = "https://script.google.com/macros/s/AKfycbxuwR7fge5YmBoxpF24nEVbC4FnPTNMpKTLWE3GXZTpd-kdxmE5S4A05oaWLP65jaa6/exec";

/**
 * ESP32-CAM Cloud WebSocket Streaming Server Endpoint
 */
export const WS_CAM_URL = "wss://esp32cam-p4ns.onrender.com";

/**
 * Default Telegram Bot Chat ID for incident alerts
 */
export const DEFAULT_TELEGRAM_CHAT_ID = "7831605237";

/**
 * Default SCADA Projects / Multi-station presets
 */
export const DEFAULT_PROJECTS = [
    { name: "Cống Ngăn Mặn #01", loc: "Thông Minh", active: true, prefix: "" },
    { name: "Cống Ngăn Mặn #02", loc: "Ba Tri", active: false, prefix: "/tram_02" },
    { name: "Ao Nuôi Thủy Sản 01", loc: "Chợ Lách", active: false, prefix: "/ao_01" }
];

/**
 * PA System MP3 Preset Audio Tracks (DYPlayer Tracks 09–17)
 */
export const AUDIO_TRACKS = [
    { track: 9, title: "⚠️ Cấm Bơi Lội Nguy Hiểm", desc: "Cảnh báo nguy hiểm cấm bơi lội", duration: "3s" },
    { track: 10, title: "⚠️ Dòng Nước Chảy Xiết", desc: "Cảnh báo dòng nước chảy xiết", duration: "3s" },
    { track: 11, title: "🌊 Cống Đang Mở Lấy Nước", desc: "Thông báo cống đang mở lấy nước ngọt", duration: "4s" },
    { track: 12, title: "🛑 Cống Đang Đóng Ngăn Mặn", desc: "Thông báo cống đang đóng ngăn mặn xâm nhập", duration: "4s" },
    { track: 13, title: "🚨 Xả Lũ Khẩn Cấp", desc: "Cảnh báo khẩn cấp cống đang xả lũ hạ mực nước", duration: "5s" },
    { track: 14, title: "🧂 Cảnh Báo Độ Mặn Cao", desc: "Cảnh báo độ mặn nguồn nước vượt mức an toàn", duration: "4s" },
    { track: 15, title: "🌧️ Cảnh Báo Triều Cường / Ngập", desc: "Cảnh báo triều cường dâng cao", duration: "4s" },
    { track: 16, title: "🚨 Còi Hụ Báo Động Khẩn Cấp", desc: "Phát tín hiệu còi hụ báo động khẩn cấp", duration: "10s" },
    { track: 17, title: "🔔 Chuông Báo Động Tiêu Chuẩn", desc: "Phát tín hiệu chuông cảnh báo tiêu chuẩn", duration: "6s" }
];

/**
 * Hash Route to Tab Container DOM ID Mapping
 */
export const ROUTE_MAP = {
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

/**
 * Tab Container ID to Navigation Suffix Mapping
 */
export const TAB_NAV_MAP = {
    'tab-monitor': 'monitor',
    'tab-control': 'control',
    'tab-phat-thanh': 'phat-thanh',
    'tab-settings': 'settings',
    'tab-canh-bao': 'canh-bao',
    'tab-thao-tac': 'thao-tac',
    'tab-bao-tri': 'bao-tri'
};

/**
 * Default Sensor Thresholds
 */
export const DEFAULT_THRESHOLDS = {
    salinity: 1.5,     // ppt
    waterLevel: 80,    // cm
    stallCurrent: 150, // ADC delta
    sensorHeight: 120  // cm
};

/**
 * LocalStorage Key Names
 */
export const STORAGE_KEYS = {
    THEME: 'theme',
    LANG: 'lang',
    IS_LOGGED_IN: 'isLoggedIn',
    USER_ROLE: 'userRole',
    PROJECTS: 'scada_projects',
    ACCOUNTS: 'scada_accounts',
    PRESET_LOGIN_EMAIL: 'preset_login_email',
    CAM_IP: 'camIp',
    HIDE_SIM: 'scada_hide_sim'
};

/**
 * Timing and Polling Intervals (in milliseconds)
 */
export const TIMING = {
    HEARTBEAT_TIMEOUT_MS: 20000,
    HEARTBEAT_CHECK_INTERVAL_MS: 1000,
    CHART_THROTTLE_MS: 5000,
    SENSOR_ALERT_DEBOUNCE_MS: 60000,
    MAINT_TICKER_INTERVAL_MS: 1000,
    TOAST_DURATION_MS: 2800
};
