/**
 * @file auth.js
 * @description Authentication observer, role check, presence tracking, account lock detection,
 *              multi-account switcher, user profile modal, and session lifecycle management.
 * @module modules/auth
 */

import {
    auth,
    db,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL,
    onAuthStateChanged,
    signOut,
    updateProfile,
    updatePassword,
    ref,
    set,
    update,
    get,
    child,
    onValue,
    serverTimestamp,
    onDisconnect
} from '../config/firebase-config.js';

import {
    getState,
    updateState
} from '../core/state.js';

import {
    showToast,
    openModal,
    closeModal
} from '../utils/ui-utils.js';

import {
    timeAgo,
    onlineDuration,
    escapeHtml,
    escapeJs
} from '../utils/formatters.js';

import {
    logLoginSession
} from '../services/gas-telegram-service.js';

import { STORAGE_KEYS } from '../config/app-constants.js';

/**
 * Handle for Firebase presence connection listener unsubscribe
 */
let presenceConnectedUnsubscribe = null;
let blockedStatusUnsubscribe = null;
let adminRoleUnsubscribe = null;

/**
 * Set control button access permissions based on role.
 * @param {boolean} allow - True for Admin, false for Viewer/Guest
 */
export function setControlAccess(allow) {
    const isAllowed = !!allow;
    updateState('isScadaAdmin', isAllowed);
    if (typeof window !== 'undefined') {
        window.isScadaAdmin = isAllowed;
    }

    const controlElements = document.querySelectorAll('.scada-control-btn');
    controlElements.forEach(el => {
        if (isAllowed) {
            el.disabled = false;
            el.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        } else {
            el.disabled = true;
            el.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    });
}

/**
 * Apply gold ring and glowing border styles for administrator avatars.
 * @param {boolean} isAdmin
 */
export function updateAdminAvatarStyle(isAdmin) {
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
}

/**
 * Update active user account list stored in localStorage for multi-account switching.
 * @param {Object} userData - { uid, email, displayName, photoURL, lastLogin }
 */
export function updateSavedAccounts(userData) {
    try {
        let accounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS) || "[]");
        accounts = accounts.filter(acc => acc.uid !== userData.uid);
        accounts.unshift(userData);
        if (accounts.length > 5) accounts = accounts.slice(0, 5); // Keep up to 5 accounts
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
        console.error("[Auth] Error updating saved accounts in localStorage:", e);
    }
}

/**
 * Toggle the multi-account switcher popover dialog.
 * @param {boolean} [show]
 */
export function togglePopoverSwitchAccount(show) {
    const popover = document.getElementById('popover-switch-account');
    if (!popover) return;

    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
        userDropdown.classList.add('hidden');
    }

    const isHidden = popover.classList.contains('hidden');
    const shouldShow = (typeof show === 'boolean') ? show : isHidden;

    if (shouldShow) {
        populateSwitchAccountPopover();
        popover.classList.remove('hidden');
    } else {
        popover.classList.add('hidden');
    }
}

/**
 * Populate user accounts list in the multi-account popover.
 */
export function populateSwitchAccountPopover() {
    const container = document.getElementById('switch-account-list');
    if (!container) return;
    container.innerHTML = '';

    const currentUser = auth.currentUser;
    const currentUid = currentUser ? currentUser.uid : null;

    let accounts = [];
    try {
        accounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS) || "[]");
    } catch (e) {
        accounts = [];
    }

    if (accounts.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Chưa có tài khoản nào khác được lưu trên trình duyệt này.</p>`;
        return;
    }

    accounts.forEach(acc => {
        const isCurrent = acc.uid === currentUid;
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-2 rounded-xl transition-all ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'}`;

        const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(acc.displayName || 'User') + '&background=0D8ABC&color=fff';
        const photo = acc.photoURL || defaultAvatar;

        item.innerHTML = `
            <div class="flex items-center gap-2.5 overflow-hidden">
                <img src="${photo}" class="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" onerror="this.src='${defaultAvatar}'">
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(acc.displayName || 'Người dùng')}</p>
                    <p class="text-[10px] text-slate-400 truncate">${escapeHtml(acc.email || '')}</p>
                </div>
            </div>
            ${isCurrent ? '<span class="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">Đang dùng</span>' : `<button onclick="selectAccountToSwitch('${escapeJs(acc.uid)}', '${escapeJs(acc.email || '')}')" class="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">Chọn</button>`}
        `;

        if (!isCurrent) {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    selectAccountToSwitch(acc.uid, acc.email || '');
                }
            });
        }

        container.appendChild(item);
    });
}

/**
 * Open multi-account switcher dialog.
 */
export function openSwitchAccountModal() {
    togglePopoverSwitchAccount(true);
}

/**
 * Select a saved profile to sign in with.
 * @param {string} targetUid
 * @param {string} targetEmail
 */
export function selectAccountToSwitch(targetUid, targetEmail) {
    togglePopoverSwitchAccount(false);
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === targetUid) {
        showToast("Bạn đang sử dụng tài khoản này!", "info");
        return;
    }

    togglePopoverSwitchAccount(false);
    if (typeof presenceConnectedUnsubscribe === 'function') {
        presenceConnectedUnsubscribe();
        presenceConnectedUnsubscribe = null;
    }

    // Save target email for preset login filling
    if (targetEmail) {
        localStorage.setItem(STORAGE_KEYS.PRESET_LOGIN_EMAIL, targetEmail);
    }

    signOut(auth).then(() => {
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        window.location.href = 'login.html';
    }).catch(err => {
        console.error("[Auth] Sign out error during account switch:", err);
        window.location.href = 'login.html';
    });
}

/**
 * Add another account by signing out and navigating to the login portal.
 */
export function addNewAccount() {
    togglePopoverSwitchAccount(false);
    if (typeof presenceConnectedUnsubscribe === 'function') {
        presenceConnectedUnsubscribe();
        presenceConnectedUnsubscribe = null;
    }

    localStorage.removeItem(STORAGE_KEYS.PRESET_LOGIN_EMAIL);
    signOut(auth).then(() => {
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        window.location.href = 'login.html';
    }).catch(err => {
        console.error("[Auth] Sign out error adding new account:", err);
        window.location.href = 'login.html';
    });
}

/**
 * Open the user profile management modal dialog.
 */
export function openProfileModal() {
    const modal = document.getElementById('modal-profile');
    if (!modal) return;

    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.add('hidden');

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const nameInput = document.getElementById('profile-name-input');
    const emailDisplay = document.getElementById('profile-email-display');
    const roleDisplay = document.getElementById('profile-role-display');
    const avatarImg = document.getElementById('profile-modal-avatar-img');
    const newPassInput = document.getElementById('profile-new-password');
    const confirmPassInput = document.getElementById('profile-confirm-password');

    if (nameInput) nameInput.value = currentUser.displayName || '';
    if (emailDisplay) emailDisplay.innerText = currentUser.email || 'Khách ẩn danh';
    
    const isScadaAdmin = getState('isScadaAdmin');
    if (roleDisplay) {
        roleDisplay.innerHTML = isScadaAdmin
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">👑 Quản Trị Viên (Admin)</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">👤 Người Xem (Viewer)</span>`;
    }

    const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.displayName || 'User') + '&background=0D8ABC&color=fff';
    if (avatarImg) {
        avatarImg.src = currentUser.photoURL || defaultAvatar;
    }

    if (newPassInput) newPassInput.value = '';
    if (confirmPassInput) confirmPassInput.value = '';

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

/**
 * Close the user profile management modal.
 */
export function closeProfileModal() {
    closeModal('modal-profile');
}

/**
 * Update modal avatar display element.
 * @param {string} photoURL
 * @param {string} displayName
 */
export function updateModalAvatarDisplay(photoURL, displayName) {
    const avatarImg = document.getElementById('profile-modal-avatar-img');
    const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName || 'User') + '&background=0D8ABC&color=fff';
    if (avatarImg) {
        avatarImg.src = photoURL || defaultAvatar;
    }
}

/**
 * Handle profile avatar file selection & upload.
 * @param {Event} event
 */
export function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const avatarImg = document.getElementById('profile-modal-avatar-img');
        if (avatarImg) {
            avatarImg.src = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Prompt user to input an avatar image URL directly.
 */
export function promptAvatarLink() {
    const currentUrl = document.getElementById('profile-modal-avatar-img')?.src || '';
    const newUrl = prompt("Nhập đường dẫn (URL) ảnh đại diện mới:", currentUrl.startsWith('data:') ? '' : currentUrl);
    if (newUrl && newUrl.trim() !== '') {
        const avatarImg = document.getElementById('profile-modal-avatar-img');
        if (avatarImg) {
            avatarImg.src = newUrl.trim();
        }
    }
}

/**
 * Save updated profile changes (display name, avatar, password) to Firebase.
 */
export async function saveProfileChanges() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const nameInput = document.getElementById('profile-name-input');
    const avatarImg = document.getElementById('profile-modal-avatar-img');
    const newPassInput = document.getElementById('profile-new-password');
    const confirmPassInput = document.getElementById('profile-confirm-password');

    const newName = nameInput ? nameInput.value.trim() : '';
    let newPhoto = avatarImg ? avatarImg.src : '';
    const newPass = newPassInput ? newPassInput.value : '';
    const confirmPass = confirmPassInput ? confirmPassInput.value : '';

    if (!newName) {
        showToast('Tên hiển thị không được để trống!', 'error');
        return;
    }

    const btnSave = document.getElementById('btn-save-profile');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang lưu...`;
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') lucide.createIcons();
    }

    try {
        // Check if avatar is a local data URI or file upload to Firebase Storage
        const fileInput = document.getElementById('profile-avatar-file-input');
        if (fileInput && fileInput.files && fileInput.files[0] && storage) {
            try {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `avatars/${currentUser.uid}_${Date.now()}.${fileExt}`;
                const sRef = storageRef(storage, fileName);
                await uploadBytes(sRef, file);
                newPhoto = await getDownloadURL(sRef);
            } catch (storageErr) {
                console.warn("[Auth] Storage upload failed, falling back to URL/DataURI:", storageErr);
            }
        }

        // 1. Update Firebase Auth Profile
        await updateProfile(currentUser, {
            displayName: newName,
            photoURL: newPhoto
        });

        // 2. Update Realtime Database Profile
        await update(ref(db, `web_users/${currentUser.uid}`), {
            displayName: newName,
            photoURL: newPhoto,
            lastUpdated: serverTimestamp()
        });

        // 3. Update UI Avatar and Name elements across DOM
        document.querySelectorAll('#user-name-display, #dropdown-user-name, #drawer-user-name').forEach(el => {
            el.innerText = newName;
        });

        document.querySelectorAll('#user-avatar-img, #dropdown-avatar-img, #drawer-avatar-img').forEach(el => {
            el.src = newPhoto;
        });

        // 4. Update Saved Accounts in LocalStorage
        updateSavedAccounts({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: newName,
            photoURL: newPhoto,
            lastLogin: Date.now()
        });

        // 5. Update Password if provided
        if (newPass) {
            if (newPass !== confirmPass) {
                showToast('Mật khẩu xác nhận không khớp!', 'error');
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerHTML = `Lưu Thay Đổi`;
                }
                return;
            }
            if (newPass.length < 6) {
                showToast('Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerHTML = `Lưu Thay Đổi`;
                }
                return;
            }

            try {
                await updatePassword(currentUser, newPass);
                showToast('Đã đổi mật khẩu thành công!', 'success');
            } catch (passErr) {
                if (passErr.code === 'auth/requires-recent-login') {
                    showToast('Phiên đăng nhập quá cũ để đổi mật khẩu. Vui lòng đăng nhập lại!', 'error');
                } else {
                    showToast(`Lỗi đổi mật khẩu: ${passErr.message}`, 'error');
                }
            }
        }

        showToast('Đã cập nhật thông tin cá nhân!', 'success');
        closeProfileModal();
    } catch (err) {
        console.error("[Auth] Error saving profile:", err);
        showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = `Lưu Thay Đổi`;
        }
    }
}

/**
 * Perform logout and clean up presence and sessions.
 */
export async function logout() {
    const currentUser = auth.currentUser;
    const email = currentUser ? currentUser.email : "N/A";
    const name = currentUser ? (currentUser.displayName || "Người dùng") : "Người dùng";
    const uid = currentUser ? currentUser.uid : "N/A";
    const isScadaAdmin = getState('isScadaAdmin');

    if (typeof presenceConnectedUnsubscribe === 'function') {
        presenceConnectedUnsubscribe();
        presenceConnectedUnsubscribe = null;
    }
    if (typeof blockedStatusUnsubscribe === 'function') {
        blockedStatusUnsubscribe();
        blockedStatusUnsubscribe = null;
    }
    if (typeof adminRoleUnsubscribe === 'function') {
        adminRoleUnsubscribe();
        adminRoleUnsubscribe = null;
    }

    try {
        if (currentUser) {
            // Set offline in database
            await set(ref(db, `web_users/${currentUser.uid}/presence`), {
                state: 'offline',
                last_changed: serverTimestamp()
            });
        }

        // Log session to Google Sheets
        await logLoginSession(
            "Đăng xuất",
            "Người dùng chủ động đăng xuất khỏi hệ thống",
            "Email/Google",
            isScadaAdmin ? "Admin" : "User",
            name,
            email,
            uid
        );

        await signOut(auth);
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        window.location.href = 'login.html';
    } catch (err) {
        console.error("[Auth] Logout error:", err);
        window.location.href = 'login.html';
    }
}

/**
 * Initialize Authentication Observer and Presence System.
 */
export function initAuth() {
    console.log('[Auth Module] Initializing Firebase Auth Observer...');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log(`[Auth] User authenticated: ${user.email} (${user.uid})`);
            localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');

            // Clean up previous listeners if user changed
            if (typeof presenceConnectedUnsubscribe === 'function') {
                presenceConnectedUnsubscribe();
                presenceConnectedUnsubscribe = null;
            }
            if (typeof blockedStatusUnsubscribe === 'function') {
                blockedStatusUnsubscribe();
                blockedStatusUnsubscribe = null;
            }
            if (typeof adminRoleUnsubscribe === 'function') {
                adminRoleUnsubscribe();
                adminRoleUnsubscribe = null;
            }

            // 1. SETUP PRESENCE TRACKING
            const myConnectionsRef = ref(db, `web_users/${user.uid}/presence`);
            const connectedRef = ref(db, '.info/connected');

            presenceConnectedUnsubscribe = onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    const con = onDisconnect(myConnectionsRef);
                    con.set({
                        state: 'offline',
                        last_changed: serverTimestamp()
                    }).then(() => {
                        set(myConnectionsRef, {
                            state: 'online',
                            last_changed: serverTimestamp()
                        });
                    });
                }
            });

            // 2. CHECK ACCOUNT LOCK DETECTION (Realtime)
            const blockedRef = ref(db, `web_users/${user.uid}/isBlocked`);
            blockedStatusUnsubscribe = onValue(blockedRef, (snapshot) => {
                const isBlocked = snapshot.val();
                if (isBlocked === true || isBlocked === 'true') {
                    alert("⚠️ TÀI KHOẢN ĐÃ BỊ KHÓA!\n\nQuản trị viên đã khóa tài khoản của bạn. Bạn sẽ được chuyển hướng ra trang đăng nhập.");
                    if (typeof presenceConnectedUnsubscribe === 'function') {
                        presenceConnectedUnsubscribe();
                        presenceConnectedUnsubscribe = null;
                    }
                    signOut(auth).then(() => {
                        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
                        window.location.href = 'login.html';
                    });
                }
            });

            // 3. CHECK ROLE (admins/${uid})
            const adminRef = ref(db, `admins/${user.uid}`);
            adminRoleUnsubscribe = onValue(adminRef, (snapshot) => {
                const isAdmin = snapshot.val() === true;
                setControlAccess(isAdmin);
                updateAdminAvatarStyle(isAdmin);

                // Update Admin menu visibility in Desktop & Mobile headers
                const adminMenuItems = document.querySelectorAll('.admin-only-item, #btn-open-admin-modal, #drawer-btn-admin');
                adminMenuItems.forEach(item => {
                    if (isAdmin) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });

                // Update user role badge
                const roleBadges = document.querySelectorAll('#user-role-badge, #drawer-user-role');
                roleBadges.forEach(badge => {
                    badge.innerText = isAdmin ? '👑 Admin' : '👤 Viewer';
                    badge.className = isAdmin
                        ? 'text-[10px] font-extrabold text-amber-500 dark:text-amber-400'
                        : 'text-[10px] font-extrabold text-slate-400';
                });
            });

            // 4. SYNC USER PROFILE TO RTDB & DOM
            const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=0D8ABC&color=fff';
            const userPhoto = user.photoURL || defaultAvatar;
            const userName = user.displayName || user.email || 'Người dùng';

            document.querySelectorAll('#user-name-display, #dropdown-user-name, #drawer-user-name').forEach(el => {
                el.innerText = userName;
            });
            document.querySelectorAll('#user-email-display, #dropdown-user-email, #drawer-user-email').forEach(el => {
                el.innerText = user.email || 'Khách ẩn danh';
            });
            document.querySelectorAll('#user-avatar-img, #dropdown-avatar-img, #drawer-avatar-img').forEach(el => {
                el.src = userPhoto;
            });

            // Sync user to web_users node in Firebase
            update(ref(db, `web_users/${user.uid}`), {
                uid: user.uid,
                email: user.email || 'guest@scada.local',
                displayName: userName,
                photoURL: userPhoto,
                lastLogin: serverTimestamp(),
                loginType: user.isAnonymous ? 'guest' : (user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'password')
            }).catch(e => console.warn("[Auth] web_users sync error:", e));

            // Save to multi-account list
            updateSavedAccounts({
                uid: user.uid,
                email: user.email || '',
                displayName: userName,
                photoURL: userPhoto,
                lastLogin: Date.now()
            });

        } else {
            console.log('[Auth] No active user session. Redirecting to login.html...');
            localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
            setControlAccess(false);
            updateAdminAvatarStyle(false);
            window.location.href = 'login.html';
        }
    });
}

// Public Window Bridge for backward compatibility with inline HTML onclick handlers
if (typeof window !== 'undefined') {
    window.setControlAccess = setControlAccess;
    window.updateAdminAvatarStyle = updateAdminAvatarStyle;
    window.togglePopoverSwitchAccount = togglePopoverSwitchAccount;
    window.populateSwitchAccountPopover = populateSwitchAccountPopover;
    window.openSwitchAccountModal = openSwitchAccountModal;
    window.selectAccountToSwitch = selectAccountToSwitch;
    window.addNewAccount = addNewAccount;
    window.switchAccount = openSwitchAccountModal;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.updateModalAvatarDisplay = updateModalAvatarDisplay;
    window.handleAvatarUpload = handleAvatarUpload;
    window.promptAvatarLink = promptAvatarLink;
    window.saveProfileChanges = saveProfileChanges;
    window.logout = logout;
    window.initAuth = initAuth;
}

export default {
    initAuth,
    setControlAccess,
    updateAdminAvatarStyle,
    openProfileModal,
    closeProfileModal,
    saveProfileChanges,
    openSwitchAccountModal,
    togglePopoverSwitchAccount,
    selectAccountToSwitch,
    addNewAccount,
    logout
};
