
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
        import { getDatabase, ref, get, child, push, remove, set, serverTimestamp, onValue, query, limitToLast, onDisconnect } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
        import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

        const firebaseConfig = {
            apiKey: "AIzaSyCgWv3tMBnArYx1JHuasH7Yg-RARRlcRb8",
            authDomain: "hethongcongthongminh.firebaseapp.com",
            databaseURL: "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "hethongcongthongminh",
            storageBucket: "hethongcongthongminh.firebasestorage.app",
            messagingSenderId: "1056991222410",
            appId: "1:1056991222410:web:36623d39ebbc5728e02b73",
            measurementId: "G-96J4Z5SFEQ"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const storage = getStorage(app);
        window.storage = storage;
        window.storageRef = storageRef;
        window.uploadBytes = uploadBytes;
        window.getDownloadURL = getDownloadURL;
        const db = getDatabase(app);
        window.db = db;
        window.onValue = onValue;
        window.ref = ref;
        window.set = set;

        window.isScadaAdmin = false;

        window.setControlAccess = function(allow) {
            window.isScadaAdmin = !!allow;
            const controlElements = document.querySelectorAll('.scada-control-btn');
            controlElements.forEach(el => {
                if (allow) {
                    el.disabled = false;
                    el.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                } else {
                    el.disabled = true;
                    el.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                }
            });
        };

        window.updateAdminAvatarStyle = function(isAdmin) {
            const avatarContainers = [
                document.getElementById('user-avatar-container'),
                document.getElementById('dropdown-avatar-display'),
                document.getElementById('profile-modal-avatar')
            ];
            const adminClasses = ['ring-4', 'ring-yellow-400', 'shadow-[0_0_15px_rgba(250,204,21,0.8)]', 'border-2', 'border-amber-300'];
            avatarContainers.forEach(container => {
                if (!container) return;
                if (isAdmin) {
                    container.classList.add(...adminClasses);
                } else {
                    container.classList.remove(...adminClasses);
                }
            });
        };

        // Ghi nhật ký vận hành hệ thống do User bấm (Realtime DB branch: nhat_ky)
        window.ghiNhatKy = async function(tenHanhDong, chiTiet = '') {
            try {
                const currentUser = auth.currentUser;
                const email = (currentUser && currentUser.email) ? currentUser.email : "Khách ẩn danh";
                await push(ref(db, 'nhat_ky'), {
                    thaoTac: tenHanhDong,
                    chiTiet: chiTiet || tenHanhDong,
                    nguoiThucHien: email,
                    thoiGian: serverTimestamp(),
                    timestamp: Date.now()
                });
            } catch(err) {
                console.error("Lỗi ghi nhật ký Firebase (nhat_ky):", err);
            }
        };

        // Ghi nhật ký cảnh báo tự động do Hệ thống phát hiện (Realtime DB branch: nhat_ky)
        window.ghiNhatKyTuDong = async function(tenHanhDong, chiTiet = '') {
            try {
                await push(ref(db, 'nhat_ky'), {
                    thaoTac: tenHanhDong,
                    chiTiet: chiTiet || tenHanhDong,
                    nguoiThucHien: "Hệ thống tự động",
                    thoiGian: serverTimestamp(),
                    timestamp: Date.now()
                });
            } catch(err) {
                console.error("Lỗi ghi nhật ký tự động Firebase (nhat_ky):", err);
            }
        };

        window.logAction = window.ghiNhatKy;

        window.allFirebaseLogs = [];
        window.tableState = {
            alert: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
            action: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] },
            maint: { page: 1, itemsPerPage: 10, search: '', date: '', rawData: [], filteredData: [] }
        };

        window.hienThiNhatKy = function() {
            const logsRef = query(ref(db, 'nhat_ky'), limitToLast(50));
            onValue(logsRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) {
                    window.allFirebaseLogs = [];
                    renderNhatKyToHTML();
                    return;
                }

                const logsArray = [];
                Object.keys(data).forEach(key => {
                    const item = data[key];
                    let ts = item.timestamp;
                    if (!ts && typeof item.thoiGian === 'number') ts = item.thoiGian;
                    if (!ts) ts = Date.now();

                    const dateObj = new Date(ts);
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();

                    const formattedTime = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                    const dateISO = `${year}-${month}-${day}`;

                    logsArray.push({
                        key: key,
                        thaoTac: item.thaoTac || 'THAO TÁC',
                        chiTiet: item.chiTiet || item.thaoTac || '',
                        nguoiThucHien: item.nguoiThucHien || 'Khách ẩn danh',
                        timeStr: formattedTime,
                        dateISO: dateISO,
                        timestamp: ts
                    });
                });

                logsArray.sort((a, b) => b.timestamp - a.timestamp);
                window.allFirebaseLogs = logsArray;
                renderNhatKyToHTML();
            });
        };

        // ================= LOGIC MODULE BẢO TRÌ HỆ THỐNG ĐỊNH KỲ (maintenance/) =================
        window.langMaintenanceData = { last_maintenance_timestamp: Date.now(), interval_days: 30 };
        let maintTickerInterval = null;

        window.addMaintTag = function(tagText) {
            const input = document.getElementById('maint-note-input');
            if (!input) return;
            let currentVal = input.value.trim();
            if (currentVal === '') {
                input.value = tagText;
            } else {
                currentVal = currentVal.replace(/,\s*$/, "");
                input.value = currentVal + ', ' + tagText;
            }
        };

        window.langCapNhatBaoTriUI = function() {
            const data = window.langMaintenanceData || {};
            const lastTs = data.last_maintenance_timestamp || Date.now();
            
            const intervalMs = data.interval_ms || ((data.interval_days || 30) * 24 * 60 * 60 * 1000);

            const targetTs = lastTs + intervalMs;
            const now = Date.now();
            const diffMs = targetTs - now;

            const totalMs = intervalMs;
            const elapsedMs = now - lastTs;
            const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

            const daysEl = document.getElementById('ticker-days');
            const hoursEl = document.getElementById('ticker-hours');
            const minsEl = document.getElementById('ticker-minutes');
            const secsEl = document.getElementById('ticker-seconds');

            const blocks = ['block-days', 'block-hours', 'block-minutes', 'block-seconds'];

            const titleEl = document.getElementById('maint-ticker-title');
            const badgeEl = document.getElementById('maint-status-badge');
            const barEl = document.getElementById('maint-progress-bar');
            const percentEl = document.getElementById('maint-progress-percent');
            const dateEl = document.getElementById('maint-last-date');
            const intervalDisplayEl = document.getElementById('maint-interval-display');

            if (intervalDisplayEl) {
                const iD = Math.floor(intervalMs / (24 * 60 * 60 * 1000));
                const iH = Math.floor((intervalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const iM = Math.floor((intervalMs % (60 * 60 * 1000)) / (60 * 1000));
                let displayStr = [];
                if (iD > 0) displayStr.push(`${iD} ngày`);
                if (iH > 0) displayStr.push(`${iH} giờ`);
                if (iM > 0) displayStr.push(`${iM} phút`);
                if (displayStr.length === 0) displayStr.push('0 phút');
                intervalDisplayEl.innerText = displayStr.join(' ');
            }

            if (dateEl) {
                const dateObj = new Date(lastTs);
                const lH = String(dateObj.getHours()).padStart(2, '0');
                const lM = String(dateObj.getMinutes()).padStart(2, '0');
                const ld = String(dateObj.getDate()).padStart(2, '0');
                const lm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const ly = dateObj.getFullYear();
                dateEl.innerText = `${lH}:${lM} - ${ld}/${lm}/${ly}`;
            }

            if (percentEl) percentEl.innerText = `${progressPercent}%`;

            let d = 0, h = 0, m = 0, s = 0;
            let overdueStr = '';

            if (diffMs <= 0) {
                let absDiff = Math.abs(diffMs);
                let od = Math.floor(absDiff / (1000 * 60 * 60 * 24));
                let oh = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                let om = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
                let os = Math.floor((absDiff % (1000 * 60)) / 1000);
                
                overdueStr = `Đã quá hạn: `;
                if (od > 0) overdueStr += `${od} ngày `;
                if (oh > 0) overdueStr += `${oh} giờ `;
                if (om > 0) overdueStr += `${om} phút `;
                overdueStr += `${os} giây`;
            } else {
                let absDiff = diffMs;
                d = Math.floor(absDiff / (1000 * 60 * 60 * 24));
                h = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
                s = Math.floor((absDiff % (1000 * 60)) / 1000);
            }

            if (daysEl) daysEl.innerText = String(d).padStart(2, '0');
            if (hoursEl) hoursEl.innerText = String(h).padStart(2, '0');
            if (minsEl) minsEl.innerText = String(m).padStart(2, '0');
            if (secsEl) secsEl.innerText = String(s).padStart(2, '0');

            const mobMaint = document.getElementById('mob-maintenance');
            if (mobMaint) {
                if (diffMs <= 0) {
                    mobMaint.innerText = "Quá Hạn";
                    mobMaint.className = "text-xs font-black text-rose-600 animate-pulse";
                } else {
                    mobMaint.innerText = `${d}d ${h}h ${m}m`;
                    mobMaint.className = "text-xs font-mono font-black text-amber-600 dark:text-amber-400";
                }
            }

            if (!window.sysBootTimeForUI) window.sysBootTimeForUI = Date.now();
            const upMs = Date.now() - window.sysBootTimeForUI;
            const upH = Math.floor(upMs / (1000 * 60 * 60));
            const upM = Math.floor((upMs % (1000 * 60 * 60)) / (1000 * 60));
            const upS = Math.floor((upMs % (1000 * 60)) / 1000);
            const mobUp = document.getElementById('mob-uptime');
            if (mobUp) {
                mobUp.innerText = `${String(upH).padStart(2,'0')}:${String(upM).padStart(2,'0')}:${String(upS).padStart(2,'0')}`;
            }

            const overdueEl = document.getElementById('maint-overdue-text');
            if (overdueEl) {
                if (overdueStr) {
                    overdueEl.innerHTML = `<p class="text-rose-500 text-[11px] font-black animate-pulse bg-rose-950/40 rounded py-1 px-2 border border-rose-600/30 inline-block mt-2">${overdueStr}</p>`;
                } else {
                    overdueEl.innerHTML = '';
                }
            }

            if (progressPercent >= 90 || diffMs <= 0) {
                if (titleEl) titleEl.innerHTML = `<i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-500 animate-pulse"></i> ⚠️ CẦN BẢO TRÌ GẤP`;
                if (badgeEl) {
                    badgeEl.innerText = "CẦN BẢO TRÌ KHẨN CẤP";
                    badgeEl.className = "text-[10px] bg-rose-600 text-white px-2.5 py-1 rounded-full font-black animate-pulse shadow-md shadow-rose-600/30";
                }
                if (barEl) {
                    barEl.style.width = diffMs <= 0 ? '100%' : `${progressPercent}%`;
                    barEl.className = "h-full bg-rose-600 rounded-full transition-all duration-500 animate-pulse";
                }
                blocks.forEach(bId => {
                    const el = document.getElementById(bId);
                    if (el) {
                        el.className = "bg-rose-950/40 border border-rose-600/60 rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300 animate-pulse";
                        const span = el.querySelector('span');
                        if (span) span.className = "text-2xl sm:text-3xl font-black font-mono text-rose-500 tracking-tight";
                    }
                });
            } else if (progressPercent >= 70) {
                if (titleEl) titleEl.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5 text-amber-400"></i> SẮP ĐẾN HẠN BẢO TRÌ`;
                if (badgeEl) {
                    badgeEl.innerText = "SẮP ĐẾN HẠN BẢO TRÌ";
                    badgeEl.className = "text-[10px] bg-amber-500 text-white px-2.5 py-1 rounded-full font-extrabold";
                }
                if (barEl) {
                    barEl.style.width = `${progressPercent}%`;
                    barEl.className = "h-full bg-amber-500 rounded-full transition-all duration-500";
                }
                blocks.forEach(bId => {
                    const el = document.getElementById(bId);
                    if (el) {
                        el.className = "bg-amber-950/30 border border-amber-500/40 rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300";
                        const span = el.querySelector('span');
                        if (span) span.className = "text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight";
                    }
                });
            } else {
                if (titleEl) titleEl.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5 text-emerald-400"></i> ĐỒNG HỒ BẢO TRÌ TỰ ĐỘNG`;
                if (badgeEl) {
                    badgeEl.innerText = "HOẠT ĐỘNG TỐT";
                    badgeEl.className = "text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-extrabold";
                }
                if (barEl) {
                    barEl.style.width = `${progressPercent}%`;
                    barEl.className = "h-full bg-emerald-500 rounded-full transition-all duration-500";
                }
                blocks.forEach(bId => {
                    const el = document.getElementById(bId);
                    if (el) {
                        el.className = "bg-slate-800/90 border border-emerald-500/30 rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300";
                        const span = el.querySelector('span');
                        if (span) span.className = "text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight";
                    }
                });
            }

            // === Sync Mini Digital Clock on Header (Cyberpunk Style) ===
            const miniBadge = document.getElementById('mini-maintenance-badge');
            const miniBadgeText = document.getElementById('mini-maintenance-text');
            if (miniBadge && miniBadgeText) {
                const pd = String(d).padStart(2, '0');
                const ph = String(h).padStart(2, '0');
                const pm = String(m).padStart(2, '0');
                const ps = String(s).padStart(2, '0');

                if (diffMs <= 0) {
                    miniBadge.className = "hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-950 border border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] cursor-pointer animate-pulse";
                    miniBadgeText.className = "text-red-500 font-mono font-bold tracking-wider text-xs drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]";
                    miniBadgeText.innerHTML = "🔧 BẢO TRÌ QUÁ HẠN";
                } else {
                    miniBadge.className = "hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-700 shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:border-emerald-500 transition-all cursor-pointer";
                    miniBadgeText.className = "text-emerald-400 font-mono font-bold tracking-widest text-xs drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]";
                    miniBadgeText.innerHTML = `🔧${pd}d:${ph}h:${pm}m:${ps}s`;
                }
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        window.langKhoiTaoBaoTriListener = function() {
            // 1. Lắng nghe thông tin chu kỳ maintenance/
            const maintRef = ref(db, 'maintenance');
            onValue(maintRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    window.langMaintenanceData = data;
                } else {
                    const initialData = {
                        last_maintenance_timestamp: Date.now(),
                        interval_ms: 30 * 24 * 60 * 60 * 1000
                    };
                    set(maintRef, initialData);
                    window.langMaintenanceData = initialData;
                }
                window.langCapNhatBaoTriUI();
            });

            // 2. Lắng nghe bảng lịch sử bảo trì maintenance_history/
            const historyRef = ref(db, 'maintenance_history');
            onValue(historyRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) {
                    if (window.tableState && window.tableState.maint) window.tableState.maint.rawData = [];
                    if (window.renderTableData) window.renderTableData('maint');
                    return;
                }

                const historyArray = [];
                Object.keys(data).forEach(key => {
                    const item = data[key];
                    let ts = item.timestamp;
                    if (!ts && typeof item.thoiGian === 'number') ts = item.thoiGian;
                    if (!ts) ts = Date.now();

                    const dateObj = new Date(ts);
                    const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')} ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    const dateISO = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

                    historyArray.push({
                        key,
                        nguoiThucHien: item.nguoiThucHien || 'Kỹ thuật viên',
                        ghiChu: item.ghiChu || 'Đã hoàn tất bảo trì hệ thống',
                        timeStr: formattedTime,
                        dateISO: dateISO,
                        timestamp: ts
                    });
                });

                historyArray.sort((a, b) => b.timestamp - a.timestamp);
                if (window.tableState && window.tableState.maint) window.tableState.maint.rawData = historyArray;
                if (window.renderTableData) window.renderTableData('maint');
            });

            // Ticker đếm ngược chạy liên tục mỗi 1 GIÂY (Realtime Ticker)
            if (maintTickerInterval) clearInterval(maintTickerInterval);
            maintTickerInterval = setInterval(window.langCapNhatBaoTriUI, 1000);
        };

        window.openMaintConfirmModal = function() {
            if (typeof window.isScadaAdmin !== 'undefined' && !window.isScadaAdmin) {
                if (window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách)! Chỉ Quản trị viên mới được xác nhận bảo trì.", "error");
                return;
            }
            const modal = document.getElementById('modal-maint-confirm');
            if (modal) modal.classList.remove('hidden');
        };

        window.openMaintSettingsModal = function() {
            if (typeof window.isScadaAdmin !== 'undefined' && !window.isScadaAdmin) {
                if (window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách)! Chỉ Quản trị viên mới được chỉnh sửa chu kỳ.", "error");
                return;
            }
            const modal = document.getElementById('modal-maint-settings');
            const data = window.langMaintenanceData || {};
            const intervalMs = data.interval_ms || ((data.interval_days || 30) * 24 * 60 * 60 * 1000);
            
            const iD = Math.floor(intervalMs / (24 * 60 * 60 * 1000));
            const iH = Math.floor((intervalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const iM = Math.floor((intervalMs % (60 * 60 * 1000)) / (60 * 1000));
            
            if (document.getElementById('inp-maint-days')) document.getElementById('inp-maint-days').value = iD;
            if (document.getElementById('inp-maint-hours')) document.getElementById('inp-maint-hours').value = iH;
            if (document.getElementById('inp-maint-minutes')) document.getElementById('inp-maint-minutes').value = iM;
            
            if (modal) modal.classList.remove('hidden');
        };

        window.saveMaintInterval = async function() {
            const inpDays = document.getElementById('inp-maint-days');
            const inpHours = document.getElementById('inp-maint-hours');
            const inpMinutes = document.getElementById('inp-maint-minutes');
            
            if (!inpDays || !inpHours || !inpMinutes) return;
            
            const d = parseInt(inpDays.value, 10) || 0;
            const h = parseInt(inpHours.value, 10) || 0;
            const m = parseInt(inpMinutes.value, 10) || 0;
            
            const newIntervalMs = (d * 24 * 60 * 60 * 1000) + (h * 60 * 60 * 1000) + (m * 60 * 1000);
            
            if (newIntervalMs <= 0) {
                if (window.showToast) window.showToast("Vui lòng nhập thời gian chu kỳ lớn hơn 0.", "error");
                return;
            }
            try {
                await set(ref(db, 'maintenance/interval_ms'), newIntervalMs);
                if (window.showToast) window.showToast("Lưu cài đặt chu kỳ thành công!", "success");
                closeModal('modal-maint-settings');
            } catch (err) {
                console.error("Lỗi cập nhật chu kỳ Firebase:", err);
                if (window.showToast) window.showToast('Lỗi cập nhật: ' + err.message, 'error');
            }
        };

        window.hoanTatBaoTri = async function() {
            if (typeof window.isScadaAdmin !== 'undefined' && !window.isScadaAdmin) {
                if (window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách)! Chỉ Quản trị viên mới được xác nhận bảo trì.", "error");
                return;
            }

            const noteInput = document.getElementById('maint-note-input');
            const noteText = noteInput ? noteInput.value.trim() : '';

            const btn = document.getElementById('btn-complete-maintenance');
            if (btn) btn.disabled = true;

            try {
                const newTs = Date.now();
                const currentUser = auth.currentUser;
                const userEmail = (currentUser && currentUser.email) ? currentUser.email : 'Khách';

                // 1. Cập nhật timestamp bảo trì gần nhất
                await set(ref(db, 'maintenance/last_maintenance_timestamp'), newTs);
                window.langMaintenanceData.last_maintenance_timestamp = newTs;
                window.langCapNhatBaoTriUI();

                // 2. Đẩy thông tin bảo trì vào nhánh maintenance_history/
                const finalNote = noteText || 'Đã thực hiện bảo trì định kỳ hệ thống';
                await push(ref(db, 'maintenance_history'), {
                    thoiGian: serverTimestamp(),
                    timestamp: newTs,
                    nguoiThucHien: userEmail,
                    ghiChu: finalNote
                });

                // 3. Ghi vết sang nhat_ky vận hành
                if (typeof window.ghiNhatKy === 'function') {
                    await window.ghiNhatKy('BẢO TRÌ THIẾT BỊ', 'Đã hoàn tất bảo trì định kỳ: ' + finalNote);
                }

                if (noteInput) noteInput.value = '';
                if (window.showToast) window.showToast('✅ Đã lưu nhật ký bảo trì và đặt lại đồng hồ!', 'success');
                closeModal('modal-maint-confirm');
            } catch (err) {
                console.error("Lỗi cập nhật bảo trì Firebase:", err);
                if (window.showToast) window.showToast('Lỗi cập nhật bảo trì: ' + err.message, 'error');
            } finally {
                if (btn) btn.disabled = false;
            }
        };

        window.renderNhatKyToHTML = function() {
            let allLogs = window.allFirebaseLogs || [];
            const actionLogs = [];
            const alertLogs = [];

            allLogs.forEach(item => {
                const thaoTacUpper = (item.thaoTac || '').toUpperCase();
                if (thaoTacUpper.includes("CẢNH BÁO") || thaoTacUpper.includes("MẤT KẾT NỐI") || thaoTacUpper.includes("KHÔI PHỤC KẾT NỐI") || thaoTacUpper.includes("VƯỢT NGƯỠNG") || thaoTacUpper.includes("DỪNG KHẨN CẤP")) {
                    alertLogs.push(item);
                } else {
                    actionLogs.push(item);
                }
            });

            // Badges số lượng trên Navigation Tab 4 và Tab 5 (Cả Desktop & Mobile Sidebar)
            const alertBadge = document.getElementById('alert-log-count-badge');
            const mobAlertBadge = document.getElementById('mob-alert-log-count-badge');
            const toolAlertBadge = document.getElementById('tools-menu-alert-badge');
            
            if (alertBadge) {
                alertBadge.innerText = alertLogs.length;
                if (alertLogs.length > 0) alertBadge.classList.remove('hidden');
                else alertBadge.classList.add('hidden');
            }
            if (mobAlertBadge) {
                mobAlertBadge.innerText = alertLogs.length;
                if (alertLogs.length > 0) mobAlertBadge.classList.remove('hidden');
                else mobAlertBadge.classList.add('hidden');
            }
            if (toolAlertBadge) {
                toolAlertBadge.innerText = alertLogs.length;
                if (alertLogs.length > 0) toolAlertBadge.classList.remove('hidden');
                else toolAlertBadge.classList.add('hidden');
            }

            const actionBadge = document.getElementById('action-log-count-badge');
            const mobActionBadge = document.getElementById('mob-action-log-count-badge');
            const toolActionBadge = document.getElementById('tools-menu-action-badge');

            if (actionBadge) {
                actionBadge.innerText = actionLogs.length;
                if (actionLogs.length > 0) actionBadge.classList.remove('hidden');
                else actionBadge.classList.add('hidden');
            }
            if (mobActionBadge) {
                mobActionBadge.innerText = actionLogs.length;
                if (actionLogs.length > 0) mobActionBadge.classList.remove('hidden');
                else mobActionBadge.classList.add('hidden');
            }
            if (toolActionBadge) {
                toolActionBadge.innerText = actionLogs.length;
                if (actionLogs.length > 0) toolActionBadge.classList.remove('hidden');
                else toolActionBadge.classList.add('hidden');
            }

            if (window.tableState) {
                window.tableState.alert.rawData = alertLogs;
                window.tableState.action.rawData = actionLogs;
                window.renderTableData('alert');
                window.renderTableData('action');
            }
        };

        window.onLogFilterChange = function(type) {
            const searchEl = document.getElementById(`${type}-search-input`);
            const dateEl = document.getElementById(`${type}-date-input`);
            if (window.tableState && window.tableState[type]) {
                window.tableState[type].search = searchEl ? searchEl.value.trim().toLowerCase() : '';
                window.tableState[type].date = dateEl ? dateEl.value : '';
                window.tableState[type].page = 1; // Reset về trang 1 khi thay đổi bộ lọc
                window.renderTableData(type);
            }
        };

        window.renderTableData = function(type) {
            if (!window.tableState || !window.tableState[type]) return;
            const state = window.tableState[type];
            const search = state.search || '';
            const filterDate = state.date || '';

            state.filteredData = (state.rawData || []).filter(item => {
                let matchesSearch = true;
                if (search) {
                    if (type === 'maint') {
                        matchesSearch = ((item.timeStr || '') + ' ' + (item.nguoiThucHien || '') + ' ' + (item.ghiChu || '')).toLowerCase().includes(search);
                    } else {
                        matchesSearch = ((item.timeStr || '') + ' ' + (item.thaoTac || '') + ' ' + (item.chiTiet || '') + ' ' + (item.nguoiThucHien || '')).toLowerCase().includes(search);
                    }
                }
                let matchesDate = true;
                if (filterDate) {
                    matchesDate = item.dateISO === filterDate;
                }
                return matchesSearch && matchesDate;
            });

            const totalEl = document.getElementById(`${type}-total-rows-badge`);
            if (totalEl) {
                totalEl.innerHTML = `<i data-lucide="database" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"></i> ${state.filteredData.length} bản ghi gần nhất`;
            }
            if (type === 'maint') {
                const oldBadge = document.getElementById('maint-history-count-badge');
                if (oldBadge) oldBadge.innerText = `${state.filteredData.length} lần`;
            }

            window.renderPageOnly(type);
        };

        window.changePage = function(type, delta) {
            if (!window.tableState || !window.tableState[type]) return;
            const state = window.tableState[type];
            const totalPages = Math.max(1, Math.ceil(state.filteredData.length / state.itemsPerPage));
            state.page += delta;
            if (state.page < 1) state.page = 1;
            if (state.page > totalPages) state.page = totalPages;
            window.renderPageOnly(type);
        };

        window.renderPageOnly = function(type) {
            if (!window.tableState || !window.tableState[type]) return;
            const state = window.tableState[type];
            const totalPages = Math.max(1, Math.ceil(state.filteredData.length / state.itemsPerPage));
            if (state.page > totalPages) state.page = totalPages;
            if (state.page < 1) state.page = 1;

            const pageInfo = document.getElementById(`${type}-page-info`);
            const prevBtn = document.getElementById(`${type}-prev-btn`);
            const nextBtn = document.getElementById(`${type}-next-btn`);
            if (pageInfo) pageInfo.innerText = `Trang ${state.page} / ${totalPages}`;
            if (prevBtn) prevBtn.disabled = (state.page <= 1);
            if (nextBtn) nextBtn.disabled = (state.page >= totalPages);

            const startIdx = (state.page - 1) * state.itemsPerPage;
            const pageItems = state.filteredData.slice(startIdx, startIdx + state.itemsPerPage);

            if (type === 'alert') {
                const tbody = document.getElementById('alert-logs-tbody');
                if (!tbody) return;
                if (pageItems.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-medium">Chưa có cảnh báo sự cố nào phù hợp bộ lọc.</td></tr>`;
                } else {
                    tbody.innerHTML = pageItems.map((item, idx) => {
                        const isEmergency = (item.thaoTac || '').toUpperCase().includes("DỪNG KHẨN CẤP");
                        const badgeColor = isEmergency ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';
                        const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/70 dark:bg-slate-800/50';
                        return `
                            <tr class="${rowBg} hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors">
                                <td class="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap">${item.timeStr}</td>
                                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeColor}">${item.thaoTac}</span></td>
                                <td class="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">${item.chiTiet}</td>
                                <td class="py-2.5 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs"><span class="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-[11px]"><i data-lucide="cpu" class="w-3 h-3 text-red-500"></i> ${item.nguoiThucHien || "Hệ thống tự động"}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            } else if (type === 'action') {
                const tbody = document.getElementById('action-logs-tbody');
                if (!tbody) return;
                if (pageItems.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-medium">Chưa có thao tác nào phù hợp bộ lọc.</td></tr>`;
                } else {
                    tbody.innerHTML = pageItems.map((item, idx) => {
                        const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/70 dark:bg-slate-800/50';
                        return `
                            <tr class="${rowBg} hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                                <td class="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap">${item.timeStr}</td>
                                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">${item.thaoTac}</span></td>
                                <td class="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">${item.chiTiet}</td>
                                <td class="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 text-xs"><span class="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-[11px]"><i data-lucide="user" class="w-3 h-3 text-blue-500"></i> ${item.nguoiThucHien}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            } else if (type === 'maint') {
                const tbody = document.getElementById('maint-history-tbody');
                if (!tbody) return;
                if (pageItems.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Chưa có lịch sử bảo trì nào phù hợp bộ lọc.</td></tr>`;
                } else {
                    tbody.innerHTML = pageItems.map((item, idx) => {
                        const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/70 dark:bg-slate-800/50';
                        return `
                            <tr class="${rowBg} hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                                <td class="py-3 px-3.5 font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap">${item.timeStr}</td>
                                <td class="py-3 px-3.5 font-bold text-slate-600 dark:text-slate-300 text-xs"><span class="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md text-[11px] font-extrabold border border-indigo-100 dark:border-indigo-800"><i data-lucide="user-check" class="w-3.5 h-3.5 text-indigo-500"></i> ${item.nguoiThucHien}</span></td>
                                <td class="py-3 px-3.5 font-bold text-slate-800 dark:text-slate-200 leading-relaxed">${item.ghiChu}</td>
                            </tr>
                        `;
                    }).join('');
                }
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        window.exportLogsCSV = function(type) {
            const state = window.tableState && window.tableState[type];
            const dataToExport = state && state.filteredData ? state.filteredData : [];
            if (dataToExport.length === 0) {
                if (window.showToast) window.showToast('Không có dữ liệu để xuất CSV!', 'error');
                return;
            }
            let csvContent = "\uFEFF"; // UTF-8 BOM
            let fileName = "Nhat_Ky.csv";
            const dateSuffix = new Date().toISOString().slice(0, 10);

            if (type === 'alert') {
                csvContent += "Thời Gian,Loại Cảnh Báo,Nội Dung Chi Tiết,Nguồn
";
                dataToExport.forEach(item => {
                    csvContent += `"${item.timeStr}","${item.thaoTac}","${(item.chiTiet || '').replace(/"/g, '""')}","${item.nguoiThucHien || 'Hệ thống tự động'}"
`;
                });
                fileName = `Nhat_Ky_Canh_Bao_${dateSuffix}.csv`;
            } else if (type === 'action') {
                csvContent += "Thời Gian,Loại Thao Tác,Nội Dung Chi Tiết,Nguồn Thực Hiện
";
                dataToExport.forEach(item => {
                    csvContent += `"${item.timeStr}","${item.thaoTac}","${(item.chiTiet || '').replace(/"/g, '""')}","${item.nguoiThucHien || 'Khách'}"
`;
                });
                fileName = `Lich_Su_Thao_Tac_${dateSuffix}.csv`;
            } else if (type === 'maint') {
                csvContent += "Thời Gian,Kỹ Thuật Viên,Nội Dung Ghi Chú Bảo Dưỡng
";
                dataToExport.forEach(item => {
                    csvContent += `"${item.timeStr}","${item.nguoiThucHien}","${(item.ghiChu || '').replace(/"/g, '""')}"
`;
                });
                fileName = `Lich_Su_Bao_Tri_${dateSuffix}.csv`;
            }

            const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (window.showToast) window.showToast('Đã xuất báo cáo CSV toàn bộ danh sách lọc!', 'success');
        };

        window.deleteLogsData = async function(type) {
            if (!window.isScadaAdmin) {
                if (window.showToast) window.showToast("Bạn đang ở chế độ Xem (Khách), không có quyền xóa nhật ký!", "error");
                return;
            }

            const firstConfirm = confirm('[XÁC NHẬN LẦN 1/2 - CẢNH BÁO AN NINH]
Bạn có chắc chắn muốn xóa dữ liệu nhật ký này khỏi máy chủ Realtime Database không?');
            if (!firstConfirm) return;

            const secondConfirm = confirm('[XÁC NHẬN LẦN 2/2 - THAO TÁC KHẨN CẤP]
Cảnh báo lần cuối: Hành động này KHÔNG THỂ KHÔI PHỤC. Dữ liệu sẽ bị xóa vĩnh viễn khỏi hệ thống. Tiếp tục xóa?');
            if (!secondConfirm) return;

            try {
                if (type === 'maint') {
                    await remove(ref(db, 'maintenance_history'));
                    if (window.showToast) window.showToast('Đã xóa sạch lịch sử bảo trì kỹ thuật!', 'success');
                } else if (type === 'alert') {
                    const state = window.tableState && window.tableState.alert;
                    const toDelete = (state && state.rawData) || [];
                    for (const item of toDelete) {
                        if (item.key) await remove(ref(db, `nhat_ky/${item.key}`));
                    }
                    if (window.showToast) window.showToast('Đã xóa sạch nhật ký cảnh báo sự cố!', 'success');
                } else if (type === 'action') {
                    const state = window.tableState && window.tableState.action;
                    const toDelete = (state && state.rawData) || [];
                    for (const item of toDelete) {
                        if (item.key) await remove(ref(db, `nhat_ky/${item.key}`));
                    }
                    if (window.showToast) window.showToast('Đã xóa sạch lịch sử thao tác người dùng!', 'success');
                }
            } catch (err) {
                console.error("Lỗi xóa nhật ký Firebase:", err);
                if (window.showToast) window.showToast('Lỗi khi xóa dữ liệu: ' + err.message, 'error');
            }
        };

        window.togglePopoverSwitchAccount = function(show) {
            const popover = document.getElementById('popover-switch-account');
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (!popover) return;

            if (show === false) {
                popover.classList.add('hidden');
                return;
            }

            const isHidden = popover.classList.contains('hidden');
            if (isHidden || show === true) {
                window.populateSwitchAccountPopover();
                popover.classList.remove('hidden');
            } else {
                popover.classList.add('hidden');
            }
        };

        window.populateSwitchAccountPopover = function() {
            const currentUser = auth.currentUser;
            const currentUid = currentUser ? currentUser.uid : '';
            const displayName = currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0] || 'Khách') : 'Khách';
            const email = currentUser ? (currentUser.email || 'Tài khoản Google/Khách ẩn danh') : '';
            const photoURL = currentUser ? (currentUser.photoURL || '') : '';

            const mainAvatarContainer = document.getElementById('switch-account-main-avatar');
            if (mainAvatarContainer) {
                if (photoURL) {
                    mainAvatarContainer.innerHTML = `<img src="${photoURL}" class="w-full h-full object-cover">`;
                } else {
            mainAvatarContainer.innerHTML = displayName.substring(0, 2).toUpperCase();
                }
            }
            const mainNameEl = document.getElementById('switch-account-main-name');
            if (mainNameEl) mainNameEl.innerText = displayName;
            const mainEmailEl = document.getElementById('switch-account-main-email');
            if (mainEmailEl) mainEmailEl.innerText = email;

            const container = document.getElementById('switch-account-list');
            if (!container) return;

            let accounts = [];
            try {
                accounts = JSON.parse(localStorage.getItem('scada_accounts') || '[]');
            } catch(e) {}

            if (accounts.length === 0 && currentUser) {
                accounts.push({
                    uid: currentUser.uid,
                    email: currentUser.email || 'Tài khoản Google/Khách ẩn danh',
                    displayName: displayName,
                    photoURL: photoURL,
                    lastLogin: Date.now()
                });
            }

            let html = '';
            accounts.forEach(acc => {
                const isCurrent = acc.uid === currentUid;
                const initial = (acc.displayName || acc.email || 'U').substring(0, 2).toUpperCase();
                const avatarHtml = acc.photoURL 
                    ? `<img src="${acc.photoURL}" class="w-8 h-8 rounded-full object-cover shadow-sm">`
                    : `<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">${initial}</div>`;
                
                html += `
                    <div onclick="selectAccountToSwitch('${acc.uid}', '${acc.email}')" class="p-2.5 rounded-xl border ${isCurrent ? 'border-blue-500/80 bg-blue-950/40' : 'border-gray-700/50 hover:bg-[#2d2e31]'} cursor-pointer flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2.5 overflow-hidden">
                            ${avatarHtml}
                            <div class="overflow-hidden">
                                <div class="text-xs font-bold text-gray-200 truncate">${acc.displayName || 'Người dùng'}</div>
                                <div class="text-[10px] text-gray-400 truncate">${acc.email}</div>
                            </div>
                        </div>
                        ${isCurrent ? `<span class="px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-400 text-[9px] font-bold flex items-center gap-1 flex-shrink-0"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Đang dùng</span>` : `<i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-500 flex-shrink-0"></i>`}
                    </div>
                `;
            });

            container.innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        window.openSwitchAccountModal = function() {
            window.togglePopoverSwitchAccount(true);
        };

        window.selectAccountToSwitch = function(uid, email) {
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.uid === uid) {
                window.togglePopoverSwitchAccount(false);
                showToast("Bạn đang sử dụng tài khoản này!", "info");
                return;
            }
            window.togglePopoverSwitchAccount(false);
            if (typeof presenceConnectedUnsubscribe === 'function') {
                presenceConnectedUnsubscribe();
                presenceConnectedUnsubscribe = null;
            }
            if (currentUser) {
                const userPresenceRef = ref(db, `web_users/${currentUser.uid}/presence`);
                set(userPresenceRef, { state: 'offline', last_changed: serverTimestamp() }).catch(console.error);
            }
            if (email && !email.includes(' ẩn danh')) {
                localStorage.setItem('preset_login_email', email);
            }
            signOut(auth).then(() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
            });
        };

        window.addNewAccount = function() {
            window.togglePopoverSwitchAccount(false);
            localStorage.removeItem('preset_login_email');
            if (typeof presenceConnectedUnsubscribe === 'function') {
                presenceConnectedUnsubscribe();
                presenceConnectedUnsubscribe = null;
            }
            if (auth.currentUser) {
                const userPresenceRef = ref(db, `web_users/${auth.currentUser.uid}/presence`);
                set(userPresenceRef, { state: 'offline', last_changed: serverTimestamp() }).catch(console.error);
            }
            signOut(auth).then(() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
            });
        };

        window.switchAccount = window.openSwitchAccountModal;

        let presenceConnectedUnsubscribe = null;

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Theo dõi trạng thái Presence (Online / Offline)
                if (typeof presenceConnectedUnsubscribe === 'function') {
                    presenceConnectedUnsubscribe();
                    presenceConnectedUnsubscribe = null;
                }
                const connectedRef = ref(db, ".info/connected");
                presenceConnectedUnsubscribe = onValue(connectedRef, (snap) => {
                    if (snap.val() === true) {
                        const userPresenceRef = ref(db, `web_users/${user.uid}/presence`);
                        onDisconnect(userPresenceRef).set({ state: 'offline', last_changed: serverTimestamp() }).then(() => {
                            set(userPresenceRef, { state: 'online', last_changed: serverTimestamp() });
                        });
                    }
                });

                // Lắng nghe trạng thái bị khóa Realtime
                onValue(ref(db, `web_users/${user.uid}/isBlocked`), (snapshot) => {
                    if (snapshot.exists() && snapshot.val() === true) {
                        alert('Tài khoản của bạn đã bị khóa bởi Quản trị viên!');
                        if (typeof presenceConnectedUnsubscribe === 'function') {
                            presenceConnectedUnsubscribe();
                            presenceConnectedUnsubscribe = null;
                        }
                        const userPresenceRef = ref(db, `web_users/${user.uid}/presence`);
                        set(userPresenceRef, { state: 'offline', last_changed: serverTimestamp() });
                        signOut(auth).then(() => {
                            window.location.href = 'login.html';
                        });
                    }
                });
                // Đã đăng nhập
                const displayName = user.displayName || user.email?.split('@')[0] || 'Khách';
                const photoURL = user.photoURL || '';
                
                // Cập nhật giao diện
                const nameEl = document.getElementById('user-profile-name');
                if (nameEl) nameEl.innerText = displayName;
                
                const dpNameEl = document.getElementById('dropdown-profile-name');
                if (dpNameEl) dpNameEl.innerText = displayName;

                // Cập nhật email và UID hiển thị
                const emailText = user.email ? user.email : 'Tài khoản Google/Khách ẩn danh';
                
                const profileEmailEl = document.getElementById('profile-email');
                if (profileEmailEl) profileEmailEl.innerText = emailText;
                const userEmailTextEl = document.getElementById('user-email-text');
                if (userEmailTextEl) userEmailTextEl.innerText = emailText;

                const profileUidEl = document.getElementById('profile-user-id');
                if (profileUidEl) profileUidEl.innerText = user.uid;
                const userUidTextEl = document.getElementById('user-uid-text');
                if (userUidTextEl) userUidTextEl.innerText = user.uid;

                const roleEl = document.querySelector('[data-i18n="user_role"]');
                const userRoleTextEl = document.getElementById('user-role-text');
                const profileRoleEl = document.getElementById('profile-role');

                // Lưu lịch sử tài khoản đã từng đăng nhập (LocalStorage multi-account)
                try {
                    let accounts = JSON.parse(localStorage.getItem('scada_accounts') || '[]');
                    const accIndex = accounts.findIndex(a => a.uid === user.uid);
                    const accData = {
                        uid: user.uid,
                        email: user.email || 'Tài khoản Google/Khách ẩn danh',
                        displayName: displayName,
                        photoURL: photoURL,
                        lastLogin: Date.now()
                    };
                    if (accIndex >= 0) {
                        accounts[accIndex] = accData;
                    } else {
                        accounts.push(accData);
                    }
                    localStorage.setItem('scada_accounts', JSON.stringify(accounts));
                } catch(e) {}

                // Truy vấn quyền Admin từ Realtime Database: admins/${user.uid}
                try {
                    const dbRef = ref(db);
                    const snapshot = await get(child(dbRef, `admins/${user.uid}`));
                    if (snapshot.exists() && (snapshot.val() === true || snapshot.val() === 'true')) {
                        const roleTitle = 'Quản trị viên 👑';
                        if (roleEl) roleEl.innerText = roleTitle;
                        if (userRoleTextEl) userRoleTextEl.innerText = roleTitle;
                        if (profileRoleEl) profileRoleEl.innerText = roleTitle;
                        setControlAccess(true);
                        updateAdminAvatarStyle(true);
                        const btnAdmin = document.getElementById("btn-admin-panel");
                        if (btnAdmin) btnAdmin.classList.remove("hidden");
                        const btnAdminDash2 = document.getElementById("btn-admin-dashboard");
                        if (btnAdminDash2) btnAdminDash2.classList.remove("hidden");
                    } else {
                        const roleTitle = 'Người xem (Viewer)';
                        if (roleEl) roleEl.innerText = roleTitle;
                        if (userRoleTextEl) userRoleTextEl.innerText = roleTitle;
                        if (profileRoleEl) profileRoleEl.innerText = roleTitle;
                        setControlAccess(false);
                        updateAdminAvatarStyle(false);
                        const btnAdmin = document.getElementById("btn-admin-panel");
                        if (btnAdmin) btnAdmin.classList.add("hidden");
                        const btnAdminDash2 = document.getElementById("btn-admin-dashboard");
                        if (btnAdminDash2) btnAdminDash2.classList.add("hidden");
                    }
                } catch (err) {
                    console.error("Lỗi kiểm tra quyền Admin từ Database:", err);
                    const roleTitle = 'Người xem (Viewer)';
                    if (roleEl) roleEl.innerText = roleTitle;
                    if (userRoleTextEl) userRoleTextEl.innerText = roleTitle;
                    if (profileRoleEl) profileRoleEl.innerText = roleTitle;
                    setControlAccess(false);
                    updateAdminAvatarStyle(false);
                    const btnAdmin = document.getElementById("btn-admin-panel");
                    if (btnAdmin) btnAdmin.classList.add("hidden");
                    const btnAdminDash2 = document.getElementById("btn-admin-dashboard");
                    if (btnAdminDash2) btnAdminDash2.classList.add("hidden");
                }
                
                const avatarContainer = document.getElementById('user-avatar-container');
                if (avatarContainer) {
                    if (photoURL) {
                        avatarContainer.innerHTML = `<img src="${photoURL}" alt="Avatar" class="w-full h-full object-cover rounded-full">`;
                    } else {
                        avatarContainer.innerHTML = displayName.substring(0, 2).toUpperCase();
                    }
                }
                
                const dpAvatar = document.getElementById('dropdown-avatar-display');
                if (dpAvatar) {
                    if (photoURL) {
                        dpAvatar.innerHTML = `<img src="${photoURL}" alt="Avatar" class="w-full h-full object-cover rounded-full">`;
                    } else {
                        dpAvatar.innerHTML = displayName.substring(0, 2).toUpperCase();
                    }
                }

                // Tự động lắng nghe và tải Nhật ký & Module Bảo trì từ Firebase Realtime Database
                window.hienThiNhatKy();
                if (typeof window.langKhoiTaoBaoTriListener === 'function') {
                    window.langKhoiTaoBaoTriListener();
                }
            } else {
                if (typeof presenceConnectedUnsubscribe === 'function') {
                    presenceConnectedUnsubscribe();
                    presenceConnectedUnsubscribe = null;
                }
                // Chưa đăng nhập
                window.location.href = 'login.html';
            }
        });

        window.logout = function() {
            if (typeof presenceConnectedUnsubscribe === 'function') {
                presenceConnectedUnsubscribe();
                presenceConnectedUnsubscribe = null;
            }
            if (auth.currentUser) {
                const userPresenceRef = ref(db, `web_users/${auth.currentUser.uid}/presence`);
                set(userPresenceRef, { state: 'offline', last_changed: serverTimestamp() }).catch(console.error);
            }
            signOut(auth).then(() => {
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error("Lỗi đăng xuất:", error);
            });
        };
        window.toggleUserMenu = function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
            }
        };

        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('#user-menu-wrapper')) {
                dropdown.classList.add('hidden');
            }
        });

        window.openProfileModal = function() {
            const user = auth.currentUser;
            if (!user) return;
            
            // Điền thông tin
            const displayName = user.displayName || user.email?.split('@')[0] || 'Khách';
            document.getElementById('profile-display-name').value = displayName;
            document.getElementById('profile-avatar-url').value = user.photoURL || '';
            
            // Cập nhật Avatar Modal
            updateModalAvatarDisplay(user.photoURL, displayName);
            
            // Thông tin read-only
            document.getElementById('profile-email').innerText = user.email ? user.email : 'Tài khoản Google/Khách ẩn danh';
            const roleEl = document.querySelector('[data-i18n="user_role"]');
            document.getElementById('profile-role').innerText = roleEl ? roleEl.innerText : 'Người xem (Viewer)';
            document.getElementById('profile-last-login').innerText = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('vi-VN') : 'Không rõ';
            document.getElementById('profile-user-id').innerText = user.uid;
            
            // Xóa pass
            document.getElementById('profile-new-pass').value = '';
            document.getElementById('profile-confirm-pass').value = '';
            
            // Hiển thị modal
            const modal = document.getElementById('modal-profile');
            if (modal) {
                modal.classList.remove('hidden');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            
            // Ẩn dropdown menu nếu đang mở
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        };

        window.closeProfileModal = function() {
            const modal = document.getElementById('modal-profile');
            if (modal) {
                modal.classList.add('hidden');
            }
        };

        window.updateModalAvatarDisplay = function(photoURL, displayName) {
            const container = document.getElementById('profile-modal-avatar');
            if (!container) return;
            if (photoURL) {
                container.innerHTML = `<img src="${photoURL}" alt="Avatar" class="w-full h-full object-cover rounded-full">`;
            } else {
                container.innerHTML = (displayName || 'DK').substring(0, 2).toUpperCase();
            }
        };

        window.handleAvatarUpload = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Str = e.target.result;
                document.getElementById('profile-avatar-url').value = base64Str;
                const displayName = document.getElementById('profile-display-name').value;
                updateModalAvatarDisplay(base64Str, displayName);
            };
            reader.readAsDataURL(file);
        };

        window.promptAvatarLink = function() {
            const url = prompt("Nhập Link (URL) hình ảnh:");
            if (url && url.trim() !== '') {
                document.getElementById('profile-avatar-url').value = url.trim();
                const displayName = document.getElementById('profile-display-name').value;
                updateModalAvatarDisplay(url.trim(), displayName);
            }
        };

        window.saveProfileChanges = async function() {
            const user = auth.currentUser;
            if (!user) return;
            
            const btn = document.getElementById('btn-save-profile');
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang lưu...`;
            btn.disabled = true;
            
            try {
                // 1. Cập nhật Tên & Avatar
                const displayName = document.getElementById('profile-display-name').value.trim();
                const photoURL = document.getElementById('profile-avatar-url').value;
                
                if (displayName !== user.displayName || photoURL !== user.photoURL) {
                    await updateProfile(user, { displayName, photoURL });
                    try {
                        const db = window.db || getDatabase();
                        await update(ref(db, `web_users/${user.uid}`), {
                            displayName: displayName,
                            photoURL: photoURL
                        });
                    } catch (e) {
                        console.error("Failed to update web_users:", e);
                    }
                    // Cập nhật ngay Header
                    const finalName = displayName || user.email?.split('@')[0] || 'Khách';
                    
                    const nameEl = document.getElementById('user-profile-name');
                    if (nameEl) nameEl.innerText = finalName;
                    
                    const dpNameEl = document.getElementById('dropdown-profile-name');
                    if (dpNameEl) dpNameEl.innerText = finalName;
                    
                    const avatarContainers = [document.getElementById('user-avatar-container'), document.getElementById('dropdown-avatar-display')];
                    avatarContainers.forEach(container => {
                        if (container) {
                            if (photoURL) {
                                container.innerHTML = `<img src="${photoURL}" alt="Avatar" class="w-full h-full object-cover rounded-full">`;
                            } else {
                                container.innerHTML = finalName.substring(0, 2).toUpperCase();
                            }
                        }
                    });
                    
                    if(window.showToast) window.showToast('Đã cập nhật Tên và Ảnh đại diện', 'success');
                }
                
                // 2. Cập nhật Mật khẩu
                const newPass = document.getElementById('profile-new-pass').value;
                const confirmPass = document.getElementById('profile-confirm-pass').value;
                
                if (newPass || confirmPass) {
                    if (newPass !== confirmPass) {
                        if(window.showToast) window.showToast('Mật khẩu xác nhận không khớp!', 'error');
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                        return;
                    }
                    if (newPass.length < 6) {
                        if(window.showToast) window.showToast('Mật khẩu mới phải từ 6 ký tự!', 'error');
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                        return;
                    }
                    
                    await updatePassword(user, newPass);
                    if(window.showToast) window.showToast('Đã đổi mật khẩu thành công!', 'success');
                }
                
                closeProfileModal();
            } catch (error) {
                console.error("Lỗi cập nhật Profile:", error);
                if (error.code === 'auth/requires-recent-login') {
                    if(window.showToast) window.showToast('Phiên đăng nhập quá cũ để đổi mật khẩu. Vui lòng đăng nhập lại!', 'error');
                } else {
                    if(window.showToast) window.showToast('Lỗi: ' + error.message, 'error');
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        };
    