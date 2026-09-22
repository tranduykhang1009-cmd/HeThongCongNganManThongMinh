
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf-8");

const adminMenu = `
                        <!-- Quản Lý Người Dùng (Chỉ Admin) -->
                        <button id="btn-admin-panel" onclick="openAdminModal()" class="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-colors flex items-center gap-3 group hidden">
                            <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center transition-colors shadow-sm">
                                <i data-lucide="shield-alert" class="w-4 h-4 text-red-600 dark:text-red-400"></i>
                            </div>
                            <span class="text-sm font-bold text-red-600 dark:text-red-400">Quản Lý Hệ Thống</span>
                        </button>
`;

html = html.replace("<!-- Tùy Chọn Ngôn Ngữ -->", adminMenu + "\n                        <!-- Tùy Chọn Ngôn Ngữ -->");
fs.writeFileSync("index.html", html);
console.log("Added admin menu button to index.html");
