/**
 * @file i18n.js
 * @description Multi-language dictionary and dynamic DOM translation engine.
 * @module core/i18n
 */

import { STORAGE_KEYS } from '../config/app-constants.js';

let currentLang = 'vi';

/**
 * Full multilingual translation dictionary
 */
export const i18n = {
    vi: {
        app_title: "HỆ THỐNG GIÁM SÁT & ĐIỀU KHIỂN CỐNG NGĂN MẶN",
        app_subtitle: "Tác giả: Lê Trọng Nam, Trần Duy Khang, Huỳnh Minh Ngọc | GVHD: Trần Thị Hồng Hạnh",
        status_online: "Trực Tuyến",
        status_offline: "Mất Mạng",
        user_role: "Quản Trị Viên",
        user_profile: "Hồ Sơ Cá Nhân",
        language: "Ngôn Ngữ",
        logout: "Đăng Xuất Hệ Thống",
        tab_monitor: "Giám Sát Realtime",
        tab_control: "Điều Khiển & Camera",
        tab_phat_thanh: "Phát Thanh Loa",
        tab_settings: "Cài Đặt Hệ Thống",
        tab_alerts: "Nhật Ký Sự Cố",
        "tab_canh-bao": "Cảnh Báo Sự Cố",
        tab_canh_bao: "Cảnh Báo Sự Cố",
        tab_thao_tac: "Lịch Sử Thao Tác",
        tab_bao_tri: "Bảo Trì Thiết Bị",
        card_salinity: "ĐỘ MẶN SÔNG",
        card_temperature: "NHIỆT ĐỘ NƯỚC",
        card_water_inner: "MỰC NƯỚC TRONG CỐNG",
        card_water_outer: "MỰC NƯỚC NGOÀI CỐNG",
        card_diff: "CHÊNH LỆCH (ΔH)",
        card_motor_current: "DÒNG ĐIỆN MOTOR (ADC THÔ)",
        card_gate_status: "TRẠNG THÁI CỐNG",
        card_network: "HẠ TẦNG MẠNG",
        threshold: "Ngưỡng",
        safe: "AN TOÀN",
        stable: "ỔN ĐỊNH",
        safe_level: "Ngưỡng an toàn",
        river_water: "Mực nước sông ngoài",
        outer_water: "NGOẠI THỦY",
        pressure_safe: "AN TOÀN ÁP LỰC",
        gate_pressure: "Chênh áp lực cửa cống",
        diff_safe_desc: "Áp lực 2 phía an toàn",
        motor_load: "Tải động cơ",
        normal: "BÌNH THƯỜNG",
        buzzer_status: "Còi báo:",
        chart_title: "BIỂU ĐỒ DIỄN BIẾN ĐỘ MẶN & MỰC NƯỚC REALTIME",
        control_panel_title: "Bảng Điều Khiển Cửa Cống",
        operating_mode: "Chế Độ Hoạt Động",
        mode_manual: "THỦ CÔNG (MANUAL)",
        mode_auto: "TỰ ĐỘNG",
        gate_action: "Thao Tác Cửa Cống",
        open_gate: "MỞ CỐNG",
        close_gate: "ĐÓNG CỐNG",
        emergency_system: "Hệ Thống An Toàn Khẩn Cấp",
        emergency_btn: "DỪNG KHẨN CẤP (EMERGENCY)",
        camera_title: "Camera Giám Sát Trực Tiếp",
        camera_connecting: "Luồng Camera IP Trạm Cống đang kết nối...",
        settings_title: "Cấu Hình Ngưỡng Cảnh Báo & Phần Cứng",
        salinity_thresh_label: "Ngưỡng Độ Mặn Cảnh Báo (ppt)",
        water_thresh_label: "Ngưỡng Mực Nước An Toàn Trong Cống (cm)",
        stall_thresh_label: "Ngưỡng Độ Lệch Dòng Kẹt Rác (Δ ADC)",
        height_thresh_label: "Chiều Cao Lắp Đặt Cảm Biến Siêu Âm (cm)",
        volume_label: "Âm Lượng Còi Báo Khẩn Cấp (0 - 30):",
        save: "Lưu Ngưỡng",
        alerts_log_title: "Nhật Ký Sự Cố & Cảnh Báo Hệ Thống",
        export_csv: "Xuất Báo Cáo CSV",
        clear_log: "Xóa 50 Bản Ghi",
        no_alerts: "Chưa có sự cố nào được ghi nhận.",
        cancel: "Hủy Bỏ",
        confirm_delete: "Xóa Lịch Sử",
        confirm_clear_title: "Xác Nhận Xóa Nhật Ký Sự Cố?",
        confirm_clear_desc: "Toàn bộ lịch sử sự cố sẽ bị xóa khỏi bộ nhớ. Hành động này không thể hoàn tác!",
        modal_add_project_title: "Tạo Dự Án / Trạm Mới",
        modal_project_name: "Tên Trạm / Dự Án Mới",
        modal_project_loc: "Khu Vực / Tỉnh Thành",
        project_list_title: "Danh Sách Hệ Thống",
        add_new: "Thêm Mới",
        create_new_project: "Tạo Dự Án / Trạm Mới",
        create_and_switch: "Tạo Mới & Chuyển Vùng",
        modal_emg_title: "XÁC NHẬN DỪNG KHẨN CẤP?",
        modal_emg_desc: "Lệnh Dừng Khẩn Cấp sẽ lập tức khóa toàn bộ van cống và phát còi báo động khẩn!",
        confirm_emg_btn: "XÁC NHẬN DỪNG",
        err_emergency_active: "❌ Không thể điều khiển khi Emergency đang kích hoạt!",
        err_auto_mode_active: "❌ Hệ thống đang ở chế độ TỰ ĐỘNG, vui lòng chuyển sang THỦ CÔNG!",
        err_firebase_conn: "❌ Mất kết nối đến Firebase Database!",
        msg_mode_auto: "Đã chuyển Chế Độ TỰ ĐỘNG AI",
        msg_mode_manual: "Đã chuyển Chế Độ THỦ CÔNG",
        msg_gate_open: "Đã gửi lệnh MỞ CỐNG thành công",
        msg_gate_close: "Đã gửi lệnh ĐÓNG CỐNG thành công",
        msg_emg_on: "⚠️ ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP!",
        msg_emg_off: "✅ Đã khôi phục hoạt động bình thường",
        msg_save_success: "✅ Đã lưu cài đặt ngưỡng thành công!"
    },
    en: {
        app_title: "SALINITY CONTROL & MONITORING SYSTEM",
        app_subtitle: "Authors: Le Trong Nam, Tran Duy Khang, Huynh Minh Ngoc | Mentor: Tran Thi Hong Hanh",
        status_online: "Online",
        status_offline: "Offline",
        user_role: "Administrator",
        user_profile: "User Profile",
        language: "Language",
        logout: "System Logout",
        tab_monitor: "Realtime Monitor",
        tab_control: "Control & Camera",
        tab_phat_thanh: "Public Address PA",
        tab_settings: "Threshold Settings",
        tab_alerts: "Event Alerts Log",
        "tab_canh-bao": "Incident Alerts",
        tab_canh_bao: "Incident Alerts",
        tab_thao_tac: "Operation Logs",
        tab_bao_tri: "Maintenance Ticker",
        card_salinity: "RIVER SALINITY",
        card_temperature: "WATER TEMP",
        card_water_inner: "INNER WATER LEVEL",
        card_water_outer: "OUTER WATER LEVEL",
        card_diff: "LEVEL DIFF (ΔH)",
        card_motor_current: "MOTOR CURRENT",
        card_gate_status: "GATE STATUS",
        card_network: "NETWORK INFRA",
        threshold: "Threshold",
        safe: "SAFE",
        stable: "STABLE",
        safe_level: "Safe Threshold",
        river_water: "Outer River Level",
        outer_water: "OUTER RIVER",
        pressure_safe: "PRESSURE SAFE",
        gate_pressure: "Gate Pressure Diff",
        diff_safe_desc: "Balanced Hydraulic Pressure",
        motor_load: "Motor Load",
        normal: "NORMAL",
        buzzer_status: "Buzzer:",
        chart_title: "REALTIME SALINITY & WATER LEVEL TREND CHART",
        control_panel_title: "Sluice Gate Control Panel",
        operating_mode: "Operating Mode",
        mode_manual: "MANUAL MODE",
        mode_auto: "AUTO MODE",
        gate_action: "Gate Operation",
        open_gate: "OPEN GATE",
        close_gate: "CLOSE GATE",
        emergency_system: "Emergency Safety System",
        emergency_btn: "EMERGENCY STOP",
        camera_title: "Live Surveillance Camera",
        camera_connecting: "Sluice Gate IP Camera Stream Connecting...",
        settings_title: "Alert Threshold & Hardware Configuration",
        salinity_thresh_label: "Alert Salinity Threshold (ppt)",
        water_thresh_label: "Inner Gate Safe Water Level (cm)",
        stall_thresh_label: "Motor Overload / Jam Threshold (ADC)",
        height_thresh_label: "Ultrasonic Sensor Mounting Height (cm)",
        volume_label: "Emergency Buzzer Volume (0 - 30):",
        save: "Save Setting",
        alerts_log_title: "System Alerts & Incident Log",
        export_csv: "Export CSV Report",
        clear_log: "Clear Log",
        no_alerts: "No incident alerts recorded.",
        cancel: "Cancel",
        confirm_delete: "Delete History",
        confirm_clear_title: "Confirm Clear Incident Log?",
        confirm_clear_desc: "All alert history will be cleared from memory. This action cannot be undone!",
        modal_add_project_title: "Create New Project / Station",
        modal_project_name: "New Station / Project Name",
        modal_project_loc: "Location / Province",
        project_list_title: "System List",
        add_new: "Add New",
        create_new_project: "Create New Station",
        create_and_switch: "Create & Switch",
        modal_emg_title: "CONFIRM EMERGENCY STOP?",
        modal_emg_desc: "Emergency Stop will immediately lock all gate valves and trigger emergency alarm!",
        confirm_emg_btn: "CONFIRM STOP",
        err_emergency_active: "❌ Cannot operate while Emergency Stop is active!",
        err_auto_mode_active: "❌ System is in AUTO mode! Switch to MANUAL mode first.",
        err_firebase_conn: "❌ Firebase Database connection failed!",
        msg_mode_auto: "Switched to AUTO Mode",
        msg_mode_manual: "Switched to MANUAL Mode",
        msg_gate_open: "OPEN GATE command sent successfully",
        msg_gate_close: "CLOSE GATE command sent successfully",
        msg_emg_on: "⚠️ EMERGENCY STOP ACTIVATED!",
        msg_emg_off: "✅ Normal Operation Restored",
        msg_save_success: "✅ Settings saved successfully!"
    }
};

/**
 * Translate a key into current language.
 * @param {string} key
 * @returns {string} Translated string
 */
export function t(key) {
    if (!key) return '';
    return i18n[currentLang]?.[key] || i18n.vi[key] || key;
}

/**
 * Switch language and dynamically update DOM elements.
 * @param {string} lang - 'vi' or 'en'
 */
export function switchLanguage(lang) {
    if (lang !== 'vi' && lang !== 'en') {
        lang = 'vi';
    }
    currentLang = lang;
    try {
        localStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch (e) {}

    updateDOMTranslations();
}

/**
 * Update all DOM elements containing [data-i18n] attributes.
 */
export function updateDOMTranslations() {
    if (typeof document === 'undefined') return;

    const dict = i18n[currentLang] || i18n.vi;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && (el.type === 'placeholder' || el.getAttribute('placeholder'))) {
                el.placeholder = dict[key];
            } else {
                el.innerText = dict[key];
            }
        }
    });

    // Update select element if present
    const selectEl = document.getElementById('select-language');
    if (selectEl) {
        selectEl.value = currentLang;
    }
}

/**
 * Initialize language from localStorage or default.
 */
export function initI18n() {
    let savedLang = 'vi';
    try {
        savedLang = localStorage.getItem(STORAGE_KEYS.LANG) || 'vi';
    } catch (e) {}
    currentLang = savedLang;
    updateDOMTranslations();
}

/**
 * Get current active language code.
 * @returns {string} 'vi' or 'en'
 */
export function getCurrentLang() {
    return currentLang;
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.i18n = i18n;
    window.t = t;
    window.switchLanguage = switchLanguage;
    window.updateDOMTranslations = updateDOMTranslations;
    window.getCurrentLang = getCurrentLang;
}

export default {
    i18n,
    t,
    switchLanguage,
    updateDOMTranslations,
    initI18n,
    getCurrentLang
};
