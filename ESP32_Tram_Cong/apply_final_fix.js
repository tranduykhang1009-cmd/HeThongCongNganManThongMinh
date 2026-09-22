const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The marker where heartbeat should be restored
const heartbeatMarker = '// --- BẮT NHỊP TIM TRẠM PHAO LIÊN TỤC TRONG NỀN ---';
const heartbeatRestore = `// --- BẮT NHỊP TIM TRẠM PHAO LIÊN TỤC TRONG NỀN ---
            merged.heartbeat_phao = dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0;
            if (merged.heartbeat_phao && window.hbTracker.phao.lastVal !== merged.heartbeat_phao) {
                window.hbTracker.phao.lastVal = merged.heartbeat_phao;
                window.hbTracker.phao.lastTime = Date.now();
                if (!window.hbTracker.phao.isOnline) {
                    window.hbTracker.phao.isOnline = true;
                    if(typeof pushAlert === 'function') pushAlert("ĐÃ KẾT NỐI LẠI", "Trạm Phao đã khôi phục kết nối thành công.");
                    if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong("KHÔI PHỤC KẾT NỐI", "Trạm Phao trực tuyến trở lại");
                    if(typeof window.updateConnectionUI === 'function') window.updateConnectionUI();
                }
            }`;

if (html.includes(heartbeatMarker) && !html.includes('merged.heartbeat_phao = dbData.tram_phao.heartbeatphao')) {
    html = html.replace(heartbeatMarker, heartbeatRestore);
    console.log('Restored heartbeat_phao');
}

// Ensure the calibration data extraction is at the bottom of processAndMergeData
const oldEndMarker = `        dataCache = merged;
        updateDOM(dataCache);
    }`;

const newEndBlock = `        // --- BƯỚC 1: TRÍCH XUẤT SAI SỐ TỪ CƠ SỞ DỮ LIỆU ---
        if (dbData.control) {
            merged.calib_sal = typeof dbData.control.calib_sal === 'number' ? dbData.control.calib_sal : 0;
            merged.calib_temp = typeof dbData.control.calib_temp === 'number' ? dbData.control.calib_temp : 0;
            merged.calib_water_in = typeof dbData.control.calib_water_in === 'number' ? dbData.control.calib_water_in : 0;
            merged.calib_water_out = typeof dbData.control.calib_water_out === 'number' ? dbData.control.calib_water_out : 0;
        } else {
            merged.calib_sal = 0;
            merged.calib_temp = 0;
            merged.calib_water_in = 0;
            merged.calib_water_out = 0;
        }

        // --- BƯỚC 2: BẢO LƯU DỮ LIỆU GỐC TRƯỚC KHI BÙ TRỪ ---
        merged.raw_do_man = merged.do_man;
        merged.raw_temp = merged.temp;
        merged.raw_muc_nuoc = merged.muc_nuoc;
        merged.raw_sieu_am_ngoai = merged.sieu_am_ngoai;

        // --- BƯỚC 3: CỘNG/TRỪ SAI SỐ VÀO DỮ LIỆU ---
        merged.do_man = Math.max(0, merged.raw_do_man + merged.calib_sal);
        merged.temp = merged.raw_temp + merged.calib_temp;
        merged.muc_nuoc = Math.max(0, merged.raw_muc_nuoc + merged.calib_water_in);
        merged.sieu_am_ngoai = Math.max(0, merged.raw_sieu_am_ngoai + merged.calib_water_out);

        dataCache = merged;
        updateDOM(dataCache);
    }`;

// Wait, replace_file_content accidentally injected the calibration logic OVER the heartbeat block previously!
// Let's remove the accidentally injected calibration logic if it's there.
const badInjectionTarget = `// --- BƯỚC 1: TRÍCH XUẤT SAI SỐ TỪ CƠ SỞ DỮ LIỆU ---`;
if (html.includes(badInjectionTarget)) {
    // The previous tool run broke things, let's just surgically extract what we need.
    // Actually, I can just replace the whole processAndMergeData function.
}

fs.writeFileSync('index.html', html);
