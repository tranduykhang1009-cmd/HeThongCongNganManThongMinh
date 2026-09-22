/**
 * @file control.js
 * @description Sluice gate control operations, Auto/Manual mode switching,
 *              Emergency Stop (E-Stop) system, and 3D simulation animations.
 * @module modules/control
 */

import { getState, updateState } from '../core/state.js';
import { writeFirebase, setFirebase } from '../services/firebase-service.js';
import { showToast, openModal, closeModal } from '../utils/ui-utils.js';
import { t } from '../core/i18n.js';
import { STORAGE_KEYS } from '../config/app-constants.js';

/**
 * Update DOM elements reflecting Auto vs Manual mode state.
 * @param {number} mode - 0 for Manual, 1 for Auto
 */
export function updateModeDOM(mode) {
    const btnManual = document.getElementById('btn-mode-manual');
    const btnAuto = document.getElementById('btn-mode-auto');
    const badgeMode = document.getElementById('badge-mode');
    const isAuto = mode === 1;

    if (btnManual && btnAuto) {
        if (isAuto) {
            btnAuto.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30";
            btnManual.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
        } else {
            btnManual.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400/30";
            btnAuto.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
        }
    }

    if (badgeMode) {
        badgeMode.innerText = isAuto ? "TỰ ĐỘNG AI" : "THỦ CÔNG";
        badgeMode.className = isAuto
            ? "px-2.5 py-1 rounded-xl text-xs font-black text-white bg-blue-600 shadow-md shadow-blue-600/30"
            : "px-2.5 py-1 rounded-xl text-xs font-black text-white bg-amber-500 shadow-md shadow-amber-500/30";
    }
}

/**
 * Execute gate Open (1.0) or Close (0.0) commands with loading button feedback.
 * @param {number} val - 1 for Open, 0 for Close
 * @param {HTMLElement} [btnEl] - The button element triggered
 */
export async function setGateWithLoading(val, btnEl) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể thực hiện lệnh điều khiển!", "error");
        return;
    }

    const hbTracker = getState('hbTracker') || { cong: { isOnline: false } };
    if (hbTracker.cong && !hbTracker.cong.isOnline) {
        showToast("CẢNH BÁO AN TOÀN: Trạm Cống đang mất kết nối! Không thể điều khiển.", "error");
        return;
    }

    const dataCache = getState('dataCache') || {};
    if (dataCache.emergency_stop === 1 || dataCache.emergency_ket_cong === 1) {
        showToast("Hệ thống đang dừng khẩn cấp! Vui lòng khôi phục trước khi điều khiển.", "error");
        return;
    }

    if (dataCache.mode === 1) {
        showToast("Hệ thống đang ở chế độ TỰ ĐỘNG AI! Vui lòng chuyển sang THỦ CÔNG để thao tác tay.", "warning");
        return;
    }

    let originalHtml = '';
    if (btnEl) {
        originalHtml = btnEl.innerHTML;
        btnEl.disabled = true;
        btnEl.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>`;
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ root: btnEl });
        }
    }

    try {
        const success = await writeFirebase('control', { gate_target: val });
        if (success) {
            const actionText = val === 1 ? 'Ra lệnh mở cống (Thủ công)' : 'Ra lệnh đóng cống (Thủ công)';
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction(actionText);
            }
            showToast('Đã gửi lệnh điều khiển thành công!', 'success');
        } else {
            throw new Error('Không thể ghi dữ liệu tới Firebase');
        }
    } catch (err) {
        console.error("[Control] setGateWithLoading error:", err);
        showToast(`Lỗi gửi lệnh điều khiển: ${err.message}`, 'error');
    } finally {
        if (btnEl) {
            setTimeout(() => {
                btnEl.disabled = false;
                btnEl.innerHTML = originalHtml;
                if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                    lucide.createIcons({ root: btnEl });
                }
            }, 1000);
        }
    }
}

/**
 * Switch operational mode between Auto (1) and Manual (0) with optimistic UI.
 * @param {number} val - 1 for Auto, 0 for Manual
 * @param {HTMLElement} [btnEl]
 */
export async function setModeOptimistic(val, btnEl) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể chuyển đổi chế độ!", "error");
        return;
    }

    const hbTracker = getState('hbTracker') || { cong: { isOnline: false } };
    if (hbTracker.cong && !hbTracker.cong.isOnline) {
        showToast("CẢNH BÁO AN TOÀN: Trạm Cống đang mất kết nối!", "error");
        return;
    }

    let originalHtml = '';
    if (btnEl) {
        originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>`;
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ root: btnEl });
        }
    }

    updateModeDOM(val);

    try {
        const success = await writeFirebase('control', { mode: val });
        if (success) {
            const modeText = val === 1 ? 'Chuyển sang chế độ TỰ ĐỘNG AI' : 'Chuyển sang chế độ THỦ CÔNG';
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction(modeText);
            }
            showToast('Đã gửi lệnh chuyển chế độ!', 'success');
        } else {
            throw new Error('Ghi dữ liệu thất bại');
        }
    } catch (err) {
        console.error("[Control] setModeOptimistic error:", err);
        showToast(`Lỗi chuyển chế độ: ${err.message}`, 'error');
        // Revert DOM on error
        const dataCache = getState('dataCache') || {};
        updateModeDOM(dataCache.mode || 0);
    } finally {
        if (btnEl) {
            setTimeout(() => {
                btnEl.innerHTML = originalHtml;
                if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                    lucide.createIcons({ root: btnEl });
                }
            }, 600);
        }
    }
}

/**
 * Open Emergency Stop confirmation modal.
 */
export function confirmEmergencyToggle() {
    openModal('modal-confirm-emergency');
}

/**
 * Execute Emergency Stop toggle or reset.
 */
export async function executeToggleEmergency() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể thao tác dừng khẩn cấp!", "error");
        return;
    }

    const dataCache = getState('dataCache') || {};
    const isCurrentlyKetCong = dataCache.emergency_ket_cong === 1;
    const isCurrentlyEmg = dataCache.emergency_stop === 1;

    try {
        if (isCurrentlyKetCong) {
            // Reset jam state
            await writeFirebase('tram_cong', { emergency_ket_cong: 0 });
            await writeFirebase('control', { emergency_stop: 0 });
            closeModal('modal-confirm-emergency');
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction("Khôi phục hoạt động sau kẹt cống");
            }
            showToast('Đã khôi phục hoạt động sau kẹt cống!', 'success');
            return;
        }

        const newVal = isCurrentlyEmg ? 0 : 1;
        await writeFirebase('control', { emergency_stop: newVal });
        closeModal('modal-confirm-emergency');

        if (newVal === 1) {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction("Kích hoạt Dừng Khẩn Cấp");
            }
            showToast('ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP!', 'error');
        } else {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction("Khôi phục hoạt động hệ thống");
            }
            showToast('Đã khôi phục hoạt động hệ thống!', 'success');
        }
    } catch (err) {
        console.error("[Control] executeToggleEmergency error:", err);
        showToast(`Lỗi xử lý dừng khẩn cấp: ${err.message}`, 'error');
    }
}

/**
 * Toggle visibility of 3D CSS Simulation section.
 */
export function toggleSimulation() {
    const simSection = document.getElementById('simulation-section') || document.getElementById('sim-3d-wrapper');
    const btnToggle = document.getElementById('btn-toggle-sim');
    if (!simSection) return;

    const isHidden = simSection.classList.contains('hidden');
    if (isHidden) {
        simSection.classList.remove('hidden');
        localStorage.setItem(STORAGE_KEYS.HIDE_SIM, 'false');
        if (btnToggle) {
            btnToggle.innerHTML = `<i data-lucide="eye-off" class="w-4 h-4"></i> <span>Ẩn Mô Phỏng</span>`;
        }
        showToast("Đã hiện khung mô phỏng 3D", "info");
    } else {
        simSection.classList.add('hidden');
        localStorage.setItem(STORAGE_KEYS.HIDE_SIM, 'true');
        if (btnToggle) {
            btnToggle.innerHTML = `<i data-lucide="eye" class="w-4 h-4"></i> <span>Hiện Mô Phỏng</span>`;
        }
        showToast("Đã ẩn khung mô phỏng 3D", "info");
    }

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

/**
 * Initialize 3D Simulation state from LocalStorage preference.
 */
export function initSimulationState() {
    try {
        const isHidden = localStorage.getItem(STORAGE_KEYS.HIDE_SIM) === 'true';
        const simSection = document.getElementById('simulation-section') || document.getElementById('sim-3d-wrapper');
        const btnToggle = document.getElementById('btn-toggle-sim');

        if (simSection && isHidden) {
            simSection.classList.add('hidden');
            if (btnToggle) {
                btnToggle.innerHTML = `<i data-lucide="eye" class="w-4 h-4"></i> <span>Hiện Mô Phỏng</span>`;
            }
        }
    } catch (e) {}
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.setGateWithLoading = setGateWithLoading;
    window.setModeOptimistic = setModeOptimistic;
    window.updateModeDOM = updateModeDOM;
    window.confirmEmergencyToggle = confirmEmergencyToggle;
    window.executeToggleEmergency = executeToggleEmergency;
    window.toggleSimulation = toggleSimulation;
    window.initSimulationState = initSimulationState;
}

export default {
    setGateWithLoading,
    setModeOptimistic,
    updateModeDOM,
    confirmEmergencyToggle,
    executeToggleEmergency,
    toggleSimulation,
    initSimulationState
};
