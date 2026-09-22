
    import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
    import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

    let unsubscribeAdmins = null;
    let unsubscribeUsers = null;
    let currentAdminsMap = {};
    let allAdminUsers = [];
    let openActionMenuUid = null;

    function removeVietnameseTones(str) {
        if (!str) return "";
        return String(str)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeJs(str) {
        if (!str) return "";
        return String(str)
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"');
    }

    function getTime(val) {
        if (!val) return 0;
        const t = new Date(val).getTime();
        return isNaN(t) ? 0 : t;
    }

    window.renderAdminUsersTable = function() {
        const tbody = document.getElementById("admin-users-list");
        if (!tbody) return;
        tbody.innerHTML = "";

        const statsEl = document.getElementById("admin-user-stats");
        if (statsEl) {
            const totalCount = allAdminUsers.length;
            const onlineCount = allAdminUsers.filter(u => u.presence?.state === 'online').length;
            const offlineCount = Math.max(0, totalCount - onlineCount);
            statsEl.innerHTML = `Tổng: <span class="font-black text-slate-700 dark:text-slate-200">${totalCount}</span> người dùng &bull; <span class="text-green-500 font-bold">🟢 ${onlineCount} Online</span> &bull; <span class="text-slate-400">⚪ ${offlineCount} Offline</span>`;
        }

        if (allAdminUsers.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center py-6 text-slate-400 font-medium'>Không có dữ liệu người dùng.</td></tr>";
            return;
        }

        const searchInput = document.getElementById("admin-user-search");
        const rawQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const normQuery = removeVietnameseTones(rawQuery);

        // Chức năng tìm kiếm lọc danh sách usersArray theo thời gian thực
        const filteredUsers = allAdminUsers.filter(user => {
            if (!rawQuery) return true;
            const uid = String(user.uid || "").toLowerCase();
            const name = String(user.displayName || "").toLowerCase();
            const normName = removeVietnameseTones(name);
            const email = String(user.email || "").toLowerCase();
            const isOnline = user.presence?.state === 'online';
            const presenceStr = isOnline ? "online truc tuyen hoat dong dang online" : "offline ngoai tuyen khong hoat dong da thoat";
            const roleStr = user.isAdmin ? "admin quan tri quan tri vien" : "khach viewer nguoi xem";
            const statusStr = user.isBlocked ? "bi khoa khoa blocked" : "hoat dong binh thuong";

            return name.includes(rawQuery) || 
                   normName.includes(normQuery) || 
                   email.includes(rawQuery) || 
                   uid.includes(rawQuery) ||
                   presenceStr.includes(rawQuery) ||
                   presenceStr.includes(normQuery) ||
                   roleStr.includes(rawQuery) ||
                   roleStr.includes(normQuery) ||
                   statusStr.includes(rawQuery) ||
                   statusStr.includes(normQuery);
        });

        if (filteredUsers.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center py-6 text-slate-400 font-medium'>Không tìm thấy người dùng phù hợp bộ lọc.</td></tr>";
            return;
        }

        const auth = getAuth();
        const currentAuthUser = auth.currentUser;
        const currentUid = currentAuthUser ? currentAuthUser.uid : null;

        filteredUsers.forEach(user => {
            let dateVal = user.lastLogin;
            if (!dateVal && user.presence && user.presence.last_changed) {
                dateVal = user.presence.last_changed;
            }
            const dateObj = dateVal ? new Date(dateVal) : null;
            const loginTime = (dateObj && !isNaN(dateObj.getTime())) ? dateObj.toLocaleString("vi-VN") : "Chưa có";
            
            const roleBadge = user.isAdmin 
                ? '<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">Admin 👑</span>'
                : '<span class="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">Khách</span>';
            
            const statusBadge = user.isBlocked
                ? '<span class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300 ml-2">Bị Khóa</span>'
                : '';

            const isOnline = user.presence?.state === 'online';
            const presenceBadge = isOnline
                ? '<span class="flex items-center gap-1 text-green-500 text-xs mt-1 font-medium"><div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>Online</span>'
                : '<span class="flex items-center gap-1 text-gray-400 text-xs mt-1 font-medium"><div class="w-2 h-2 bg-gray-400 rounded-full"></div>Offline</span>';

            const safeDisplayName = escapeHtml(user.displayName || "Khách");
            const safeEmail = escapeHtml(user.email || user.uid || "");
            const safeUid = escapeHtml(user.uid || "");
            const jsUid = escapeJs(user.uid || "");

            const isSelf = (currentUid && user.uid === currentUid);
            const isMenuOpen = (openActionMenuUid === user.uid);

            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
            if (user.isBlocked) tr.classList.add("opacity-50");
            if (isMenuOpen) {
                tr.style.position = "relative";
                tr.style.zIndex = "50";
            }

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        ${safeDisplayName}
                        ${isSelf ? '<span class="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-extrabold border border-blue-500/30">(Bạn)</span>' : ''}
                    </div>
                    <div class="text-xs text-slate-500">${safeEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${roleBadge}${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-xs">
                    <div class="text-slate-700 dark:text-slate-300 font-medium">${loginTime}</div>
                    ${presenceBadge}
                </td>
                <td class="px-6 py-4 text-center relative">
                    <button onclick="toggleActionMenu('${jsUid}', event)" class="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <i data-lucide="more-vertical" class="w-5 h-5"></i>
                    </button>
                    <!-- Action Menu Dropdown -->
                    <div id="action-menu-${safeUid}" class="${isMenuOpen ? '' : 'hidden'} absolute right-4 top-8 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden text-left">
                        <button ${isSelf ? 'disabled' : `onclick="toggleAdmin('${jsUid}', ${!user.isAdmin})"`} class="w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'} font-medium border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <i data-lucide="shield" class="w-4 h-4"></i> ${user.isAdmin ? (isSelf ? 'Quản trị viên (Hiện tại)' : 'Hủy quyền Admin') : 'Cấp quyền Admin'}
                        </button>
                        <button ${isSelf ? 'disabled' : `onclick="toggleBlock('${jsUid}', ${!user.isBlocked})"`} class="w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20'} font-bold border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <i data-lucide="ban" class="w-4 h-4"></i> ${user.isBlocked ? 'Mở khóa tài khoản' : (isSelf ? 'Không thể tự khóa' : 'Khóa tài khoản')}
                        </button>
                        <button ${isSelf ? 'disabled' : `onclick="deleteUserRecord('${jsUid}')"`} class="w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20'} font-bold flex items-center gap-2">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Xóa dữ liệu
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (typeof lucide !== "undefined") lucide.createIcons();
    };

    window.filterAdminUsers = function() {
        window.renderAdminUsersTable();
    };

    window.openAdminModal = function() {
        // Đóng dropdown user nếu đang mở
        const userDropdown = document.getElementById("user-dropdown");
        if (userDropdown) userDropdown.classList.add("hidden");

        document.getElementById("modal-admin").classList.remove("hidden");
        
        const searchInput = document.getElementById("admin-user-search");
        if (searchInput) searchInput.value = "";
        openActionMenuUid = null;

        // Hủy listener cũ trước khi đăng ký mới nếu modal được mở lại
        if (typeof unsubscribeAdmins === "function") {
            unsubscribeAdmins();
            unsubscribeAdmins = null;
        }
        if (typeof unsubscribeUsers === "function") {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }

        const db = window.db || getDatabase();
        const usersRefGlobal = ref(db, "web_users");
        const adminsRefGlobal = ref(db, "admins");

        // Realtime Listener for Admins
        unsubscribeAdmins = onValue(adminsRefGlobal, (snapshot) => {
            currentAdminsMap = snapshot.exists() ? snapshot.val() : {};
            if (allAdminUsers && allAdminUsers.length > 0) {
                allAdminUsers.forEach(u => {
                    u.isAdmin = currentAdminsMap[u.uid] === true || currentAdminsMap[u.uid] === "true";
                });
                allAdminUsers.sort((a, b) => {
                    if (a.isAdmin && !b.isAdmin) return -1;
                    if (!a.isAdmin && b.isAdmin) return 1;
                    const aOnline = a.presence?.state === 'online';
                    const bOnline = b.presence?.state === 'online';
                    if (aOnline && !bOnline) return -1;
                    if (!aOnline && bOnline) return 1;
                    return getTime(b.lastLogin || b.presence?.last_changed) - getTime(a.lastLogin || a.presence?.last_changed);
                });
                window.renderAdminUsersTable();
            }
        });

        // Realtime Listener for Users
        unsubscribeUsers = onValue(usersRefGlobal, (usersSnap) => {
            if (usersSnap.exists()) {
                const users = usersSnap.val();
                
                // Chuyển object thành mảng để sort
                const usersArray = Object.entries(users).map(([uid, user]) => ({
                    uid,
                    ...user,
                    isAdmin: currentAdminsMap[uid] === true || currentAdminsMap[uid] === "true",
                    isBlocked: user.isBlocked === true || user.isBlocked === "true"
                }));

                // Sort: Admin lên đầu, sau đó tới Online, rồi tới người dùng mới nhất
                usersArray.sort((a, b) => {
                    if (a.isAdmin && !b.isAdmin) return -1;
                    if (!a.isAdmin && b.isAdmin) return 1;
                    const aOnline = a.presence?.state === 'online';
                    const bOnline = b.presence?.state === 'online';
                    if (aOnline && !bOnline) return -1;
                    if (!aOnline && bOnline) return 1;
                    return getTime(b.lastLogin || b.presence?.last_changed) - getTime(a.lastLogin || a.presence?.last_changed);
                });

                allAdminUsers = usersArray;
                window.renderAdminUsersTable();
            } else {
                allAdminUsers = [];
                window.renderAdminUsersTable();
            }
        });
        if (typeof lucide !== "undefined") lucide.createIcons();
    };

    window.closeAdminModal = function() {
        document.getElementById("modal-admin").classList.add("hidden");
        openActionMenuUid = null;
        // Hủy lắng nghe realtime để tiết kiệm bộ nhớ khi đóng modal
        if (typeof unsubscribeAdmins === "function") {
            unsubscribeAdmins();
            unsubscribeAdmins = null;
        }
        if (typeof unsubscribeUsers === "function") {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }
    };

    // Hàm để ẩn hiện Dropdown Menu Hành Động
    window.toggleActionMenu = function(uid, e) {
        if (e && typeof e.stopPropagation === "function") {
            e.stopPropagation();
        }
        if (openActionMenuUid === uid) {
            openActionMenuUid = null;
        } else {
            openActionMenuUid = uid;
        }
        window.renderAdminUsersTable();
    };

    // Lắng nghe click bên ngoài để đóng action menu
    document.addEventListener("click", function(e) {
        if (openActionMenuUid && !e.target.closest('[id^="action-menu-"]') && !e.target.closest('button[onclick*="toggleActionMenu"]')) {
            openActionMenuUid = null;
            window.renderAdminUsersTable();
        }
    });

    window.toggleAdmin = function(uid, makeAdmin) {
        openActionMenuUid = null;
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === uid && !makeAdmin) {
            if (window.showToast) window.showToast("Bạn không thể tự hủy quyền Admin của chính mình!", "error");
            else alert("Bạn không thể tự hủy quyền Admin của chính mình!");
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn ${makeAdmin ? "Cấp quyền Admin cho" : "Hủy quyền Admin của"} người này?`)) return;
        
        const db = window.db || getDatabase();
        set(ref(db, `admins/${uid}`), makeAdmin)
            .then(() => {
                if (window.showToast) window.showToast("Cập nhật quyền Admin thành công!", "success");
                else alert("Cập nhật quyền Admin thành công!");
            })
            .catch(e => {
                if (window.showToast) window.showToast("Lỗi: " + e.message, "error");
                else alert("Lỗi: " + e.message);
            });
    };



    window.uploadAvatar = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            if (window.showToast) window.showToast('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.', 'error');
            else alert('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.');
            return;
        }

        const auth = getAuth();
        if (!auth || !auth.currentUser) return;
        const uid = auth.currentUser.uid;

        const storage = window.storage;
        if (!storage) {
            console.error("Storage not initialized");
            return;
        }

        try {
            if (window.showToast) window.showToast('Đang tải ảnh lên...', 'info');
            
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${uid}_${Date.now()}.${fileExt}`;
            const storageReference = window.storageRef(storage, fileName);
            
            await window.uploadBytes(storageReference, file);
            const downloadURL = await window.getDownloadURL(storageReference);
            
            const urlInput = document.getElementById('profile-avatar-url');
            if (urlInput) {
                urlInput.value = downloadURL;
            }
            
            // Preview
            const previewContainer = document.getElementById('user-avatar-container-modal');
            if (!previewContainer) {
                // Tạm thời hiển thị trực tiếp vào avatar trên modal
                const modalAvatar = document.querySelector('#modal-profile img');
                if (modalAvatar) {
                    modalAvatar.src = downloadURL;
                } else {
                    const containers = document.querySelectorAll('#modal-profile .w-20.h-20');
                    if (containers.length > 0) {
                        containers[0].innerHTML = `<img src="${downloadURL}" class="w-full h-full object-cover rounded-full shadow-md border-2 border-white dark:border-slate-800">`;
                    }
                }
            }

            if (window.showToast) window.showToast('Tải ảnh lên thành công! Bấm Lưu Thay Đổi để xác nhận.', 'success');
        } catch (error) {
            console.error("Upload error:", error);
            if (window.showToast) window.showToast('Lỗi khi tải ảnh: ' + error.message, 'error');
            else alert('Lỗi khi tải ảnh: ' + error.message);
        }
    };

    window.deleteUserRecord = function(uid) {
        openActionMenuUid = null;
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === uid) {
            if (window.showToast) window.showToast("Bạn không thể tự xóa tài khoản của chính mình!", "error");
            else alert("Bạn không thể tự xóa tài khoản của chính mình!");
            return;
        }

        if (!confirm("XÓA TÀI KHOẢN NÀY KHỎI DANH SÁCH?

Lưu ý: Thao tác này chỉ xóa dữ liệu hiển thị trên Web. Nếu bạn chưa xóa họ bên Firebase Authentication, họ vẫn có thể đăng nhập lại.")) return;
        
        const db = window.db || getDatabase();
        remove(ref(db, `web_users/${uid}`))
            .then(() => {
                if (window.showToast) window.showToast("Đã xóa dữ liệu thành công!", "success");
            })
            .catch(e => {
                if (window.showToast) window.showToast("Lỗi: " + e.message, "error");
            });
    };

    window.toggleBlock = function(uid, isBlocked) {
        openActionMenuUid = null;
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === uid && isBlocked) {
            if (window.showToast) window.showToast("Bạn không thể tự khóa tài khoản của chính mình!", "error");
            else alert("Bạn không thể tự khóa tài khoản của chính mình!");
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn ${isBlocked ? "Khóa" : "Mở Khóa"} người này?`)) return;
        
        const db = window.db || getDatabase();
        set(ref(db, `web_users/${uid}/isBlocked`), isBlocked)
            .then(() => {
                if (window.showToast) window.showToast("Cập nhật trạng thái Khóa thành công!", "success");
                else alert("Cập nhật trạng thái Khóa thành công!");
            })
            .catch(e => {
                if (window.showToast) window.showToast("Lỗi: " + e.message, "error");
                else alert("Lỗi: " + e.message);
            });
    };
