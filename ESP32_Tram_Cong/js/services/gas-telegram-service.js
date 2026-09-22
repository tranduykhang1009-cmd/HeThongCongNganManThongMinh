/**
 * @file gas-telegram-service.js
 * @description Google Apps Script webhook client for login & audit logging,
 *              Telegram bot alert broadcaster, and automatic audit hooks.
 * @module services/gas-telegram-service
 */

import { GAS_URL, DEFAULT_TELEGRAM_CHAT_ID } from '../config/app-constants.js';
import { getState, subscribeState } from '../core/state.js';
import { showToast } from '../utils/ui-utils.js';

/**
 * Shared Secret Security API Key for Google Apps Script Webhook
 */
export const GAS_API_KEY = "NgayMaiDiThiQG2026";

/**
 * Active Telegram Chat ID for alerts
 */
let activeTelegramChatId = DEFAULT_TELEGRAM_CHAT_ID;

/**
 * Retrieve current Telegram Chat ID
 * @returns {string}
 */
export function getTelegramChatId() {
    return activeTelegramChatId;
}

/**
 * Set and update active Telegram Chat ID
 * @param {string} chatId
 */
export function setTelegramChatId(chatId) {
    if (chatId && typeof chatId === 'string') {
        activeTelegramChatId = chatId.trim();
        if (typeof window !== 'undefined') {
            window.telegramChatId = activeTelegramChatId;
        }
        if (typeof document !== 'undefined') {
            const input = document.getElementById('setting-telegram-id');
            if (input && input.value !== activeTelegramChatId) {
                input.value = activeTelegramChatId;
            }
        }
    }
}

/**
 * Dispatches a URL-encoded POST payload to the Google Apps Script Webhook with API security key.
 * Uses mode: 'no-cors' to avoid browser CORS restrictions.
 * 
 * @param {Object} dataObj - Key-value payload
 * @returns {Promise<boolean>}
 */
export async function sendToGoogleSheets(dataObj) {
    try {
        const payload = { ...dataObj, api_key: GAS_API_KEY };
        const formData = new URLSearchParams();

        Object.keys(payload).forEach(key => {
            if (payload[key] !== undefined && payload[key] !== null) {
                formData.append(key, String(payload[key]));
            }
        });

        await fetch(GAS_URL, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            mode: 'no-cors'
        });

        console.log("[GAS Service] Webhook POST dispatched:", payload.loai || 'general');
        return true;
    } catch (error) {
        console.error("[GAS Service] Error sending to Google Sheets:", error);
        return false;
    }
}

/**
 * Resolve client Public IP address via ipify.org
 * @returns {Promise<string>} IP address or "N/A"
 */
async function resolveClientIp() {
    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
            const ipData = await ipRes.json();
            return ipData.ip || "N/A";
        }
    } catch (e) {
        // Fallback on network failure
    }
    return "N/A";
}

/**
 * Detect client OS and Web Browser from navigator.userAgent
 * @returns {string} Formatted device/browser string
 */
function detectClientDevice() {
    if (typeof navigator === 'undefined') return "N/A";
    const ua = navigator.userAgent || '';
    let device = "N/A";

    if (/Windows/i.test(ua)) device = "Windows";
    else if (/Mac/i.test(ua)) device = "MacOS";
    else if (/Android/i.test(ua)) device = "Android";
    else if (/iPhone|iPad/i.test(ua)) device = "iOS";
    else if (/Linux/i.test(ua)) device = "Linux";

    if (/coc_coc_browser/i.test(ua)) device += " - Cốc Cốc";
    else if (/Edg\//i.test(ua)) device += " - Edge";
    else if (/Chrome/i.test(ua)) device += " - Chrome";
    else if (/Safari/i.test(ua)) device += " - Safari";
    else if (/Firefox/i.test(ua)) device += " - Firefox";

    return device;
}

/**
 * Log user authentication events (Login, Logout, Failed attempts) to Google Sheets.
 * 
 * @param {string} action - 'Đăng nhập thành công' | 'Đăng xuất' | 'Đăng nhập thất bại'
 * @param {string} details - Online duration or error message
 * @param {string} method - 'Google' | 'Email' | 'Ẩn danh' | 'N/A'
 * @param {string} role - 'Admin' | 'User' | 'Guest'
 * @param {string} name - User display name
 * @param {string} email - User email address
 * @param {string} uid - Firebase Auth UID
 */
export async function logLoginSession(action, details, method, role, name, email, uid) {
    const ip = await resolveClientIp();
    const device = detectClientDevice();

    try {
        await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                loai: "lich_su_dang_nhap",
                action: action || "Thao tác",
                details: details || "N/A",
                method: method || "N/A",
                role: role || "User",
                name: name || "Người dùng",
                email: email || "N/A",
                uid: uid || "N/A",
                ip: ip,
                device: device,
                api_key: GAS_API_KEY
            }),
            mode: "no-cors"
        });
        console.log(`[GAS Service] Login session logged: ${action} (${email})`);
    } catch (err) {
        console.error("[GAS Service] Failed to log login session:", err);
    }
}

/**
 * Log SCADA physical or web gate operations to Google Sheets.
 * 
 * @param {string} actionText - Action description (e.g. "Mở Cống", "Đóng Cống")
 * @param {string} [source] - Action source (e.g. "Web", "Tủ Điện")
 */
export function logActionToSheets(actionText, source) {
    const dataCache = getState('dataCache') || {};
    const hbTracker = getState('hbTracker') || {
        cong: { isOnline: false },
        phao: { isOnline: false }
    };

    const isAuto = dataCache.mode === 1;
    const isCongOnline = hbTracker.cong && hbTracker.cong.isOnline;
    const isPhaoOnline = hbTracker.phao && hbTracker.phao.isOnline;

    sendToGoogleSheets({
        loai: 'nhat_ky',
        mode: isAuto ? 'TỰ ĐỘNG (AI)' : 'THỦ CÔNG (Web/Tại chỗ)',
        action: actionText,
        wifi_cong: isCongOnline ? 'Online' : 'Offline',
        wifi_phao: isPhaoOnline ? 'Online' : 'Offline',
        reason: source ? `Nguồn: ${source}` : 'Thao tác tay trên Web'
    });
}

/**
 * Broadcast an incident alert or notification to Telegram bot subscribers.
 * 
 * @param {string} message - Notification text
 */
export function sendTelegramAlert(message) {
    if (!message || typeof message !== 'string') return;

    const msgUpper = message.toUpperCase();
    const isAlert = msgUpper.includes("CẢNH BÁO") ||
                    msgUpper.includes("KHẨN CẤP") ||
                    msgUpper.includes("LỖI") ||
                    msgUpper.includes("MẤT KẾT NỐI");

    sendToGoogleSheets({
        loai: 'broadcast_telegram',
        message: message,
        severity: isAlert ? 'high' : 'normal',
        chat_id: activeTelegramChatId
    });
}

/**
 * Test Telegram bot connection and message transmission
 */
export function testTelegram() {
    const val = activeTelegramChatId;
    if (!val || val.trim() === "") {
        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast('Chưa có ID nào được liên kết. Vui lòng bấm Kết Nối Bot trước!', 'error');
        }
        return;
    }

    const btn = typeof document !== 'undefined' ? document.getElementById('btn-test-tele') : null;
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Đang gửi...`;
        if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ root: btn });
        }
    }

    // Send test alert
    sendTelegramAlert(`✅ HỆ THỐNG KIỂM TRA: Gửi tin nhắn Telegram thành công từ hệ thống. ID của bạn là: ${val}`);

    setTimeout(() => {
        if (btn) {
            btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500"></i> Đã Gửi`;
            if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons({ root: btn });
            }
        }
        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast('Đã gửi Test qua hệ thống. Vui lòng check điện thoại.', 'success');
        }

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = `<i data-lucide="bell-ring" class="w-3.5 h-3.5"></i> Test`;
                if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons({ root: btn });
                }
            }
        }, 3000);
    }, 1500);
}

/**
 * Setup automatic audit logging hooks into global window.ghiNhatKy and window.logAction
 */
export function setupLoggingHooks() {
    if (typeof window === 'undefined') return;

    // Hook into existing ghiNhatKy if present or define standard
    const originalGhiNhatKy = window.ghiNhatKy;

    window.ghiNhatKy = function (text, source) {
        if (typeof originalGhiNhatKy === 'function') {
            try {
                originalGhiNhatKy(text, source);
            } catch (err) {
                console.error("[GAS Service] Error in original ghiNhatKy:", err);
            }
        }

        // Forward to Google Sheets
        logActionToSheets(text, source);

        // Delay 1.5s to broadcast to Telegram to prevent concurrent burst requests
        setTimeout(() => {
            sendTelegramAlert(`👤 [USER THAO TÁC] ${text}`);
        }, 1500);
    };

    // Ensure logAction points to hooked ghiNhatKy
    window.logAction = window.ghiNhatKy;
    console.log("[GAS Service] Operational logging hooks successfully attached.");
}

/**
 * Subscribe to state to automatically sync telegramChatId from Firebase control node
 */
export function initTelegramStateSync() {
    subscribeState('dataCache', (newData) => {
        if (newData && newData.telegram_chat_id) {
            setTelegramChatId(newData.telegram_chat_id);
        }
    });
}

// Backward compatibility alias
export const logToGoogleSheets = logLoginSession;

// Public Window Bridge for backward compatibility
if (typeof window !== 'undefined') {
    window.sendToGoogleSheets = sendToGoogleSheets;
    window.logToGoogleSheets = logToGoogleSheets;
    window.logLoginSession = logLoginSession;
    window.logActionToSheets = logActionToSheets;
    window.sendTelegramAlert = sendTelegramAlert;
    window.testTelegram = testTelegram;
    window.setupLoggingHooks = setupLoggingHooks;
    window.telegramChatId = activeTelegramChatId;
    window.getTelegramChatId = getTelegramChatId;
    window.setTelegramChatId = setTelegramChatId;
}

export default {
    sendToGoogleSheets,
    logToGoogleSheets,
    logLoginSession,
    logActionToSheets,
    sendTelegramAlert,
    testTelegram,
    setupLoggingHooks,
    initTelegramStateSync,
    getTelegramChatId,
    setTelegramChatId
};
