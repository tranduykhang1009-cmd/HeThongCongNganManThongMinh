/**
 * @file admin.js
 * @description Administrator user directory modal, real-time web_users & admins sync,
 *              Vietnamese diacritics-insensitive search, multi-column sorting, pagination,
 *              grant/revoke admin rights, realtime account locking, and avatar storage uploads.
 * @module modules/admin
 */

import {
    db,
    ref,
    set,
    remove,
    onValue,
    get,
    auth,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL
} from '../config/firebase-config.js';

import {
    getState,
    updateState
} from '../core/state.js';

import { showToast, openModal, closeModal } from '../utils/ui-utils.js';
import {
    removeVietnameseTones,
    escapeHtml,
    escapeJs,
    getTime,
    timeAgo,
    onlineDuration
} from '../utils/formatters.js';

let unsubscribeAdmins = null;
let unsubscribeUsers = null;
let currentAdminsMap = {};
let allAdminUsers = [];
let openActionMenuUid = null;

let adminCurrentPage = 1;
const adminItemsPerPage = 10;
let adminSortCol = 'login';
let adminSortOrder = 'desc';
let adminFilterValue = 'all';
let adminFilterLabel = 'Tất cả';

/**
 * Open administrator user management modal dialog.
 */
export function openAdminModal() {
    const isScadaAdmin = getState('isScadaAdmin');
    if (!isScadaAdmin && typeof window !== 'undefined' && !window.isScadaAdmin) {
        showToast("Bạn không có quyền truy cập vào Bảng Quản Trị!", "error");
        return;
    }

    const modal = document.getElementById("modal-admin");
    if (!modal) return;
    modal.classList.remove("hidden");

    // Close user dropdown if open
    const userDropdown = document.getElementById("user-dropdown");
    if (userDropdown) userDropdown.classList.add("hidden");

    // Clean up previous listeners
    if (typeof unsubscribeAdmins === "function") unsubscribeAdmins();
    if (typeof unsubscribeUsers === "function") unsubscribeUsers();

    // 1. Listen to admins map
    const adminsRef = ref(db, "admins");
    unsubscribeAdmins = onValue(adminsRef, (snapshot) => {
        currentAdminsMap = snapshot.val() || {};

        // 2. Listen to web_users map
        const usersRef = ref(db, "web_users");
        unsubscribeUsers = onValue(usersRef, (snap) => {
            const data = snap.val();
            if (data) {
                const usersArray = Object.keys(data).map(uid => {
                    const user = data[uid] || {};
                    return {
                        uid: uid,
                        email: user.email || "",
                        displayName: user.displayName || user.name || "Khách",
                        photoURL: user.photoURL || "",
                        lastLogin: user.lastLogin || user.last_login || null,
                        presence: user.presence || null,
                        isAdmin: currentAdminsMap[uid] === true,
                        isBlocked: user.isBlocked === true || user.isBlocked === "true"
                    };
                });

                // Default Sort: Admins first, then Online users, then latest login
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
                renderAdminUsersTable();
            } else {
                allAdminUsers = [];
                renderAdminUsersTable();
            }
        });
    });

    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}

/**
 * Close administrator user management modal and unsubscribe RTDB listeners.
 */
export function closeAdminModal() {
    closeModal('modal-admin');
    openActionMenuUid = null;

    if (typeof unsubscribeAdmins === "function") {
        unsubscribeAdmins();
        unsubscribeAdmins = null;
    }
    if (typeof unsubscribeUsers === "function") {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }
}

/**
 * Filter admin user directory and re-render table.
 * @param {string} val - 'all' | 'admin' | 'user' | 'online' | 'offline' | 'blocked'
 * @param {string} label - Display label
 */
export function setAdminFilter(val, label) {
    adminFilterValue = val;
    adminFilterLabel = label;
    const labelEl = document.getElementById('admin-filter-label');
    if (labelEl) labelEl.innerText = label;

    const menu = document.getElementById('admin-filter-menu');
    if (menu) menu.classList.add('hidden');

    adminCurrentPage = 1;
    renderAdminUsersTable();
}

/**
 * Toggle admin status filter dropdown menu.
 * @param {Event} [e]
 */
export function toggleAdminFilterMenu(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const menu = document.getElementById('admin-filter-menu');
    if (menu) menu.classList.toggle('hidden');
}

/**
 * Set active sort column for the admin user table.
 * @param {'name'|'role'|'login'} col
 */
export function setAdminSort(col) {
    if (adminSortCol === col) {
        adminSortOrder = adminSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        adminSortCol = col;
        adminSortOrder = (col === 'name') ? 'asc' : 'desc';
    }
    renderAdminUsersTable();
}

/**
 * Change page in admin users directory.
 * @param {number} page
 */
export function changeAdminPage(page) {
    adminCurrentPage = page;
    renderAdminUsersTable();
}

/**
 * Export complete admin user directory to CSV with UTF-8 BOM.
 */
export function exportAdminUsersCSV() {
    if (!allAdminUsers || allAdminUsers.length === 0) {
        showToast("Không có dữ liệu để xuất!", "error");
        return;
    }

    let csv = "UID,Tài Khoản,Email,Vai Trò,Trạng Thái,Online,Đăng Nhập Cuối\n";
    allAdminUsers.forEach(u => {
        const uid = u.uid || "";
        const name = (u.displayName || "Khách").replace(/,/g, " ");
        const email = (u.email || "").replace(/,/g, " ");
        const role = u.isAdmin ? "Admin" : "User";
        const status = u.isBlocked ? "Khóa" : "Bình thường";
        const online = (u.presence?.state === 'online') ? "Online" : "Offline";

        let dateVal = u.lastLogin;
        if (!dateVal && u.presence && u.presence.last_changed) dateVal = u.presence.last_changed;
        const dateObj = dateVal ? new Date(dateVal) : null;
        const loginTime = (dateObj && !isNaN(dateObj.getTime())) ? dateObj.toLocaleString("vi-VN") : "Chưa có";

        csv += `${uid},${name},${email},${role},${status},${online},${loginTime}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_Sach_Nguoi_Dung_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Đã tải danh sách người dùng CSV!", "success");
}

/**
 * Master Admin Users Table Renderer.
 */
export function renderAdminUsersTable() {
    const tbody = document.getElementById("admin-users-list");
    if (!tbody) return;

    // Hide floating action menu
    const floatingMenu = document.getElementById("admin-floating-action-menu");
    if (floatingMenu) floatingMenu.classList.add("hidden");

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

    const clearBtn = document.getElementById("admin-user-search-clear");
    if (clearBtn) {
        if (rawQuery.length > 0) clearBtn.classList.remove("hidden");
        else clearBtn.classList.add("hidden");
    }

    // 1. FILTERING
    let filteredUsers = allAdminUsers.filter(user => {
        if (adminFilterValue === "admin" && !user.isAdmin) return false;
        if (adminFilterValue === "user" && user.isAdmin) return false;
        if (adminFilterValue === "online" && user.presence?.state !== 'online') return false;
        if (adminFilterValue === "offline" && user.presence?.state === 'online') return false;
        if (adminFilterValue === "blocked" && !user.isBlocked) return false;

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

    // 2. SORTING
    filteredUsers.sort((a, b) => {
        let valA, valB;
        if (adminSortCol === 'name') {
            valA = (a.displayName || "").toLowerCase();
            valB = (b.displayName || "").toLowerCase();
        } else if (adminSortCol === 'role') {
            valA = a.isAdmin ? 1 : 0;
            valB = b.isAdmin ? 1 : 0;
        } else { // 'login'
            let dateA = a.lastLogin;
            if (!dateA && a.presence && a.presence.last_changed) dateA = a.presence.last_changed;
            let dateB = b.lastLogin;
            if (!dateB && b.presence && b.presence.last_changed) dateB = b.presence.last_changed;
            valA = getTime(dateA);
            valB = getTime(dateB);
        }

        if (valA < valB) return adminSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return adminSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    if (filteredUsers.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center py-6 text-slate-400 font-medium'>Không tìm thấy người dùng phù hợp bộ lọc.</td></tr>";
        const pCont = document.getElementById("admin-pagination-container");
        if (pCont) pCont.classList.add('hidden');
        return;
    }

    // 3. PAGINATION SLICING
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / adminItemsPerPage) || 1;
    if (adminCurrentPage > totalPages) adminCurrentPage = totalPages;
    if (adminCurrentPage < 1) adminCurrentPage = 1;

    const startIndex = (adminCurrentPage - 1) * adminItemsPerPage;
    const endIndex = Math.min(startIndex + adminItemsPerPage, totalItems);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const currentAuthUser = auth ? auth.currentUser : null;
    const currentUid = currentAuthUser ? currentAuthUser.uid : null;

    tbody.innerHTML = "";

    paginatedUsers.forEach(user => {
        let dateVal = user.lastLogin;
        const isOnline = user.presence?.state === 'online';

        let loginTimeRel = "Chưa có";
        let loginTimeFull = "";

        if (isOnline) {
            const duration = user.presence && user.presence.last_changed ? onlineDuration(user.presence.last_changed) : "vừa xong";
            loginTimeRel = `Đang xem (${duration})`;
            if (user.lastLogin) {
                loginTimeFull = `Đăng nhập lúc: ${new Date(user.lastLogin).toLocaleString("vi-VN")}`;
            }
        } else {
            if (user.presence && user.presence.last_changed) {
                dateVal = user.presence.last_changed;
            }
            const dateObj = dateVal ? new Date(dateVal) : null;
            if (dateObj && !isNaN(dateObj.getTime())) {
                loginTimeFull = `Thoát lúc: ${dateObj.toLocaleString("vi-VN")}`;
                loginTimeRel = `Đã thoát ${timeAgo(dateVal)}`;
            }
        }

        const roleBadge = user.isAdmin
            ? '<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">Admin 👑</span>'
            : '<span class="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">Khách</span>';

        const statusBadge = user.isBlocked
            ? '<span class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300 ml-2">Bị Khóa</span>'
            : '';

        const presenceBadge = isOnline
            ? '<span class="flex items-center gap-1 text-green-500 text-xs mt-1 font-medium"><div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>Online</span>'
            : '<span class="flex items-center gap-1 text-gray-400 text-xs mt-1 font-medium"><div class="w-2 h-2 bg-gray-400 rounded-full"></div>Offline</span>';

        const safeDisplayName = escapeHtml(user.displayName || "Khách");
        const safeEmail = escapeHtml(user.email || user.uid || "");
        const jsUid = escapeJs(user.uid || "");

        const isSelf = (currentUid && user.uid === currentUid);

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60";
        if (user.isBlocked) tr.classList.add("opacity-50");

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
                <div class="text-slate-700 dark:text-slate-300 font-bold" title="${loginTimeFull}">${loginTimeRel}</div>
                ${presenceBadge}
            </td>
            <td class="px-6 py-4 text-center">
                <button onclick="toggleActionMenu('${jsUid}', '${escapeJs(user.displayName || 'Khách')}', ${user.isAdmin}, ${user.isBlocked}, ${isSelf}, event)" class="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <i data-lucide="more-vertical" class="w-5 h-5"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 4. RENDER PAGINATION FOOTER
    const pCont = document.getElementById("admin-pagination-container");
    if (pCont) {
        pCont.classList.remove('hidden');
        const pInfo = document.getElementById("admin-page-info");
        if (pInfo) pInfo.innerText = `Hiển thị ${startIndex + 1} - ${endIndex} / ${totalItems}`;

        const pBtns = document.getElementById("admin-page-buttons");
        if (pBtns) {
            let html = "";
            // Prev button
            html += `<button onclick="changeAdminPage(${adminCurrentPage - 1})" class="p-1 rounded-lg ${adminCurrentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>`;

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === adminCurrentPage) {
                    html += `<button class="w-7 h-7 rounded-lg bg-blue-500 text-white font-bold text-xs shadow-md">${i}</button>`;
                } else if (i === 1 || i === totalPages || (i >= adminCurrentPage - 1 && i <= adminCurrentPage + 1)) {
                    html += `<button onclick="changeAdminPage(${i})" class="w-7 h-7 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs">${i}</button>`;
                } else if (i === adminCurrentPage - 2 || i === adminCurrentPage + 2) {
                    html += `<span class="text-slate-400 text-xs px-1">...</span>`;
                }
            }

            // Next button
            html += `<button onclick="changeAdminPage(${adminCurrentPage + 1})" class="p-1 rounded-lg ${adminCurrentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>`;

            pBtns.innerHTML = html;
        }
    }

    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons({ root: tbody });
    }
}

/**
 * Toggle floating Action Context Menu for a selected user row.
 * @param {string} uid
 * @param {string} name
 * @param {boolean} isAdmin
 * @param {boolean} isBlocked
 * @param {boolean} isSelf
 * @param {Event} e
 */
export function toggleActionMenu(uid, name, isAdmin, isBlocked, isSelf, e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    const floatingMenu = document.getElementById("admin-floating-action-menu");
    if (!floatingMenu) return;

    if (openActionMenuUid === uid && !floatingMenu.classList.contains("hidden")) {
        floatingMenu.classList.add("hidden");
        openActionMenuUid = null;
        return;
    }

    openActionMenuUid = uid;

    // Render menu content based on user state
    let html = `
        <div class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
            <p class="text-[10px] font-black text-slate-400 uppercase truncate">${escapeHtml(name)}</p>
        </div>
        <div class="py-1">
    `;

    if (isAdmin) {
        if (isSelf) {
            html += `<button disabled class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-400 flex items-center gap-2 cursor-not-allowed opacity-70"><i data-lucide="shield" class="w-4 h-4"></i> Quản trị viên (Hiện tại)</button>`;
        } else {
            html += `<button onclick="toggleAdmin('${uid}', false)" class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"><i data-lucide="shield-off" class="w-4 h-4 text-orange-500"></i> Hủy Quyền Admin</button>`;
        }
    } else {
        html += `<button onclick="toggleAdmin('${uid}', true)" class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4 text-blue-600"></i> Cấp Quyền Admin</button>`;
    }

    html += `<div class="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>`;

    if (isBlocked) {
        html += `<button onclick="toggleBlock('${uid}', false)" class="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2"><i data-lucide="unlock" class="w-4 h-4 text-emerald-500"></i> Mở Khóa Tài Khoản</button>`;
    } else {
        if (isSelf) {
            html += `<button disabled class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-400 flex items-center gap-2 cursor-not-allowed opacity-70"><i data-lucide="lock" class="w-4 h-4"></i> Khóa Tài Khoản (Không khả dụng)</button>`;
        } else {
            html += `<button onclick="toggleBlock('${uid}', true)" class="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"><i data-lucide="lock" class="w-4 h-4 text-amber-500"></i> Khóa Tài Khoản</button>`;
        }
    }

    html += `<div class="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>`;

    if (isSelf) {
        html += `<button disabled class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-400 flex items-center gap-2 cursor-not-allowed opacity-70"><i data-lucide="trash-2" class="w-4 h-4"></i> Xóa Bản Ghi (Không khả dụng)</button>`;
    } else {
        html += `<button onclick="deleteUserRecord('${uid}')" class="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"><i data-lucide="trash-2" class="w-4 h-4 text-rose-500"></i> Xóa Bản Ghi</button>`;
    }

    html += `</div>`;
    floatingMenu.innerHTML = html;

    // Position floating action menu near clicked button
    if (e && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        floatingMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        let leftPos = rect.right - 200;
        if (leftPos < 10) leftPos = 10;
        floatingMenu.style.left = `${leftPos}px`;
    }

    floatingMenu.classList.remove("hidden");
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons({ root: floatingMenu });
    }
}

/**
 * Grant or revoke administrator privileges for a user.
 * @param {string} uid
 * @param {boolean} makeAdmin
 */
export async function toggleAdmin(uid, makeAdmin) {
    const floatingMenu = document.getElementById("admin-floating-action-menu");
    if (floatingMenu) floatingMenu.classList.add("hidden");
    openActionMenuUid = null;

    const currentAuthUser = auth ? auth.currentUser : null;
    if (currentAuthUser && currentAuthUser.uid === uid && !makeAdmin) {
        showToast("Bạn không thể tự hủy quyền Admin của chính mình!", "error");
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn ${makeAdmin ? "Cấp quyền Admin cho" : "Hủy quyền Admin của"} người này?`)) return;

    try {
        await set(ref(db, `admins/${uid}`), makeAdmin);
        showToast("Cập nhật quyền Admin thành công!", "success");
    } catch (e) {
        console.error("[Admin] Error updating admin privilege:", e);
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

/**
 * Lock or unlock user account in realtime.
 * @param {string} uid
 * @param {boolean} isBlocked
 */
export async function toggleBlock(uid, isBlocked) {
    const floatingMenu = document.getElementById("admin-floating-action-menu");
    if (floatingMenu) floatingMenu.classList.add("hidden");
    openActionMenuUid = null;

    const currentAuthUser = auth ? auth.currentUser : null;
    if (currentAuthUser && currentAuthUser.uid === uid && isBlocked) {
        showToast("Bạn không thể tự khóa tài khoản của chính mình!", "error");
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn ${isBlocked ? "Khóa" : "Mở Khóa"} tài khoản này?`)) return;

    try {
        await set(ref(db, `web_users/${uid}/isBlocked`), isBlocked);
        showToast(isBlocked ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản!", "success");
    } catch (e) {
        console.error("[Admin] Error updating block state:", e);
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

/**
 * Delete user profile metadata record from Firebase RTDB.
 * @param {string} uid
 */
export async function deleteUserRecord(uid) {
    const floatingMenu = document.getElementById("admin-floating-action-menu");
    if (floatingMenu) floatingMenu.classList.add("hidden");
    openActionMenuUid = null;

    const currentAuthUser = auth ? auth.currentUser : null;
    if (currentAuthUser && currentAuthUser.uid === uid) {
        showToast("Bạn không thể tự xóa tài khoản của chính mình!", "error");
        return;
    }

    if (!confirm("XÓA TÀI KHOẢN NÀY KHỎI DANH SÁCH?\n\nLưu ý: Thao tác này chỉ xóa dữ liệu hiển thị trên Web. Nếu bạn chưa xóa họ bên Firebase Authentication, họ vẫn có thể đăng nhập lại.")) return;

    try {
        await remove(ref(db, `web_users/${uid}`));
        showToast("Đã xóa dữ liệu thành công!", "success");
    } catch (e) {
        console.error("[Admin] Error deleting user record:", e);
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

/**
 * Upload profile avatar image to Firebase Storage.
 * @param {Event} event
 */
export async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.', 'error');
        return;
    }

    const currentAuthUser = auth ? auth.currentUser : null;
    if (!currentAuthUser) return;
    const uid = currentAuthUser.uid;

    if (!storage) {
        console.error("[Admin] Firebase Storage not initialized.");
        return;
    }

    try {
        showToast('Đang tải ảnh lên Storage...', 'info');

        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${uid}_${Date.now()}.${fileExt}`;
        const sRef = storageRef(storage, fileName);

        await uploadBytes(sRef, file);
        const downloadURL = await getDownloadURL(sRef);

        const urlInput = document.getElementById('profile-avatar-url');
        if (urlInput) urlInput.value = downloadURL;

        const avatarImg = document.getElementById('profile-modal-avatar-img');
        if (avatarImg) avatarImg.src = downloadURL;

        showToast('Tải ảnh lên thành công! Bấm Lưu Thay Đổi để xác nhận.', 'success');
    } catch (error) {
        console.error("[Admin] Upload avatar error:", error);
        showToast(`Lỗi khi tải ảnh: ${error.message}`, 'error');
    }
}

// Global outside click listener to close floating action menu
if (typeof document !== 'undefined') {
    document.addEventListener("click", function (e) {
        const floatingMenu = document.getElementById("admin-floating-action-menu");
        if (floatingMenu && !floatingMenu.classList.contains("hidden")) {
            if (!e.target.closest('#admin-floating-action-menu') && !e.target.closest('button[onclick*="toggleActionMenu"]')) {
                floatingMenu.classList.add("hidden");
                openActionMenuUid = null;
            }
        }
    });
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;
    window.renderAdminUsersTable = renderAdminUsersTable;
    window.setAdminFilter = setAdminFilter;
    window.toggleAdminFilterMenu = toggleAdminFilterMenu;
    window.setAdminSort = setAdminSort;
    window.changeAdminPage = changeAdminPage;
    window.exportAdminUsersCSV = exportAdminUsersCSV;
    window.toggleActionMenu = toggleActionMenu;
    window.toggleAdmin = toggleAdmin;
    window.toggleBlock = toggleBlock;
    window.deleteUserRecord = deleteUserRecord;
    window.uploadAvatar = uploadAvatar;
}

export default {
    openAdminModal,
    closeAdminModal,
    renderAdminUsersTable,
    setAdminFilter,
    toggleAdminFilterMenu,
    setAdminSort,
    changeAdminPage,
    exportAdminUsersCSV,
    toggleActionMenu,
    toggleAdmin,
    toggleBlock,
    deleteUserRecord,
    uploadAvatar
};
