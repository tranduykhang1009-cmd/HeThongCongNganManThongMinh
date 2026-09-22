/**
 * @file logs.js
 * @description Incident alerts and user action audit log tables, search and date filtering,
 *              client-side pagination, UTF-8 CSV report export, and administrative purge.
 * @module modules/logs
 */

import {
    db,
    ref,
    push,
    remove,
    onValue,
    query,
    limitToLast,
    serverTimestamp,
    auth
} from '../config/firebase-config.js';

import {
    getState,
    updateState
} from '../core/state.js';

import { showToast } from '../utils/ui-utils.js';
import {
    escapeHtml,
    removeVietnameseTones,
    formatDate
} from '../utils/formatters.js';

/**
 * Log user operational action to Firebase Realtime Database (nhat_ky node).
 * @param {string} tenHanhDong - Action title
 * @param {string} [chiTiet=''] - Action details
 */
export async function ghiNhatKy(tenHanhDong, chiTiet = '') {
    try {
        const currentUser = auth ? auth.currentUser : null;
        const email = (currentUser && currentUser.email) ? currentUser.email : "Khách ẩn danh";
        const logRef = ref(db, 'nhat_ky');
        await push(logRef, {
            thaoTac: tenHanhDong,
            chiTiet: chiTiet || tenHanhDong,
            nguoiThucHien: email,
            thoiGian: serverTimestamp(),
            timestamp: Date.now()
        });
    } catch (err) {
        console.error("[Logs] Error logging user action to Firebase (nhat_ky):", err);
    }
}

/**
 * Log automatic system event or sensor alert to Firebase RTDB.
 * @param {string} tenHanhDong - Event title
 * @param {string} [chiTiet=''] - Event details
 */
export async function ghiNhatKyTuDong(tenHanhDong, chiTiet = '') {
    try {
        const logRef = ref(db, 'nhat_ky');
        await push(logRef, {
            thaoTac: tenHanhDong,
            chiTiet: chiTiet || tenHanhDong,
            nguoiThucHien: "Hệ thống tự động",
            thoiGian: serverTimestamp(),
            timestamp: Date.now()
        });
    } catch (err) {
        console.error("[Logs] Error logging automatic system event (nhat_ky):", err);
    }
}

// Global Alias
export const logAction = ghiNhatKy;

/**
 * Realtime query listener for the nhat_ky logs node (limited to last 50 entries).
 */
export function hienThiNhatKy() {
    try {
        const logsRef = query(ref(db, 'nhat_ky'), limitToLast(50));
        onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                updateState('allFirebaseLogs', []);
                renderNhatKyToHTML();
                return;
            }

            const logsArray = [];
            Object.keys(data).forEach(key => {
                const item = data[key];
                let ts = item.timestamp;
                if (!ts && typeof item.thoiGian === 'number') ts = item.thoiGian;
                if (!ts) ts = Date.now();

                const dateObj = new Date(ts);
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();

                const formattedTime = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                const dateISO = `${year}-${month}-${day}`;

                logsArray.push({
                    key: key,
                    thaoTac: item.thaoTac || 'THAO TÁC',
                    chiTiet: item.chiTiet || item.thaoTac || '',
                    nguoiThucHien: item.nguoiThucHien || 'Khách ẩn danh',
                    timeStr: formattedTime,
                    dateISO: dateISO,
                    timestamp: ts
                });
            });

            logsArray.sort((a, b) => b.timestamp - a.timestamp);
            updateState('allFirebaseLogs', logsArray);
            renderNhatKyToHTML();
        }, (err) => {
            console.error("[Logs] Error listening to nhat_ky:", err);
        });
    } catch (err) {
        console.error("[Logs] Failed to attach nhat_ky listener:", err);
    }
}

/**
 * Separate logs into Incident Alerts and User Actions, then trigger table rendering.
 */
export function renderNhatKyToHTML() {
    const allLogs = getState('allFirebaseLogs') || [];
    const alertLogs = [];
    const actionLogs = [];

    allLogs.forEach(item => {
        const titleUpper = (item.thaoTac || '').toUpperCase();
        const detailUpper = (item.chiTiet || '').toUpperCase();

        const isAlert = titleUpper.includes("CẢNH BÁO") ||
                        titleUpper.includes("MẶN") ||
                        titleUpper.includes("NƯỚC") ||
                        titleUpper.includes("MẤT KẾT NỐI") ||
                        titleUpper.includes("KHÔI PHỤC") ||
                        titleUpper.includes("KẸT CỐNG") ||
                        titleUpper.includes("DỪNG KHẨN CẤP") ||
                        titleUpper.includes("LỖI") ||
                        item.nguoiThucHien === "Hệ thống tự động" ||
                        detailUpper.includes("VƯỢT NGƯỠNG");

        if (isAlert) {
            alertLogs.push(item);
        } else {
            actionLogs.push(item);
        }
    });

    const tableState = getState('tableState') || {
        alert: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
        action: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
        maint: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] }
    };

    tableState.alert.rawData = alertLogs;
    tableState.action.rawData = actionLogs;
    updateState('tableState', tableState);

    renderTableData('alert');
    renderTableData('action');
}

/**
 * Handle search or date filter changes for logs tables.
 * @param {'alert'|'action'|'maint'} type
 */
export function onLogFilterChange(type) {
    const searchEl = document.getElementById(`${type}-search-input`);
    const dateEl = document.getElementById(`${type}-date-input`);

    const tableState = getState('tableState');
    if (tableState && tableState[type]) {
        tableState[type].search = searchEl ? searchEl.value.trim().toLowerCase() : '';
        tableState[type].date = dateEl ? dateEl.value : '';
        tableState[type].page = 1; // Reset to page 1 on filter change
        updateState('tableState', tableState);
        renderTableData(type);
    }
}

/**
 * Filter dataset and trigger page rendering for a specified table type.
 * @param {'alert'|'action'|'maint'} type
 */
export function renderTableData(type) {
    const tableState = getState('tableState');
    if (!tableState || !tableState[type]) return;

    const state = tableState[type];
    const rawList = state.rawData || [];

    const normSearch = removeVietnameseTones(state.search);

    state.filteredData = rawList.filter(item => {
        // Date match filter
        if (state.date && item.dateISO && item.dateISO !== state.date) {
            return false;
        }

        // Search text match
        if (state.search) {
            const rawTitle = (item.thaoTac || item.thoiGian || '').toLowerCase();
            const rawDetail = (item.chiTiet || item.ghiChu || '').toLowerCase();
            const rawUser = (item.nguoiThucHien || '').toLowerCase();

            const titleMatch = rawTitle.includes(state.search) || removeVietnameseTones(rawTitle).includes(normSearch);
            const detailMatch = rawDetail.includes(state.search) || removeVietnameseTones(rawDetail).includes(normSearch);
            const userMatch = rawUser.includes(state.search) || removeVietnameseTones(rawUser).includes(normSearch);

            if (!titleMatch && !detailMatch && !userMatch) return false;
        }

        return true;
    });

    updateState('tableState', tableState);
    renderPageOnly(type);
}

/**
 * Change page index for a table (+1 or -1).
 * @param {'alert'|'action'|'maint'} type
 * @param {number} delta
 */
export function changePage(type, delta) {
    const tableState = getState('tableState');
    if (!tableState || !tableState[type]) return;

    const state = tableState[type];
    const totalPages = Math.ceil((state.filteredData.length || 1) / state.itemsPerPage) || 1;
    const newPage = state.page + delta;

    if (newPage >= 1 && newPage <= totalPages) {
        state.page = newPage;
        updateState('tableState', tableState);
        renderPageOnly(type);
    }
}

/**
 * Render HTML table rows and pagination controls for current page slice.
 * @param {'alert'|'action'|'maint'} type
 */
export function renderPageOnly(type) {
    const tableState = getState('tableState');
    if (!tableState || !tableState[type]) return;

    const state = tableState[type];
    let tbodyId = '';
    if (type === 'alert') tbodyId = 'alert-logs-tbody';
    else if (type === 'action') tbodyId = 'action-logs-tbody';
    else if (type === 'maint') tbodyId = 'maint-history-tbody';

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const totalItems = state.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));

    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const startIndex = (state.page - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, totalItems);
    const currentItems = state.filteredData.slice(startIndex, endIndex);

    if (currentItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 font-medium">Không có dữ liệu phù hợp.</td></tr>`;
    } else {
        let html = '';
        currentItems.forEach((item, index) => {
            const stt = startIndex + index + 1;
            const timeDisplay = item.timeStr || item.thoiGian || '--';
            const actionDisplay = escapeHtml(item.thaoTac || 'THAO TÁC');
            const detailDisplay = escapeHtml(item.chiTiet || item.ghiChu || '');
            const userDisplay = escapeHtml(item.nguoiThucHien || 'Hệ thống');

            let badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
            if (actionDisplay.includes("CẢNH BÁO") || actionDisplay.includes("LỖI") || actionDisplay.includes("MẤT KẾT NỐI") || actionDisplay.includes("DỪNG")) {
                badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300";
            } else if (actionDisplay.includes("KHÔI PHỤC") || actionDisplay.includes("BẢO TRÌ")) {
                badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
            }

            html += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                    <td class="px-4 py-3 font-bold text-center text-slate-400">${stt}</td>
                    <td class="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">${timeDisplay}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${actionDisplay}</span>
                        <div class="text-xs text-slate-500 mt-1">${detailDisplay}</div>
                    </td>
                    <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span>${userDisplay}</span>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Update Pagination Labels & Button states
    const infoEl = document.getElementById(`${type}-page-info`);
    if (infoEl) {
        infoEl.innerText = totalItems > 0
            ? `Hiển thị ${startIndex + 1} - ${endIndex} / ${totalItems} mục (Trang ${state.page}/${totalPages})`
            : `Không có dữ liệu`;
    }

    const prevBtn = document.getElementById(`${type}-prev-btn`);
    const nextBtn = document.getElementById(`${type}-next-btn`);

    if (prevBtn) {
        prevBtn.disabled = state.page <= 1;
        if (state.page <= 1) {
            prevBtn.classList.add('opacity-40', 'cursor-not-allowed');
        } else {
            prevBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        }
    }

    if (nextBtn) {
        nextBtn.disabled = state.page >= totalPages;
        if (state.page >= totalPages) {
            nextBtn.classList.add('opacity-40', 'cursor-not-allowed');
        } else {
            nextBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        }
    }

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: tbody });
    }
}

/**
 * Export filtered table dataset to UTF-8 CSV format with Byte Order Mark (BOM).
 * @param {'alert'|'action'|'maint'} type
 */
export function exportLogsCSV(type) {
    const tableState = getState('tableState');
    const state = tableState && tableState[type];

    if (!state || !state.filteredData || state.filteredData.length === 0) {
        showToast('Không có dữ liệu để xuất CSV!', 'error');
        return;
    }

    let csvContent = "STT,Thời Gian,Hoạt Động / Cảnh Báo,Nội Dung Chi Tiết,Người Thực Hiện\\n";

    state.filteredData.forEach((item, index) => {
        const stt = index + 1;
        const time = (item.timeStr || item.thoiGian || '').replace(/,/g, ' ');
        const action = (item.thaoTac || '').replace(/,/g, ' ').replace(/"/g, '""');
        const detail = (item.chiTiet || item.ghiChu || '').replace(/,/g, ' ').replace(/"/g, '""');
        const user = (item.nguoiThucHien || '').replace(/,/g, ' ');

        csvContent += `${stt},${time},"${action}","${detail}",${user}\\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileName = `SCADA_Logs_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Đã xuất báo cáo CSV (${state.filteredData.length} dòng)!`, 'success');
}

/**
 * Administratively delete log records from Firebase Realtime Database with 2-step confirmation.
 * @param {'alert'|'action'|'maint'} type
 */
export async function deleteLogsData(type) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền xóa nhật ký!", "error");
        return;
    }

    let confirmMsg = "Bạn có chắc chắn muốn xóa toàn bộ lịch sử này không?";
    let dbPath = 'nhat_ky';

    if (type === 'maint') {
        confirmMsg = "XÓA LỊCH SỬ BẢO TRÌ?\n\nThao tác này sẽ xóa vĩnh viễn toàn bộ nhật ký lịch sử bảo trì kỹ thuật trên máy chủ Firebase.";
        dbPath = 'maintenance_history';
    } else if (type === 'alert') {
        confirmMsg = "XÓA NHẬT KÝ CẢNH BÁO?\n\nThao tác này sẽ xóa sạch nhật ký sự cố trên máy chủ Firebase.";
    } else if (type === 'action') {
        confirmMsg = "XÓA LỊCH SỬ THAO TÁC?\n\nThao tác này sẽ xóa sạch lịch sử người dùng trên máy chủ Firebase.";
    }

    if (!confirm(confirmMsg)) return;

    try {
        await remove(ref(db, dbPath));
        const tableState = getState('tableState');
        if (tableState && tableState[type]) {
            tableState[type].rawData = [];
            tableState[type].filteredData = [];
            tableState[type].page = 1;
            updateState('tableState', tableState);
            renderTableData(type);
        }

        if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
            window.logAction(`Xóa nhật ký ${type}`);
        }
        showToast(`Đã xóa sạch dữ liệu nhật ký ${type}!`, 'success');
    } catch (err) {
        console.error(`[Logs] Error deleting ${type} logs:`, err);
        showToast(`Lỗi khi xóa dữ liệu: ${err.message}`, 'error');
    }
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.ghiNhatKy = ghiNhatKy;
    window.ghiNhatKyTuDong = ghiNhatKyTuDong;
    window.logAction = logAction;
    window.hienThiNhatKy = hienThiNhatKy;
    window.renderNhatKyToHTML = renderNhatKyToHTML;
    window.onLogFilterChange = onLogFilterChange;
    window.renderTableData = renderTableData;
    window.changePage = changePage;
    window.renderPageOnly = renderPageOnly;
    window.exportLogsCSV = exportLogsCSV;
    window.deleteLogsData = deleteLogsData;
}

export default {
    ghiNhatKy,
    ghiNhatKyTuDong,
    logAction,
    hienThiNhatKy,
    renderNhatKyToHTML,
    onLogFilterChange,
    renderTableData,
    changePage,
    renderPageOnly,
    exportLogsCSV,
    deleteLogsData
};
