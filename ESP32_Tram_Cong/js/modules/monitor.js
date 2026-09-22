/**
 * @file monitor.js
 * @description Realtime telemetry dashboard rendering, sensor cards, battery gauges,
 *              stale data detection, and Chart.js telemetry trend visualizations.
 * @module modules/monitor
 */

import { getState, updateState, subscribeState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { TIMING } from '../config/app-constants.js';
import { formatNumber } from '../utils/formatters.js';

let salinityChartInstance = null;
let waterChartInstance = null;
let lastChartUpdateTime = 0;
let lastSensorAlertTime = 0;

const MAX_CHART_POINTS = 20;

/**
 * Helper to safely set text content of a DOM element by ID.
 * @param {string} id
 * @param {*} val
 */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = (val !== null && val !== undefined) ? String(val) : '--';
}

/**
 * Helper to safely set HTML content of a DOM element by ID.
 * @param {string} id
 * @param {string} val
 */
function setHTML(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = (val !== null && val !== undefined) ? String(val) : '';
}

/**
 * Compute battery percentage given voltage and min/max operating ranges.
 * @param {number} voltage
 * @param {number} maxV
 * @param {number} minV
 * @returns {number} Clamped percentage 0–100
 */
export function calculateBatteryPercentage(voltage, maxV, minV) {
    if (isNaN(voltage) || voltage <= 0) return 0;
    if (voltage >= maxV) return 100;
    if (voltage <= minV) return 0;
    return Math.round(((voltage - minV) / (maxV - minV)) * 100);
}

/**
 * Push an incident alert into the alerts buffer and trigger notification.
 * @param {string} title
 * @param {string} message
 */
export function pushAlert(title, message) {
    const now = Date.now();
    if (now - lastSensorAlertTime < (TIMING.SENSOR_ALERT_DEBOUNCE_MS || 60000)) {
        return; // Debounced
    }
    lastSensorAlertTime = now;

    console.warn(`[SCADA Alert] ${title}: ${message}`);

    if (typeof window !== 'undefined') {
        if (typeof window.ghiNhatKyTuDong === 'function') {
            window.ghiNhatKyTuDong(title, message);
        }
        if (typeof window.sendTelegramAlert === 'function') {
            window.sendTelegramAlert(`🚨 [${title}] ${message}`);
        }
    }
}

/**
 * Initialize Chart.js trend charts for salinity and water level monitoring.
 */
export function initChart() {
    if (typeof Chart === 'undefined') {
        console.warn('[Monitor Module] Chart.js library is not loaded yet.');
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // 1. Salinity & Temperature Chart
    const salCanvas = document.getElementById('salinityChart');
    if (salCanvas) {
        const ctxSal = salCanvas.getContext('2d');
        if (salinityChartInstance) {
            salinityChartInstance.destroy();
        }

        salinityChartInstance = new Chart(ctxSal, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Độ mặn (ppt)',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Nhiệt độ nước (°C)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: textColor, font: { size: 10, weight: 'bold' } } }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 6 },
                        grid: { color: gridColor }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: { color: '#3b82f6', font: { size: 9 } },
                        grid: { color: gridColor },
                        title: { display: true, text: 'ppt', color: '#3b82f6', font: { size: 9 } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: { color: '#f59e0b', font: { size: 9 } },
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: '°C', color: '#f59e0b', font: { size: 9 } }
                    }
                }
            }
        });
    }

    // 2. Water Levels & Delta H Chart
    const waterCanvas = document.getElementById('waterChart');
    if (waterCanvas) {
        const ctxWater = waterCanvas.getContext('2d');
        if (waterChartInstance) {
            waterChartInstance.destroy();
        }

        waterChartInstance = new Chart(ctxWater, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Mực nước Trong (cm)',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Mực nước Ngoài (cm)',
                        data: [],
                        borderColor: '#06b6d4',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'Chênh lệch ΔH (cm)',
                        data: [],
                        borderColor: '#ec4899',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [3, 3],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: textColor, font: { size: 10, weight: 'bold' } } }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 6 },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: { color: textColor, font: { size: 9 } },
                        grid: { color: gridColor },
                        title: { display: true, text: 'cm', color: textColor, font: { size: 9 } }
                    }
                }
            }
        });
    }
}

/**
 * Append data point to Chart.js sliding buffer (throttled to 5 seconds).
 * @param {string} label - Timestamp label
 * @param {number} salinity
 * @param {number} temp
 * @param {number} waterInner
 * @param {number} waterOuter
 * @param {number} waterDiff
 */
export function addChartData(label, salinity, temp, waterInner, waterOuter, waterDiff) {
    const now = Date.now();
    if (now - lastChartUpdateTime < (TIMING.CHART_THROTTLE_MS || 5000)) {
        return;
    }
    lastChartUpdateTime = now;

    if (salinityChartInstance) {
        const labels = salinityChartInstance.data.labels;
        labels.push(label);
        salinityChartInstance.data.datasets[0].data.push(salinity);
        salinityChartInstance.data.datasets[1].data.push(temp);

        if (labels.length > MAX_CHART_POINTS) {
            labels.shift();
            salinityChartInstance.data.datasets[0].data.shift();
            salinityChartInstance.data.datasets[1].data.shift();
        }
        salinityChartInstance.update('none');
    }

    if (waterChartInstance) {
        const labels = waterChartInstance.data.labels;
        labels.push(label);
        waterChartInstance.data.datasets[0].data.push(waterInner);
        waterChartInstance.data.datasets[1].data.push(waterOuter);
        waterChartInstance.data.datasets[2].data.push(waterDiff);

        if (labels.length > MAX_CHART_POINTS) {
            labels.shift();
            waterChartInstance.data.datasets[0].data.shift();
            waterChartInstance.data.datasets[1].data.shift();
            waterChartInstance.data.datasets[2].data.shift();
        }
        waterChartInstance.update('none');
    }
}

/**
 * Master Realtime DOM Telemetry Updater.
 * Synchronizes all sensor values, thresholds, battery tooltips, animations,
 * and 3D simulation elements with live dataCache.
 * 
 * @param {Object} d - Fused dataCache object
 */
export function updateDOM(d) {
    if (!d || typeof document === 'undefined') return;

    const hbTracker = getState('hbTracker') || {
        phao: { isOnline: false },
        cong: { isOnline: false }
    };

    const isPhaoOnline = hbTracker.phao && hbTracker.phao.isOnline;
    const isCongOnline = hbTracker.cong && hbTracker.cong.isOnline;
    const isSystemOnline = isPhaoOnline || isCongOnline;

    // 1. SENSOR VALUE FORMATTING
    const salVal = d.do_man !== undefined ? parseFloat(d.do_man).toFixed(2) : '--';
    const tempVal = d.temp !== undefined ? parseFloat(d.temp).toFixed(1) : '--';
    const waterInVal = d.muc_nuoc !== undefined ? parseFloat(d.muc_nuoc).toFixed(1) : '--';
    const waterOutVal = d.sieu_am_ngoai !== undefined ? parseFloat(d.sieu_am_ngoai).toFixed(1) : '--';
    const diff = (d.muc_nuoc !== undefined && d.sieu_am_ngoai !== undefined)
        ? Math.abs(parseFloat(d.muc_nuoc) - parseFloat(d.sieu_am_ngoai))
        : 0;
    const diffVal = diff.toFixed(1);
    const currVal = d.dong_dien_tho !== undefined ? String(d.dong_dien_tho) : '--';

    // 2. DOM TEXT UPDATES
    setText('lbl-salinity', salVal);
    setText('lbl-temp', tempVal);
    setText('lbl-water-in', waterInVal);
    setText('lbl-water-out', waterOutVal);
    setText('lbl-water-diff', diffVal);
    setText('lbl-motor-current', currVal);

    // 3. STALE DATA BADGES & GRAYSCALE INDICATORS
    const cardSal = document.getElementById('card-salinity');
    const cardTemp = document.getElementById('card-temp');
    const stalePhaoBadges = document.querySelectorAll('.badge-stale-phao');

    if (!isPhaoOnline) {
        if (cardSal) cardSal.classList.add('grayscale', 'opacity-70');
        if (cardTemp) cardTemp.classList.add('grayscale', 'opacity-70');
        stalePhaoBadges.forEach(b => {
            b.classList.remove('hidden');
            b.innerText = "DỮ LIỆU CŨ";
        });
    } else {
        if (cardSal) cardSal.classList.remove('grayscale', 'opacity-70');
        if (cardTemp) cardTemp.classList.remove('grayscale', 'opacity-70');
        stalePhaoBadges.forEach(b => b.classList.add('hidden'));
    }

    const cardWaterIn = document.getElementById('card-water-in');
    const cardWaterOut = document.getElementById('card-water-out');
    const staleCongBadges = document.querySelectorAll('.badge-stale-cong');

    if (!isCongOnline) {
        if (cardWaterIn) cardWaterIn.classList.add('grayscale', 'opacity-70');
        if (cardWaterOut) cardWaterOut.classList.add('grayscale', 'opacity-70');
        staleCongBadges.forEach(b => {
            b.classList.remove('hidden');
            b.innerText = "DỮ LIỆU CŨ";
        });
    } else {
        if (cardWaterIn) cardWaterIn.classList.remove('grayscale', 'opacity-70');
        if (cardWaterOut) cardWaterOut.classList.remove('grayscale', 'opacity-70');
        staleCongBadges.forEach(b => b.classList.add('hidden'));
    }

    // 4. PROGRESS BARS
    const barSal = document.getElementById('bar-salinity');
    if (barSal && d.do_man !== undefined) {
        const pct = Math.min(100, Math.max(0, (parseFloat(d.do_man) / (parseFloat(d.salinity_threshold) || 1.5)) * 50));
        barSal.style.width = `${pct}%`;
    }

    const barWaterIn = document.getElementById('bar-water-in');
    if (barWaterIn && d.muc_nuoc !== undefined) {
        const pct = Math.min(100, Math.max(0, (parseFloat(d.muc_nuoc) / (parseFloat(d.flood_threshold) || 80)) * 100));
        barWaterIn.style.width = `${pct}%`;
    }

    // 5. THRESHOLD ALERTS & BADGES
    const badgeSal = document.getElementById('badge-salinity');
    if (parseFloat(d.do_man) > parseFloat(d.salinity_threshold)) {
        pushAlert("CẢNH BÁO MẶN", `Mặn (${parseFloat(d.do_man).toFixed(2)} ppt) vượt ngưỡng an toàn!`);
        if (badgeSal) {
            badgeSal.innerText = "CẢNH BÁO";
            badgeSal.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse";
        }
    } else {
        if (badgeSal) {
            badgeSal.innerText = typeof t === 'function' ? t('safe') : "AN TOÀN";
            badgeSal.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
        }
    }

    const badgeWater = document.getElementById('badge-water');
    if (parseFloat(d.muc_nuoc) > parseFloat(d.flood_threshold)) {
        pushAlert("CẢNH BÁO NƯỚC", `Nước trong cống (${parseFloat(d.muc_nuoc).toFixed(1)} cm) vượt ngưỡng cảnh báo ngập!`);
        if (badgeWater) {
            badgeWater.innerText = "VƯỢT NGƯỠNG";
            badgeWater.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse";
        }
    } else {
        if (badgeWater) {
            badgeWater.innerText = typeof t === 'function' ? t('safe') : "AN TOÀN";
            badgeWater.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
        }
    }

    const badgeDiff = document.getElementById('badge-water-diff');
    if (badgeDiff) {
        if (diff > 5) {
            badgeDiff.innerText = "ÁP LỰC CAO";
            badgeDiff.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse";
        } else {
            badgeDiff.innerText = "CÂN BẰNG";
            badgeDiff.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
        }
    }

    // 6. DUAL BATTERY & SOLAR TELEMETRY TOOLTIPS
    // A. Buoy Station (1S Li-ion 3.2V–4.2V)
    const buoyVolt = d.pin_volt || 0;
    const buoyPct = d.pin_phan_tram || calculateBatteryPercentage(buoyVolt, 4.2, 3.2);
    setText('lbl-battery-buoy', `${formatNumber(buoyVolt, 2)}V`);
    setText('pct-battery-buoy', `${buoyPct}%`);
    setText('solar-volt-buoy', `${formatNumber(d.solar_volt, 2)}V`);
    setText('solar-curr-buoy', `${formatNumber(d.solar_dong_sac, 0)}mA`);
    setText('solar-pwr-buoy', `${formatNumber(d.solar_cong_suat, 2)}W`);

    const solarBoltBuoy = document.getElementById('solar-bolt-buoy');
    if (solarBoltBuoy) {
        if (parseFloat(d.solar_dong_sac) > 10) {
            solarBoltBuoy.classList.remove('hidden');
        } else {
            solarBoltBuoy.classList.add('hidden');
        }
    }

    // B. Gate Station (3S Li-ion 9.6V–12.6V)
    const congVolt = d.cong_dien_ap || 0;
    const congPct = d.cong_pin_phan_tram || calculateBatteryPercentage(congVolt, 12.6, 9.6);
    setText('lbl-battery-station', `${formatNumber(congVolt, 2)}V`);
    setText('pct-battery-station', `${congPct}%`);
    setText('solar-curr-station', `${formatNumber(d.cong_dong_dien, 0)}mA`);
    setText('solar-pwr-station', `${formatNumber(d.cong_cong_suat, 2)}W`);

    // 7. CALIBRATION OFFSET BADGES
    const setCalibBadge = (id, calibVal) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (calibVal !== 0 && calibVal !== undefined) {
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> <span class="text-amber-500 font-bold">OFFSET ${calibVal > 0 ? '+' + calibVal : calibVal}</span>`;
        } else {
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> <span class="text-slate-400">RAW</span>`;
        }
    };
    setCalibBadge('calib-status-sal', d.calib_sal);
    setCalibBadge('calib-status-temp', d.calib_temp);
    setCalibBadge('calib-status-water-in', d.calib_water_in);
    setCalibBadge('calib-status-water-out', d.calib_water_out);

    // 8. HEADER & MOBILE ALARM BADGES
    const isAlarm = d.gate_status === 0 || d.emergency_ket_cong === 1 || d.emergency_stop === 1;
    const alarmBadges = document.querySelectorAll('#hdr-alarm-badge, #mob-alarm-badge');
    alarmBadges.forEach(b => {
        b.innerText = isAlarm ? "CẢNH BÁO" : "BÌNH THƯỜNG";
        b.className = isAlarm
            ? "text-[10px] font-bold text-red-500 animate-pulse"
            : "text-[10px] font-bold text-emerald-600 dark:text-emerald-400";
    });

    // 9. SLUICE GATE STATUS & MOTOR INDICATOR
    const btnOpen = document.getElementById('btn-action-open');
    const btnClose = document.getElementById('btn-action-close');

    if (btnOpen && btnClose) {
        btnOpen.classList.remove('ring-4', 'ring-emerald-400', 'shadow-[0_0_15px_rgba(52,211,153,0.8)]');
        btnClose.classList.remove('ring-4', 'ring-blue-400', 'shadow-[0_0_15px_rgba(59,130,246,0.8)]');

        if (d.gate_status === 2) {
            btnOpen.classList.add('ring-4', 'ring-emerald-400', 'shadow-[0_0_15px_rgba(52,211,153,0.8)]');
        } else if (d.gate_status === 3) {
            btnClose.classList.add('ring-4', 'ring-blue-400', 'shadow-[0_0_15px_rgba(59,130,246,0.8)]');
        }
    }

    if (d.gate_status === 2 || d.gate_status === 3) {
        setHTML('gate-badge-box', `
            <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-amber-500 shadow-md shadow-amber-500/30 flex items-center gap-1 animate-pulse">
                <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> ${d.gate_status === 2 ? 'ĐANG MỞ...' : 'ĐANG ĐÓNG...'}
            </span>
        `);
    } else if (d.gate_status === 1) {
        setHTML('gate-badge-box', `
            <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-emerald-600 shadow-md shadow-emerald-600/30 flex items-center gap-1">
                <i data-lucide="unlock" class="w-3.5 h-3.5"></i> ĐÃ MỞ
            </span>
        `);
    } else {
        setHTML('gate-badge-box', `
            <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-rose-600 shadow-md shadow-rose-600/30 flex items-center gap-1">
                <i data-lucide="lock" class="w-3.5 h-3.5"></i> ĐÃ ĐÓNG
            </span>
        `);
    }

    // 10. NIGHT BEACON LED & BUZZER STATUS
    const isNightMode = d.trang_thai_dem === 1;
    let ledHtml = '';
    let simLedClass = "w-3.5 h-3.5 rounded-full border ";
    let simBaseClass = "w-6 h-1.5 rounded-t ";

    if (isNightMode) {
        ledHtml = `<div class="w-4 h-4 rounded-full bg-red-500 border-2 border-red-300 shadow-[0_0_15px_rgba(239,68,68,1)] animate-ping"></div>`;
        simLedClass += "bg-red-500 border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse";
        simBaseClass += "bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    } else {
        ledHtml = `<div class="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-slate-400 dark:border-slate-500"></div>`;
        simLedClass += "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-500 shadow-inner";
        simBaseClass += "bg-slate-400 dark:bg-slate-600";
    }

    setHTML('status-led', ledHtml);
    document.querySelectorAll('.sim-led').forEach(el => el.className = simLedClass);
    document.querySelectorAll('.sim-led-base').forEach(el => el.className = simBaseClass);

    const isSpeakerActive = (d.speaker_status === 1 || d.emergency_stop === 1 || d.emergency_ket_cong === 1);
    const simSpeaker = document.getElementById('sim-speaker');
    const simLightbulb = document.getElementById('sim-lightbulb');
    const statusBuzzer = document.getElementById('status-buzzer');

    if (simLightbulb) simLightbulb.setAttribute('class', isNightMode ? "w-4 h-4 text-amber-400 icon-blink" : "w-4 h-4 text-slate-300 transition-colors");
    if (simSpeaker) simSpeaker.setAttribute('class', isSpeakerActive ? "w-4 h-4 text-red-500 icon-blink" : "w-4 h-4 text-slate-300 transition-colors");
    if (statusBuzzer) statusBuzzer.innerHTML = isSpeakerActive ? `<i data-lucide="volume-2" class="w-4 h-4 text-red-500 icon-blink"></i>` : `<i data-lucide="volume-2" class="w-4 h-4 text-slate-300"></i>`;

    // 11. 3D SIMULATION GATE ELEVATION & WATER TUBES
    const simGate = document.getElementById('sim-gate');
    if (simGate) {
        if (d.gate_status === 1) {
            simGate.style.transform = 'translateY(-65px)';
        } else if (d.gate_status === 2) {
            simGate.style.transform = 'translateY(-30px)';
        } else if (d.gate_status === 3) {
            simGate.style.transform = 'translateY(-15px)';
        } else {
            simGate.style.transform = 'translateY(0px)';
        }
    }

    const simWater = document.getElementById('sim-water');
    const simWaterTubeIn = document.getElementById('sim-water-tube-in');
    const simWaterTubeOut = document.getElementById('sim-water-tube-out');
    const simWaterMarkerIn = document.getElementById('sim-water-marker-in');
    const simWaterMarkerOut = document.getElementById('sim-water-marker-out');
    const simWaterTextIn = document.getElementById('sim-water-text-in');
    const simWaterTextOut = document.getElementById('sim-water-text-out');

    if (simWater) {
        const maxWater = d.sensor_height || 100;
        const waterValIn = d.muc_nuoc || 0;
        const waterValOut = d.sieu_am_ngoai || 0;

        const pctIn = Math.max(5, Math.min(95, (waterValIn / maxWater) * 100));
        const pctOut = Math.max(5, Math.min(95, (waterValOut / maxWater) * 100));

        simWater.style.height = `${pctOut}%`;

        if (simWaterTubeIn) simWaterTubeIn.style.height = `${pctIn}%`;
        if (simWaterMarkerIn) simWaterMarkerIn.style.bottom = `${pctIn}%`;
        if (simWaterTextIn) simWaterTextIn.innerText = `${Math.round(waterValIn)}cm`;

        if (simWaterTubeOut) simWaterTubeOut.style.height = `${pctOut}%`;
        if (simWaterMarkerOut) simWaterMarkerOut.style.bottom = `${pctOut}%`;
        if (simWaterTextOut) simWaterTextOut.innerText = `${Math.round(waterValOut)}cm`;
    }

    // 12. EMERGENCY STOP BUTTON STATE
    const btnEmg = document.getElementById('btn-emergency');
    const txtEmg = document.getElementById('emg-text');

    if (d.emergency_ket_cong === 1) {
        if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/40 active:scale-95 text-xs sm:text-sm animate-pulse border-b-4 border-amber-700";
        if (txtEmg) txtEmg.innerText = "⚠️ KHÔI PHỤC (ĐANG KẸT CỐNG)";
    } else if (d.emergency_stop === 1) {
        if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 active:scale-95 text-xs sm:text-sm animate-pulse border-b-4 border-emerald-800";
        if (txtEmg) txtEmg.innerText = "KHÔI PHỤC HOẠT ĐỘNG (RESET E-STOP)";
    } else {
        if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.6)] border-b-4 border-red-800 flex items-center justify-center gap-2.5 active:scale-95 transition-all";
        if (txtEmg) txtEmg.innerText = typeof t === 'function' ? t('emergency_btn') : "DỪNG KHẨN CẤP (E-STOP)";
    }

    // 13. SYSTEM CONTAINER BORDER GLOW
    const appEl = document.getElementById('app');
    if (appEl) {
        if (isSystemOnline) {
            appEl.style.boxShadow = "inset 0 0 15px rgba(16, 185, 129, 0.4)";
            appEl.style.border = "2px solid rgba(16, 185, 129, 0.5)";
        } else {
            appEl.style.boxShadow = "inset 0 0 25px rgba(239, 68, 68, 0.6)";
            appEl.style.border = "2px solid rgba(239, 68, 68, 0.8)";
        }
    }

    // 14. UPDATE CHART DATA (Throttled)
    const timeNow = new Date().toLocaleTimeString('vi-VN');
    addChartData(timeNow, d.do_man ?? 0, d.temp ?? 0, d.muc_nuoc ?? 0, d.sieu_am_ngoai ?? 0, diff);
    setText('lbl-last-update', timeNow);

    // Refresh icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.updateDOM = updateDOM;
    window.initChart = initChart;
    window.addChartData = addChartData;
    window.pushAlert = pushAlert;
    window.calculateBatteryPercentage = calculateBatteryPercentage;
}

export default {
    updateDOM,
    initChart,
    addChartData,
    pushAlert,
    calculateBatteryPercentage
};
