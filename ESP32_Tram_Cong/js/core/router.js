/**
 * @file router.js
 * @description Hash-based client-side SPA routing engine for tab navigation and state preservation.
 * @module core/router
 */

import { ROUTE_MAP, TAB_NAV_MAP } from '../config/app-constants.js';

let currentActiveRoute = '';
let currentActiveTabId = 'tab-monitor';

/**
 * Registry for tab lifecycle hooks
 * Map<string, Set<Function>>
 */
const tabChangeHooks = new Set();

/**
 * Initialize Client-Side URL Routing.
 * Registers hashchange and DOMContentLoaded event listeners.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleRoute);
    } else {
        handleRoute();
    }
}

/**
 * Programmatically navigate to a route by updating the URL hash.
 * @param {string} route - Target route name (e.g., 'monitor', 'control', 'broadcast', 'settings', 'alerts', 'actions', 'maintenance')
 */
export function navigateTo(route) {
    const cleanRoute = (route || '').replace(/^#\/?/, '').trim().toLowerCase();
    window.location.hash = `#/${cleanRoute}`;
}

/**
 * Backward-compatible switchTab function that coordinates tab switching with URL hash.
 * @param {string} tabId - Target tab container ID (e.g. 'tab-monitor', 'tab-control', etc.)
 */
export function switchTab(tabId) {
    if (!tabId) return;
    
    // Find matching route for the tabId
    const navSuffix = tabId.replace(/^tab-/, '');
    const targetRoute = findRouteForTab(tabId) || navSuffix;
    
    // Update hash without triggering a duplicate switch if hash is already matching
    const currentHashRoute = getRouteFromHash();
    if (currentHashRoute !== targetRoute) {
        window.location.hash = `#/${targetRoute}`;
    } else {
        switchTabDOM(tabId);
    }
}

/**
 * Extract clean route name from current window.location.hash.
 * @returns {string} Route name without '#' or leading '/'
 */
export function getRouteFromHash() {
    const hash = window.location.hash || '';
    return hash.replace(/^#\/?/, '').trim().toLowerCase();
}

/**
 * Find corresponding route keyword for a given tab container ID.
 * @param {string} tabId
 * @returns {string}
 */
function findRouteForTab(tabId) {
    for (const [route, targetTab] of Object.entries(ROUTE_MAP)) {
        if (targetTab === tabId && route !== '') {
            return route;
        }
    }
    return TAB_NAV_MAP[tabId] || tabId.replace(/^tab-/, '');
}

/**
 * Handle route changes triggered by hash changes or initial page load.
 */
export function handleRoute() {
    const route = getRouteFromHash();
    const targetTabId = ROUTE_MAP[route] || 'tab-monitor';
    currentActiveRoute = route || 'monitor';
    
    switchTabDOM(targetTabId);
}

/**
 * Perform DOM operations to switch the visible tab and update navigation indicators.
 * @param {string} tabId - Target tab container ID
 */
export function switchTabDOM(tabId) {
    // 1. Close open tools menu if active
    const toolsMenu = document.getElementById('tools-menu');
    if (toolsMenu && !toolsMenu.classList.contains('hidden') && typeof window.toggleToolsMenu === 'function') {
        window.toggleToolsMenu();
    }

    // 2. Validate target tab container existence
    const targetTab = document.getElementById(tabId);
    if (!targetTab) {
        console.warn(`[Router] Tab container "${tabId}" not found in DOM.`);
        return;
    }

    currentActiveTabId = tabId;

    // 3. Hide all other tab containers
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active', 'opacity-100');
        tab.classList.add('hidden', 'opacity-0');
    });

    // 4. Reset Desktop Navigation Button states
    document.querySelectorAll('header button[id^="nav-"]').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-blue-600');
        btn.classList.add('text-slate-400', 'border-transparent');
    });

    // 5. Reset Mobile Sidebar Navigation Button states
    document.querySelectorAll('aside button[id^="mob-nav-"]').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');
    });

    // 6. Show target tab with smooth fade-in
    targetTab.classList.remove('hidden');
    targetTab.classList.add('active', 'transition-opacity', 'duration-300');
    const rAF = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : 
                (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') ? window.requestAnimationFrame : 
                (fn) => setTimeout(fn, 16);
    rAF(() => {
        targetTab.classList.remove('opacity-0');
        targetTab.classList.add('opacity-100');
    });

    // 7. Activate matching Desktop Navigation Tab
    const navSuffix = tabId.replace(/^tab-/, '');
    const activeDesktopNav = document.getElementById(`nav-${navSuffix}`);
    if (activeDesktopNav) {
        activeDesktopNav.classList.remove('text-slate-400', 'border-transparent');
        activeDesktopNav.classList.add('text-blue-600', 'border-blue-600');
    }

    // 8. Activate matching Mobile Sidebar Tab
    const activeMobileNav = document.getElementById(`mob-nav-${navSuffix}`);
    if (activeMobileNav) {
        activeMobileNav.classList.remove('text-slate-600', 'dark:text-slate-300');
        activeMobileNav.classList.add('bg-blue-50', 'dark:bg-blue-900/40', 'text-blue-600', 'dark:text-blue-300');
    }

    // 9. Close mobile sidebar overlay if open
    if (typeof window.toggleMobileSidebar === 'function') {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            window.toggleMobileSidebar(false);
        }
    }

    // 10. Execute data renderers if tables are activated
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

    // 11. Trigger lifecycle hooks & custom DOM event
    tabChangeHooks.forEach(hook => {
        try {
            hook(tabId, currentActiveRoute);
        } catch (err) {
            console.error(`[Router Hook Error]:`, err);
        }
    });

    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('tabChanged', {
            detail: { tabId, route: currentActiveRoute }
        }));
    }
}

/**
 * Register a callback hook for tab changes.
 * @param {Function} callback - Function receiving (tabId, route)
 * @returns {Function} Unsubscribe function
 */
export function onTabChanged(callback) {
    if (typeof callback === 'function') {
        tabChangeHooks.add(callback);
        return () => tabChangeHooks.delete(callback);
    }
}

/**
 * Get current active tab ID.
 * @returns {string}
 */
export function getCurrentTabId() {
    return currentActiveTabId;
}

/**
 * Get current active route.
 * @returns {string}
 */
export function getCurrentRoute() {
    return currentActiveRoute;
}

// Public Window Bridge
if (typeof window !== 'undefined') {
    window.navigateTo = navigateTo;
    window.switchTab = switchTab;
    window.initRouter = initRouter;
    window.getCurrentTabId = getCurrentTabId;
    window.getCurrentRoute = getCurrentRoute;
}

export default {
    initRouter,
    navigateTo,
    switchTab,
    onTabChanged,
    getCurrentTabId,
    getCurrentRoute
};
