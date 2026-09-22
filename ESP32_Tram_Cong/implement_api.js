const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Navbar Google Sheets Button
const toggleSwipeTarget = `<button onclick="toggleSwipeToTab()" id="btn-toggle-swipe" class="pb-1.5 px-2 text-xs sm:text-sm font-bold border-b-2 border-slate-300 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-slate-400 dark:text-slate-500 transition-colors">`;
const gSheetBtn = `
        <a href="https://docs.google.com/spreadsheets/d/1VGSKa__Ge1KRXKrvok5pihtK_mnQeW302tZffFFk3HE/edit" target="_blank" class="pb-1.5 px-2 text-xs sm:text-sm font-bold border-b-2 border-transparent hover:border-emerald-500 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 transition-colors">
            <i data-lucide="table" class="w-4 h-4"></i> 
            <span>Dữ Liệu Sheet</span>
        </a>
        <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-2 self-center flex-shrink-0"></div>
        `;

if (html.includes(toggleSwipeTarget) && !html.includes('Dữ Liệu Sheet')) {
    html = html.replace(toggleSwipeTarget, gSheetBtn + toggleSwipeTarget);
    console.log("Added Google Sheets button to navbar");
}

// 2. Telegram Settings Form
const lockPhysicalSectionEnd = `</div>
                    <div id="lock-physical-status" class="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Trạng thái: Đang mở khóa
                    </div>
                </div>`;
                
const telegramSettingsHTML = `
                <!-- 6. CẢNH BÁO TELEGRAM -->
                <div class="pt-6 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                        <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <i data-lucide="send" class="w-4 h-4 text-blue-500"></i> Báo Động Qua Telegram
                        </h4>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Cấu hình Bot gửi tin nhắn tự động khi có sự cố ngập mặn hoặc kẹt rác.</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-inner">
                        <div class="flex flex-col sm:flex-row gap-3 items-end">
                            <div class="flex-1 w-full">
                                <label class="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex justify-between">
                                    <span>Telegram Chat ID</span>
                                    <a href="https://t.me/userinfobot" target="_blank" class="text-blue-500 hover:underline">Lấy ID ở đâu?</a>
                                </label>
                                <input type="text" id="setting-telegram-id" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="Ví dụ: 123456789">
                            </div>
                            <button onclick="saveTelegramId()" class="scada-control-btn w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 active:scale-95">
                                <i data-lucide="save" class="w-4 h-4"></i> Lưu ID
                            </button>
                        </div>
                    </div>
                </div>`;

if (html.includes(lockPhysicalSectionEnd) && !html.includes('Báo Động Qua Telegram')) {
    html = html.replace(lockPhysicalSectionEnd, lockPhysicalSectionEnd + '\n' + telegramSettingsHTML);
    console.log("Added Telegram settings form");
}

// 3. API Logic (Google Sheets + Telegram API + setInterval)
const apiScript = `
<!-- ================= SCRIPT XỬ LÝ API (GOOGLE SHEETS & TELEGRAM) ================= -->
<script>
const GAS_URL = "https://script.google.com/macros/s/AKfycbxR2U_fJFQrUjsRLUwgMIRbu4px3DDzZ56FauXbs4AMU5V3X-M6ktfNggtgLdSyS0u3/exec";
const TELEGRAM_BOT_TOKEN = "8867073633:AAGk0DU8cvAy568d3PZcEcTPhqaTHhdPEFI";
let telegramChatId = "";

// Lắng nghe Firebase để load telegramChatId
const onFirebaseLoadSettings = setInterval(() => {
    if (window.dbData && window.dbData.control) {
        if (window.dbData.control.telegram_chat_id) {
            telegramChatId = window.dbData.control.telegram_chat_id;
            const input = document.getElementById('setting-telegram-id');
            if(input) input.value = telegramChatId;
        }
        clearInterval(onFirebaseLoadSettings);
    }
}, 1000);

// Hàm gửi dữ liệu lên Google Sheets
async function sendToGoogleSheets(dataObj) {
    try {
        const formData = new URLSearchParams();
        for (const key in dataObj) {
            formData.append(key, dataObj[key]);
        }
        
        fetch(GAS_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Tránh lỗi CORS
        });
        console.log("Đã bắn POST tới Google Sheets:", dataObj.loai);
    } catch (error) {
        console.error("Lỗi khi gửi Google Sheets:", error);
    }
}

// Hàm bắn tin nhắn Telegram
window.sendTelegramAlert = async function(message) {
    if (!telegramChatId || telegramChatId.trim() === "") return;
    try {
        const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=\${telegramChatId}&text=\${encodeURIComponent(message)}\`;
        fetch(url); // Không cần await
    } catch(err) {
        console.error("Lỗi gửi Telegram:", err);
    }
};

// Hàm lưu Telegram ID
window.saveTelegramId = function() {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast('Lỗi: Cần quyền Admin!', 'error');
        return;
    }
    const val = document.getElementById('setting-telegram-id').value;
    if (window.dbData && window.dbData.control) {
        window.set(window.ref(window.db, 'control/telegram_chat_id'), val).then(() => {
            telegramChatId = val;
            if(window.showToast) window.showToast('Đã lưu Telegram Chat ID thành công', 'success');
        });
    }
};

// ================= HOOK VÀO CÁC HÀM GHI NHẬT KÝ =================

// 1. Hook vào ghiNhatKy (Thao tác của User)
if (window.ghiNhatKy) {
    const oldGhiNhatKy = window.ghiNhatKy;
    window.ghiNhatKy = function(text, source) {
        // Chạy hàm cũ để lưu lên Firebase
        oldGhiNhatKy(text, source);
        
        // Gửi lên Google Sheets
        sendToGoogleSheets({
            loai: 'nhat_ky',
            action: text,
            source: source || 'Web SCADA',
            reason: 'Thao tác thủ công',
            network: window.isFirebaseOnline ? 'Online' : 'Offline',
            alert: 'Không'
        });
        
        // Báo Telegram
        window.sendTelegramAlert("👤 [USER THAO TÁC] " + text);
    };
}

// 2. Hook vào ghiNhatKyTuDong (Sự cố / Cảnh báo / AI)
if (window.ghiNhatKyTuDong) {
    const oldGhiNhatKyTuDong = window.ghiNhatKyTuDong;
    window.ghiNhatKyTuDong = function(type, text, source) {
        // Chạy hàm cũ
        oldGhiNhatKyTuDong(type, text, source);
        
        // Gửi lên Google Sheets
        sendToGoogleSheets({
            loai: 'nhat_ky',
            action: text,
            source: source || 'Hệ thống tự động',
            reason: type === 'alert' ? 'Phát hiện sự cố' : 'Auto Logic',
            network: window.isFirebaseOnline ? 'Online' : 'Offline',
            alert: type === 'alert' ? 'Đã kích hoạt' : 'Không'
        });

        // Bắn Telegram nếu là sự cố
        if (type === 'alert') {
            window.sendTelegramAlert("⚠️ [SỰ CỐ CỐNG NGĂN MẶN] " + text);
        }
    };
}

// Vòng lặp bắn Data Cảm Biến định kỳ (5 phút = 300000ms)
setInterval(() => {
    if (!window.dbData) return;
    
    let sal = window.dbData.raw_do_man || 0;
    let t = window.dbData.raw_temp || 0;
    let w_in = window.dbData.raw_muc_nuoc || 0;
    let w_out = window.dbData.raw_sieu_am_ngoai || 0;
    let bat = window.dbData.vol_pin || 0;
    
    // Áp dụng sai số
    if (window.dbData.control) {
        sal += (window.dbData.control.calib_sal || 0);
        t += (window.dbData.control.calib_temp || 0);
        w_in += (window.dbData.control.calib_water_in || 0);
        w_out += (window.dbData.control.calib_water_out || 0);
    }
    
    sendToGoogleSheets({
        loai: 'cam_bien',
        salinity: sal.toFixed(2),
        temp: t.toFixed(1),
        water_in: w_in.toFixed(1),
        water_out: w_out.toFixed(1),
        battery: bat.toFixed(0) + '%'
    });
}, 300000); // 5 phút

</script>
`;

if (!html.includes('GAS_URL') && html.includes('</body>')) {
    html = html.replace('</body>', apiScript + '\n</body>');
    console.log("Added API Scripts (Telegram + Google Sheets)");
}

fs.writeFileSync('index.html', html);
console.log("Successfully updated index.html with new Web-to-Sheet and Telegram integrations.");
