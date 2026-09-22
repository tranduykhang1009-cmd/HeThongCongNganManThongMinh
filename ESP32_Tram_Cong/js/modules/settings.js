/**
 * @file settings.js
 * @description System settings, threshold configuration, sensor calibration offsets,
 *              remote physical electrical panel button lock, and multi-station presets.
 * @module modules/settings
 */

import { getState, updateState } from '../core/state.js';
import { writeFirebase, setProjectPrefix, getProjectPrefix } from '../services/firebase-service.js';
import { showToast, openModal, closeModal } from '../utils/ui-utils.js';
import { DEFAULT_PROJECTS, STORAGE_KEYS } from '../config/app-constants.js';

/**
 * Update system thresholds or calibration offsets with loading button feedback.
 * @param {string} type - Parameter key type ('sal', 'flood', 'stall', 'height', 'calib_sal', etc.)
 * @param {HTMLElement} btn - The submit button triggering the action
 */
export async function updateSettingWithLoading(type, btn) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không có quyền thay đổi thông số!", "error");
        return;
    }

    if (!btn) return;
    const originalHtml = btn.innerHTML;
    const originalClass = btn.className;

    // Button loading state
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang lưu...`;
    btn.className = "scada-control-btn px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 opacity-80 cursor-not-allowed";
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: btn });
    }
    btn.disabled = true;

    let path = 'control';
    let data = {};
    let desc = '';

    switch (type) {
        case 'sal': {
            const val = parseFloat(document.getElementById('inp-sal')?.value);
            if (isNaN(val) || val < 0) {
                showToast("Giá trị ngưỡng mặn không hợp lệ!", "error");
                revertButton(btn, originalHtml, originalClass);
                return;
            }
            data = { salinity_threshold: val };
            desc = `Cài đặt ngưỡng mặn: ${val} ppt`;
            break;
        }
        case 'flood': {
            const val = parseFloat(document.getElementById('inp-flood')?.value);
            if (isNaN(val) || val < 0) {
                showToast("Giá trị ngưỡng ngập không hợp lệ!", "error");
                revertButton(btn, originalHtml, originalClass);
                return;
            }
            data = { flood_threshold: val };
            desc = `Cài đặt ngưỡng ngập: ${val} cm`;
            break;
        }
        case 'stall': {
            const val = parseInt(document.getElementById('inp-stall')?.value, 10);
            if (isNaN(val) || val < 0) {
                showToast("Giá trị dòng kẹt không hợp lệ!", "error");
                revertButton(btn, originalHtml, originalClass);
                return;
            }
            data = { stall_threshold: val };
            desc = `Cài đặt ngưỡng dòng kẹt: ${val}`;
            break;
        }
        case 'height': {
            const val = parseFloat(document.getElementById('inp-height')?.value);
            if (isNaN(val) || val < 0) {
                showToast("Độ cao đặt cảm biến không hợp lệ!", "error");
                revertButton(btn, originalHtml, originalClass);
                return;
            }
            data = { sensor_height: val };
            desc = `Cài đặt độ cao cảm biến: ${val} cm`;
            break;
        }
        case 'calib_sal': {
            const val = parseFloat(document.getElementById('inp-calib-sal')?.value) || 0;
            data = { calib_sal: val };
            desc = `Hiệu chuẩn độ mặn: ${val > 0 ? '+' + val : val} ppt`;
            break;
        }
        case 'calib_temp': {
            const val = parseFloat(document.getElementById('inp-calib-temp')?.value) || 0;
            data = { calib_temp: val };
            desc = `Hiệu chuẩn nhiệt độ: ${val > 0 ? '+' + val : val} °C`;
            break;
        }
        case 'calib_water_in': {
            const val = parseFloat(document.getElementById('inp-calib-water-in')?.value) || 0;
            data = { calib_water_in: val };
            desc = `Hiệu chuẩn nước trong: ${val > 0 ? '+' + val : val} cm`;
            break;
        }
        case 'calib_water_out': {
            const val = parseFloat(document.getElementById('inp-calib-water-out')?.value) || 0;
            data = { calib_water_out: val };
            desc = `Hiệu chuẩn nước ngoài: ${val > 0 ? '+' + val : val} cm`;
            break;
        }
        default:
            revertButton(btn, originalHtml, originalClass);
            return;
    }

    try {
        const success = await writeFirebase(path, data);
        if (success) {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction(desc);
            }

            setTimeout(() => {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Đã lưu`;
                btn.className = "scada-control-btn px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors";
                if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                    lucide.createIcons({ root: btn });
                }

                setTimeout(() => {
                    revertButton(btn, originalHtml, originalClass);
                    showToast('Cập nhật thông số thành công!', 'success');
                }, 2000);
            }, 400);
        } else {
            throw new Error('Ghi dữ liệu không thành công');
        }
    } catch (err) {
        console.error("[Settings] updateSettingWithLoading error:", err);
        btn.innerHTML = `<i data-lucide="x" class="w-4 h-4"></i> Lỗi`;
        btn.className = "scada-control-btn px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0";
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ root: btn });
        }

        setTimeout(() => {
            revertButton(btn, originalHtml, originalClass);
        }, 3000);

        showToast(`Lỗi cập nhật: ${err.message}`, 'error');
    }
}

/**
 * Revert button to original state.
 * @param {HTMLElement} btn
 * @param {string} originalHtml
 * @param {string} originalClass
 */
function revertButton(btn, originalHtml, originalClass) {
    if (!btn) return;
    btn.innerHTML = originalHtml;
    btn.className = originalClass;
    btn.disabled = false;
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: btn });
    }
}

/**
 * Lock or unlock physical push-buttons on the SCADA electrical cabinet.
 * @param {boolean} [explicitState]
 */
export async function toggleLockPhysical(explicitState) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể khóa tủ điện!", "error");
        return;
    }

    const dataCache = getState('dataCache') || {};
    const currentLock = dataCache.khoa_nut_vat_ly === true;
    const targetLock = (typeof explicitState === 'boolean') ? explicitState : !currentLock;

    try {
        await Promise.all([
            writeFirebase('control', { khoa_nut_vat_ly: targetLock }),
            writeFirebase('dieu_khien', { khoa_nut_vat_ly: targetLock })
        ]);

        const actionText = targetLock ? "Khóa nút bấm vật lý tủ điện" : "Mở khóa nút bấm vật lý tủ điện";
        if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
            window.logAction(actionText);
        }
        showToast(targetLock ? "Đã khóa nút bấm tại tủ!" : "Đã mở khóa nút bấm tại tủ!", "success");
    } catch (err) {
        console.error("[Settings] toggleLockPhysical error:", err);
        showToast("Lỗi cập nhật khóa vật lý", "error");
    }
}

/**
 * Populate settings input fields from active dataCache if not currently focused by user.
 * @param {Object} d - Live telemetry dataCache
 */
export function populateSettingsInputs(d) {
    if (!d) return;

    const setInputVal = (id, val) => {
        const inp = document.getElementById(id);
        if (inp && document.activeElement !== inp && val !== undefined && val !== null) {
            inp.value = val;
        }
    };

    setInputVal('inp-sal', d.salinity_threshold);
    setInputVal('inp-flood', d.flood_threshold);
    setInputVal('inp-stall', d.stall_threshold);
    setInputVal('inp-height', d.sensor_height);
    setInputVal('inp-calib-sal', d.calib_sal);
    setInputVal('inp-calib-temp', d.calib_temp);
    setInputVal('inp-calib-water-in', d.calib_water_in);
    setInputVal('inp-calib-water-out', d.calib_water_out);
}

/**
 * =========================================================================
 * MULTI-STATION / PROJECT MANAGEMENT
 * =========================================================================
 */

/**
 * Retrieve saved projects from LocalStorage or defaults.
 * @returns {Array<Object>}
 */
export function getSavedProjects() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PROJECTS;
}

/**
 * Save project array to LocalStorage.
 * @param {Array<Object>} projs
 */
export function saveProjectsToStorage(projs) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projs));
    } catch (e) {}
}

/**
 * Render system selector dropdown options in Desktop and Mobile headers.
 */
export function renderProjectDropdown() {
    const projs = getSavedProjects();
    const listEl = document.getElementById('project-list');
    const mobListEl = document.getElementById('mob-project-list');

    let html = '';
    projs.forEach((p, idx) => {
        html += `
            <button onclick="selectSystem('${p.name}')" class="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between text-xs font-bold ${p.active ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-300'}">
                <div class="truncate">
                    <p class="truncate">${p.name}</p>
                    <span class="text-[10px] text-slate-400 font-normal">Khu vực: ${p.loc}</span>
                </div>
                ${p.active ? '<i data-lucide="check" class="w-4 h-4 text-blue-600 flex-shrink-0"></i>' : ''}
            </button>
        `;
    });

    if (listEl) listEl.innerHTML = html;
    if (mobListEl) mobListEl.innerHTML = html;

    const activeProj = projs.find(p => p.active) || projs[0];
    const sysName = document.getElementById('system-name');
    const sysLoc = document.getElementById('system-location');
    const mobSysName = document.getElementById('mob-system-name');

    if (sysName && activeProj) sysName.innerText = activeProj.name;
    if (sysLoc && activeProj) sysLoc.innerText = activeProj.loc;
    if (mobSysName && activeProj) mobSysName.innerText = activeProj.name;

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

/**
 * Select active project/station by name.
 * @param {string} name
 */
export function selectSystem(name) {
    const projs = getSavedProjects();
    projs.forEach(p => p.active = (p.name === name));
    saveProjectsToStorage(projs);
    renderProjectDropdown();

    const dropdown = document.getElementById('system-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const activeProj = projs.find(p => p.active);
    if (activeProj) {
        setProjectPrefix(activeProj.prefix || '');
        showToast(`Đã chuyển sang ${name}`, 'info');
    }
}

/**
 * Save new project from modal form.
 */
export function saveNewProject() {
    const name = document.getElementById('new-proj-name')?.value.trim();
    const loc = document.getElementById('new-proj-loc')?.value.trim();
    const prefix = document.getElementById('new-proj-prefix')?.value.trim() || '';

    if (!name || !loc) {
        showToast('Vui lòng điền đầy đủ tên và khu vực trạm!', 'error');
        return;
    }

    const projs = getSavedProjects();
    projs.forEach(p => p.active = false);
    projs.push({ name, loc, active: true, prefix });
    saveProjectsToStorage(projs);
    renderProjectDropdown();

    setProjectPrefix(prefix);
    closeModal('modal-add-project');
    showToast(`Đã thêm và kích hoạt ${name}!`, 'success');
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.updateSettingWithLoading = updateSettingWithLoading;
    window.toggleLockPhysical = toggleLockPhysical;
    window.populateSettingsInputs = populateSettingsInputs;
    window.renderProjectDropdown = renderProjectDropdown;
    window.selectSystem = selectSystem;
    window.saveNewProject = saveNewProject;
    window.getSavedProjects = getSavedProjects;
}

export default {
    updateSettingWithLoading,
    toggleLockPhysical,
    populateSettingsInputs,
    renderProjectDropdown,
    selectSystem,
    saveNewProject,
    getSavedProjects
};
