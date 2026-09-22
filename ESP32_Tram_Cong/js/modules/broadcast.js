/**
 * @file broadcast.js
 * @description Public Address (PA) audio broadcasting system, MP3 tracks 09–17 triggering,
 *              master volume slider with debouncing, infinite loop toggle, and Mute All controls.
 * @module modules/broadcast
 */

import { getState } from '../core/state.js';
import { writeFirebase } from '../services/firebase-service.js';
import { showToast } from '../utils/ui-utils.js';
import { AUDIO_TRACKS } from '../config/app-constants.js';

let volumeDebounceTimer = null;

/**
 * Update the volume percentage label in the UI.
 * @param {number|string} val - Volume 0–30
 */
export function updateVolumeLabel(val) {
    const lbl = document.getElementById('lbl-volume-val') || document.getElementById('volume-display');
    if (lbl) {
        lbl.innerText = `${val} / 30`;
    }
}

/**
 * Send volume level to DYPlayer master volume with 300ms debounce.
 * @param {number|string} val - Volume 0–30
 */
export function sendVolumeControl(val) {
    const numVal = Math.max(0, Math.min(30, parseInt(val, 10) || 0));
    updateVolumeLabel(numVal);

    if (volumeDebounceTimer) clearTimeout(volumeDebounceTimer);
    volumeDebounceTimer = setTimeout(() => {
        writeFirebase('control', { volume: numVal })
            .then(success => {
                if (success) {
                    showToast(`Đã điều chỉnh âm lượng: ${numVal}/30`, 'success');
                }
            })
            .catch(err => {
                console.error("[Broadcast] Volume control error:", err);
                showToast('Lỗi cập nhật âm lượng', 'error');
            });
    }, 300);
}

/**
 * Toggle infinite loop mode for emergency audio broadcasting.
 * @param {HTMLInputElement} cb - Checkbox element
 */
export function toggleLoopAudio(cb) {
    if (!cb) return;
    const isLoop = cb.checked ? 1 : 0;
    const statusTxt = document.getElementById('txt-loop-status');

    if (statusTxt) {
        statusTxt.innerText = isLoop ? "BẬT (Lặp vô hạn)" : "TẮT (1 Lần)";
        statusTxt.className = isLoop
            ? "text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400"
            : "text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }

    writeFirebase('control', { loop_audio: isLoop, audio_loop: isLoop })
        .then(success => {
            if (success) {
                showToast(isLoop ? 'Đã bật chế độ phát lặp vô hạn' : 'Đã tắt chế độ phát lặp', 'info');
            }
        })
        .catch(err => {
            console.error("[Broadcast] toggleLoopAudio error:", err);
            showToast('Lỗi cấu hình vòng lặp', 'error');
            cb.checked = !cb.checked;
        });
}

/**
 * Trigger playback of a specific audio track on DYPlayer.
 * @param {number} trackNum - Track number (9–17)
 * @param {string} [desc] - Track description/title
 */
export async function playAudioTrack(trackNum, desc) {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể thực hiện lệnh phát loa!", "error");
        return;
    }

    const hbTracker = getState('hbTracker') || { cong: { isOnline: false } };
    if (hbTracker.cong && !hbTracker.cong.isOnline) {
        showToast("CẢNH BÁO: Trạm Cống đang mất kết nối! Không thể phát thanh.", "error");
        return;
    }

    const trackTitle = desc || `Track ${trackNum}`;

    try {
        const success = await writeFirebase('control', {
            play_audio: trackNum,
            play_track: trackNum,
            track_title: trackTitle
        });

        if (success) {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction("Phát loa: " + trackTitle);
            }
            showToast(`Đang phát: ${trackTitle}`, 'success');
        } else {
            throw new Error('Ghi dữ liệu phát loa thất bại');
        }
    } catch (err) {
        console.error("[Broadcast] playAudioTrack error:", err);
        showToast(`Lỗi phát âm thanh: ${err.message}`, 'error');
    }
}

/**
 * Send emergency mute command to DYPlayer to halt all audio broadcasts.
 */
export async function stopAllAudio() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn đang ở chế độ Xem (Khách), không thể tắt loa!", "error");
        return;
    }

    try {
        const success = await writeFirebase('control', { stop_audio: 1 });
        if (success) {
            if (typeof window !== 'undefined' && typeof window.logAction === 'function') {
                window.logAction("Dừng phát loa");
            }
            showToast('Đã gửi lệnh dừng loa!', 'success');
        } else {
            throw new Error('Ghi dữ liệu dừng loa thất bại');
        }
    } catch (err) {
        console.error("[Broadcast] stopAllAudio error:", err);
        showToast(`Lỗi dừng âm thanh: ${err.message}`, 'error');
    }
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.updateVolumeLabel = updateVolumeLabel;
    window.sendVolumeControl = sendVolumeControl;
    window.toggleLoopAudio = toggleLoopAudio;
    window.playAudioTrack = playAudioTrack;
    window.stopAllAudio = stopAllAudio;
    window.AUDIO_TRACKS = AUDIO_TRACKS;
}

export { AUDIO_TRACKS };

export default {
    updateVolumeLabel,
    sendVolumeControl,
    toggleLoopAudio,
    playAudioTrack,
    stopAllAudio,
    AUDIO_TRACKS
};
