/**
 * @file camera-service.js
 * @description ESP32-CAM WebSocket streaming client, watchdog auto-reconnect,
 *              cursor-centered pan/zoom engine, hardware controls, and canvas snapshot capture.
 * @module services/camera-service
 */

import { WS_CAM_URL, STORAGE_KEYS } from '../config/app-constants.js';
import { getState, updateState } from '../core/state.js';
import { showToast } from '../utils/ui-utils.js';

/**
 * Active WebSocket instance for ESP32-CAM
 * @type {WebSocket|null}
 */
let wsCam = null;

/**
 * Watchdog and reconnection timer IDs
 */
let camWatchdogTimer = null;
let reconnectTimeoutId = null;
let timestampTickerId = null;
let zoomBadgeFadeTimer = null;

/**
 * Pan & Zoom internal state
 */
let camScale = 1;
let camPointX = 0;
let camPointY = 0;
let isCamDragging = false;
let dragStartX = 0;
let dragStartY = 0;

/**
 * Hardware control flags
 */
let camVFlip = false;
let camHFlip = false;
let cameraManuallyStopped = false;

/**
 * Update the visual Camera Status Badge
 * @param {'online'|'connected'|'connecting'|'loading'|'offline'|'error'} status
 */
export function setCamBadge(status) {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('cam-status-badge');
    if (!badge) return;

    if (status === 'online' || status === 'connected') {
        badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 flex items-center gap-1.5 border border-emerald-500/20';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ĐÃ KẾT NỐI';
    } else if (status === 'connecting' || status === 'loading') {
        badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-600 flex items-center gap-1.5 border border-amber-500/20';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> ĐANG KẾT NỐI';
    } else {
        badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-500/10 text-slate-500 flex items-center gap-1.5 border border-slate-500/20';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> CHƯA KẾT NỐI';
    }
}

/**
 * Connect to ESP32-CAM via Cloud WebSocket or Local IP
 * @param {string} [customUrl] - Optional specific WebSocket URL
 */
export function connectCamera(customUrl) {
    let url = customUrl || WS_CAM_URL;

    if (typeof document !== 'undefined') {
        const ipInput = document.getElementById('cam-ip');
        if (ipInput && ipInput.value.trim() !== '') {
            const ip = ipInput.value.trim();
            url = ip.startsWith('ws') ? ip : `ws://${ip}:81`;
            try {
                localStorage.setItem(STORAGE_KEYS.CAM_IP || 'camIp', ip);
            } catch (e) {
                // Ignore storage errors
            }
        }
    }

    const img = typeof document !== 'undefined' ? document.getElementById('cam-stream') : null;
    const placeholder = typeof document !== 'undefined' ? document.getElementById('cam-placeholder') : null;

    if (wsCam && (wsCam.readyState === WebSocket.OPEN || wsCam.readyState === WebSocket.CONNECTING)) {
        const currentUrl = (wsCam.url || '').replace(/\/$/, '');
        const newUrl = url.replace(/\/$/, '');

        if (currentUrl !== newUrl) {
            wsCam.close();
        } else {
            if (typeof document !== 'undefined' && typeof showToast === 'function') {
                showToast('Camera đang được kết nối!', 'info');
            }
            return;
        }
    }

    setCamBadge('connecting');

    try {
        wsCam = new WebSocket(url);
        wsCam.binaryType = 'blob';

        if (typeof window !== 'undefined') {
            window.wsCam = wsCam;
        }

        wsCam.onopen = () => {
            console.log("✅ Đã kết nối WebSocket tới Camera Server:", url);
            if (placeholder) placeholder.style.display = 'none';
            if (img) img.classList.remove('hidden');
            setCamBadge('online');

            updateState('cameraState', {
                isConnected: true,
                isConnecting: false,
                streamUrl: url,
                vFlip: camVFlip,
                hFlip: camHFlip,
                manuallyStopped: false
            });

            if (cameraManuallyStopped && typeof document !== 'undefined' && typeof showToast === 'function') {
                showToast('Kết nối Camera thành công!', 'success');
            }
            cameraManuallyStopped = false;
        };

        wsCam.onmessage = (event) => {
            // Reset watchdog timer on every received frame
            if (camWatchdogTimer) clearTimeout(camWatchdogTimer);
            setCamBadge('online');

            // 1500ms Watchdog detects frozen stream
            camWatchdogTimer = setTimeout(() => {
                console.warn("[Camera Watchdog] Frame timeout (>1500ms)! Closing stale socket.");
                if (wsCam) {
                    wsCam.close();
                }
                setCamBadge('offline');
            }, 1500);

            // Render raw binary JPEG Blob
            if (event.data instanceof Blob && img) {
                if (img.src && img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
                const objUrl = URL.createObjectURL(event.data);
                img.src = objUrl;

                const imgBlur = document.getElementById('cam-bg-blur');
                if (imgBlur) {
                    imgBlur.src = objUrl;
                    imgBlur.classList.remove('hidden');
                }
            }
        };

        wsCam.onclose = () => {
            console.warn("⚠️ Mất kết nối WebSocket Camera.");
            setCamBadge('offline');

            updateState('cameraState', {
                isConnected: false,
                isConnecting: false,
                streamUrl: url,
                vFlip: camVFlip,
                hFlip: camHFlip,
                manuallyStopped: cameraManuallyStopped
            });

            if (img) img.classList.add('hidden');
            if (placeholder) {
                placeholder.style.display = 'flex';
                const p = placeholder.querySelector('p');
                if (p) {
                    p.innerText = cameraManuallyStopped
                        ? "CAMERA ĐÃ DỪNG TẠM THỜI"
                        : "ĐANG KẾT NỐI LẠI VỚI CAMERA...";
                }
            }

            if (camWatchdogTimer) {
                clearTimeout(camWatchdogTimer);
                camWatchdogTimer = null;
            }

            clearTimeout(reconnectTimeoutId);
            if (!cameraManuallyStopped) {
                reconnectTimeoutId = setTimeout(() => {
                    connectCamera(url);
                }, 3000);
            }
        };

        wsCam.onerror = (err) => {
            console.error("❌ Lỗi WebSocket Camera:", err);
            try {
                if (wsCam && wsCam.readyState !== 2 && wsCam.readyState !== 3) {
                    wsCam.close();
                }
            } catch (e) {
                // Ignore close error during error handling
            }
        };
    } catch (err) {
        console.error("❌ Không thể khởi tạo WebSocket Camera:", err);
        setCamBadge('offline');
    }
}

/**
 * Manually stop the camera stream and suppress automatic reconnects.
 */
export function stopCamera() {
    cameraManuallyStopped = true;
    clearTimeout(reconnectTimeoutId);
    if (camWatchdogTimer) {
        clearTimeout(camWatchdogTimer);
        camWatchdogTimer = null;
    }

    if (wsCam) {
        wsCam.close();
        wsCam = null;
    }

    if (typeof document !== 'undefined') {
        const img = document.getElementById('cam-stream');
        const placeholder = document.getElementById('cam-placeholder');
        if (img) img.classList.add('hidden');
        if (placeholder) {
            placeholder.style.display = 'flex';
            const p = placeholder.querySelector('p');
            if (p) p.innerText = "CAMERA ĐÃ DỪNG TẠM THỜI";
        }
    }

    setCamBadge('offline');
    updateState('cameraState', {
        isConnected: false,
        isConnecting: false,
        vFlip: camVFlip,
        hFlip: camHFlip,
        manuallyStopped: true,
        streamUrl: ''
    });

    if (typeof document !== 'undefined' && typeof showToast === 'function') {
        showToast('Đã dừng luồng Camera', 'info');
    }
}

/**
 * Send hardware configuration command to ESP32-CAM over active WebSocket
 * @param {string} variable - Command parameter name (e.g. 'led_intensity', 'vflip', 'hmirror', 'framesize')
 * @param {number|string} value - Parameter value
 */
export function setCamControl(variable, value) {
    if (wsCam && wsCam.readyState === WebSocket.OPEN) {
        if (variable === 'led_intensity') {
            wsCam.send(`LED:${value}`);
            console.log(`💡 Đã gửi lệnh LED: ${value}`);
        } else {
            wsCam.send(`CMD:${variable}:${value}`);
            console.log(`⚙️ Đã gửi lệnh Camera - ${variable}: ${value}`);
        }
    } else {
        console.warn("⚠️ Không thể gửi lệnh: WebSocket chưa kết nối!");
        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast('Chưa kết nối Camera để gửi lệnh!', 'warning');
        }
    }
}

/**
 * Toggle Vertical Flip on camera sensor
 */
export function setCamFlipV() {
    camVFlip = !camVFlip;
    setCamControl('vflip', camVFlip ? 1 : 0);
    if (typeof window !== 'undefined') {
        window.camVFlip = camVFlip;
    }
    if (typeof document !== 'undefined' && typeof showToast === 'function') {
        showToast(`Đã ${camVFlip ? 'bật' : 'tắt'} lật dọc`, 'success');
    }
}

/**
 * Toggle Horizontal Mirror on camera sensor
 */
export function setCamFlipH() {
    camHFlip = !camHFlip;
    setCamControl('hmirror', camHFlip ? 1 : 0);
    if (typeof window !== 'undefined') {
        window.camHFlip = camHFlip;
    }
    if (typeof document !== 'undefined' && typeof showToast === 'function') {
        showToast(`Đã ${camHFlip ? 'bật' : 'tắt'} lật ngang`, 'success');
    }
}

/**
 * Set Camera Frame Size resolution
 * @param {number|string} val
 */
export function setCamFrameSize(val) {
    setCamControl('framesize', val);
}

/**
 * Set Camera Flash LED Intensity (0–255)
 * @param {number|string} val
 */
export function setCamLed(val) {
    setCamControl('led_intensity', val);
}

/**
 * Update CSS Transform matrix for smooth Pan & Zoom
 */
function updateTransformDOM() {
    if (typeof document === 'undefined') return;
    const img = document.getElementById('cam-stream');
    const zoomBadge = document.getElementById('zoom-level-badge');
    if (!img) return;

    img.style.transform = `translate(${camPointX}px, ${camPointY}px) scale(${camScale})`;

    if (zoomBadge) {
        zoomBadge.innerText = `Zoom: ${camScale.toFixed(1)}x`;
        zoomBadge.classList.remove('opacity-0');
        clearTimeout(zoomBadgeFadeTimer);
        zoomBadgeFadeTimer = setTimeout(() => {
            if (!isCamDragging) {
                zoomBadge.classList.add('opacity-0');
            }
        }, 1500);
    }
}

/**
 * Zoom by relative delta (clamped to 1.0x – 5.0x)
 * @param {number} delta - Zoom increment/decrement
 */
export function zoomCam(delta) {
    camScale += delta;
    if (camScale < 1) camScale = 1;
    if (camScale > 5) camScale = 5;
    if (camScale === 1) {
        camPointX = 0;
        camPointY = 0;
    }
    updateTransformDOM();
}

/**
 * Reset Camera Pan & Zoom transform to default (1.0x)
 */
export function resetCamTransform() {
    camScale = 1;
    camPointX = 0;
    camPointY = 0;
    updateTransformDOM();
}

/**
 * Initialize cursor-centered pan/zoom mouse and touch event listeners
 */
export function initCamPanZoom() {
    if (typeof document === 'undefined') return;

    const container = document.getElementById('cam-container');
    const img = document.getElementById('cam-stream');
    if (!container || !img) return;

    // Zoom centered on cursor position
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = camScale;
        const delta = -e.deltaY;
        if (delta > 0) {
            camScale *= 1.15;
        } else {
            camScale /= 1.15;
        }

        if (camScale < 1) camScale = 1;
        if (camScale > 5) camScale = 5;

        // Reposition pan coordinates to keep cursor focus stationary
        const ratio = camScale / oldScale;
        camPointX -= (mouseX - camPointX) * (ratio - 1);
        camPointY -= (mouseY - camPointY) * (ratio - 1);

        if (camScale === 1) {
            camPointX = 0;
            camPointY = 0;
        }
        updateTransformDOM();
    }, { passive: false });

    // Drag-to-pan
    container.addEventListener('mousedown', (e) => {
        if (camScale <= 1) return;
        e.preventDefault();
        dragStartX = e.clientX - camPointX;
        dragStartY = e.clientY - camPointY;
        isCamDragging = true;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isCamDragging) return;
        e.preventDefault();
        camPointX = e.clientX - dragStartX;
        camPointY = e.clientY - dragStartY;
        updateTransformDOM();
    });

    window.addEventListener('mouseup', () => {
        isCamDragging = false;
    });
}

/**
 * Capture high-resolution JPEG snapshot from current video frame and trigger download
 */
export function takeSnapshot() {
    if (typeof document === 'undefined') return;
    const img = document.getElementById('cam-stream');

    if (!img || img.classList.contains('hidden') || !img.naturalWidth || img.naturalWidth === 0) {
        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast("Lỗi: Camera chưa được kết nối hoặc chưa có khung hình!", "error");
        }
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const timestamp = new Date().getTime();
        const link = document.createElement('a');
        link.download = `Camera_Snapshot_${timestamp}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast("Đã lưu ảnh Camera vào máy!", "success");
        }
    } catch (err) {
        console.error("[Camera Service] Snapshot error:", err);
        if (typeof document !== 'undefined' && typeof showToast === 'function') {
            showToast("Lỗi khi chụp ảnh Camera: " + err.message, "error");
        }
    }
}

/**
 * Initialize 1-second interval timestamp on Camera overlay
 */
export function initCameraTimestampTicker() {
    if (timestampTickerId) clearInterval(timestampTickerId);

    timestampTickerId = setInterval(() => {
        if (typeof document === 'undefined') return;
        const timeEl = document.getElementById('cam-timestamp');
        if (timeEl) {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            timeEl.innerText = `${d}/${m}/${y} ${h}:${min}:${s}`;
        }
    }, 1000);
}

/**
 * Bootstrap all Camera services, listeners, and tickers
 */
export function initCameraService() {
    initCamPanZoom();
    initCameraTimestampTicker();

    // Auto-restore saved camera IP from localStorage if available
    if (typeof localStorage !== 'undefined' && typeof document !== 'undefined') {
        const savedCamIp = localStorage.getItem(STORAGE_KEYS.CAM_IP || 'camIp');
        if (savedCamIp) {
            const camInput = document.getElementById('cam-ip');
            if (camInput) camInput.value = savedCamIp;
        }
    }
}

/**
 * Alias for initCameraService for backward compatibility and app.js contract
 */
export const initCameraControls = initCameraService;

// Public Window Bridge for backward compatibility
if (typeof window !== 'undefined') {
    window.connectCamera = connectCamera;
    window.stopCamera = stopCamera;
    window.setCamControl = setCamControl;
    window.setCamFlipV = setCamFlipV;
    window.setCamFlipH = setCamFlipH;
    window.setCamFrameSize = setCamFrameSize;
    window.setCamLed = setCamLed;
    window.zoomCam = zoomCam;
    window.resetCamTransform = resetCamTransform;
    window.takeSnapshot = takeSnapshot;
    window.initCamPanZoom = initCamPanZoom;
    window.initCameraService = initCameraService;
    window.initCameraControls = initCameraControls;
    window.camVFlip = camVFlip;
    window.camHFlip = camHFlip;
    window.cameraManuallyStopped = cameraManuallyStopped;
}

export default {
    connectCamera,
    stopCamera,
    setCamControl,
    setCamFlipV,
    setCamFlipH,
    setCamFrameSize,
    setCamLed,
    zoomCam,
    resetCamTransform,
    takeSnapshot,
    initCamPanZoom,
    initCameraService,
    initCameraControls,
    setCamBadge
};
