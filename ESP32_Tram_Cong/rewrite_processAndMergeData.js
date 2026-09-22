const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The new correct implementation of processAndMergeData
const newFunction = `    function processAndMergeData() {
        let dbData = localDbData;
        let merged = {};
        const now = Date.now();
        lastFetchTime = now;
        
        // 1. DỮ LIỆU TRẠM PHAO
        if (dbData.tram_phao) {
            merged.do_man = dbData.tram_phao.do_man ?? dbData.tram_phao.salinity ?? 0;
            merged.temp = dbData.tram_phao.nhiet_do ?? dbData.tram_phao.temp ?? dbData.tram_phao.temperature ?? 0;
            
            // --- BẮT NHỊP TIM TRẠM PHAO LIÊN TỤC TRONG NỀN ---
            merged.heartbeat_phao = dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0;
            if (merged.heartbeat_phao && window.hbTracker.phao.lastVal !== merged.heartbeat_phao) {
                window.hbTracker.phao.lastVal = merged.heartbeat_phao;
                window.hbTracker.phao.lastTime = now;
                if (!window.hbTracker.phao.isOnline) {
                    window.hbTracker.phao.isOnline = true;
                    if(typeof pushAlert === 'function') pushAlert("ĐÃ KẾT NỐI LẠI", "Trạm Phao đã khôi phục kết nối thành công.");
                    if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong("KHÔI PHỤC KẾT NỐI", "Trạm Phao trực tuyến trở lại");
                    if(typeof window.updateConnectionUI === 'function') window.updateConnectionUI();
                }
            }
            
            merged.pin_phan_tram = dbData.tram_phao.pin_phan_tram ?? 0;
            merged.pin_volt = dbData.tram_phao.pin_volt ?? 0;
            merged.solar_cong_suat = dbData.tram_phao.solar_cong_suat ?? 0;
            merged.solar_dong_sac = dbData.tram_phao.solar_dong_sac ?? dbData.tram_phao.solar_current ?? 0;
            merged.solar_volt = dbData.tram_phao.solar_volt ?? 0;
            merged.trang_thai_dem = dbData.tram_phao.trang_thai_dem ?? 0;
        }

        // 2. DỮ LIỆU ĐIỀU KHIỂN & CÀI ĐẶT
        if (dbData.control) {
            merged.mode = dbData.control.mode ?? 0;
            merged.salinity_threshold = dbData.control.salinity_threshold ?? dbData.control.threshold ?? 0.4;
            merged.flood_threshold = dbData.control.flood_threshold ?? 30;
            merged.stall_threshold = dbData.control.stall_threshold ?? 700;
            
            merged.sensor_height = dbData.control.sensor_height ?? 18; 
            
            merged.emergency_stop = dbData.control.emergency_stop ?? 0;
            merged.panel_unlocked = dbData.control.panel_unlocked ?? 0;
            merged.volume = dbData.control.volume ?? 20;
            merged.khoa_nut_vat_ly = dbData.control.khoa_nut_vat_ly ?? false;
            merged.loop_audio = dbData.control.loop_audio ?? 0;
            merged.use_ultrasonic = dbData.control.use_ultrasonic ?? 0;
        }

        if (dbData.dieu_khien) {
            merged.khoa_nut_vat_ly = dbData.dieu_khien.khoa_nut_vat_ly ?? merged.khoa_nut_vat_ly ?? false;
        }

        // 3. DỮ LIỆU TRẠM CỐNG
        if (dbData.tram_cong) {
            const SENSOR_HEIGHT = merged.sensor_height || 18; 
            const distIn = dbData.tram_cong.khoang_cach_sieu_am ?? 0;
            const distOut = dbData.tram_cong.khoang_cach_sieu_am_ngoai ?? 0;

            merged.muc_nuoc = distIn > 0 ? Math.max(0, SENSOR_HEIGHT - distIn) : (dbData.tram_cong.muc_nuoc ?? 0);
            merged.sieu_am_ngoai = distOut > 0 ? Math.max(0, SENSOR_HEIGHT - distOut) : 0;
            merged.dong_dien_tho = dbData.tram_cong.dong_dien_tho ?? 0;
            merged.gate_status = dbData.tram_cong.gate_status ?? dbData.tram_cong.servo_state ?? 1;
            
            // --- BẮT NHỊP TIM TRẠM CỐNG LIÊN TỤC TRONG NỀN ---
            merged.heartbeat_cong = dbData.tram_cong.heartbeatcong ?? dbData.tram_cong.heartbeat ?? 0;
            if (merged.heartbeat_cong && window.hbTracker.cong.lastVal !== merged.heartbeat_cong) {
                window.hbTracker.cong.lastVal = merged.heartbeat_cong;
                window.hbTracker.cong.lastTime = now;
                if (!window.hbTracker.cong.isOnline) {
                    window.hbTracker.cong.isOnline = true;
                    if(typeof pushAlert === 'function') pushAlert("ĐÃ KẾT NỐI LẠI", "Trạm Cống đã khôi phục kết nối thành công. Mở khóa điều khiển.");
                    if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong("KHÔI PHỤC KẾT NỐI", "Trạm Cống trực tuyến trở lại");
                    if(typeof window.updateConnectionUI === 'function') window.updateConnectionUI();
                }
            }

            merged.emergency_ket_cong = dbData.tram_cong.emergency_ket_cong ?? 0;
            merged.cong_dien_ap = dbData.tram_cong.pin_volt ?? dbData.tram_cong.dien_ap ?? 0;
            merged.cong_pin_phan_tram = dbData.tram_cong.pin_phan_tram ?? 0;
            merged.cong_dong_dien = dbData.tram_cong.solar_dong_sac ?? dbData.tram_cong.dong_dien ?? 0;
            merged.cong_cong_suat = dbData.tram_cong.solar_cong_suat ?? dbData.tram_cong.cong_suat ?? 0;
        }

        // 4. DỮ LIỆU NĂNG LƯỢNG MẶT TRỜI
        if (dbData.nang_luong) {
            if (dbData.nang_luong.phao) {
                merged.pin_volt = dbData.nang_luong.phao.pin_volt ?? dbData.nang_luong.phao.dien_ap ?? dbData.nang_luong.phao.v ?? merged.pin_volt;
                merged.pin_phan_tram = dbData.nang_luong.phao.pin_phan_tram ?? dbData.nang_luong.phao.pct ?? merged.pin_phan_tram;
                merged.solar_volt = dbData.nang_luong.phao.solar_volt ?? dbData.nang_luong.phao.solar_v ?? merged.solar_volt;
                merged.solar_dong_sac = dbData.nang_luong.phao.solar_dong_sac ?? dbData.nang_luong.phao.dong_sac ?? dbData.nang_luong.phao.ma ?? merged.solar_dong_sac;
                merged.solar_cong_suat = dbData.nang_luong.phao.solar_cong_suat ?? dbData.nang_luong.phao.cong_suat ?? dbData.nang_luong.phao.w ?? merged.solar_cong_suat;
            }
            if (dbData.nang_luong.cong) {
                merged.cong_dien_ap = dbData.nang_luong.cong.dien_ap ?? dbData.nang_luong.cong.pin_volt ?? dbData.nang_luong.cong.v ?? merged.cong_dien_ap ?? 0;
                merged.cong_dong_dien = dbData.nang_luong.cong.dong_dien ?? dbData.nang_luong.cong.dong_sac ?? dbData.nang_luong.cong.ma ?? merged.cong_dong_dien ?? 0;
                merged.cong_cong_suat = dbData.nang_luong.cong.cong_suat ?? dbData.nang_luong.cong.w ?? merged.cong_cong_suat ?? 0;
                merged.cong_pin_phan_tram = dbData.nang_luong.cong.pin_phan_tram ?? dbData.nang_luong.cong.pct ?? merged.cong_pin_phan_tram ?? 0;
            }
        }

        // --- BƯỚC 5: TRÍCH XUẤT SAI SỐ TỪ CƠ SỞ DỮ LIỆU ---
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

        // --- BƯỚC 6: BẢO LƯU DỮ LIỆU GỐC TRƯỚC KHI BÙ TRỪ ---
        merged.raw_do_man = merged.do_man;
        merged.raw_temp = merged.temp;
        merged.raw_muc_nuoc = merged.muc_nuoc;
        merged.raw_sieu_am_ngoai = merged.sieu_am_ngoai;

        // --- BƯỚC 7: CỘNG/TRỪ SAI SỐ VÀO DỮ LIỆU ---
        merged.do_man = Math.max(0, merged.raw_do_man + merged.calib_sal);
        merged.temp = merged.raw_temp + merged.calib_temp;
        merged.muc_nuoc = Math.max(0, merged.raw_muc_nuoc + merged.calib_water_in);
        merged.sieu_am_ngoai = Math.max(0, merged.raw_sieu_am_ngoai + merged.calib_water_out);

        dataCache = merged;
        updateDOM(dataCache);
    }`;

// Find the start of processAndMergeData
const startIndex = html.indexOf('function processAndMergeData() {');
if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let started = false;
    
    for (let i = startIndex; i < html.length; i++) {
        if (html[i] === '{') {
            braceCount++;
            started = true;
        } else if (html[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIndex = i;
            break;
        }
    }
    
    if (endIndex !== -1) {
        html = html.substring(0, startIndex) + newFunction + html.substring(endIndex + 1);
        fs.writeFileSync('index.html', html);
        console.log("Successfully replaced processAndMergeData!");
    } else {
        console.log("Could not find matching brace for processAndMergeData.");
    }
} else {
    console.log("Could not find function processAndMergeData() {");
}
