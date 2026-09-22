/**
 * @file maintenance.js
 * @description Realtime maintenance countdown ticker (1-second timer), overdue status styling,
 *              maintenance history logging, cycle interval settings modal, and service completion reset.
 * @module modules/maintenance
 */

import {
    db,
    ref,
    set,
    update,
    push,
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

import { showToast, openModal, closeModal } from '../utils/ui-utils.js';
import { renderTableData } from './logs.js';

let maintTickerInterval = null;

/**
 * Add a quick pre-defined tag to the maintenance note textarea.
 * @param {string} tagText
 */
export function addMaintTag(tagText) {
    const input = document.getElementById('maint-note-input');
    if (!input) return;
    let currentVal = input.value.trim();
    if (currentVal === '') {
        input.value = tagText;
    } else {
        currentVal = currentVal.replace(/,\s*$/, "");
        input.value = currentVal + ', ' + tagText;
    }
}

/**
 * Master UI updater for the 1-second maintenance countdown ticker and progress bar.
 */
export function langCapNhatBaoTriUI() {
    const data = getState('langMaintenanceData') || {
        last_maintenance_timestamp: Date.now(),
        interval_ms: 30 * 24 * 60 * 60 * 1000,
        interval_days: 30
    };

    const lastTs = data.last_maintenance_timestamp || Date.now();
    const intervalMs = data.interval_ms || ((data.interval_days || 30) * 24 * 60 * 60 * 1000);

    const targetTs = lastTs + intervalMs;
    const now = Date.now();
    const diffMs = targetTs - now;

    const totalMs = intervalMs;
    const elapsedMs = now - lastTs;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

    const daysEl = document.getElementById('ticker-days');
    const hoursEl = document.getElementById('ticker-hours');
    const minsEl = document.getElementById('ticker-minutes');
    const secsEl = document.getElementById('ticker-seconds');

    const titleEl = document.getElementById('maint-ticker-title');
    const badgeEl = document.getElementById('maint-status-badge');
    const barEl = document.getElementById('maint-progress-bar');
    const percentEl = document.getElementById('maint-progress-percent');
    const dateEl = document.getElementById('maint-last-date');
    const intervalDisplayEl = document.getElementById('maint-interval-display');

    // Update interval display text
    if (intervalDisplayEl) {
        const iD = Math.floor(intervalMs / (24 * 60 * 60 * 1000));
        const iH = Math.floor((intervalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const iM = Math.floor((intervalMs % (60 * 60 * 1000)) / (60 * 1000));
        let displayStr = [];
        if (iD > 0) displayStr.push(`${iD} ngày`);
        if (iH > 0) displayStr.push(`${iH} giờ`);
        if (iM > 0) displayStr.push(`${iM} phút`);
        if (displayStr.length === 0) displayStr.push('0 phút');
        intervalDisplayEl.innerText = displayStr.join(' ');
    }

    // Update last maintenance date
    if (dateEl) {
        const dateObj = new Date(lastTs);
        const lH = String(dateObj.getHours()).padStart(2, '0');
        const lM = String(dateObj.getMinutes()).padStart(2, '0');
        const ld = String(dateObj.getDate()).padStart(2, '0');
        const lm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const lY = dateObj.getFullYear();
        dateEl.innerText = `${lH}:${lM} ${ld}/${lm}/${lY}`;
    }

    // Update Progress Bar
    if (barEl) {
        barEl.style.width = `${progressPercent}%`;
        if (diffMs < 0) {
            barEl.className = "h-full rounded-full transition-all duration-500 bg-rose-500 shadow-md shadow-rose-500/50";
        } else if (progressPercent > 80) {
            barEl.className = "h-full rounded-full transition-all duration-500 bg-amber-500 shadow-md shadow-amber-500/50";
        } else {
            barEl.className = "h-full rounded-full transition-all duration-500 bg-blue-600 shadow-md shadow-blue-500/50";
        }
    }
    if (percentEl) {
        percentEl.innerText = `${progressPercent}%`;
    }

    const blocks = ['block-days', 'block-hours', 'block-minutes', 'block-seconds'];

    if (diffMs < 0) {
        // OVERDUE CASE
        const absDiff = Math.abs(diffMs);
        const oD = Math.floor(absDiff / (24 * 60 * 60 * 1000));
        const oH = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const oM = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000));
        const oS = Math.floor((absDiff % (60 * 1000)) / 1000);

        if (daysEl) daysEl.innerText = String(oD).padStart(2, '0');
        if (hoursEl) hoursEl.innerText = String(oH).padStart(2, '0');
        if (minsEl) minsEl.innerText = String(oM).padStart(2, '0');
        if (secsEl) secsEl.innerText = String(oS).padStart(2, '0');

        if (titleEl) {
            titleEl.innerHTML = `<span class="text-rose-500 animate-pulse flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i> ĐÃ QUÁ HẠN BẢO TRÌ!</span>`;
        }
        if (badgeEl) {
            badgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse";
            badgeEl.innerText = "CẦN BẢO TRÌ NGAY";
        }

        blocks.forEach(bId => {
            const b = document.getElementById(bId);
            if (b) {
                b.className = "p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 flex flex-col items-center justify-center shadow-inner animate-pulse";
            }
        });

    } else {
        // ON SCHEDULE CASE
        const dD = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const dH = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const dM = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        const dS = Math.floor((diffMs % (60 * 1000)) / 1000);

        if (daysEl) daysEl.innerText = String(dD).padStart(2, '0');
        if (hoursEl) hoursEl.innerText = String(dH).padStart(2, '0');
        if (minsEl) minsEl.innerText = String(dM).padStart(2, '0');
        if (secsEl) secsEl.innerText = String(dS).padStart(2, '0');

        if (titleEl) {
            titleEl.innerHTML = `<span>Đếm ngược đến đợt bảo trì tiếp theo</span>`;
        }
        if (badgeEl) {
            badgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
            badgeEl.innerText = "ĐANG VẬN HÀNH TỐT";
        }

        blocks.forEach(bId => {
            const b = document.getElementById(bId);
            if (b) {
                b.className = "p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center shadow-inner";
            }
        });
    }

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

/**
 * Initialize Firebase Realtime Database listeners for maintenance node and maintenance history.
 */
export function langKhoiTaoBaoTriListener() {
    try {
        // 1. Listen to maintenance config
        const maintRef = ref(db, 'maintenance');
        onValue(maintRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.last_maintenance_timestamp) {
                updateState('langMaintenanceData', data);
                if (typeof window !== 'undefined') window.langMaintenanceData = data;
                langCapNhatBaoTriUI();
            } else {
                const initialData = {
                    last_maintenance_timestamp: Date.now(),
                    interval_ms: 30 * 24 * 60 * 60 * 1000,
                    interval_days: 30
                };
                set(maintRef, initialData).catch(e => console.warn("[Maintenance] Init default error:", e));
                updateState('langMaintenanceData', initialData);
                if (typeof window !== 'undefined') window.langMaintenanceData = initialData;
                langCapNhatBaoTriUI();
            }
        });

        // 2. Listen to maintenance history records
        const histRef = query(ref(db, 'maintenance_history'), limitToLast(50));
        onValue(histRef, (snapshot) => {
            const data = snapshot.val();
            const tableState = getState('tableState');
            if (!data) {
                if (tableState && tableState.maint) {
                    tableState.maint.rawData = [];
                    updateState('tableState', tableState);
                    renderTableData('maint');
                }
                return;
            }

            const historyArray = [];
            Object.keys(data).forEach(key => {
                const item = data[key];
                let ts = item.timestamp || Date.now();
                const dateObj = new Date(ts);
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();

                const formattedTime = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                const dateISO = `${year}-${month}-${day}`;

                historyArray.push({
                    key: key,
                    thaoTac: "HOÀN TẤT BẢO TRÌ",
                    chiTiet: item.ghiChu || "Bảo dưỡng định kỳ",
                    ghiChu: item.ghiChu || "Bảo dưỡng định kỳ",
                    nguoiThucHien: item.nguoiThucHien || "Kỹ thuật viên",
                    timeStr: formattedTime,
                    thoiGian: formattedTime,
                    dateISO: dateISO,
                    timestamp: ts
                });
            });

            historyArray.sort((a, b) => b.timestamp - a.timestamp);
            if (tableState && tableState.maint) {
                tableState.maint.rawData = historyArray;
                updateState('tableState', tableState);
                renderTableData('maint');
            }
        });

        // 3. Start 1-second countdown ticker
        if (maintTickerInterval) clearInterval(maintTickerInterval);
        maintTickerInterval = setInterval(langCapNhatBaoTriUI, 1000);

    } catch (err) {
        console.error("[Maintenance] Error initializing maintenance listeners:", err);
    }
}

/**
 * Open modal to complete and log maintenance.
 */
export function openMaintConfirmModal() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền xác nhận bảo trì!", "error");
        return;
    }
    const noteInput = document.getElementById('maint-note-input');
    if (noteInput) noteInput.value = "Kiểm tra định kỳ, bôi trơn bạc đạn, lau cảm biến";
    openModal('modal-maint-confirm');
}

/**
 * Open modal to configure maintenance cycle interval.
 */
export function openMaintSettingsModal() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền thay đổi chu kỳ bảo trì!", "error");
        return;
    }

    const data = getState('langMaintenanceData') || {};
    const intervalMs = data.interval_ms || ((data.interval_days || 30) * 24 * 60 * 60 * 1000);

    const iD = Math.floor(intervalMs / (24 * 60 * 60 * 1000));
    const iH = Math.floor((intervalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const iM = Math.floor((intervalMs % (60 * 60 * 1000)) / (60 * 1000));

    const inpDays = document.getElementById('inp-maint-days');
    const inpHours = document.getElementById('inp-maint-hours');
    const inpMins = document.getElementById('inp-maint-mins');

    if (inpDays) inpDays.value = iD;
    if (inpHours) inpHours.value = iH;
    if (inpMins) inpMins.value = iM;

    openModal('modal-maint-settings');
}

/**
 * Save maintenance interval settings to Firebase RTDB.
 */
export async function saveMaintInterval() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền lưu chu kỳ!", "error");
        return;
    }

    const inpDays = document.getElementById('inp-maint-days');
    const inpHours = document.getElementById('inp-maint-hours');
    const inpMins = document.getElementById('inp-maint-mins');

    const d = parseInt(inpDays?.value || 0, 10);
    const h = parseInt(inpHours?.value || 0, 10);
    const m = parseInt(inpMins?.value || 0, 10);

    const totalMs = ((d * 24 + h) * 60 + m) * 60 * 1000;

    if (totalMs <= 0) {
        showToast("Vui lòng nhập thời gian chu kỳ lớn hơn 0.", "error");
        return;
    }

    try {
        await update(ref(db, 'maintenance'), {
            interval_ms: totalMs,
            interval_days: d
        });
        closeModal('modal-maint-settings');
        showToast("Lưu cài đặt chu kỳ thành công!", "success");
    } catch (err) {
        console.error("[Maintenance] Error saving interval:", err);
        showToast(`Lỗi cập nhật: ${err.message}`, 'error');
    }
}

/**
 * Complete maintenance service, push history record, and reset countdown clock.
 */
export async function hoanTatBaoTri() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền hoàn tất bảo trì!", "error");
        return;
    }

    const noteInput = document.getElementById('maint-note-input');
    const note = noteInput ? noteInput.value.trim() : '';
    const finalNote = note || "Đã bảo trì định kỳ hệ thống";

    const currentUser = auth ? auth.currentUser : null;
    const email = (currentUser && currentUser.email) ? currentUser.email : "Kỹ thuật viên";
    const newTs = Date.now();

    try {
        // 1. Update last maintenance timestamp
        await update(ref(db, 'maintenance'), {
            last_maintenance_timestamp: newTs
        });

        // 2. Push history log
        await push(ref(db, 'maintenance_history'), {
            timestamp: newTs,
            thoiGian: serverTimestamp(),
            nguoiThucHien: email,
            ghiChu: finalNote
        });

        // 3. Log to general audit logs
        if (typeof window !== 'undefined' && typeof window.ghiNhatKy === 'function') {
            await window.ghiNhatKy('BẢO TRÌ THIẾT BỊ', 'Đã hoàn tất bảo trì định kỳ: ' + finalNote);
        }

        closeModal('modal-maint-confirm');
        langCapNhatBaoTriUI();
        showToast('✅ Đã lưu nhật ký bảo trì và đặt lại đồng hồ!', 'success');
    } catch (err) {
        console.error("[Maintenance] Error completing maintenance:", err);
        showToast(`Lỗi cập nhật bảo trì: ${err.message}`, 'error');
    }
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.addMaintTag = addMaintTag;
    window.langCapNhatBaoTriUI = langCapNhatBaoTriUI;
    window.langKhoiTaoBaoTriListener = langKhoiTaoBaoTriListener;
    window.openMaintConfirmModal = openMaintConfirmModal;
    window.openMaintSettingsModal = openMaintSettingsModal;
    window.saveMaintInterval = saveMaintInterval;
    window.hoanTatBaoTri = hoanTatBaoTri;
}

export default {
    addMaintTag,
    langCapNhatBaoTriUI,
    langKhoiTaoBaoTriListener,
    openMaintConfirmModal,
    openMaintSettingsModal,
    saveMaintInterval,
    hoanTatBaoTri
};
