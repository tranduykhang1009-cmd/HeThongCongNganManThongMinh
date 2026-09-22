/**
 * @file app.js
 * @description Main application bootstrap entrypoint and comprehensive Public Window Bridge
 *              coordinating core routing, state management, services, utilities, and feature modules.
 * @module app
 */

// 1. Import Firebase Configurations & SDK Helpers
import {
    app,
    auth,
    db,
    storage,
    ref,
    set,
    get,
    child,
    onValue,
    push,
    remove,
    update,
    serverTimestamp,
    storageRef,
    uploadBytes,
    getDownloadURL,
    onAuthStateChanged,
    signOut
} from './config/firebase-config.js';

import * as Constants from './config/app-constants.js';

// 2. Import Core State, Router, and i18n
import {
    getState,
    updateState,
    mergeState,
    subscribeState
} from './core/state.js';

import {
    initRouter,
    navigateTo,
    switchTab,
    onTabChanged,
    getCurrentTabId,
    getCurrentRoute,
    switchTabDOM
} from './core/router.js';

import {
    i18n,
    t,
    switchLanguage,
    updateDOMTranslations,
    initI18n,
    getCurrentLang
} from './core/i18n.js';

// 3. Import UI & Formatter Utilities
import {
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
} from './utils/ui-utils.js';

import {
    timeAgo,
    onlineDuration,
    removeVietnameseTones,
    escapeHtml,
    escapeJs,
    formatDate,
    getTime,
    formatNumber
} from './utils/formatters.js';

// 4. Import Services
import {
    initFirebaseListeners,
    stopFirebaseListeners,
    processAndMergeData,
    writeFirebase,
    updateFirebase,
    pushFirebase,
    removeFirebase,
    setFirebase,
    getProjectPrefix,
    setProjectPrefix,
    updateConnectionUI,
    startHeartbeatTracker,
    stopHeartbeatTracker
} from './services/firebase-service.js';

import {
    connectCamera,
    stopCamera,
    takeSnapshot,
    setCamControl,
    setCamFlipV,
    setCamFlipH,
    zoomCam,
    resetCamTransform,
    setCamBadge,
    initCameraControls
} from './services/camera-service.js';

import {
    sendToGoogleSheets,
    logToGoogleSheets,
    logLoginSession,
    logActionToSheets,
    sendTelegramAlert,
    testTelegram,
    setupLoggingHooks,
    initTelegramStateSync,
    getTelegramChatId,
    setTelegramChatId
} from './services/gas-telegram-service.js';

// 5. Import Feature Modules (M4)
import {
    initAuth,
    setControlAccess,
    updateAdminAvatarStyle,
    openProfileModal,
    closeProfileModal,
    saveProfileChanges,
    openSwitchAccountModal,
    togglePopoverSwitchAccount,
    populateSwitchAccountPopover,
    selectAccountToSwitch,
    addNewAccount,
    logout,
    handleAvatarUpload,
    promptAvatarLink,
    updateModalAvatarDisplay
} from './modules/auth.js';

import {
    updateDOM,
    initChart,
    addChartData,
    pushAlert,
    calculateBatteryPercentage
} from './modules/monitor.js';

import {
    setGateWithLoading,
    setModeOptimistic,
    updateModeDOM,
    confirmEmergencyToggle,
    executeToggleEmergency,
    toggleSimulation,
    initSimulationState
} from './modules/control.js';

import {
    updateVolumeLabel,
    sendVolumeControl,
    toggleLoopAudio,
    playAudioTrack,
    stopAllAudio,
    AUDIO_TRACKS
} from './modules/broadcast.js';

import {
    updateSettingWithLoading,
    toggleLockPhysical,
    populateSettingsInputs,
    renderProjectDropdown,
    selectSystem,
    saveNewProject,
    getSavedProjects
} from './modules/settings.js';

import {
    ghiNhatKy,
    ghiNhatKyTuDong,
    logAction,
    hienThiNhatKy,
    renderNhatKyToHTML,
    onLogFilterChange,
    renderTableData,
    changePage,
    renderPageOnly,
    exportLogsCSV,
    deleteLogsData
} from './modules/logs.js';

import {
    addMaintTag,
    langCapNhatBaoTriUI,
    langKhoiTaoBaoTriListener,
    openMaintConfirmModal,
    openMaintSettingsModal,
    saveMaintInterval,
    hoanTatBaoTri
} from './modules/maintenance.js';

import {
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
} from './modules/admin.js';

/**
 * =========================================================================
 * COMPREHENSIVE PUBLIC WINDOW BRIDGE
 * Guarantees 100% backward compatibility for all HTML inline onclick/onchange handlers.
 * =========================================================================
 */
if (typeof window !== 'undefined') {
    // 1. Firebase Instances & Methods
    window.firebaseApp = app;
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.storageRef = storageRef;
    window.uploadBytes = uploadBytes;
    window.getDownloadURL = getDownloadURL;
    window.ref = ref;
    window.set = set;
    window.get = get;
    window.child = child;
    window.push = push;
    window.remove = remove;
    window.update = update;
    window.onValue = onValue;
    window.serverTimestamp = serverTimestamp;

    // 2. Navigation & Routing
    window.navigateTo = navigateTo;
    window.switchTab = switchTab;
    window.getCurrentTabId = getCurrentTabId;
    window.getCurrentRoute = getCurrentRoute;
    window.switchTabDOM = switchTabDOM;

    // 3. State Management
    window.getState = getState;
    window.updateState = updateState;
    window.mergeState = mergeState;
    window.subscribeState = subscribeState;

    // 4. UI Utilities
    window.showToast = showToast;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.toggleDropdown = toggleDropdown;
    window.toggleTheme = toggleTheme;
    window.toggleUserMenu = toggleUserMenu;
    window.toggleToolsMenu = toggleToolsMenu;
    window.toggleMobileSidebar = toggleMobileSidebar;

    // 5. i18n Translation
    window.i18n = i18n;
    window.t = t;
    window.switchLanguage = switchLanguage;
    window.updateDOMTranslations = updateDOMTranslations;
    window.getCurrentLang = getCurrentLang;

    // 6. Formatters
    window.timeAgo = timeAgo;
    window.onlineDuration = onlineDuration;
    window.removeVietnameseTones = removeVietnameseTones;
    window.escapeHtml = escapeHtml;
    window.escapeJs = escapeJs;
    window.formatDate = formatDate;
    window.getTime = getTime;
    window.formatNumber = formatNumber;

    // 7. Constants
    window.SCADA_CONSTANTS = Constants;
    window.DB_BASE_URL = Constants.DB_BASE_URL;
    window.DB_AUTH = Constants.DB_AUTH;
    window.GAS_URL = Constants.GAS_URL;
    window.WS_CAM_URL = Constants.WS_CAM_URL;
    window.AUDIO_TRACKS = AUDIO_TRACKS;

    // 8. Services Bridge
    window.initFirebaseListeners = initFirebaseListeners;
    window.stopFirebaseListeners = stopFirebaseListeners;
    window.processAndMergeData = processAndMergeData;
    window.writeFirebase = writeFirebase;
    window.updateFirebase = updateFirebase;
    window.pushFirebase = pushFirebase;
    window.removeFirebase = removeFirebase;
    window.setFirebase = setFirebase;
    window.getProjectPrefix = getProjectPrefix;
    window.setProjectPrefix = setProjectPrefix;
    window.updateConnectionUI = updateConnectionUI;
    window.startHeartbeatTracker = startHeartbeatTracker;
    window.stopHeartbeatTracker = stopHeartbeatTracker;

    // Camera Service
    window.connectCamera = connectCamera;
    window.stopCamera = stopCamera;
    window.takeSnapshot = takeSnapshot;
    window.setCamControl = setCamControl;
    window.setCamFlipV = setCamFlipV;
    window.setCamFlipH = setCamFlipH;
    window.zoomCam = zoomCam;
    window.resetCamTransform = resetCamTransform;
    window.setCamBadge = setCamBadge;

    // GAS & Telegram
    window.sendToGoogleSheets = sendToGoogleSheets;
    window.logToGoogleSheets = logToGoogleSheets;
    window.logLoginSession = logLoginSession;
    window.logActionToSheets = logActionToSheets;
    window.sendTelegramAlert = sendTelegramAlert;
    window.testTelegram = testTelegram;
    window.setupLoggingHooks = setupLoggingHooks;
    window.getTelegramChatId = getTelegramChatId;
    window.setTelegramChatId = setTelegramChatId;

    // 9. Auth Module Bridge
    window.setControlAccess = setControlAccess;
    window.updateAdminAvatarStyle = updateAdminAvatarStyle;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.saveProfileChanges = saveProfileChanges;
    window.openSwitchAccountModal = openSwitchAccountModal;
    window.togglePopoverSwitchAccount = togglePopoverSwitchAccount;
    window.populateSwitchAccountPopover = populateSwitchAccountPopover;
    window.selectAccountToSwitch = selectAccountToSwitch;
    window.addNewAccount = addNewAccount;
    window.switchAccount = openSwitchAccountModal;
    window.logout = logout;
    window.handleAvatarUpload = handleAvatarUpload;
    window.promptAvatarLink = promptAvatarLink;
    window.updateModalAvatarDisplay = updateModalAvatarDisplay;

    // 10. Monitor Module Bridge
    window.updateDOM = updateDOM;
    window.initChart = initChart;
    window.addChartData = addChartData;
    window.pushAlert = pushAlert;
    window.calculateBatteryPercentage = calculateBatteryPercentage;

    // 11. Control Module Bridge
    window.setGateWithLoading = setGateWithLoading;
    window.setModeOptimistic = setModeOptimistic;
    window.updateModeDOM = updateModeDOM;
    window.confirmEmergencyToggle = confirmEmergencyToggle;
    window.executeToggleEmergency = executeToggleEmergency;
    window.toggleSimulation = toggleSimulation;
    window.initSimulationState = initSimulationState;

    // 12. Broadcast Module Bridge
    window.updateVolumeLabel = updateVolumeLabel;
    window.sendVolumeControl = sendVolumeControl;
    window.toggleLoopAudio = toggleLoopAudio;
    window.playAudioTrack = playAudioTrack;
    window.stopAllAudio = stopAllAudio;

    // 13. Settings Module Bridge
    window.updateSettingWithLoading = updateSettingWithLoading;
    window.toggleLockPhysical = toggleLockPhysical;
    window.populateSettingsInputs = populateSettingsInputs;
    window.renderProjectDropdown = renderProjectDropdown;
    window.selectSystem = selectSystem;
    window.saveNewProject = saveNewProject;
    window.getSavedProjects = getSavedProjects;

    // 14. Logs Module Bridge
    window.ghiNhatKy = ghiNhatKy;
    window.ghiNhatKyTuDong = ghiNhatKyTuDong;
    window.logAction = logAction;
    window.hienThiNhatKy = hienThiNhatKy;
    window.renderNhatKyToHTML = renderNhatKyToHTML;
    window.onLogFilterChange = onLogFilterChange;
    window.renderTableData = renderTableData;
    window.changePage = changePage;
    window.renderPageOnly = renderPageOnly;
    window.exportLogsCSV = exportLogsCSV;
    window.deleteLogsData = deleteLogsData;

    // 15. Maintenance Module Bridge
    window.addMaintTag = addMaintTag;
    window.langCapNhatBaoTriUI = langCapNhatBaoTriUI;
    window.langKhoiTaoBaoTriListener = langKhoiTaoBaoTriListener;
    window.openMaintConfirmModal = openMaintConfirmModal;
    window.openMaintSettingsModal = openMaintSettingsModal;
    window.saveMaintInterval = saveMaintInterval;
    window.hoanTatBaoTri = hoanTatBaoTri;

    // 16. Admin Module Bridge
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

/**
 * Setup Drag-to-Scroll behavior for Desktop Tab Bar (#nav-tabs-container)
 */
function initTabDragToScroll() {
    const tabContainer = document.querySelector('#nav-tabs-container');
    if (!tabContainer) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

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
        const walk = (x - startX) * 2;
        tabContainer.scrollLeft = scrollLeft - walk;
    });
}

/**
 * Setup Safe Table Action Button Listeners for filter inputs & pagination
 * @param {'alert'|'action'|'maint'} type
 */
function setupSafeTableListeners(type) {
    const btnExport = document.getElementById(`btn-${type}-export-csv`);
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (typeof exportLogsCSV === 'function') exportLogsCSV(type);
        });
    }

    const btnDelete = document.getElementById(`btn-${type}-delete-log`);
    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            if (typeof deleteLogsData === 'function') deleteLogsData(type);
        });
    }

    const btnPrev = document.getElementById(`${type}-prev-btn`);
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (typeof changePage === 'function') changePage(type, -1);
        });
    }

    const btnNext = document.getElementById(`${type}-next-btn`);
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (typeof changePage === 'function') changePage(type, 1);
        });
    }

    const searchInp = document.getElementById(`${type}-search-input`);
    if (searchInp) {
        searchInp.addEventListener('input', () => {
            if (typeof onLogFilterChange === 'function') onLogFilterChange(type);
        });
    }

    const dateInp = document.getElementById(`${type}-date-input`);
    if (dateInp) {
        dateInp.addEventListener('change', () => {
            if (typeof onLogFilterChange === 'function') onLogFilterChange(type);
        });
    }
}

/**
 * Main Application Bootstrap Function
 */
export function initApp() {
    console.log('[SCADA App] Bootstrapping SCADA Web Application...');

    // 1. Initialize Theme (Light / Dark)
    initTheme();

    // 2. Initialize Language & Translations
    initI18n();

    // 3. Initialize Global Click Handlers
    initGlobalClickHandlers();

    // 4. Initialize Client-Side URL Hash Router
    initRouter();

    // 5. Initialize Logging & Telegram Hooks
    setupLoggingHooks();
    initTelegramStateSync();

    // 6. Initialize Firebase Auth State & Presence Observer
    initAuth();

    // 7. Initialize RTDB Telemetry Listeners
    initFirebaseListeners();

    // 8. Initialize Maintenance and Logs Listeners
    hienThiNhatKy();
    langKhoiTaoBaoTriListener();

    // 9. Subscribe to state changes to populate settings inputs
    subscribeState('dataCache', (newData) => {
        populateSettingsInputs(newData);
    });

    // 10. Initialize DOM-dependent components
    const onDOMReady = () => {
        initTabDragToScroll();
        ['alert', 'action', 'maint'].forEach(type => setupSafeTableListeners(type));
        renderProjectDropdown();
        initSimulationState();
        initChart();
        initCameraControls();

        // Connect Camera automatically on page load
        connectCamera();

        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
        console.log('[SCADA App] All Modules and Services Initialized Successfully.');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        onDOMReady();
    }
}

// Auto-boot application
initApp();

export default {
    initApp,
    navigateTo,
    switchTab,
    getState,
    updateState,
    subscribeState,
    t,
    switchLanguage,
    showToast,
    openModal,
    closeModal,
    setGateWithLoading,
    setModeOptimistic,
    executeToggleEmergency,
    confirmEmergencyToggle,
    toggleSimulation,
    playAudioTrack,
    stopAllAudio,
    toggleLoopAudio,
    sendVolumeControl,
    updateSettingWithLoading,
    toggleLockPhysical,
    connectCamera,
    stopCamera,
    takeSnapshot,
    openProfileModal,
    closeProfileModal,
    openAdminModal,
    closeAdminModal,
    openMaintConfirmModal,
    openMaintSettingsModal,
    saveMaintInterval,
    hoanTatBaoTri,
    exportLogsCSV,
    deleteLogsData,
    changePage,
    onLogFilterChange,
    toggleAdmin,
    toggleBlock,
    deleteUserRecord,
    uploadAvatar,
    logout
};
