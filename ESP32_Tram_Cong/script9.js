
const GAS_URL = "https://script.google.com/macros/s/AKfycbxR2U_fJFQrUjsRLUwgMIRbu4px3DDzZ56FauXbs4AMU5V3X-M6ktfNggtgLdSyS0u3/exec";
let telegramChatId = "7831605237";

// Lắng nghe Firebase để load telegramChatId lúc mới vào Web
const onFirebaseLoadSettings = setInterval(() => {
    if (typeof window.dataCache !== 'undefined' && window.dataCache.control) {
        if (window.dataCache.control.telegram_chat_id) {
            telegramChatId = window.dataCache.control.telegram_chat_id;
            const input = document.getElementById('setting-telegram-id');
            if(input) input.value = telegramChatId;
        }
        clearInterval(onFirebaseLoadSettings);
    }
}, 1000);

// Hàm gửi dữ liệu lên Google Sheets
async function sendToGoogleSheets(dataObj) {
    try {
        // Nạp API KEY bảo mật cho mọi request
        dataObj.api_key = "NgayMaiDiThiQG2026";
        
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

// Hàm bắn tin nhắn Telegram qua Google Sheets (Broadcasting)
window.sendTelegramAlert = async function(message) {
    // Phân loại tin nhắn để báo cho GAS biết đây là tin khẩn cấp (Admin) hay tin thường (User + Admin)
    const isAlert = message.includes("CẢNH BÁO") || message.includes("KHẨN CẤP") || message.includes("LỖI");
    
    sendToGoogleSheets({
        loai: 'broadcast_telegram',
        message: message,
        severity: isAlert ? 'high' : 'normal',
        chat_id: telegramChatId
    });
};

// (Đã xóa hàm registerTelegram vì dùng Deep Link trực tiếp qua Telegram)

// Hàm Test Telegram bằng Google Sheets
window.testTelegram = function() {
    const val = telegramChatId;
    if (!val || val.trim() === "") {
        if(window.showToast) window.showToast('Chưa có ID nào được liên kết. Vui lòng bấm Kết Nối Bot trước!', 'error');
        return;
    }
    const btn = document.getElementById('btn-test-tele');
    if (btn) btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Đang gửi...`;
    
    // Test gửi thông báo
    window.sendTelegramAlert("✅ HỆ THỐNG KIỂM TRA: Gửi tin nhắn Telegram thành công từ hệ thống. ID của bạn là: " + val);
    
    setTimeout(() => {
        if (btn) btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500"></i> Đã Gửi`;
        if(window.showToast) window.showToast('Đã gửi Test qua hệ thống. Vui lòng check điện thoại.', 'success');
        if (typeof lucide !== 'undefined') lucide.createIcons({root: btn});
        
        setTimeout(() => {
            if (btn) btn.innerHTML = `<i data-lucide="bell-ring" class="w-3.5 h-3.5"></i> Test`;
            if (typeof lucide !== 'undefined') lucide.createIcons({root: btn});
        }, 3000);
    }, 1500);
};

// ================= HOOK VÀO CÁC HÀM GHI NHẬT KÝ =================

const setupHooks = setInterval(() => {
    if (window.ghiNhatKy && window.ghiNhatKyTuDong) {
        clearInterval(setupHooks);

        // 1. Hook vào ghiNhatKy (Thao tác của User: Bấm Mở / Đóng cống)
        const oldGhiNhatKy = window.ghiNhatKy;
        window.ghiNhatKy = function(text, source) {
            // Chạy hàm cũ để lưu lên Firebase
            oldGhiNhatKy(text, source);
            
            // Gửi lên Google Sheets (Đã sửa lại biến cho khớp cấu trúc Cột mới)
            sendToGoogleSheets({
                loai: 'nhat_ky',
                mode: (typeof dataCache !== 'undefined' && dataCache.mode === 1) ? 'TỰ ĐỘNG (AI)' : 'THỦ CÔNG (Web/Tại chỗ)',
                action: text, 
                wifi_cong: (window.hbTracker && window.hbTracker.cong && window.hbTracker.cong.isOnline) ? 'Online' : 'Offline',
                wifi_phao: (window.hbTracker && window.hbTracker.phao && window.hbTracker.phao.isOnline) ? 'Online' : 'Offline',
                reason: source ? ("Nguồn: " + source) : "Thao tác tay trên Web"
            });
            
            // Báo Telegram (Delay 1.5s để Google Sheets ghi xong, tránh kẹt request đồng thời)
            setTimeout(() => {
                window.sendTelegramAlert("👤 [USER THAO TÁC] " + text);
            }, 1500);
        };
        
        // TRỌNG TÂM LỖI: Các nút bấm trên Web gọi hàm logAction, mà logAction lại trỏ về hàm ghiNhatKy CŨ!
        // Do đó ta phải trỏ logAction về hàm ghiNhatKy MỚI (đã bị hook)
        window.logAction = window.ghiNhatKy;

        // --- Đã gỡ bỏ hook ghiNhatKyTuDong ở đây để chống SPAM. 
        // --- Mọi logic cảnh báo tự động sẽ do Google Apps Script xử lý ngầm 24/7.
    }
}, 500);
