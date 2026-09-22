const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Restore the deleted header buttons
const restoreTarget = `            <span id="action-log-count-badge" class="hidden ml-1 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white font-black rounded-full leading-none shadow-sm">0</span>
        </button>

<!-- ================= 2. MAIN CONTAINER ================= -->`;

const restoreWith = `            <span id="action-log-count-badge" class="hidden ml-1 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white font-black rounded-full leading-none shadow-sm">0</span>
        </button>
        <button onclick="switchTab('tab-bao-tri')" id="nav-bao-tri" class="pb-1.5 px-1 text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 border-b-2 border-transparent hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
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

<!-- ================= 2. MAIN CONTAINER ================= -->`;

if (html.includes(restoreTarget)) {
    html = html.replace(restoreTarget, restoreWith);
    console.log("Restored deleted header.");
}

// 2. Fix titles correctly
html = html.replace(
    '<i data-lucide="droplet" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> ĐỘ MẶN SÔNG',
    '<i data-lucide="droplet" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> ĐỘ MẶN'
);

html = html.replace(
    '<i data-lucide="waves" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> NƯỚC TRONG',
    '<i data-lucide="waves" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> MỰC NƯỚC TRONG CỐNG'
);

html = html.replace(
    '<i data-lucide="compass" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> NƯỚC NGOÀI',
    '<i data-lucide="compass" class="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600"></i> MỰC NƯỚC NGOÀI CỐNG'
);

// 3. Optional: Revert the inner texts back to Gốc / Bù because they are now redundant
html = html.replace(/Độ mặn gốc:/g, 'Gốc:');
html = html.replace(/Nhiệt độ gốc:/g, 'Gốc:');
html = html.replace(/Mực nước trong cống gốc:/g, 'Gốc:');
html = html.replace(/Mực nước ngoài cống gốc:/g, 'Gốc:');

fs.writeFileSync('index.html', html);
console.log('Fixed titles and restored html');
