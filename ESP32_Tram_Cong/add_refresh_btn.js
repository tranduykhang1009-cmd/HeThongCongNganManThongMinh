
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf-8");

// Add refresh button
html = html.replace(
    /<h3 class="text-lg font-black text-red-600 dark:text-red-400 flex items-center gap-2">/,
    `<button onclick="loadUsersList()" class="text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors mr-3">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i> Làm mới
            </button>
            <h3 class="text-lg font-black text-red-600 dark:text-red-400 flex items-center gap-2">`
);

// We also need to fix the layout so the title and buttons sit nicely.
html = html.replace(
    /<div class="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">/,
    `<div class="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
            <div class="flex items-center">`
);

html = html.replace(
    /<\/h3>\s*<button onclick="closeAdminModal\(\)"/,
    `</h3>
            </div>
            <button onclick="closeAdminModal()"`
);


fs.writeFileSync("index.html", html);
console.log("Added refresh button");
