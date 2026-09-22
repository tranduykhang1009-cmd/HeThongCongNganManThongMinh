/**
 * @file formatters.js
 * @description Formatting utilities for relative timestamps, Vietnamese text normalization, and HTML escaping.
 * @module utils/formatters
 */

/**
 * Convert a timestamp into a human-readable relative time string in Vietnamese.
 * @param {number|string|Date} timestamp
 * @returns {string} Relative time string (e.g., "Vừa xong", "15 giây trước", "3 phút trước")
 */
export function timeAgo(timestamp) {
    if (!timestamp) return "Chưa có";
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return "Chưa có";

    const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    if (seconds < 0) return "Vừa xong";

    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + " năm trước";

    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + " tháng trước";

    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + " ngày trước";

    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + " giờ trước";

    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " phút trước";

    if (seconds < 10) return "Vừa xong";
    return Math.floor(seconds) + " giây trước";
}

/**
 * Convert a timestamp into an active online duration string.
 * @param {number|string|Date} timestamp
 * @returns {string} Duration string (e.g., "vài giây", "5 phút", "2 giờ", "3 ngày")
 */
export function onlineDuration(timestamp) {
    if (!timestamp) return "vừa xong";
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return "vừa xong";

    const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    if (seconds < 0) return "vừa xong";

    let interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + " ngày";

    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + " giờ";

    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " phút";

    if (seconds < 10) return "vài giây";
    return Math.floor(seconds) + " giây";
}

/**
 * Remove Vietnamese accents and diacritics for search indexing and comparisons.
 * @param {string} str
 * @returns {string} Normalized ASCII string
 */
export function removeVietnameseTones(str) {
    if (!str) return "";
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

/**
 * Escape HTML special characters to prevent XSS attacks in dynamic rendering.
 * @param {string} str
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Escape JavaScript string characters for safe inline insertion.
 * @param {string} str
 * @returns {string} Escaped string
 */
export function escapeJs(str) {
    if (!str) return "";
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}

/**
 * Safely parse date and format into readable date-time string.
 * @param {number|string|Date} date
 * @param {'full'|'date'|'time'|'iso'} [format='full']
 * @returns {string}
 */
export function formatDate(date, format = 'full') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();

    if (format === 'time') return `${hours}:${minutes}:${seconds}`;
    if (format === 'date') return `${day}/${month}/${year}`;
    if (format === 'iso') return `${year}-${month}-${day}`;
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

/**
 * Safely convert any date representation to epoch milliseconds.
 * @param {number|string|Date} val
 * @returns {number}
 */
export function getTime(val) {
    if (!val) return 0;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

/**
 * Safely format numbers with fixed decimal places.
 * @param {number|string} num
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatNumber(num, decimals = 1) {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '--';
    return parsed.toFixed(decimals);
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.timeAgo = timeAgo;
    window.onlineDuration = onlineDuration;
    window.removeVietnameseTones = removeVietnameseTones;
    window.escapeHtml = escapeHtml;
    window.escapeJs = escapeJs;
    window.formatDate = formatDate;
    window.getTime = getTime;
    window.formatNumber = formatNumber;
}

export default {
    timeAgo,
    onlineDuration,
    removeVietnameseTones,
    escapeHtml,
    escapeJs,
    formatDate,
    getTime,
    formatNumber
};
