const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const missingHtml = `        <button onclick="switchTab('tab-bao-tri')" id="nav-bao-tri" class="pb-1.5 px-1 text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 border-b-2 border-transparent hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
            <i data-lucide="wrench" class="w-4 h-4 text-amber-500"></i> 
            <span data-i18n="tab_bao_tri">Bảo Trì & Thiết Bị</span>
        </button>
        <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-2 self-center flex-shrink-0"></div>
        <button onclick="toggleSwipeToTab()" id="btn-toggle-swipe" class="pb-1.5 px-2 text-xs sm:text-sm font-bold border-b-2 border-slate-300 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-slate-400 dark:text-slate-500 transition-colors">
            <i data-lucide="hand" id="icon-toggle-swipe" class="w-4 h-4 text-slate-400"></i> 
            <span id="text-toggle-swipe">Lướt (Tắt)</span>
        </button>
    </div>
</header>
`;

if (!html.includes('id="nav-bao-tri"')) {
    html = html.replace('<!-- ================= 2. MAIN CONTAINER ================= -->', missingHtml + '\n<!-- ================= 2. MAIN CONTAINER ================= -->');
    fs.writeFileSync('index.html', html);
    console.log('Restored layout successfully');
} else {
    console.log('Already there');
}
