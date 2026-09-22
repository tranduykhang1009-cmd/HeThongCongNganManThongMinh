
    const DB_BASE_URL = "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app";
    const DB_AUTH = "auth=tB2xm09anJWcnva5gz1NBvDS6VDGh7sjPvuURNEx";

    let dataCache = {};
    let alertsLog = [];
    window.saveLocks = {};
    let realtimeChart = null;
    let refreshIntervalMs = 2000;
    let fetchTimerId = null;
    let currentProjectPrefix = ""; // Rống là dự án 1, hoặc "/projects/proj2"

    let currentLang = 'vi';

    // ĐIỂN TỪ ĐỊNH ĐA NGÔN NGỮ HOÀN CHỈNH (FULL i18n DICTIONARY)
    const i18n = {
        vi: {
            app_title: "HỆ THỐNG GIÁM SÁT & ĐIỀU KHIỂN CỐNG NGĂN MẶN",
            app_subtitle: "Tác giả: Lê Trọng Nam, Trần Duy Khang, Huỳnh Minh Ngọc | GVHD: Trần Thị Hồng Hạnh",
            status_online: "Trực Tuyến",
            status_offline: "Mất Mạng",
            user_role: "Quản Trị Viên",
            language: "Ngôn Ngữ",
            logout: "Đăng Xuất Hệ Thống",
            tab_monitor: "Giám Sát Realtime",
            tab_control: "Điều Khiển & Camera",
            tab_settings: "Cài Đặt Hệ Thống",
            tab_alerts: "Nhật Ký Sự Cố",
            card_salinity: "ĐỘ MẶN SÔNG",
            card_temperature: "NHIỆT ĐỘ NƯỚC",
            card_water_inner: "MỰC NƯỚC TRONG CỐNG",
            card_water_outer: "MỰC NƯỚC NGOÀI CỐNG",
            card_diff: "CHÊNH LỆCH (ΔH)",
            card_motor_current: "DÒNG ĐIỆN MOTOR (ADC THÔ)",
            card_gate_status: "TRẠNG THÁI CỐNG",
            card_network: "HẠ TẦNG MẠNG",
            threshold: "Ngưỡng",
            safe: "AN TOÀN",
            stable: "ỔN ĐỊNH",
            safe_level: "Ngưỡng an toàn",
            river_water: "Mực nước sông ngoài",
            outer_water: "NGOẠI THỦY",
            pressure_safe: "AN TOÀN ÁP LỰC",
            gate_pressure: "Chênh áp lực cửa cống",
            diff_safe_desc: "Áp lực 2 phía an toàn",
            motor_load: "Tải động cơ",
            normal: "BÌNH THƯỜNG",
            buzzer_status: "Còi báo:",
            chart_title: "BIỂU ĐỒ DIỄN BIẾN ĐỘ MẶN & MỰC NƯỚC REALTIME",
            control_panel_title: "Bảng Điều Khiển Cửa Cống",
            operating_mode: "Chế Độ Hoạt Động",
            mode_manual: "THỦ CÔNG (MANUAL)",
            mode_auto: "TỰ ĐỘNG",
            gate_action: "Thao Tác Cửa Cống",
            open_gate: "MỞ CỐNG",
            close_gate: "ĐÓNG CỐNG",
            emergency_system: "Hệ Thống An Toàn Khẩn Cấp",
            emergency_btn: "DỪNG KHẨN CẤP (EMERGENCY)",
            camera_title: "Camera Giám Sát Trực Tiếp",
            camera_connecting: "Luồng Camera IP Trạm Cống đang kết nối...",
            settings_title: "Cấu Hình Ngưỡng Cảnh Báo & Phần Cứng",
            salinity_thresh_label: "Ngưỡng Độ Mặn Cảnh Báo (ppt)",
            water_thresh_label: "Ngưỡng Mực Nước An Toàn Trong Cống (cm)",
            stall_thresh_label: "Ngưỡng Độ Lệch Dòng Kẹt Rác (Δ ADC)",
            height_thresh_label: "Chiều Cao Lắp Đặt Cảm Biến Siêu Âm (cm)",
            volume_label: "Âm Lượng Còi Báo Khẩn Cấp (0 - 30):",
            save: "Lưu Ngưỡng",
            alerts_log_title: "Nhật Ký Sự Cố & Cảnh Báo Hệ Thống",
            export_csv: "Xuất Báo Cáo CSV",
            clear_log: "Xóa 50 Bản Ghi",
            no_alerts: "Chưa có sự cố nào được ghi nhận.",
            cancel: "Hủy Bỏ",
            confirm_delete: "Xóa Lịch Sử",
            confirm_clear_title: "Xác Nhận Xóa Nhật Ký Sự Cố?",
            confirm_clear_desc: "Toàn bộ lịch sử sự cố sẽ bị xóa khỏi bộ nhớ. Hành động này không thể hoàn tác!",
            modal_add_project_title: "Tạo Dự Án / Trạm Mới",
            modal_project_name: "Tên Trạm / Dự Án Mới",
            modal_project_loc: "Khu Vực / Tỉnh Thành",
            project_list_title: "Danh Sách Hệ Thống",
            add_new: "Thêm Mới",
            create_new_project: "Tạo Dự Án / Trạm Mới",
            create_and_switch: "Tạo Mới & Chuyển Vùng",
            modal_emg_title: "XÁC NHẬN DỪNG KHẨN CẤP?",
            modal_emg_desc: "Lệnh Dừng Khẩn Cấp sẽ lập tức khóa toàn bộ van cống và phát còi báo động khẩn!",
            confirm_emg_btn: "XÁC NHẬN DỪNG",
            err_emergency_active: "❌ Không thể điều khiển khi Emergency đang kích hoạt!",
            err_auto_mode_active: "❌ Hệ thống đang ở chế độ TỰ ĐỘNG, vui lòng chuyển sang THỦ CÔNG!",
            err_firebase_conn: "❌ Mất kết nối đến Firebase Database!",
            msg_mode_auto: "Đã chuyển Chế Độ TỰ ĐỘNG AI",
            msg_mode_manual: "Đã chuyển Chế Độ THỦ CÔNG",
            msg_gate_open: "Đã gửi lệnh MỞ CỐNG thành công",
            msg_gate_close: "Đã gửi lệnh ĐÓNG CỐNG thành công",
            msg_emg_on: "⚠️ ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP!",
            msg_emg_off: "✅ Đã khôi phục hoạt động bình thường",
            msg_save_success: "✅ Đã lưu cài đặt ngưỡng thành công!"
        },
        en: {
            app_title: "SALINITY CONTROL & MONITORING SYSTEM",
            app_subtitle: "Science Project - Authors: Le Trong Nam, Tran Duy Khang, Huynh Minh Ngoc | Mentor: Tran Thi Hong Hanh",
            status_online: "Online",
            status_offline: "Offline",
            user_role: "Administrator",
            language: "Language",
            logout: "System Logout",
            tab_monitor: "Realtime Monitor",
            tab_control: "Control & Camera",
            tab_settings: "Threshold Settings",
            tab_alerts: "Event Alerts Log",
            card_salinity: "RIVER SALINITY",
            card_temperature: "WATER TEMP",
            card_water_inner: "INNER WATER LEVEL",
            card_water_outer: "OUTER WATER LEVEL",
            card_diff: "LEVEL DIFF (ΔH)",
            card_motor_current: "MOTOR CURRENT",
            card_gate_status: "GATE STATUS",
            card_network: "NETWORK INFRA",
            threshold: "Threshold",
            safe: "SAFE",
            stable: "STABLE",
            safe_level: "Safe Threshold",
            river_water: "Outer River Level",
            outer_water: "OUTER RIVER",
            pressure_safe: "PRESSURE SAFE",
            gate_pressure: "Gate Pressure Diff",
            diff_safe_desc: "Balanced Hydraulic Pressure",
            motor_load: "Motor Load",
            normal: "NORMAL",
            buzzer_status: "Buzzer:",
            chart_title: "REALTIME SALINITY & WATER LEVEL TREND CHART",
            control_panel_title: "Sluice Gate Control Panel",
            operating_mode: "Operating Mode",
            mode_manual: "MANUAL MODE",
            mode_auto: "AUTO MODE",
            gate_action: "Gate Operation",
            open_gate: "OPEN GATE",
            close_gate: "CLOSE GATE",
            emergency_system: "Emergency Safety System",
            emergency_btn: "EMERGENCY STOP",
            camera_title: "Live Surveillance Camera",
            camera_connecting: "Sluice Gate IP Camera Stream Connecting...",
            settings_title: "Alert Threshold & Hardware Configuration",
            salinity_thresh_label: "Alert Salinity Threshold (ppt)",
            water_thresh_label: "Inner Gate Safe Water Level (cm)",
            stall_thresh_label: "Motor Overload / Jam Threshold (ADC)",
            height_thresh_label: "Ultrasonic Sensor Mounting Height (cm)",
            volume_label: "Emergency Buzzer Volume (0 - 30):",
            save: "Save Setting",
            alerts_log_title: "System Alerts & Incident Log",
            export_csv: "Export CSV Report",
            clear_log: "Clear Log",
            no_alerts: "No incident alerts recorded.",
            cancel: "Cancel",
            confirm_delete: "Delete History",
            confirm_clear_title: "Confirm Clear Incident Log?",
            confirm_clear_desc: "All alert history will be cleared from memory. This action cannot be undone!",
            modal_add_project_title: "Create New Project / Station",
            modal_project_name: "New Station / Project Name",
            modal_project_loc: "Location / Province",
            project_list_title: "System List",
            add_new: "Add New",
            create_new_project: "Create New Station",
            create_and_switch: "Create & Switch",
            modal_emg_title: "CONFIRM EMERGENCY STOP?",
            modal_emg_desc: "Emergency Stop will immediately lock all gate valves and trigger emergency alarm!",
            confirm_emg_btn: "CONFIRM STOP",
            err_emergency_active: "❌ Cannot operate while Emergency Stop is active!",
            err_auto_mode_active: "❌ System is in AUTO mode! Switch to MANUAL mode first.",
            err_firebase_conn: "❌ Firebase Database connection failed!",
            msg_mode_auto: "Switched to AUTO Mode",
            msg_mode_manual: "Switched to MANUAL Mode",
            msg_gate_open: "OPEN GATE command sent successfully",
            msg_gate_close: "CLOSE GATE command sent successfully",
            msg_emg_on: "⚠️ EMERGENCY STOP ACTIVATED!",
            msg_emg_off: "✅ Normal Operation Restored",
            msg_save_success: "✅ Settings saved successfully!"
        }
    };

    // HÀM DỊCH i18n DỘNG CHUẨN VÀ TỐI ƯU
    function t(key) {
        return i18n[currentLang]?.[key] || i18n.vi[key] || key;
    }

    function switchLanguage(lang) {
        currentLang = lang;
        const dict = i18n[lang] || i18n.vi;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                    el.placeholder = dict[key];
                } else {
                    el.innerText = dict[key];
                }
            }
        });
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        // --- THÊM DÒNG NÀY VÀO: XÓA SẠCH SPAM TRƯỚC KHI HIỆN THÔNG BÁO MỚI ---
        container.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] flex items-center gap-2.5 transform transition-all duration-300 translate-y-4 opacity-0 border border-white/10 ${type === 'success' ? 'bg-slate-900/90 backdrop-blur-md text-emerald-400 border-emerald-500/30' : 'bg-slate-900/90 backdrop-blur-md text-rose-400 border-rose-500/30'}`;
        toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle-2' : 'alert-triangle'}" class="w-4 h-4 ${type === 'success' ? 'text-emerald-400' : 'text-rose-400'} flex-shrink-0"></i> <span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons();
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    let defaultProjects = [
        { name: "Cống Ngăn Mặn #01", loc: "Thông Minh", active: true, prefix: "" },
        { name: "Cống Ngăn Mặn #02", loc: "Ba Tri", active: false, prefix: "/tram_02" },
        { name: "Ao Nuôi Thủy Sản 01", loc: "Chợ Lách", active: false, prefix: "/ao_01" }
    ];

    function getSavedProjects() {
        const saved = localStorage.getItem('scada_projects');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return defaultProjects;
    }

    function saveProjectsToStorage(projs) {
        localStorage.setItem('scada_projects', JSON.stringify(projs));
    }

    function renderProjectDropdown() {
        const projs = getSavedProjects();
        const container = document.getElementById('project-list-container');
        if (!container) return;

        let activeName = "Cống Ngăn Mặn #01";
        container.innerHTML = projs.map(p => {
            if (p.active) {
                activeName = p.name;
                currentProjectPrefix = p.prefix || "";
            }
            return `
                <button onclick="selectSystem('${p.name}')" class="w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors border-t border-slate-100 dark:border-slate-700/60 ${p.active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium'}">
                    <span class="flex items-center gap-2">${p.active ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''} ${p.name}</span>
                    <span class="text-[10px] text-slate-400">${p.loc || ''}</span>
                </button>
            `;
        }).join('');

        setText('selected-system-name', activeName);
        lucide.createIcons();
    }

    function selectSystem(name) {
        let projs = getSavedProjects();
        projs.forEach(p => p.active = (p.name === name));
        saveProjectsToStorage(projs);
        renderProjectDropdown();
        toggleDropdown('system-dropdown');
        showToast(`Đã chuyển sang theo dõi: ${name}`, 'success');
        pushAlert("CHUYỂN DỰ ÁN", `Đã chuyển sang quản lý: ${name}`);
        fetchData(); // Fetch dữ liệu trạm mới ngay
    }

    function saveNewProject() {
        const name = document.getElementById('inp-new-proj-name').value.trim();
        const loc = document.getElementById('inp-new-proj-loc').value.trim();
        if (!name) return;

        let projs = getSavedProjects();
        projs.forEach(p => p.active = false);
        const prefix = `/tram_${Date.now().toString().slice(-4)}`;
        projs.push({ name: name, loc: loc || 'Mới tạo', active: true, prefix: prefix });
        saveProjectsToStorage(projs);
        renderProjectDropdown();
        closeModal('modal-add-project');
        showToast(`Tạo thành công dự án: ${name}`, 'success');
        pushAlert("TẠO DỰ ÁN MỚI", `Đã khởi tạo dự án: ${name} (${loc})`);
        fetchData();
    }

    // [ĐÃ XÓA] changeRefreshRate - Không cần polling thủ công, Firebase onValue() đã xử lý real-time.

    // function logout() đã được chuyển lên thẻ script type="module" ở đầu trang

    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }

    window.toggleMobileSidebar = function(open) {
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('mobile-sidebar-overlay');
        if (!sidebar || !overlay) return;

        if (open) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            overlay.classList.add('opacity-100');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');
        }
    };

    function switchTab(tabId) {
        const toolsMenu = document.getElementById('tools-menu');
        if (toolsMenu && !toolsMenu.classList.contains('hidden') && typeof toggleToolsMenu === 'function') {
            toggleToolsMenu();
        }

        const targetTab = document.getElementById(tabId);
        if (!targetTab) {
            console.warn(`[UI Debugger] Tab "${tabId}" không tồn tại hoặc chưa sẵn sàng trong DOM. Hủy chuyển tab.`);
            return;
        }

        // Xóa class active và thêm hidden cho tất cả các tab
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active', 'opacity-100');
            el.classList.add('hidden');
        });
        
        // Reset Desktop Header Tab styles
        document.querySelectorAll('header button[id^="nav-"]').forEach(el => {
            el.classList.remove('text-blue-600', 'border-blue-600');
            el.classList.add('text-slate-400', 'border-transparent');
        });

        // Reset Mobile Sidebar Tab styles
        document.querySelectorAll('aside button[id^="mob-nav-"]').forEach(el => {
            el.classList.remove('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
            el.classList.add('text-slate-600', 'dark:text-slate-300');
        });
        
        // Hiển thị Tab được chọn với hiệu ứng Fade-in mượt mà
        targetTab.classList.remove('hidden', 'opacity-0');
        targetTab.classList.add('active', 'opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            if (targetTab) {
                targetTab.classList.remove('opacity-0');
                targetTab.classList.add('opacity-100');
            }
        }, 20);

        const navSuffix = tabId.replace('tab-', '');
        const activeNav = document.getElementById('nav-' + navSuffix);
        if (activeNav) {
            activeNav.classList.remove('text-slate-400', 'border-transparent');
            activeNav.classList.add('text-blue-600', 'border-blue-600');
        }

        const activeMobNav = document.getElementById('mob-nav-' + navSuffix);
        if (activeMobNav) {
            activeMobNav.classList.remove('text-slate-600', 'dark:text-slate-300');
            activeMobNav.classList.add('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
        }

        // KHÔNG gọi các hàm render dữ liệu nếu tab đó chưa sẵn sàng hoặc không hiển thị
        if (tabId === 'tab-canh-bao' && typeof window.renderTableData === 'function') {
            const tbody = document.getElementById('alert-logs-tbody');
            if (tbody) window.renderTableData('alert');
        } else if (tabId === 'tab-thao-tac' && typeof window.renderTableData === 'function') {
            const tbody = document.getElementById('action-logs-tbody');
            if (tbody) window.renderTableData('action');
        } else if (tabId === 'tab-bao-tri' && typeof window.renderTableData === 'function') {
            const tbody = document.getElementById('maint-history-tbody');
            if (tbody) window.renderTableData('maint');
        }
    }

    // Xử lý sự kiện kéo bằng chuột (Drag-to-scroll) & Safeguard DOM Event Listeners
    document.addEventListener('DOMContentLoaded', () => {
        const tabContainer = document.querySelector('#nav-tabs-container');
        let isDown = false, startX, scrollLeft;
        if (tabContainer) {
            tabContainer.addEventListener('mousedown', (e) => { 
                isDown = true; 
                tabContainer.classList.add('cursor-grabbing'); 
                startX = e.pageX - tabContainer.offsetLeft; 
                scrollLeft = tabContainer.scrollLeft; 
            });
            tabContainer.addEventListener('mouseleave', () => { 
                isDown = false; 
                tabContainer.classList.remove('cursor-grabbing'); 
            });
            tabContainer.addEventListener('mouseup', () => { 
                isDown = false; 
                tabContainer.classList.remove('cursor-grabbing'); 
            });
            tabContainer.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - tabContainer.offsetLeft;
                const walk = (x - startX) * 2; // Tốc độ cuộn
                tabContainer.scrollLeft = scrollLeft - walk;
            });
        }

        // Safeguard DOM Elements: Luôn kiểm tra phần tử tồn tại trước khi gắn addEventListener
        const setupSafeTableListeners = (type) => {
            const btnExport = document.getElementById(`btn-${type}-export-csv`);
            if (btnExport) btnExport.addEventListener('click', () => { if (typeof window.exportLogsCSV === 'function') window.exportLogsCSV(type); });

            const btnDelete = document.getElementById(`btn-${type}-delete-log`);
            if (btnDelete) btnDelete.addEventListener('click', () => { if (typeof window.deleteLogsData === 'function') window.deleteLogsData(type); });

            const btnPrev = document.getElementById(`${type}-prev-btn`);
            if (btnPrev) btnPrev.addEventListener('click', () => { if (typeof window.changePage === 'function') window.changePage(type, -1); });

            const btnNext = document.getElementById(`${type}-next-btn`);
            if (btnNext) btnNext.addEventListener('click', () => { if (typeof window.changePage === 'function') window.changePage(type, 1); });
        };
        ['alert', 'action', 'maint'].forEach(type => setupSafeTableListeners(type));
    });

    function openModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('hidden');
    }

    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    }

    function toggleDropdown(id) {
        const dropdown = document.getElementById(id);
        if (!dropdown) return;
        document.querySelectorAll('#user-dropdown, #system-dropdown').forEach(d => {
            if (d.id !== id) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
    }

    window.addEventListener('click', function(e) {
        if (!e.target.closest('#user-dropdown') && !e.target.closest('#system-dropdown') && !e.target.closest('button')) {
            document.querySelectorAll('#user-dropdown, #system-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });

    let lastAlertTitle = '';
    let lastAlertTime = 0;
    let lastSensorAlertTime = 0;

    function pushAlert(title, message) {
        const nowMs = Date.now();
        if (title === lastAlertTitle && (nowMs - lastAlertTime < 5000)) return;
        lastAlertTitle = title;
        lastAlertTime = nowMs;

        const nowStr = new Date().toLocaleTimeString('vi-VN');
        const dateISO = new Date().toISOString().split('T')[0];
        alertsLog.unshift({ title, message, time: nowStr, dateISO, status: 'Chờ xử lý' });
        if (alertsLog.length > 50) alertsLog.pop();

        // CHỐNG SPAM CẢNH BÁO THỦY LỰC / CẢM BIẾN (Debounce 60 giây / 60000ms)
        if (title.startsWith("CẢNH BÁO") || title.includes("MẤT KẾT NỐI")) {
            if (nowMs - lastSensorAlertTime > 60000) {
                lastSensorAlertTime = nowMs;
                if (typeof window.ghiNhatKyTuDong === 'function') {
                    window.ghiNhatKyTuDong(title, message);
                }
            }
        }

        const filterEl = document.getElementById('filterDate');
        const selectedDate = filterEl ? filterEl.value : '';
        if (typeof window.renderNhatKyToHTML === 'function') {
            window.renderNhatKyToHTML(selectedDate);
        }
    }

    window.filterAlertsByDate = function() {
        const filterEl = document.getElementById('filterDate');
        const selectedDate = filterEl ? filterEl.value : '';
        renderAlertsLog(selectedDate);
    };

    function renderAlertsLog(filterDateStr = '') {
        const container = document.getElementById('alert-list-container');
        if (!container) return;

        let filtered = alertsLog;
        if (filterDateStr) {
            filtered = alertsLog.filter(a => !a.dateISO || a.dateISO === filterDateStr);
        }

        const countBadge = document.getElementById('alert-count');
        if (countBadge) {
            countBadge.innerText = filtered.length;
            if (filtered.length > 0) countBadge.classList.remove('hidden');
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-xs text-slate-500 text-center">Không có nhật ký nào${filterDateStr ? ' trong ngày ' + filterDateStr : ''}.</div>`;
            return;
        }

        container.innerHTML = filtered.map(a => `
            <div class="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-xl text-xs flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <strong class="text-red-700 dark:text-red-400 font-black">${a.title}</strong>
                        <span class="text-[9px] font-extrabold bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200 px-1.5 py-0.5 rounded">${a.status}</span>
                    </div>
                    <span class="text-slate-600 dark:text-slate-300">${a.message}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${a.time}</span>
            </div>
        `).join('');
    }

    function confirmClearAlerts() { openModal('modal-confirm-clear'); }
    function confirmEmergencyToggle() { openModal('modal-confirm-emergency'); }

    function executeClearAlerts() {
        alertsLog = [];
        const countBadge = document.getElementById('alert-count');
        if (countBadge) countBadge.classList.add('hidden');
        const container = document.getElementById('alert-list-container');
        if (container) container.innerHTML = `<div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-xs text-slate-500 text-center">${t('no_alerts')}</div>`;
        closeModal('modal-confirm-clear');
        showToast('Đã xóa toàn bộ nhật ký sự cố!', 'success');
    }

    function exportCSV() {
        if (alertsLog.length === 0) {
            showToast('Không có dữ liệu nhật ký để xuất!', 'error');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Thời Gian,Tiêu Đề,Nội Dung,Trạng Thái
";
        alertsLog.forEach(a => {
            csvContent += `"${a.time}","${a.title}","${a.message}","${a.status}"
`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Nhat_Ky_Su_Co_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Đã tải báo cáo CSV thành công!', 'success');
    }

    let salinityChart, waterChart;
    let lastChartUpdateTime = 0;

    function initChart() {
        const ctxSal = document.getElementById('salinityChart')?.getContext('2d');
        const ctxWater = document.getElementById('waterChart')?.getContext('2d');
        if (!ctxSal || !ctxWater) return;
        
        const isMobile = window.innerWidth < 768;
        
        // Cấu hình chung cho cả 2 biểu đồ
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: isMobile ? { left: 0, right: 0, top: 5, bottom: 0 } : undefined },
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { 
                    position: 'top', 
                    labels: { boxWidth: isMobile ? 8 : 12, font: { size: isMobile ? 9 : 11, weight: 'bold' }, padding: isMobile ? 8 : 10 } 
                } 
            },
            scales: {
                x: { ticks: { font: { size: isMobile ? 8 : 9 }, maxRotation: isMobile ? 45 : 0 } }
            }
        };

        salinityChart = new Chart(ctxSal, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Độ Mặn (ppt)',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderWidth: isMobile ? 1.5 : 2.5,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: { 
                        type: 'linear', 
                        display: true, 
                        position: 'left', 
                        min: 0, 
                        suggestedMax: 1.5,
                        title: { display: !isMobile, text: 'Mặn (ppt)', font: { size: 10, weight: 'bold' } },
                        ticks: { font: { size: isMobile ? 9 : 10 } }
                    }
                }
            }
        });

        waterChart = new Chart(ctxWater, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Nước Trong Cống (cm)',
                        data: [],
                        borderColor: '#0284c7',
                        backgroundColor: 'transparent',
                        borderWidth: isMobile ? 1.5 : 2,
                        borderDash: [4, 4],
                        tension: 0.3
                    },
                    {
                        label: 'Nước Ngoài Cống (cm)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderWidth: isMobile ? 1.5 : 2,
                        borderDash: [2, 2],
                        tension: 0.3
                    },
                    {
                        label: 'Chênh Lệch ΔH (cm)',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'transparent',
                        borderWidth: isMobile ? 1 : 1.5,
                        borderDash: [6, 3],
                        tension: 0.3
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: { 
                        type: 'linear', 
                        display: true, 
                        position: 'left', 
                        min: 0, 
                        suggestedMax: 50,
                        title: { display: !isMobile, text: 'Mực Nước / ΔH (cm)', font: { size: 10, weight: 'bold' } },
                        ticks: { font: { size: isMobile ? 9 : 10 } }
                    }
                }
            }
        });
    }

    function addChartData(label, salinity, temp, waterInner, waterOuter, waterDiff) {
        if (!salinityChart || !waterChart) return;
        
        // THROTTLE: Chỉ cập nhật biểu đồ tối đa 5 giây 1 lần để tránh lặp timestamp
        const now = Date.now();
        if (now - lastChartUpdateTime < 5000) return;
        lastChartUpdateTime = now;

        // Cập nhật biểu đồ Độ Mặn
        if (salinityChart.data.labels.length > 20) {
            salinityChart.data.labels.shift();
            salinityChart.data.datasets[0].data.shift();
        }
        salinityChart.data.labels.push(label);
        salinityChart.data.datasets[0].data.push(salinity);
        salinityChart.update('none');

        // Cập nhật biểu đồ Mực Nước
        if (waterChart.data.labels.length > 20) {
            waterChart.data.labels.shift();
            waterChart.data.datasets.forEach(ds => ds.data.shift());
        }
        waterChart.data.labels.push(label);
        waterChart.data.datasets[0].data.push(waterInner);
        waterChart.data.datasets[1].data.push(waterOuter);
        waterChart.data.datasets[2].data.push(waterDiff);
        waterChart.update('none');
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    function setHTML(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    }

    function calculateBatteryPercentage(voltage, maxV, minV) {
        if (typeof voltage !== 'number' || isNaN(voltage)) return 0;
        const percent = Math.round(((voltage - minV) / (maxV - minV)) * 100);
        return Math.max(0, Math.min(100, percent));
    }

    function updateLockPhysicalDOM(isLocked) {
        const knob = document.getElementById('lock-physical-knob');
        const icon = document.getElementById('lock-physical-icon');
        const status = document.getElementById('lock-physical-status');
        const btn = document.getElementById('btn-toggle-lock-physical');

        if (knob && icon && status && btn) {
            if (isLocked) {
                knob.style.transform = 'translateX(24px)';
                icon.setAttribute('data-lucide', 'lock');
                icon.className = 'w-3 h-3 text-red-500';
                btn.className = 'relative inline-flex items-center cursor-pointer w-12 h-6 rounded-full p-0.5 transition-colors duration-300 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 shadow-inner';
                status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Trạng thái: ĐÃ KHÓA BẢO MẬT';
                status.className = 'text-[11px] font-bold text-red-500 flex items-center gap-1';
            } else {
                knob.style.transform = 'translateX(0)';
                icon.setAttribute('data-lucide', 'lock-open');
                icon.className = 'w-3 h-3 text-slate-400';
                btn.className = 'relative inline-flex items-center cursor-pointer w-12 h-6 rounded-full p-0.5 transition-colors duration-300 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-inner';
                status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Trạng thái: Đang mở khóa';
                status.className = 'text-[11px] font-bold text-slate-400 flex items-center gap-1';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    function updateModeDOM(mode) {
        const btnMan = document.getElementById('btn-mode-manual');
        const btnAuto = document.getElementById('btn-mode-auto');
        
        // Đã cập nhật thành py-2 rounded-lg để khớp với thiết kế mới
        const baseClasses = "scada-control-btn py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5";
        const activeManual = "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200/60 dark:border-slate-600";
        const activeAuto = "bg-emerald-600 text-white shadow-md border border-emerald-700";
        const inactiveClass = "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-transparent";

        // Fix: Chuyển mode thành số (đề phòng ESP32 trả về string "1")
        const hdrMode = document.getElementById('hdr-mode-badge');
        const mobMode = document.getElementById('mob-mode-badge');

        if (Number(mode) === 1) {
            if (btnMan) btnMan.className = `${baseClasses} ${inactiveClass}`;
            if (btnAuto) btnAuto.className = `${baseClasses} ${activeAuto}`;
            if (hdrMode) { hdrMode.innerText = "TỰ ĐỘNG"; hdrMode.className = "text-[10px] font-bold text-emerald-600"; }
            if (mobMode) { mobMode.innerText = "TỰ ĐỘNG"; mobMode.className = "text-[10px] font-bold text-emerald-600"; }
        } else {
            if (btnMan) btnMan.className = `${baseClasses} ${activeManual}`;
            if (btnAuto) btnAuto.className = `${baseClasses} ${inactiveClass}`;
            if (hdrMode) { hdrMode.innerText = "THỦ CÔNG"; hdrMode.className = "text-[10px] font-bold text-orange-500"; }
            if (mobMode) { mobMode.innerText = "THỦ CÔNG"; mobMode.className = "text-[10px] font-bold text-orange-500"; }
        }

        // Tự động duy trì trạng thái khóa nếu không phải Admin
        if (typeof window.isScadaAdmin !== 'undefined' && !window.isScadaAdmin) {
            if (btnMan) {
                btnMan.disabled = true;
                btnMan.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            }
            if (btnAuto) {
                btnAuto.disabled = true;
                btnAuto.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            }
        }
    }

    let lastFetchTime = Date.now();

    function updateDOM(d) {
        requestAnimationFrame(() => {
            // HIỂN THỊ SỐ CHÍNH (ĐÃ BÙ TRỪ)
            setText('val-salinity', typeof d.do_man === 'number' ? d.do_man.toFixed(2) : '--');
            setText('val-temp', typeof d.temp === 'number' ? d.temp.toFixed(1) : '--');
            setText('val-water', typeof d.muc_nuoc === 'number' ? d.muc_nuoc.toFixed(1) : '--');
            setText('val-water-outer', typeof d.sieu_am_ngoai === 'number' ? d.sieu_am_ngoai.toFixed(1) : '--');
            
            // Cập nhật Progress Bar Mực Nước
            const waterIn = typeof d.muc_nuoc === 'number' ? d.muc_nuoc : 0;
            const floodThresh = typeof d.flood_threshold === 'number' ? d.flood_threshold : 30.0;
            const waterProgress = document.getElementById('water-progress-bar');
            if (waterProgress) {
                let p = (waterIn / floodThresh) * 100;
                if (p > 100) p = 100;
                if (p < 0) p = 0;
                waterProgress.style.width = p + '%';
                if (p >= 100) {
                    waterProgress.className = "bg-red-500 h-full rounded-full transition-all duration-500";
                } else if (p >= 80) {
                    waterProgress.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
                } else {
                    waterProgress.className = "bg-blue-500 h-full rounded-full transition-all duration-500";
                }
            }

            // HIỂN THỊ DÒNG CHỮ NHỎ BÁO CÁO SAI SỐ
            const formatCalib = (val) => val > 0 ? `+${val}` : val;

            if (d.calib_sal !== 0 && d.calib_sal !== undefined) {
                setHTML('raw-info-sal', `Gốc: <span class="font-mono">${(d.raw_do_man||0).toFixed(2)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">${formatCalib(d.calib_sal)}</span>`);
            } else { setHTML('raw-info-sal', ''); }

            if (d.calib_temp !== 0 && d.calib_temp !== undefined) {
                setHTML('raw-info-temp', `Gốc: <span class="font-mono">${(d.raw_temp||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">${formatCalib(d.calib_temp)}</span>`);
            } else { setHTML('raw-info-temp', ''); }

            if (d.calib_water_in !== 0 && d.calib_water_in !== undefined) {
                setHTML('raw-info-water-in', `Gốc: <span class="font-mono">${(d.raw_muc_nuoc||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">${formatCalib(d.calib_water_in)}</span>`);
            } else { setHTML('raw-info-water-in', ''); }

            if (d.calib_water_out !== 0 && d.calib_water_out !== undefined) {
                setHTML('raw-info-water-out', `Gốc: <span class="font-mono">${(d.raw_sieu_am_ngoai||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">${formatCalib(d.calib_water_out)}</span>`);
            } else { setHTML('raw-info-water-out', ''); }
            setText('val-current-raw', d.dong_dien_tho ?? '--');

            const diff = Math.abs((d.muc_nuoc ?? 0) - (d.sieu_am_ngoai ?? 0)); // ĐÃ BÙ TRỪ
            setText('val-water-diff', diff.toFixed(1));
            const cardDiff = document.getElementById('card-water-diff');
            const badgeDiff = document.getElementById('badge-diff-status');
            const descDiff = document.getElementById('diff-desc');

            if (diff > 5.0) {
                if (cardDiff) cardDiff.className = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-2xl p-2.5 sm:p-3 md:p-4 border-2 border-red-500 shadow-xl flex flex-col justify-between diff-alert";
                if (badgeDiff) {
                    badgeDiff.innerText = "CẢNH BÁO ÁP LỰC";
                    badgeDiff.className = "text-[9px] sm:text-[10px] md:text-xs bg-red-600 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-black animate-pulse whitespace-nowrap";
                }
                if (descDiff) descDiff.innerText = "Chênh lệch cao (>5cm)";
                pushAlert("CẢNH BÁO THỦY LỰC", `Mực nước trong/ngoài cống chênh lệch ${diff.toFixed(1)}cm!`);
            } else {
                if (cardDiff) cardDiff.className = "bg-white dark:bg-slate-800 rounded-2xl p-2.5 sm:p-3 md:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-all duration-300";
                if (badgeDiff) {
                    badgeDiff.innerText = t('pressure_safe');
                    badgeDiff.className = "text-[9px] sm:text-[10px] md:text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold border border-emerald-200 dark:border-emerald-800 whitespace-nowrap";
                }
                if (descDiff) descDiff.innerText = t('diff_safe_desc');
            }

            setText('val-sal_thresh', d.salinity_threshold ?? '0.40');
            setText('val-flood_thresh', d.flood_threshold ?? '30.0');
            
            // Đồng bộ Cài đặt Âm thanh
            const inpVolume = document.getElementById('inp-volume');
            if (inpVolume && document.activeElement !== inpVolume && typeof d.volume === 'number') {
                inpVolume.value = d.volume;
                const percent = Math.round((d.volume / 30) * 100);
                setText('lbl-volume', `${d.volume} / 30 (${percent}%)`);
            }
            
            const inpLoop = document.getElementById('toggle-loop-audio');
            if (inpLoop && typeof d.loop_audio === 'number') {
                inpLoop.checked = (d.loop_audio === 1);
                const statusTxt = document.getElementById('txt-loop-status');
                if (statusTxt) {
                    statusTxt.innerText = inpLoop.checked ? "BẬT (Lặp vô hạn)" : "TẮT (1 Lần)";
                    statusTxt.className = inpLoop.checked 
                        ? "text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400"
                        : "text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                }
            }
            // -------------------------------------------------------------
            // ĐỒNG BỘ DỮ LIỆU TỪ FIREBASE VÀO CÁC Ô INPUT CÀI ĐẶT NGƯỠNG
            // Hàm trợ giúp để cập nhật input mà không bị đè chữ khi người dùng đang nhập dở
            const updateInputSafe = (id, val) => {
                const inp = document.getElementById(id);
                // Chỉ ghi đè nếu input tồn tại, không được focus, VÀ chưa bị người dùng sửa (chưa có cờ dirty)
                if (inp && document.activeElement !== inp && inp.dataset.dirty !== 'true') {
                    inp.value = val;
                }
            };

            // HIỆU CHUẨN (CALIBRATION)
            updateInputSafe('inp-calib-sal', d.calib_sal ?? 0);
            updateInputSafe('inp-calib-temp', d.calib_temp ?? 0);
            updateInputSafe('inp-calib-water-in', d.calib_water_in ?? 0);
            updateInputSafe('inp-calib-water-out', d.calib_water_out ?? 0);
            
            // THRESHOLDS (NGƯỠNG)
            updateInputSafe('inp-sal', d.salinity_threshold ?? 0.4);
            updateInputSafe('inp-flood', d.flood_threshold ?? 30.0);
            updateInputSafe('inp-stall', d.stall_threshold ?? 700);
            updateInputSafe('inp-height', d.sensor_height ?? 18);

            // CẬP NHẬT GIAO DIỆN PARAMETER CARDS VÀ CALIBRATION STATUS
            setText('st-current-sal', typeof d.do_man === 'number' ? d.do_man.toFixed(2) : '--');
            setText('st-current-flood', typeof d.muc_nuoc === 'number' ? d.muc_nuoc.toFixed(1) : '--');
            setText('st-current-stall', typeof d.dong_dien_tho === 'number' ? d.dong_dien_tho.toFixed(0) : '--');

            const setStatusBadge = (id, isWarning, safeText = 'Trong ngưỡng', warnText = 'Vượt ngưỡng') => {
                const el = document.getElementById(id);
                if (!el) return;
                if (isWarning) {
                    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> <span class="text-red-500">${warnText}</span>`;
                } else {
                    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> <span class="text-emerald-500">${safeText}</span>`;
                }
            };

            setStatusBadge('st-status-sal', d.do_man > d.salinity_threshold);
            setStatusBadge('st-status-flood', d.muc_nuoc > d.flood_threshold);
            setStatusBadge('st-status-stall', d.emergency_ket_cong === 1);

            const hdrAlarm = document.getElementById('hdr-alarm-badge');
            const mobAlarm = document.getElementById('mob-alarm-badge');
            const isAlarm = d.gate_status === 0 || d.emergency_ket_cong === 1;
            
            if (hdrAlarm) {
                hdrAlarm.innerText = isAlarm ? "CẢNH BÁO" : "BÌNH THƯỜNG";
                hdrAlarm.className = isAlarm ? "text-[10px] font-bold text-red-500 animate-pulse" : "text-[10px] font-bold text-emerald-600";
            }
            if (mobAlarm) {
                mobAlarm.innerText = isAlarm ? "CẢNH BÁO" : "BÌNH THƯỜNG";
                mobAlarm.className = isAlarm ? "text-[10px] font-bold text-red-500 animate-pulse" : "text-[10px] font-bold text-emerald-600";
            }

            const setCalibBadge = (id, calibVal) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (calibVal !== 0 && calibVal !== undefined) {
                    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> <span class="text-amber-500">OFFSET ${calibVal > 0 ? '+'+calibVal : calibVal}</span>`;
                } else {
                    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> <span class="text-slate-400">RAW DATA</span>`;
                }
            };

            setCalibBadge('calib-status-sal', d.calib_sal);
            setCalibBadge('calib-status-temp', d.calib_temp);
            setCalibBadge('calib-status-water-in', d.calib_water_in);
            setCalibBadge('calib-status-water-out', d.calib_water_out);

            // CẬP NHẬT TRẠNG THÁI KHÓA VẬT LÝ
            const btnLockPhysical = document.getElementById('btn-toggle-lock-physical');
            const lockPhysicalKnob = document.getElementById('lock-physical-knob');
            const lockPhysicalIcon = document.getElementById('lock-physical-icon');
            const lockPhysicalStatus = document.getElementById('lock-physical-status');

            if (btnLockPhysical && typeof d.khoa_nut_vat_ly === 'boolean') {
                if (d.khoa_nut_vat_ly) {
                    btnLockPhysical.className = "relative inline-flex items-center cursor-pointer w-12 h-6 rounded-full p-1 transition-colors duration-300 bg-red-500 shadow-inner";
                    lockPhysicalKnob.className = "absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center translate-x-6";
                    lockPhysicalIcon.className = "w-3 h-3 text-red-500";
                    lockPhysicalIcon.setAttribute("data-lucide", "lock");
                    if(lockPhysicalStatus) lockPhysicalStatus.innerHTML = `Trạng thái: <span class="text-red-500 font-bold">Đã khóa</span>`;
                } else {
                    btnLockPhysical.className = "relative inline-flex items-center cursor-pointer w-12 h-6 rounded-full p-1 transition-colors duration-300 bg-slate-300 dark:bg-slate-700 shadow-inner";
                    lockPhysicalKnob.className = "absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center translate-x-0";
                    lockPhysicalIcon.className = "w-3 h-3 text-slate-500";
                    lockPhysicalIcon.setAttribute("data-lucide", "unlock");
                    if(lockPhysicalStatus) lockPhysicalStatus.innerHTML = `Trạng thái: <span class="text-emerald-500 font-bold">Đang mở khóa</span>`;
                }
                if (window.lucide) window.lucide.createIcons({root: lockPhysicalKnob});
            }

            const timeNow = new Date().toLocaleTimeString('vi-VN');
            addChartData(timeNow, d.do_man ?? 0, d.temp ?? 0, d.muc_nuoc ?? 0, d.sieu_am_ngoai ?? 0, diff);
            setText('lbl-last-update', timeNow);

            const badgeSal = document.getElementById('badge-salinity');
            if (parseFloat(d.do_man) > parseFloat(d.salinity_threshold)) {
                pushAlert("CẢNH BÁO MẶN", `Mặn (${parseFloat(d.do_man).toFixed(2)} ppt) vượt ngưỡng!`);
                if (badgeSal) {
                    badgeSal.innerText = "CẢNH BÁO";
                    badgeSal.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse";
                }
            } else {
                if (badgeSal) {
                    badgeSal.innerText = t('safe');
                    badgeSal.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
                }
            }

            const badgeWater = document.getElementById('badge-water');
            if (parseFloat(d.muc_nuoc) > parseFloat(d.flood_threshold)) {
                pushAlert("CẢNH BÁO NƯỚC", `Nước trong cống (${parseFloat(d.muc_nuoc).toFixed(1)} cm) vượt ngưỡng an toàn!`);
                if (badgeWater) {
                    badgeWater.innerText = "VƯỢT NGƯỠNG";
                    badgeWater.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse";
                }
            } else {
                if (badgeWater) {
                    badgeWater.innerText = t('safe');
                    badgeWater.className = "px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
                }
            }

            // TRẠNG THÁI CỬA CỐNG: 1=Mở, 0=Đóng, 2=Đang mở, 3=Đang đóng

            // -------------------------------------------------------------
            // ĐỒNG BỘ HIỆU ỨNG VIỀN CHO NÚT BẤM CƠ HỌC (CHỈ SÁNG KHI MOTOR ĐANG CHẠY)
            // -------------------------------------------------------------
            const btnOpen = document.getElementById('btn-action-open');
            const btnClose = document.getElementById('btn-action-close');
            
            if (btnOpen && btnClose) {
                // Xóa viền cũ mỗi lần cập nhật
                btnOpen.classList.remove('ring-4', 'ring-emerald-400', 'shadow-[0_0_15px_rgba(52,211,153,0.8)]');
                btnClose.classList.remove('ring-4', 'ring-blue-400', 'shadow-[0_0_15px_rgba(59,130,246,0.8)]');
                
                // Chỉ sáng viền Nút Mở khi trạng thái là 2 (ĐANG MỞ)
                if (d.gate_status === 2) {
                    btnOpen.classList.add('ring-4', 'ring-emerald-400', 'shadow-[0_0_15px_rgba(52,211,153,0.8)]');
                } 
                // Chỉ sáng viền Nút Đóng khi trạng thái là 3 (ĐANG ĐÓNG)
                else if (d.gate_status === 3) {
                    btnClose.classList.add('ring-4', 'ring-blue-400', 'shadow-[0_0_15px_rgba(59,130,246,0.8)]');
                }
            }

            if (d.gate_status === 2 || d.gate_status === 3) {
                setHTML('gate-badge-box', `
                    <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-amber-500 shadow-md shadow-amber-500/30 flex items-center gap-1 animate-pulse">
                        <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> ${d.gate_status === 2 ? 'ĐANG MỞ...' : 'ĐANG ĐÓNG...'}
                    </span>
                `);
            } else if (d.gate_status === 1) {
                setHTML('gate-badge-box', `
                    <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-emerald-600 shadow-md shadow-emerald-600/30 flex items-center gap-1">
                        <i data-lucide="unlock" class="w-3.5 h-3.5"></i> ĐÃ MỞ
                    </span>
                `);
            } else {
                setHTML('gate-badge-box', `
                    <span id="gate-text" class="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-red-600 shadow-md shadow-red-600/30 flex items-center gap-1 animate-pulse">
                        <i data-lucide="lock" class="w-3.5 h-3.5"></i> ĐÃ ĐÓNG
                    </span>
                `);
            }

            // -------------------------------------------------------------
            // CẬP NHẬT MÔ PHỎNG 3D
            // -------------------------------------------------------------
            const simGate = document.getElementById('sim-gate');
            const simGateLabel = document.getElementById('sim-gate-label');
            const simWater = document.getElementById('sim-water');
            
            if (simGate && simGateLabel) {
                // Di chuyển cánh cống và thay đổi text đồng bộ
                if (d.gate_status === 1) {
                    simGate.style.transform = "translateY(-120%)";
                    simGateLabel.innerText = "ĐÃ MỞ";
                    simGateLabel.className = "bg-emerald-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg tracking-wider border border-emerald-500";
                } else if (d.gate_status === 0) {
                    simGate.style.transform = "translateY(0%)";
                    simGateLabel.innerText = "ĐÃ ĐÓNG";
                    simGateLabel.className = "bg-red-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg tracking-wider border border-red-500";
                } else if (d.gate_status === 2) {
                    simGate.style.transform = "translateY(-60%)";
                    simGateLabel.innerText = "ĐANG MỞ...";
                    simGateLabel.className = "bg-amber-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg tracking-wider border border-amber-600 animate-pulse";
                } else if (d.gate_status === 3) {
                    simGate.style.transform = "translateY(-60%)";
                    simGateLabel.innerText = "ĐANG ĐÓNG...";
                    simGateLabel.className = "bg-amber-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg tracking-wider border border-amber-600 animate-pulse";
                }
            }

            // Kiểm tra trạng thái offline
            const isCongOnline = (window.hbTracker && window.hbTracker.cong) ? window.hbTracker.cong.isOnline : true;
            const isPhaoOnline = (window.hbTracker && window.hbTracker.phao) ? window.hbTracker.phao.isOnline : true;

            // Toggle offline style cho các Data Cards
            const phaoCardIds = ['card-salinity', 'card-temp'];
            const congCardIds = ['card-water-in', 'card-water-out', 'card-water-diff', 'card-motor', 'card-gate-status'];
            
            phaoCardIds.forEach(id => {
                const card = document.getElementById(id);
                if (card) {
                    if (!isPhaoOnline) {
                        card.classList.add('grayscale', 'opacity-40', 'bg-slate-50', 'dark:bg-slate-900/50');
                        card.classList.remove('bg-white', 'dark:bg-slate-800');
                        const label = card.querySelector('.stale-label');
                        if (label) label.classList.remove('hidden');
                    } else {
                        card.classList.remove('grayscale', 'opacity-40', 'bg-slate-50', 'dark:bg-slate-900/50');
                        card.classList.add('bg-white', 'dark:bg-slate-800');
                        const label = card.querySelector('.stale-label');
                        if (label) label.classList.add('hidden');
                    }
                }
            });

            congCardIds.forEach(id => {
                const card = document.getElementById(id);
                if (card) {
                    // Cập nhật giá trị hiển thị bên trong
                    const valueEl = card.querySelector('[id^="val-"]');
                    
                    if (!isCongOnline) {
                        card.classList.add('grayscale', 'opacity-60', 'bg-slate-50', 'dark:bg-slate-900/50');
                        card.classList.remove('bg-white', 'dark:bg-slate-800');
                        const label = card.querySelector('.stale-label');
                        if (label) label.classList.remove('hidden');
                        if (valueEl) {
                            valueEl.classList.add('line-through', 'text-slate-400', 'dark:text-slate-500');
                            valueEl.classList.remove('text-slate-900', 'dark:text-white', 'text-blue-600');
                        }
                    } else {
                        card.classList.remove('grayscale', 'opacity-60', 'bg-slate-50', 'dark:bg-slate-900/50');
                        card.classList.add('bg-white', 'dark:bg-slate-800');
                        const label = card.querySelector('.stale-label');
                        if (label) label.classList.add('hidden');
                        if (valueEl) {
                            valueEl.classList.remove('line-through', 'text-slate-400', 'dark:text-slate-500');
                            valueEl.classList.add('text-slate-900', 'dark:text-white');
                        }
                    }
                }
            });

            // Xử lý Giao diện Offline trên Mô phỏng 3D
            const simGateBlock = document.getElementById('sim-gate')?.closest('.relative.w-full.flex-1');
            if (simGateBlock) {
                if (!isCongOnline) {
                    simGateBlock.style.filter = 'grayscale(60%) opacity(0.9)';
                    if (!document.getElementById('sim-offline-badge')) {
                        const badge = document.createElement('div');
                        badge.id = 'sim-offline-badge';
                        badge.className = 'absolute inset-0 flex items-center justify-center z-50 bg-black/5 backdrop-blur-[1px] rounded-2xl';
                        badge.innerHTML = `<span class="bg-red-600/90 text-white font-black px-4 py-2 rounded-xl shadow-lg border border-red-500 tracking-widest uppercase flex items-center gap-2"><i data-lucide="wifi-off" class="w-5 h-5"></i> DỮ LIỆU CŨ (OFFLINE)</span>`;
                        simGateBlock.appendChild(badge);
                        if (window.lucide) window.lucide.createIcons({ root: badge });
                    }
                } else {
                    simGateBlock.style.filter = '';
                    const badge = document.getElementById('sim-offline-badge');
                    if (badge) badge.remove();
                }
            }

            // Cập nhật LED nhấp nháy trên mô phỏng và trên Card Trạng Thái Cống
            
            // -------------------------------------------------------------
            // ĐỒNG BỘ TRẠNG THÁI LED ĐỎ (REALTIME TAB & MÔ PHỎNG 3D)
            // Lõi phần cứng: Nháy nhanh (Kẹt/Di chuyển), Nháy chậm (Trời tối), Tắt (Nghỉ)
            // -------------------------------------------------------------
            const isMovingOrError = isCongOnline && (d.gate_status === 2 || d.gate_status === 3 || d.emergency_ket_cong === 1 || d.emergency_stop === 1);
            const isNightMode = isCongOnline && d.trang_thai_dem === 1;

            let ledHtml = '';
            let simLedClass = "sim-led w-2.5 h-3 rounded-t-[100px] rounded-b-[2px] border relative overflow-hidden transition-colors duration-300 ";
            let simBaseClass = "sim-led-base w-3 h-0.5 rounded-[1px] transition-colors duration-300 ";

            if (isMovingOrError) {
                // Nháy cực nhanh (Đang chạy hoặc Kẹt sự cố) -> Sáng màu Đỏ tươi
                ledHtml = `<div class="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] border-2 border-red-200 animate-ping"></div>`;
                simLedClass += "bg-red-500 border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-ping";
                simBaseClass += "bg-red-500";
            } else if (isNightMode) {
                // Nháy chậm (Trời tối báo hiệu có trụ cống) -> Sáng Đỏ dịu
                ledHtml = `<div class="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] border-2 border-red-400 animate-pulse"></div>`;
                simLedClass += "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse";
                simBaseClass += "bg-red-600";
            } else {
                // Tắt (Trạng thái bình thường) -> Chuyển màu Xám/Đỏ sậm
                ledHtml = `<div class="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-slate-400 dark:border-slate-500"></div>`;
                simLedClass += "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-500 shadow-inner";
                simBaseClass += "bg-slate-400 dark:bg-slate-600";
            }

            // Gắn LED vào Tab Realtime (Thay thế cái bóng đèn cũ bằng viên LED đỏ tròn)
            setHTML('status-led', ledHtml);

            // Gắn LED vào 2 trụ mô phỏng 3D
            const simLeds = document.querySelectorAll('.sim-led');
            const simLedBases = document.querySelectorAll('.sim-led-base');
            if (simLeds.length > 0) {
                simLeds.forEach(el => el.className = simLedClass);
                simLedBases.forEach(el => el.className = simBaseClass);
            }
            
            // Xử lý icon còi báo và bóng đèn phụ trên Mô phỏng
            const simSpeaker = document.getElementById('sim-speaker');
            const simLightbulb = document.getElementById('sim-lightbulb');
            const statusBuzzer = document.getElementById('status-buzzer');
            
            if (simLightbulb) simLightbulb.setAttribute('class', isNightMode ? "w-4 h-4 text-amber-400 icon-blink" : "w-4 h-4 text-slate-300 transition-colors");
            
            const isSpeakerActive = (d.speaker_status === 1 || d.emergency_stop === 1 || d.emergency_ket_cong === 1);
            if (simSpeaker) simSpeaker.setAttribute('class', isSpeakerActive ? "w-4 h-4 text-red-500 icon-blink" : "w-4 h-4 text-slate-300 transition-colors");
            if (statusBuzzer) statusBuzzer.innerHTML = isSpeakerActive ? `<i data-lucide="volume-2" class="w-4 h-4 text-red-500 icon-blink"></i>` : `<i data-lucide="volume-2" class="w-4 h-4 text-slate-300"></i>`;
                
                if (window.lucide) {
                    if (statusLed) window.lucide.createIcons({ root: statusLed });
                    if (statusBuzzer) window.lucide.createIcons({ root: statusBuzzer });
                }

            const simWaterTubeIn = document.getElementById('sim-water-tube-in');
            const simWaterTubeOut = document.getElementById('sim-water-tube-out');
            const simWaterMarkerIn = document.getElementById('sim-water-marker-in');
            const simWaterMarkerOut = document.getElementById('sim-water-marker-out');
            const simWaterTextIn = document.getElementById('sim-water-text-in');
            const simWaterTextOut = document.getElementById('sim-water-text-out');

            if (simWater) {
                const maxWater = d.sensor_height || 100;
                
                // Mực nước trong (d.muc_nuoc)
                const waterValIn = d.muc_nuoc || 0;
                let waterPercentIn = (waterValIn / maxWater) * 100;
                waterPercentIn = Math.max(5, Math.min(95, waterPercentIn));
                
                // Mực nước ngoài (d.sieu_am_ngoai)
                const waterValOut = d.sieu_am_ngoai || 0;
                let waterPercentOut = (waterValOut / maxWater) * 100;
                waterPercentOut = Math.max(5, Math.min(95, waterPercentOut));
                
                // Cập nhật mương nước nền (bên ngoài)
                simWater.style.height = `${waterPercentOut}%`;
                
                // Cập nhật Ống thủy đo mực nước & Marker Trong
                if (simWaterTubeIn) simWaterTubeIn.style.height = `${waterPercentIn}%`;
                if (simWaterMarkerIn) simWaterMarkerIn.style.bottom = `${waterPercentIn}%`;
                if (simWaterTextIn) simWaterTextIn.innerText = `${Math.round(waterValIn)}cm`;

                // Cập nhật Ống thủy đo mực nước & Marker Ngoài
                if (simWaterTubeOut) simWaterTubeOut.style.height = `${waterPercentOut}%`;
                if (simWaterMarkerOut) simWaterMarkerOut.style.bottom = `${waterPercentOut}%`;
                if (simWaterTextOut) simWaterTextOut.innerText = `${Math.round(waterValOut)}cm`;
            }

            const btnEmg = document.getElementById('btn-emergency');
            const txtEmg = document.getElementById('emg-text');

            if (d.emergency_ket_cong === 1) {
                // TRƯỜNG HỢP 1: PHẦN CỨNG BÁO KẸT CỐNG -> Đổi sang Nút Cam "Khôi Phục Kẹt Cống"
                if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/40 active:scale-95 text-xs sm:text-sm animate-pulse border-b-4 border-amber-700";
                if (txtEmg) txtEmg.innerText = "⚠️ KHÔI PHỤC (ĐANG KẸT CỐNG)";
            } 
            else if (d.emergency_stop === 1) {
                // TRƯỜNG HỢP 2: DỪNG KHẨN CẤP TỪ WEB -> Đổi sang Nút Xanh "Khôi Phục E-Stop"
                if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 active:scale-95 text-xs sm:text-sm animate-pulse border-b-4 border-emerald-800";
                if (txtEmg) txtEmg.innerText = "KHÔI PHỤC HOẠT ĐỘNG (RESET E-STOP)";
            } 
            else {
                // TRƯỜNG HỢP 3: BÌNH THƯỜNG -> Nút Đỏ "Dừng Khẩn Cấp"
                if (btnEmg) btnEmg.className = "scada-control-btn w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.6)] border-b-4 border-red-800 flex items-center justify-center gap-2.5 active:scale-95 transition-all";
                if (txtEmg) txtEmg.innerText = t('emergency_btn');
            }



            setHTML('status-cong', window.hbTracker.cong.isOnline ? 
                `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>` : 
                `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`
            );
            
            setHTML('status-phao', window.hbTracker.phao.isOnline ? 
                `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>` : 
                `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`
            );

            const linkDot = document.getElementById('link-dot'); const linkDotDesk = document.getElementById('link-dot-desktop');
            const linkText = document.getElementById('link-text'); const linkTextDesk = document.getElementById('link-text-desktop');
                    const isSystemOnline = window.hbTracker.cong.isOnline || window.hbTracker.phao.isOnline;
        if (isSystemOnline) {
            document.getElementById('app').style.boxShadow = "inset 0 0 15px rgba(16, 185, 129, 0.4)";
            document.getElementById('app').style.border = "2px solid rgba(16, 185, 129, 0.5)";
            document.getElementById('app').style.transition = "all 0.5s ease-in-out";
            document.getElementById('app').style.boxSizing = "border-box";
            document.getElementById('app').style.minHeight = "100vh";
        } else {
            document.getElementById('app').style.boxShadow = "inset 0 0 25px rgba(239, 68, 68, 0.6)";
            document.getElementById('app').style.border = "2px solid rgba(239, 68, 68, 0.8)";
            document.getElementById('app').style.transition = "all 0.5s ease-in-out";
            document.getElementById('app').style.boxSizing = "border-box";
            document.getElementById('app').style.minHeight = "100vh";
        }

        if (isSystemOnline) {
                if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse"; if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
                if (linkText) linkText.innerText = t('status_online'); if (linkTextDesk) linkTextDesk.innerText = t('status_online');
            } else {
                if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-red-500"; if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-red-500";
                if (linkText) linkText.innerText = t('status_offline'); if (linkTextDesk) linkTextDesk.innerText = t('status_offline');
            }

            setHTML('status-led', d.trang_thai_dem === 1 ? `<i data-lucide="lightbulb" class="w-5 h-5 text-amber-400 icon-blink"></i>` : `<i data-lucide="lightbulb" class="w-5 h-5 text-slate-300"></i>`);
            setHTML('status-buzzer', (d.speaker_status === 1 || d.emergency_stop === 1) ? `<i data-lucide="volume-2" class="w-5 h-5 text-red-500 icon-blink"></i>` : `<i data-lucide="volume-2" class="w-5 h-5 text-slate-300"></i>`);

            // Cập nhật Năng Lượng Pin & Solar Trạm Phao (Hệ Pin 1S: 3.2V - 4.2V) & Trạm Cống (Hệ Pin 3S: 9.6V - 12.6V)
            const pinV = (d.pin_volt !== undefined && d.pin_volt !== null && !isNaN(parseFloat(d.pin_volt))) ? parseFloat(d.pin_volt).toFixed(2) : '0.00';
            const pinPct = parseFloat(pinV) > 0 ? calculateBatteryPercentage(parseFloat(pinV), 4.2, 3.2) : Math.min(100, Math.max(0, Math.round(d.pin_phan_tram ?? 0)));
            const solarI = (d.solar_dong_sac !== undefined && d.solar_dong_sac !== null && !isNaN(parseFloat(d.solar_dong_sac))) ? parseFloat(d.solar_dong_sac).toFixed(0) : '0';
            const solarP = (d.solar_cong_suat !== undefined && d.solar_cong_suat !== null && !isNaN(parseFloat(d.solar_cong_suat))) ? parseFloat(d.solar_cong_suat).toFixed(2) : '0.00';

            // Tooltip PHAO
            setText('hdr-pin-percent', `${pinPct}%`);
            setText('phao-v', `${pinV} V`);
            setText('phao-pct', `${pinPct}%`);
            setText('phao-ma', `${solarI} mA`);
            setText('phao-w', `${solarP} W`);

            const phaoPctEl = document.getElementById('phao-pct');
            if (phaoPctEl) {
                phaoPctEl.className = pinPct < 20 ? "text-red-600 font-bold" : "text-emerald-600 font-bold";
            }

            // Tooltip CỐNG
            const congV = (d.cong_dien_ap !== undefined && d.cong_dien_ap !== null && !isNaN(parseFloat(d.cong_dien_ap))) ? parseFloat(d.cong_dien_ap).toFixed(2) : '0.00';
            const congPct = parseFloat(congV) > 0 ? (typeof d.cong_pin_phan_tram === 'number' && d.cong_pin_phan_tram > 0 ? Math.min(100, Math.max(0, Math.round(d.cong_pin_phan_tram))) : calculateBatteryPercentage(parseFloat(congV), 12.6, 9.6)) : 0;
            const congI = (d.cong_dong_dien !== undefined && d.cong_dong_dien !== null && !isNaN(parseFloat(d.cong_dong_dien))) ? parseFloat(d.cong_dong_dien).toFixed(0) : '0';
            const congP = (d.cong_cong_suat !== undefined && d.cong_cong_suat !== null && !isNaN(parseFloat(d.cong_cong_suat))) ? parseFloat(d.cong_cong_suat).toFixed(2) : '0.00';
            
            setText('cong-v', `${congV} V`);
            setText('cong-pct', `${congPct}%`);
            setText('cong-ma', `${congI} mA`);
            setText('cong-w', `${congP} W`);

            const congPctEl = document.getElementById('cong-pct');
            if (congPctEl) {
                congPctEl.className = congPct < 20 ? "text-red-600 font-bold" : "text-emerald-600 font-bold";
            }

            // MOBILE SIDEBAR BATTERY
            const mobCongBat = document.getElementById('mob-cong-bat');
            const mobCongVol = document.getElementById('mob-cong-vol');
            const mobPhaoBat = document.getElementById('mob-phao-bat');
            const mobPhaoVol = document.getElementById('mob-phao-vol');
            
            if (mobCongBat) mobCongBat.innerText = parseFloat(congV) > 0 ? `${Math.round(congPct)}%` : 'Không có dữ liệu';
            if (mobCongVol) mobCongVol.innerText = parseFloat(congV) > 0 ? `${congV} V` : '';
            if (mobPhaoBat) mobPhaoBat.innerText = parseFloat(pinV) > 0 ? `${Math.round(pinPct)}%` : 'Không có dữ liệu';
            if (mobPhaoVol) mobPhaoVol.innerText = parseFloat(pinV) > 0 ? `${pinV} V` : '';

            const hdrCongFill = document.getElementById('hdr-battery-cong-fill');
            const hdrPctCong = document.getElementById('hdr-pct-cong');
            
            if (hdrPctCong) {
                if (!isCongOnline) {
                    hdrPctCong.innerHTML = `<span class="text-[9px] text-red-500 font-bold uppercase pr-0.5">Offline</span> <span class="opacity-60">${Math.round(congPct)}%</span>`;
                } else {
                    hdrPctCong.textContent = `${Math.round(congPct)}%`;
                }
            }
            if (hdrCongFill) {
                hdrCongFill.style.width = `${congPct}%`;
                if (!isCongOnline) {
                    hdrCongFill.className = "h-full bg-slate-400 rounded-[1.5px] transition-all duration-500 shadow-sm opacity-50";
                    if (hdrPctCong) hdrPctCong.className = "text-[11px] font-bold text-slate-500 min-w-[28px] whitespace-nowrap";
                }
                else if (congPct < 20) {
                    hdrCongFill.className = "h-full bg-gradient-to-r from-red-500 to-red-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctCong) hdrPctCong.className = "text-[11px] font-bold text-red-600 dark:text-red-400 min-w-[28px] whitespace-nowrap";
                }
                else if (congPct < 40) {
                    hdrCongFill.className = "h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctCong) hdrPctCong.className = "text-[11px] font-bold text-amber-600 dark:text-amber-400 min-w-[28px] whitespace-nowrap";
                }
                else {
                    hdrCongFill.className = "h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctCong) hdrPctCong.className = "text-[11px] font-bold text-emerald-600 dark:text-emerald-400 min-w-[28px] whitespace-nowrap";
                }
            }

            const hdrFill = document.getElementById('hdr-battery-fill');
            const hdrPctPhao = document.getElementById('hdr-pct-phao');
            if (hdrPctPhao) hdrPctPhao.textContent = `${Math.round(pinPct)}%`;
            if (hdrFill) {
                hdrFill.style.width = `${pinPct}%`;
                if (pinPct < 20) {
                    hdrFill.className = "h-full bg-gradient-to-r from-red-500 to-red-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctPhao) hdrPctPhao.className = "text-[11px] font-bold text-red-600 dark:text-red-400 min-w-[28px]";
                }
                else if (pinPct < 40) {
                    hdrFill.className = "h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctPhao) hdrPctPhao.className = "text-[11px] font-bold text-amber-600 dark:text-amber-400 min-w-[28px]";
                }
                else {
                    hdrFill.className = "h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-[1.5px] transition-all duration-500 shadow-sm";
                    if (hdrPctPhao) hdrPctPhao.className = "text-[11px] font-bold text-emerald-600 dark:text-emerald-400 min-w-[28px]";
                }
            }

            // Tối ưu độ nhạy cho pin mặt trời Epoxy Mini 5V: Chỉ cần dòng sạc thực tế >= 3 mA là sáng tia sét
            const boltCong = document.getElementById('hdr-solar-bolt-cong');
            if (boltCong) {
                if ((d.cong_dong_dien ?? 0) >= 3) {
                    boltCong.classList.remove('hidden');
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: boltCong.parentElement });
                } else {
                    boltCong.classList.add('hidden');
                }
            }

            const boltPhao = document.getElementById('hdr-solar-bolt-phao');
            if (boltPhao) {
                if ((d.solar_dong_sac ?? 0) >= 3) {
                    boltPhao.classList.remove('hidden');
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: boltPhao.parentElement });
                } else {
                    boltPhao.classList.add('hidden');
                }
            }

            // Đồng bộ trạng thái Khóa Nút Vật Lý
            if (!window.saveLocks.lockPhysical) {
                const lockState = d.khoa_nut_vat_ly ?? false;
                updateLockPhysicalDOM(lockState);
            }

            // Đồng bộ trạng thái Lặp lại vô hạn loa còi
            if (!window.saveLocks || !window.saveLocks.loopAudio) {
                const loopCheckbox = document.getElementById('toggle-loop-audio');
                const loopText = document.getElementById('txt-loop-status');
                if (loopCheckbox && loopCheckbox.checked !== (d.loop_audio === 1)) {
                    loopCheckbox.checked = (d.loop_audio === 1);
                }
                if (loopText) {
                    if (d.loop_audio === 1) {
                        loopText.innerText = "BẬT (Lặp Lại)";
                        loopText.className = "text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-500/30";
                    } else {
                        loopText.innerText = "TẮT (1 Lần)";
                        loopText.className = "text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                    }
                }
            }

            if (!window.saveLocks.mode) {
                updateModeDOM(d.mode ?? 0);
            }

            lucide.createIcons();
        });
    }

    window.hbTracker = {
        phao: { lastVal: null, lastTime: 0, isOnline: false },
        cong: { lastVal: null, lastTime: 0, isOnline: false }
    };

    let localDbData = {};

        function processAndMergeData() {
        let dbData = localDbData;
        let merged = {};
        const now = Date.now();
        let bestTs = 0;
        if (dbData.tram_phao) bestTs = Math.max(bestTs, dbData.tram_phao.heartbeatphao ?? dbData.tram_phao.heartbeat ?? 0);
        if (dbData.tram_cong) bestTs = Math.max(bestTs, dbData.tram_cong.heartbeatcong ?? dbData.tram_cong.heartbeat ?? 0);
        lastFetchTime = bestTs > 0 ? bestTs : now;
        
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
    }

    // -------------------------------------------------------------------
    // SỬA LỖI JAVASCRIPT BỊ SẬP (Fix undefined "app" ID)
    // -------------------------------------------------------------------
    function updateSettingWithLoading(type, btn) {
        const originalHtml = btn.innerHTML;
        const originalClass = btn.className;
        
        // Trạng thái: Đang lưu (Màu Vàng/Cam)
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang lưu...`;
        btn.className = "scada-control-btn px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 opacity-80 cursor-not-allowed";
        if (window.lucide) window.lucide.createIcons({root: btn});
        btn.disabled = true;

        let path = '';
        let data = {};
        
        if (type === 'sal') {
            const val = parseFloat(document.getElementById('inp-sal').value);
            path = 'control'; data = { salinity_threshold: val };
        } else if (type === 'flood') {
            const val = parseFloat(document.getElementById('inp-flood').value);
            path = 'control'; data = { flood_threshold: val };
        } else if (type === 'stall') {
            const val = parseInt(document.getElementById('inp-stall').value);
            path = 'control'; data = { stall_threshold: val };
        } else if (type === 'height') {
            const val = parseFloat(document.getElementById('inp-height').value);
            path = 'control'; data = { sensor_height: val };
        } 
        else if (type === 'calib_sal') {
            const val = parseFloat(document.getElementById('inp-calib-sal').value) || 0;
            path = 'control'; data = { calib_sal: val };
        } else if (type === 'calib_temp') {
            const val = parseFloat(document.getElementById('inp-calib-temp').value) || 0;
            path = 'control'; data = { calib_temp: val };
        } else if (type === 'calib_water_in') {
            const val = parseFloat(document.getElementById('inp-calib-water-in').value) || 0;
            path = 'control'; data = { calib_water_in: val };
        } else if (type === 'calib_water_out') {
            const val = parseFloat(document.getElementById('inp-calib-water-out').value) || 0;
            path = 'control'; data = { calib_water_out: val };
        }

        if (path) {
            writeFirebase(path, data).then(() => {
                setTimeout(() => {
                    // Trạng thái: Đã lưu (Màu Xanh lá)
                    btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Đã lưu`;
                    btn.className = "scada-control-btn px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors";
                    if (window.lucide) window.lucide.createIcons({root: btn});
                    
                    setTimeout(() => {
                        // Khôi phục mặc định
                        btn.innerHTML = originalHtml;
                        btn.className = originalClass;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons({root: btn});
                        if (window.showToast) window.showToast('Cập nhật thông số thành công!', 'success');
                    }, 2000);
                }, 500);
            }).catch(err => {
                // Trạng thái: Lỗi (Màu Đỏ)
                btn.innerHTML = `<i data-lucide="x" class="w-4 h-4"></i> Lỗi`;
                btn.className = "scada-control-btn px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 flex-shrink-0";
                if (window.lucide) window.lucide.createIcons({root: btn});
                
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.className = originalClass;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons({root: btn});
                }, 3000);
                
                if (window.showToast) window.showToast('Lỗi cập nhật: ' + err.message, 'error');
            });
        } else {
            btn.innerHTML = originalHtml;
            btn.className = originalClass;
            btn.disabled = false;
        }
    }

    window.updateConnectionUI = function() {
        setHTML('status-cong', window.hbTracker.cong.isOnline ? 
            `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>` : 
            `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`
        );
        
        setHTML('status-phao', window.hbTracker.phao.isOnline ? 
            `<span class="text-emerald-600 font-extrabold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> Đã kết nối</span>` : 
            `<span class="text-red-500 font-extrabold animate-pulse">Mất kết nối</span>`
        );

        const linkDot = document.getElementById('link-dot'); 
        const linkDotDesk = document.getElementById('link-dot-desktop');
        const linkText = document.getElementById('link-text'); 
        const linkTextDesk = document.getElementById('link-text-desktop');
        
        const isSystemOnline = window.hbTracker.cong.isOnline || window.hbTracker.phao.isOnline;

        // Đã xóa toàn bộ phần document.getElementById('app') gây lỗi văng app ở đây.

        if (isSystemOnline) {
            if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse"; 
            if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
            if (linkText) linkText.innerText = window.t ? window.t('status_online') : "ONLINE"; 
            if (linkTextDesk) linkTextDesk.innerText = window.t ? window.t('status_online') : "ONLINE";
        } else {
            if (linkDot) linkDot.className = "w-2 h-2 rounded-full bg-red-500"; 
            if (linkDotDesk) linkDotDesk.className = "w-1.5 h-1.5 rounded-full bg-red-500";
            if (linkText) linkText.innerText = "OFFLINE"; 
            if (linkTextDesk) linkTextDesk.innerText = "OFFLINE";
        }
        
        if (typeof processAndMergeData === 'function') {
            processAndMergeData();
        }
    };

    setInterval(() => {
        const now = Date.now();
        let changed = false;

        // Cập nhật text "x giây trước" cho Last Sync
        const diffSecs = Math.floor((now - lastFetchTime) / 1000);
        let syncText = "Vừa xong";
        if (diffSecs > 0 && diffSecs < 60) syncText = diffSecs + " giây trước";
        else if (diffSecs >= 60) syncText = Math.floor(diffSecs/60) + " phút trước";
        
        const deskSync = document.getElementById('last-sync-time');
        const mobSync = document.getElementById('mob-last-sync-time');
        if (deskSync) deskSync.innerText = syncText;
        if (mobSync) mobSync.innerText = syncText;

        if (window.hbTracker.phao.isOnline && (now - window.hbTracker.phao.lastTime > 20000)) {
            window.hbTracker.phao.isOnline = false;
            changed = true;
            pushAlert("MẤT KẾT NỐI", "Trạm Phao đã ngừng gửi dữ liệu. Đang chờ khôi phục...");
            if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong("MẤT KẾT NỐI PHAO", "Mất tín hiệu từ Trạm Phao");
        }
        
        if (window.hbTracker.cong.isOnline && (now - window.hbTracker.cong.lastTime > 20000)) {
            window.hbTracker.cong.isOnline = false;
            changed = true;
            pushAlert("MẤT KẾT NỐI", "Trạm Cống rớt mạng. Tạm khóa điều khiển để đảm bảo an toàn.");
            if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong("MẤT KẾT NỐI CỐNG", "Mất tín hiệu từ Trạm Cống");
        }

        if (changed) {
            window.updateConnectionUI();
        }
    }, 1000);

    window.updateConnectionUI();
    function initFirebaseListeners() {
        const paths = ['tram_phao', 'control', 'dieu_khien', 'tram_cong', 'nang_luong'];
        paths.forEach(p => {
            window.onValue(window.ref(window.db, p), (snapshot) => {
                localDbData[p] = snapshot.val();
                if (typeof processAndMergeData === 'function') {
                    processAndMergeData();
                }
            }, (error) => {
                console.error('Lỗi đọc Firebase node ' + p + ':', error);
                if (p === 'tram_phao' && window.hbTracker && window.hbTracker.phao) window.hbTracker.phao.isOnline = false;
                if (p === 'tram_cong' && window.hbTracker && window.hbTracker.cong) window.hbTracker.cong.isOnline = false;
                if (window.showToast) window.showToast(window.t('err_firebase_conn'), 'error');
            });
        });
    }

    let volumeTimeout = null;
    function sendVolumeControl(val) {
        if (volumeTimeout) clearTimeout(volumeTimeout);
        volumeTimeout = setTimeout(() => {
            writeFirebase('control', { volume: parseInt(val) })
                .then(() => {
                    if (window.showToast) window.showToast('Cập nhật âm lượng thành công', 'success');
                })
                .catch(err => {
                    if (window.showToast) window.showToast('Lỗi cập nhật âm lượng', 'error');
                });
        }, 300);
    }

    function toggleLoopAudio(cb) {
        const statusTxt = document.getElementById('txt-loop-status');
        if (statusTxt) {
            statusTxt.innerText = cb.checked ? "BẬT (Lặp vô hạn)" : "TẮT (1 Lần)";
            statusTxt.className = cb.checked 
                ? "text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400"
                : "text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
        }
        writeFirebase('control', { audio_loop: cb.checked ? 1 : 0 })
            .catch(err => {
                if (window.showToast) window.showToast('Lỗi cấu hình vòng lặp', 'error');
                cb.checked = !cb.checked;
            });
    }

    function playAudioTrack(trackNum, title) {
        writeFirebase('control', { play_track: trackNum, track_title: title })
            .then(() => {
                if (window.showToast) window.showToast(`Đang phát: ${title}`, 'success');
            })
            .catch(err => {
                if (window.showToast) window.showToast('Lỗi phát âm thanh', 'error');
            });
    }

    function stopAllAudio() {
        writeFirebase('control', { stop_audio: 1 })
            .then(() => {
                if (window.showToast) window.showToast('Đã gửi lệnh dừng âm thanh', 'success');
            })
            .catch(err => {
                if (window.showToast) window.showToast('Lỗi dừng âm thanh', 'error');
            });
    }


    async function writeFirebase(path, dataObj) {
        try {
            const url = `${DB_BASE_URL}${currentProjectPrefix}/${path}.json?${DB_AUTH}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            return true;
        } catch(e) { 
            console.error("Lỗi ghi Firebase:", e); 
            if (window.showToast) window.showToast(window.t('err_firebase_conn'), 'error');
            return false;
        }
    }

    window.onload = function() {
        renderProjectDropdown();
        initChart();
        initFirebaseListeners();
        lucide.createIcons();

        const savedCamIp = localStorage.getItem('camIp');
        if (savedCamIp) {
            const camInput = document.getElementById('cam-ip');
            if (camInput) camInput.value = savedCamIp;
        }

        const swipeArea = document.getElementById('swipe-area');
        if (swipeArea && typeof Hammer !== 'undefined') {
            const mc = new Hammer(swipeArea);
            const tabs = ['tab-monitor', 'tab-control', 'tab-phat-thanh', 'tab-settings', 'tab-canh-bao', 'tab-thao-tac', 'tab-bao-tri'];
            mc.on('swipeleft swiperight', function(ev) {
                if (!window.isSwipeEnabled) return;
                const currentActive = document.querySelector('.tab-content.active');
                if (!currentActive) return;
                let idx = tabs.indexOf(currentActive.id);
                if (ev.type === 'swipeleft' && idx < tabs.length - 1) {
                    switchTab(tabs[idx + 1]);
                } else if (ev.type === 'swiperight' && idx > 0) {
                    switchTab(tabs[idx - 1]);
                }
            });
        }
    };

// ========================================================================
// 1. CHỨC NĂNG GỬI LỆNH ĐIỀU KHIỂN CẤU HÌNH CAMERA (LED, FRAMESIZE, FLIP)
// ========================================================================
// Hàm gửi lệnh điều khiển qua Cloud WebSocket
function setCamControl(variable, value) {
    // Kiểm tra xem WebSocket có đang mở không
    if (window.wsCam && window.wsCam.readyState === WebSocket.OPEN) {
        if (variable === 'led_intensity') {
            // Lệnh đèn LED có cấu trúc: "LED:giá_trị"
            window.wsCam.send(`LED:${value}`);
            console.log(`💡 Đã gửi lệnh LED: ${value}`);
        } else {
            // Các lệnh cấu hình Camera (Độ phân giải, lật dọc, ngang)
            // Có cấu trúc: "CMD:tên_biến:giá_trị"
            window.wsCam.send(`CMD:${variable}:${value}`);
            console.log(`⚙️ Đã gửi lệnh Camera - ${variable}: ${value}`);
        }
    } else {
        console.warn("⚠️ Không thể gửi lệnh: WebSocket chưa kết nối!");
    }
}

    window.camVFlip = false;
    window.setCamFlipV = function() {
        window.camVFlip = !window.camVFlip;
        setCamControl('vflip', window.camVFlip ? 1 : 0);
        if (window.showToast) window.showToast('Đã ' + (window.camVFlip ? 'bật' : 'tắt') + ' lật dọc', 'success');
    };

    window.camHFlip = false;
    window.setCamFlipH = function() {
        window.camHFlip = !window.camHFlip;
        setCamControl('hmirror', window.camHFlip ? 1 : 0);
        if (window.showToast) window.showToast('Đã ' + (window.camHFlip ? 'bật' : 'tắt') + ' lật ngang', 'success');
    };

// ========================================================================
// 2. HỆ THỐNG PAN & ZOOM MƯỢT CHO CAMERA (MOUSE & TOUCH FLUID)
// ========================================================================
// 2. HỆ THỐNG PAN & ZOOM CAMERA (ZOOM CHUẨN VÀO VỊ TRÍ CON TRỎ CHUỘT)
// ========================================================================
(function initCamPanZoom() {
    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let isDragging = false;
    let startX = 0; let startY = 0;

    const container = document.getElementById('cam-container');
    const img = document.getElementById('cam-stream');
    const zoomBadge = document.getElementById('zoom-level-badge');
    if (!container || !img) return;

    function updateTransform() {
        img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        if (zoomBadge) {
            zoomBadge.innerText = `Zoom: ${scale.toFixed(1)}x`;
            zoomBadge.classList.remove('opacity-0');
            clearTimeout(window.zoomBadgeTimeout);
            window.zoomBadgeTimeout = setTimeout(() => { if (!isDragging) zoomBadge.classList.add('opacity-0'); }, 1500);
        }
    }

    // Zoom theo vị trí con trỏ chuột
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        
        // Tọa độ chuột so với góc trên bên trái (phù hợp với origin-top-left)
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = scale;
        const delta = -e.deltaY;
        (delta > 0) ? (scale *= 1.15) : (scale /= 1.15);
        if (scale < 1) scale = 1;
        if (scale > 5) scale = 5;

        // Tính độ dời để giữ nguyên tâm trỏ chuột
        const ratio = scale / oldScale;
        pointX -= (mouseX - pointX) * (ratio - 1);
        pointY -= (mouseY - pointY) * (ratio - 1);

        if (scale === 1) { pointX = 0; pointY = 0; }
        updateTransform();
    }, { passive: false });

    // Kéo thả (Pan)
    container.addEventListener('mousedown', (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;
        isDragging = true;
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;
        updateTransform();
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Nút Zoom Góc phải
    window.zoomCam = function(delta) { scale += delta; if (scale < 1) scale = 1; if (scale > 5) scale = 5; updateTransform(); };
    window.resetCamTransform = function() { scale = 1; pointX = 0; pointY = 0; updateTransform(); };
})();

// ========================================================================
// CHỨC NĂNG ẨN/HIỆN MÔ PHỎNG (SỬA LỖI FLEXBOX & NÚT KHẨN CẤP ĐƯỢC GIỮ NGUYÊN)

window.stopAllAudio = async function() {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không thể tắt loa!", "error");
        return;
    }
    try {
        await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/control/stop_audio'), 1);
        if (window.logAction) window.logAction("Dừng phát loa");
        if(window.showToast) window.showToast('Đã gửi lệnh dừng loa!', 'success');
    } catch(e) {
        console.error("stopAllAudio lỗi:", e);
        if(window.showToast) window.showToast('Lỗi gửi lệnh dừng loa', 'error');
    }
};

window.executeToggleEmergency = async function() {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không thể thao tác!", "error");
        return;
    }
    try {
        let newVal = 1;
        if (typeof dataCache !== 'undefined') {
            if (dataCache.emergency_ket_cong === 1) {
                // Đang kẹt cống -> Reset kẹt cống
                newVal = 0;
                await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/tram_cong/emergency_ket_cong'), 0);
            } else if (dataCache.emergency_stop === 1) {
                // Đang dừng khẩn cấp -> Khôi phục
                newVal = 0;
            }
        }
        
        await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/control/emergency_stop'), newVal);
        if (window.closeModal) window.closeModal('modal-confirm-emergency');
        
        if (newVal === 1) {
            if (window.logAction) window.logAction("Kích hoạt Dừng Khẩn Cấp");
            if (window.showToast) window.showToast('ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP!', 'error');
        } else {
            if (window.logAction) window.logAction("Khôi phục hoạt động hệ thống");
            if (window.showToast) window.showToast('Đã khôi phục hoạt động', 'success');
        }
    } catch(e) {
        console.error("toggleEmergency lỗi:", e);
    }
};

// ========================================================================
// 3. WEBSOCKET NHẬN STREAM TỪ ESP32-CAM QUA CLOUD
// ========================================================================
(function initCamWebSocket() {
    const WS_CAM_URL = "wss://esp32cam-p4ns.onrender.com";
    let reconnectTimeout;
    

        const setCamBadge = (status) => {
            const badge = document.getElementById('cam-status-badge');
            if(!badge) return;
            if(status === 'online' || status === 'connected') {
                badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 flex items-center gap-1.5 border border-emerald-500/20';
                badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ĐÃ KẾT NỐI';
            } else if (status === 'connecting' || status === 'loading') {
                badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-600 flex items-center gap-1.5 border border-amber-500/20';
                badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> ĐANG KẾT NỐI';
            } else {
                badge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-500/10 text-slate-500 flex items-center gap-1.5 border border-slate-500/20';
                badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> CHƯA KẾT NỐI';
            }
        };
    window.connectCamera = function() {
        const ipInput = document.getElementById('cam-ip');
        let url = WS_CAM_URL;
        if (ipInput && ipInput.value.trim() !== "") {
            const ip = ipInput.value.trim();
            url = ip.startsWith('ws') ? ip : `ws://${ip}:81`;
        }

        const img = document.getElementById('cam-stream');
        const placeholder = document.getElementById('cam-placeholder');
        
        if (window.wsCam && (window.wsCam.readyState === WebSocket.OPEN || window.wsCam.readyState === WebSocket.CONNECTING)) {
            // Already connected or connecting, maybe just close and reconnect if url changed?
            const currentUrl = (window.wsCam.url || "").replace(/\/$/, "");
            const newUrl = url.replace(/\/$/, "");
            
            if (currentUrl !== newUrl) {
                window.wsCam.close();
            } else {
                if (window.showToast) window.showToast('Camera đang được kết nối!', 'info');
                return;
            }
        }

        window.wsCam = new WebSocket(url);
        window.wsCam.binaryType = 'blob';

        window.wsCam.onopen = () => {
            console.log("✅ Đã kết nối WebSocket tới Camera Server:", url);
            if (placeholder) placeholder.style.display = 'none';
            if (img) img.classList.remove('hidden');
            if (typeof setCamBadge === 'function') setCamBadge('online');
            if (window.showToast && window.cameraManuallyStopped !== undefined) window.showToast('Kết nối Camera thành công!', 'success');
            window.cameraManuallyStopped = false;
        };

                let camWatchdog;
        window.wsCam.onmessage = (event) => {
            if (camWatchdog) clearTimeout(camWatchdog);
            if (typeof setCamBadge === 'function') setCamBadge('online');
            
            camWatchdog = setTimeout(() => {
                console.warn("Camera frame timeout! Watchdog triggered.");
                if (window.wsCam) {
                    window.wsCam.close();
                }
                if (typeof setCamBadge === 'function') setCamBadge('offline');
            }, 1500);
            if (event.data instanceof Blob) {
                if (img) {
                    if (img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                    const objUrl = URL.createObjectURL(event.data);
                    img.src = objUrl;
                    
                    const imgBlur = document.getElementById('cam-bg-blur');
                    if (imgBlur) {
                        imgBlur.src = objUrl;
                        imgBlur.classList.remove('hidden');
                    }
                }
            }
        };

        window.wsCam.onclose = () => {
            console.warn("⚠️ Mất kết nối WebSocket Camera.");
            setCamBadge('offline');
            if (img) img.classList.add('hidden');
            if (placeholder) {
                placeholder.style.display = 'flex';
                const p = placeholder.querySelector('p');
                if (p) p.innerText = window.cameraManuallyStopped ? "CAMERA ĐÃ DỪNG TẠM THỜI" : "ĐANG KẾT NỐI LẠI VỚI CAMERA...";
            }
            if (typeof setCamBadge === 'function') setCamBadge('error');
            clearTimeout(reconnectTimeout);
            // Only reconnect automatically if we didn't explicitly stop it
            if (!window.cameraManuallyStopped) {
                reconnectTimeout = setTimeout(window.connectCamera, 3000);
            }
        };

        window.wsCam.onerror = (err) => {
            console.error("❌ Lỗi WebSocket Camera:", err);
            window.wsCam.close();
        };
        
        window.cameraManuallyStopped = false;
    };

    window.stopCamera = function() {
        window.cameraManuallyStopped = true;
        clearTimeout(reconnectTimeout);
        if (window.wsCam) {
            window.wsCam.close();
            window.wsCam = null;
        }
        const img = document.getElementById('cam-stream');
        const placeholder = document.getElementById('cam-placeholder');
        if (img) img.classList.add('hidden');
        if (placeholder) {
            placeholder.style.display = 'flex';
            const p = placeholder.querySelector('p');
            if (p) p.innerText = "CAMERA ĐÃ DỪNG TẠM THỜI";
        }
        if (typeof setCamBadge === 'function') setCamBadge('offline');
        if (window.showToast) window.showToast('Đã dừng luồng Camera', 'info');
    };

    // Tự động kết nối khi trang tải xong
    document.addEventListener("DOMContentLoaded", window.connectCamera);
})();

// --- THÊM LẠI CÁC HÀM TƯƠNG TÁC GIAO DIỆN ĐÃ BỊ THIẾU ---
window.setGateWithLoading = async function(val, btnEl) {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không thể thực hiện lệnh điều khiển!", "error");
        return;
    }
    if (window.hbTracker && window.hbTracker.cong && !window.hbTracker.cong.isOnline) {
        if(window.showToast) window.showToast("CẢNH BÁO AN TOÀN: Trạm Cống đang mất kết nối! Lệnh thao tác đã bị chặn để tránh Cống tự động chạy ngoài ý muốn khi có điện lại.", "error");
        return;
    }
    if (typeof dataCache !== 'undefined' && dataCache.emergency_stop === 1) {
        if(window.showToast) window.showToast("Hệ thống đang dừng khẩn cấp! Không thể điều khiển.", "error");
        return;
    }
    
    // ĐÂY LÀ ĐOẠN MỚI THÊM VÀO: KHÓA KHI ĐANG Ở CHẾ ĐỘ TỰ ĐỘNG
    if (typeof dataCache !== 'undefined' && dataCache.mode === 1) {
        if(window.showToast) window.showToast("Hệ thống đang ở chế độ TỰ ĐỘNG AI! Vui lòng chuyển sang THỦ CÔNG để thao tác tay.", "error");
        return;
    }

    try {
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Đang gửi lệnh...`;
        if (window.lucide) window.lucide.createIcons({ root: btnEl });
        
        await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/control/gate_target'), val);
        
        if (window.logAction) window.logAction(val === 1 ? 'Ra lệnh mở cống (Thủ công)' : 'Ra lệnh đóng cống (Thủ công)');
        if (window.showToast) window.showToast('Đã gửi lệnh điều khiển!', 'success');
        
        setTimeout(() => {
            btnEl.innerHTML = originalHtml;
            if (window.lucide) window.lucide.createIcons({ root: btnEl });
        }, 1500);
    } catch(e) {
        console.error("setGateWithLoading lỗi:", e);
        if(window.showToast) window.showToast('Lỗi gửi lệnh điều khiển', 'error');
    }
};

window.setModeOptimistic = async function(val, btnEl) {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không thể chuyển đổi chế độ!", "error");
        return;
    }
    if (window.hbTracker && window.hbTracker.cong && !window.hbTracker.cong.isOnline) {
        if(window.showToast) window.showToast("CẢNH BÁO AN TOÀN: Trạm Cống đang mất kết nối!", "error");
        return;
    }
    try {
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang gửi...`;
        btnEl.disabled = true; // Khóa nút trong lúc gửi
        if (window.lucide) window.lucide.createIcons({ root: btnEl });

        await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/control/mode'), val);
        
        if (typeof window.ghiNhatKyTuDong === 'function') window.ghiNhatKyTuDong(val === 1 ? "CHẾ ĐỘ TỰ ĐỘNG" : "CHẾ ĐỘ THỦ CÔNG", "Đã chuyển đổi phương thức vận hành");
        if(window.showToast) window.showToast('Đã gửi lệnh chuyển chế độ!', 'success');
        
        // Khôi phục lại trạng thái HTML của nút sau 1.5s
        setTimeout(() => {
            btnEl.innerHTML = originalHtml;
            btnEl.disabled = false;
            if (window.lucide) window.lucide.createIcons({ root: btnEl });
            // Cập nhật lại UI một lần nữa để tránh kẹt
            if (typeof window.updateModeDOM === 'function') window.updateModeDOM(val);
        }, 1500);
    } catch(e) {
        console.error("setModeOptimistic lỗi:", e);
        if(window.showToast) window.showToast('Lỗi chuyển chế độ', 'error');
        btnEl.disabled = false;
    }
};

window.playAudioTrack = async function(trackNum, desc) {
    if (!window.isScadaAdmin) {
        if(window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không thể thực hiện lệnh phát loa!", "error");
        return;
    }
    if (window.hbTracker && window.hbTracker.cong && !window.hbTracker.cong.isOnline) {
        if(window.showToast) window.showToast("CẢNH BÁO: Trạm Cống đang mất kết nối!", "error");
        return;
    }
    try {
        await window.set(window.ref(window.db, (currentProjectPrefix || "") + '/control/play_audio'), trackNum);
        if (window.logAction) window.logAction("Phát loa: " + desc);
        if(window.showToast) window.showToast('Đã gửi lệnh phát loa!', 'success');
    } catch(e) {
        console.error("playAudioTrack lỗi:", e);
        if(window.showToast) window.showToast('Lỗi gửi lệnh phát loa', 'error');
    }
};


window.isSwipeEnabled = false;
function toggleSwipeToTab() {
    window.isSwipeEnabled = !window.isSwipeEnabled;
    const icon = document.getElementById('icon-toggle-swipe');
    const text = document.getElementById('text-toggle-swipe');
    const bg = document.getElementById('swipe-toggle-bg');
    const dot = document.getElementById('swipe-toggle-dot');
    
    if (window.isSwipeEnabled) {
        if (icon) { icon.classList.add('text-green-500'); icon.classList.remove('text-slate-400'); }
        if (text) text.innerText = "Lướt (Bật)";
        if (bg) { bg.classList.add('bg-green-500'); bg.classList.remove('bg-slate-200', 'dark:bg-slate-700'); }
        if (dot) dot.classList.add('translate-x-4');
    } else {
        if (icon) { icon.classList.remove('text-green-500'); icon.classList.add('text-slate-400'); }
        if (text) text.innerText = "Lướt (Tắt)";
        if (bg) { bg.classList.remove('bg-green-500'); bg.classList.add('bg-slate-200', 'dark:bg-slate-700'); }
        if (dot) dot.classList.remove('translate-x-4');
    }
    // ========================================================================
    // CHỨC NĂNG ẨN/HIỆN MÔ PHỎNG 3D CHO MÀN HÌNH NHỎ
    
}


// ========================================================================
window.toggleSimulation = function() {
    const container = document.getElementById('simulation-container');
    const icon = document.getElementById('sim-toggle-icon');
    if (!container || !icon) return;

    if (container.classList.contains('hidden') || container.style.display === 'none') {
        container.classList.remove('hidden'); container.style.display = 'flex';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem('scada_hide_sim', 'false');
    } else {
        container.classList.add('hidden'); container.style.display = 'none';
        icon.style.transform = 'rotate(180deg)';
        localStorage.setItem('scada_hide_sim', 'true');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('scada_hide_sim') === 'true') {
        const container = document.getElementById('simulation-container');
        const icon = document.getElementById('sim-toggle-icon');
        if (container) { container.classList.add('hidden'); container.style.display = 'none'; }
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
});

// ========================================================================
// TÍNH NĂNG CHỤP ẢNH & NGÀY GIỜ CAMERA MÀU TRẮNG
// ========================================================================
setInterval(() => {
    const timeEl = document.getElementById('cam-timestamp');
    if (timeEl) {
        const now = new Date();
        timeEl.innerText = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' ' + 
                           String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    }
}, 1000);

window.takeSnapshot = function() {
    const img = document.getElementById('cam-stream');
    if (!img || img.classList.contains('hidden')) {
        if(window.showToast) window.showToast("Lỗi: Camera chưa được kết nối!", "error"); return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = `Camera_Snapshot_${new Date().getTime()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    if(window.showToast) window.showToast("Đã lưu ảnh Camera vào máy!", "success");
};


