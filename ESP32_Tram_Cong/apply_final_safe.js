const fs = require('fs');

// Start from the clean recovered file
let content = fs.readFileSync('index_recovered.html', 'utf8');

// 1. Fix updateSettingWithLoading
content = content.replace(/const val = parseFloat\(document\.getElementById\('inp-calib-sal'\)\.value\);/g, "const val = parseFloat(document.getElementById('inp-calib-sal').value) || 0;");
content = content.replace(/const val = parseFloat\(document\.getElementById\('inp-calib-temp'\)\.value\);/g, "const val = parseFloat(document.getElementById('inp-calib-temp').value) || 0;");
content = content.replace(/const val = parseFloat\(document\.getElementById\('inp-calib-water-in'\)\.value\);/g, "const val = parseFloat(document.getElementById('inp-calib-water-in').value) || 0;");
content = content.replace(/const val = parseFloat\(document\.getElementById\('inp-calib-water-out'\)\.value\);/g, "const val = parseFloat(document.getElementById('inp-calib-water-out').value) || 0;");

// 2. Fix updateDOM
const domUpdateOld = /setText\('val-salinity', typeof d\.do_man === 'number' \? d\.do_man\.toFixed\(2\) : '--'\);\s*setText\('val-temp', typeof d\.temp === 'number' \? d\.temp\.toFixed\(1\) : '--'\);\s*setText\('val-water', typeof d\.muc_nuoc === 'number' \? d\.muc_nuoc\.toFixed\(1\) : '--'\);\s*setText\('val-water-outer', typeof d\.sieu_am_ngoai === 'number' \? d\.sieu_am_ngoai\.toFixed\(1\) : '--'\);/;

const domUpdateNew = `// HIỂN THỊ SỐ CHÍNH (ĐÃ BÙ TRỪ)
            setText('val-salinity', typeof d.do_man === 'number' ? d.do_man.toFixed(2) : '--');
            setText('val-temp', typeof d.temp === 'number' ? d.temp.toFixed(1) : '--');
            setText('val-water', typeof d.muc_nuoc === 'number' ? d.muc_nuoc.toFixed(1) : '--');
            setText('val-water-outer', typeof d.sieu_am_ngoai === 'number' ? d.sieu_am_ngoai.toFixed(1) : '--');

            // HIỂN THỊ DÒNG CHỮ NHỎ BÁO CÁO SAI SỐ
            const formatCalib = (val) => val > 0 ? \`+\${val}\` : val;

            if (d.calib_sal !== 0 && d.calib_sal !== undefined) {
                setHTML('raw-info-sal', \`Gốc: <span class="font-mono">\${(d.raw_do_man||0).toFixed(2)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_sal)}</span>\`);
            } else { setHTML('raw-info-sal', ''); }

            if (d.calib_temp !== 0 && d.calib_temp !== undefined) {
                setHTML('raw-info-temp', \`Gốc: <span class="font-mono">\${(d.raw_temp||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_temp)}</span>\`);
            } else { setHTML('raw-info-temp', ''); }

            if (d.calib_water_in !== 0 && d.calib_water_in !== undefined) {
                setHTML('raw-info-water-in', \`Gốc: <span class="font-mono">\${(d.raw_muc_nuoc||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_in)}</span>\`);
            } else { setHTML('raw-info-water-in', ''); }

            if (d.calib_water_out !== 0 && d.calib_water_out !== undefined) {
                setHTML('raw-info-water-out', \`Gốc: <span class="font-mono">\${(d.raw_sieu_am_ngoai||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_out)}</span>\`);
            } else { setHTML('raw-info-water-out', ''); }`;

content = content.replace(domUpdateOld, domUpdateNew);

// 3. Fix processAndMergeData
// SAFELY find the entire function block using indices from the NEW file
const startIdx = content.indexOf('function processAndMergeData() {');
// Find the END of the processAndMergeData function. 
// It ends where window.hbTracker is defined
const endIdx = content.indexOf('window.hbTracker = {');

if (startIdx !== -1 && endIdx !== -1) {
    const newProcessFunc = `function processAndMergeData() {
        let dbData = localDbData;
        let merged = {};
        const now = Date.now();
        lastFetchTime = now;
        
        // 1. ĐỌC CÀI ĐẶT & SAI SỐ (Lấy trước để tính toán)
        if (dbData.control) {
            merged.mode = dbData.control.mode ?? 0;
            merged.salinity_threshold = parseFloat(dbData.control.salinity_threshold) || 0.4;
            merged.flood_threshold = parseFloat(dbData.control.flood_threshold) || 30.0;
            merged.stall_threshold = parseInt(dbData.control.stall_threshold) || 700;
            merged.sensor_height = parseFloat(dbData.control.sensor_height) || 18.0; 
            
            merged.emergency_stop = dbData.control.emergency_stop ?? 0;
            merged.panel_unlocked = dbData.control.panel_unlocked ?? 0;
            merged.volume = dbData.control.volume ?? 25;
            merged.khoa_nut_vat_ly = dbData.control.khoa_nut_vat_ly ?? false;
            merged.loop_audio = dbData.control.loop_audio ?? 0;

            // Lấy sai số (Ép chặt kiểu số thực để không bị lỗi bằng 0)
            merged.calib_sal = parseFloat(dbData.control.calib_sal) || 0;
            merged.calib_temp = parseFloat(dbData.control.calib_temp) || 0;
            merged.calib_water_in = parseFloat(dbData.control.calib_water_in) || 0;
            merged.calib_water_out = parseFloat(dbData.control.calib_water_out) || 0;
        } else {
            merged.sensor_height = 18.0; 
            merged.calib_sal = 0; merged.calib_temp = 0; merged.calib_water_in = 0; merged.calib_water_out = 0;
        }

        // 2. TÍNH TOÁN DỮ LIỆU TRẠM PHAO
        if (dbData.tram_phao) {
            // Lấy dữ liệu gốc từ ESP32
            merged.raw_do_man = parseFloat(dbData.tram_phao.do_man ?? dbData.tram_phao.salinity ?? 0);
            merged.raw_temp = parseFloat(dbData.tram_phao.nhiet_do ?? dbData.tram_phao.temp ?? dbData.tram_phao.temperature ?? 0);
            
            // Tính dữ liệu hiển thị = Gốc + Sai số (Đảm bảo độ mặn không bị âm)
            merged.do_man = Math.max(0, merged.raw_do_man + merged.calib_sal);
            merged.temp = merged.raw_temp + merged.calib_temp;
            
            // Heartbeat & Pin
            merged.heartbeat_phao = dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0;
            if (merged.heartbeat_phao !== 0 && window.hbTracker.phao.lastVal !== merged.heartbeat_phao) {
                window.hbTracker.phao.lastVal = merged.heartbeat_phao; window.hbTracker.phao.lastTime = now; window.hbTracker.phao.isOnline = true;
            }
            merged.pin_phan_tram = dbData.tram_phao.pin_phan_tram ?? 0;
            merged.pin_volt = dbData.tram_phao.pin_volt ?? 0;
            merged.solar_cong_suat = dbData.tram_phao.solar_cong_suat ?? 0;
            merged.solar_dong_sac = dbData.tram_phao.solar_dong_sac ?? dbData.tram_phao.solar_current ?? 0;
            merged.trang_thai_dem = dbData.tram_phao.trang_thai_dem ?? 0;
        }

        // 3. TÍNH TOÁN DỮ LIỆU TRẠM CỐNG
        if (dbData.tram_cong) {
            const SENSOR_HEIGHT = merged.sensor_height; 
            const distIn = parseFloat(dbData.tram_cong.khoang_cach_sieu_am) || 0;
            const distOut = parseFloat(dbData.tram_cong.khoang_cach_sieu_am_ngoai) || 0;

            // Tính mực nước Gốc
            merged.raw_muc_nuoc = distIn > 0 ? Math.max(0, SENSOR_HEIGHT - distIn) : 0;
            merged.raw_sieu_am_ngoai = distOut > 0 ? Math.max(0, SENSOR_HEIGHT - distOut) : 0;

            // Tính mực nước Hiển thị = Gốc + Sai số
            merged.muc_nuoc = Math.max(0, merged.raw_muc_nuoc + merged.calib_water_in);
            merged.sieu_am_ngoai = Math.max(0, merged.raw_sieu_am_ngoai + merged.calib_water_out);

            merged.dong_dien_tho = dbData.tram_cong.dong_dien_tho ?? 0;
            merged.gate_status = dbData.tram_cong.gate_status ?? dbData.tram_cong.servo_state ?? 1;
            
            // Heartbeat & Pin
            merged.heartbeat_cong = dbData.tram_cong.heartbeatcong ?? dbData.tram_cong.heartbeat ?? 0;
            if (merged.heartbeat_cong !== 0 && window.hbTracker.cong.lastVal !== merged.heartbeat_cong) {
                window.hbTracker.cong.lastVal = merged.heartbeat_cong; window.hbTracker.cong.lastTime = now; window.hbTracker.cong.isOnline = true;
            }
            merged.emergency_ket_cong = dbData.tram_cong.emergency_ket_cong ?? 0;
            merged.cong_dien_ap = dbData.tram_cong.pin_volt ?? dbData.tram_cong.dien_ap ?? 0;
            merged.cong_pin_phan_tram = dbData.tram_cong.pin_phan_tram ?? 0;
            merged.cong_dong_dien = dbData.tram_cong.solar_dong_sac ?? dbData.tram_cong.dong_dien ?? 0;
            merged.cong_cong_suat = dbData.tram_cong.solar_cong_suat ?? dbData.tram_cong.cong_suat ?? 0;
        }

        // ĐỒNG BỘ CÁC Ô NHẬP LIỆU
        requestAnimationFrame(() => {
            const safeSet = (id, val) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = val; };
            safeSet('inp-sal', merged.salinity_threshold);
            safeSet('inp-flood', merged.flood_threshold);
            safeSet('inp-stall', merged.stall_threshold);
            safeSet('inp-height', merged.sensor_height);
            safeSet('inp-calib-sal', merged.calib_sal);
            safeSet('inp-calib-temp', merged.calib_temp);
            safeSet('inp-calib-water-in', merged.calib_water_in);
            safeSet('inp-calib-water-out', merged.calib_water_out);
        });

        dataCache = merged;
        updateDOM(dataCache);
    }

    `;
    
    // actualEnd is where window.hbTracker is defined. We need to leave `window.hbTracker = {` intact.
    // actualStart is startIdx minus indentation
    let actualStart = startIdx;
    while(content.charAt(actualStart - 1) === ' ') actualStart--;

    content = content.substring(0, actualStart) + '    ' + newProcessFunc + content.substring(endIdx);
    
    // Save over the original index.html
    fs.writeFileSync('index.html', content, 'utf8');
    console.log("FINAL SUCCESS! All patches injected cleanly into index.html.");
} else {
    console.log("FAILED TO FIND START OR END!");
}
