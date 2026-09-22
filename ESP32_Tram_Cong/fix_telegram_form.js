const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regexLock = /(<div id="lock-physical-status"[\s\S]*?Trạng thái: Đang mở khóa[\s\S]*?<\/div>\s*<\/div>)/;

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

if (regexLock.test(html) && !html.includes('Báo Động Qua Telegram')) {
    html = html.replace(regexLock, '$1\n' + telegramSettingsHTML);
    fs.writeFileSync('index.html', html);
    console.log("Fixed! Added Telegram settings form");
} else {
    console.log("Could not find regex match, or already added!");
}
