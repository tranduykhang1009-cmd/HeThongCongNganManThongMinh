/**
 * @file ui-utils.js
 * @description UI interaction helpers, toast notifications, modals, dropdowns, and theme toggling.
 * @module utils/ui-utils
 */

import { STORAGE_KEYS, TIMING } from '../config/app-constants.js';

let toolsMenuTimeout = null;

/**
 * Display a toast notification popup.
 * @param {string} message - Notification text
 * @param {'success'|'error'|'info'|'warning'} [type='success'] - Notification style type
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Clear previous toasts to avoid notification stacking
    container.innerHTML = '';

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isInfo = type === 'info';

    let iconName = 'check-circle-2';
    let borderClass = 'border-emerald-500/30';
    let textClass = 'text-emerald-400';

    if (type === 'error') {
        iconName = 'alert-triangle';
        borderClass = 'border-rose-500/30';
        textClass = 'text-rose-400';
    } else if (type === 'warning') {
        iconName = 'alert-circle';
        borderClass = 'border-amber-500/30';
        textClass = 'text-amber-400';
    } else if (type === 'info') {
        iconName = 'info';
        borderClass = 'border-blue-500/30';
        textClass = 'text-blue-400';
    }

    toast.className = `pointer-events-auto px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] flex items-center gap-2.5 transform transition-all duration-300 translate-y-4 opacity-0 border border-white/10 bg-slate-900/90 backdrop-blur-md ${textClass} ${borderClass}`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 ${textClass} flex-shrink-0"></i> <span>${message}</span>`;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, TIMING.TOAST_DURATION_MS || 2800);
}

/**
 * Open a modal dialog by removing its 'hidden' class.
 * @param {string} id - Modal element ID
 */
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    }
}

/**
 * Close a modal dialog by adding its 'hidden' class.
 * @param {string} id - Modal element ID
 */
export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Toggle visibility of a dropdown menu while hiding others.
 * @param {string} id - Dropdown element ID
 */
export function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    document.querySelectorAll('#user-dropdown, #system-dropdown').forEach(d => {
        if (d.id !== id) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
}

/**
 * Toggle application light/dark theme and persist preference.
 */
export function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    try {
        localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    } catch (e) {}
}

/**
 * Initialize application theme on startup.
 */
export function initTheme() {
    let isDark = true;
    try {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (savedTheme) {
            isDark = savedTheme === 'dark';
        }
    } catch (e) {}

    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

/**
 * Toggle User Profile menu dropdown.
 * @param {Event} [e]
 */
export function toggleUserMenu(e) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
    }
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Toggle Tools dropdown menu with smooth position computation and animation.
 */
export function toggleToolsMenu() {
    const menu = document.getElementById('tools-menu');
    const overlay = document.getElementById('tools-menu-overlay');
    const btn = document.getElementById('nav-tools');

    if (!menu || !overlay) return;
    if (toolsMenuTimeout) clearTimeout(toolsMenuTimeout);

    if (menu.classList.contains('hidden')) {
        if (btn) {
            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 6) + 'px';
            let leftPos = rect.left + (rect.width / 2) - 112;
            if (leftPos + 230 > window.innerWidth) {
                leftPos = window.innerWidth - 235;
            }
            menu.style.left = Math.max(10, leftPos) + 'px';
            menu.style.right = 'auto';
        }

        menu.classList.remove('hidden');
        overlay.classList.remove('hidden');

        toolsMenuTimeout = setTimeout(() => {
            menu.classList.remove('scale-95', 'opacity-0');
            menu.classList.add('scale-100', 'opacity-100');
        }, 10);
    } else {
        menu.classList.remove('scale-100', 'opacity-100');
        menu.classList.add('scale-95', 'opacity-0');
        toolsMenuTimeout = setTimeout(() => {
            menu.classList.add('hidden');
            overlay.classList.add('hidden');
        }, 150);
    }
}

/**
 * Toggle Mobile Navigation Sidebar Drawer.
 * @param {boolean} open
 */
export function toggleMobileSidebar(open) {
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
}

/**
 * Initialize global outside-click listeners for dropdowns and popovers.
 */
export function initGlobalClickHandlers() {
    window.addEventListener('click', function(e) {
        if (!e.target.closest('#user-dropdown') &&
            !e.target.closest('#system-dropdown') &&
            !e.target.closest('#user-menu-wrapper') &&
            !e.target.closest('button')) {
            document.querySelectorAll('#user-dropdown, #system-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.toggleDropdown = toggleDropdown;
    window.toggleTheme = toggleTheme;
    window.toggleUserMenu = toggleUserMenu;
    window.toggleToolsMenu = toggleToolsMenu;
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.initTheme = initTheme;
}

export default {
    showToast,
    openModal,
    closeModal,
    toggleDropdown,
    toggleTheme,
    initTheme,
    toggleUserMenu,
    toggleToolsMenu,
    toggleMobileSidebar,
    initGlobalClickHandlers
};
