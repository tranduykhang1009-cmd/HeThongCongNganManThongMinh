/**
 * @file test_modules_m4.js
 * @description Comprehensive unit and integration test suite for Milestone 4 (8 SCADA Feature Modules).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Setup Mock DOM environment for Node.js
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(...cls) { cls.forEach(c => this.classes.add(c)); }
    remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
    toggle(c) {
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        else { this.classes.add(c); return true; }
    }
    contains(c) { return this.classes.has(c); }
}

class MockElement {
    constructor(id = '', tagName = 'div') {
        this.id = id;
        this.tagName = tagName.toUpperCase();
        this.classList = new MockClassList();
        this.style = {};
        this.innerText = '';
        this.innerHTML = '';
        this.value = '';
        this.checked = false;
        this.disabled = false;
        this.attributes = {};
        this.children = [];
        this.parentNode = null;
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
    removeAttribute(k) { delete this.attributes[k]; }
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }
    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentNode = null;
        }
        return child;
    }
    closest(selector) { return null; }
    addEventListener(evt, fn) {}
    removeEventListener(evt, fn) {}
    remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
    }
    getBoundingClientRect() {
        return { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 };
    }
}

const mockElements = new Map();
function getOrCreateElement(id) {
    if (!mockElements.has(id)) {
        mockElements.set(id, new MockElement(id));
    }
    return mockElements.get(id);
}

global.window = global;
global.document = {
    documentElement: new MockElement('html'),
    getElementById: (id) => getOrCreateElement(id),
    querySelectorAll: (sel) => {
        if (sel.includes('.scada-control-btn')) {
            return [getOrCreateElement('btn-action-open'), getOrCreateElement('btn-action-close')];
        }
        if (sel.includes('admin-only-item')) {
            return [getOrCreateElement('btn-open-admin-modal')];
        }
        if (sel.includes('.sim-led')) {
            return [getOrCreateElement('sim-led-1'), getOrCreateElement('sim-led-2')];
        }
        if (sel.includes('.sim-led-base')) {
            return [getOrCreateElement('sim-base-1'), getOrCreateElement('sim-base-2')];
        }
        return [];
    },
    createElement: (tag) => new MockElement('', tag),
    body: new MockElement('body'),
    addEventListener: (evt, fn) => {},
    activeElement: null
};

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.lucide = {
    createIcons: () => {}
};

// Start test suites
console.log("\n======================================================================");
console.log("   MILESTONE 4: FEATURE MODULES UNIT & INTEGRATION TEST SUITE");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  √ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  X ${name}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function runTests() {
    // --- MODULE 1: AUTH ---
    console.log("--- Testing Module 1: Auth (js/modules/auth.js) ---");
    const Auth = await import('../js/modules/auth.js');

    await test("Auth 1.1: setControlAccess enables/disables buttons and sets state", () => {
        Auth.setControlAccess(true);
        assert.equal(window.isScadaAdmin, true);
        const btn = document.getElementById('btn-action-open');
        assert.equal(btn.disabled, false);

        Auth.setControlAccess(false);
        assert.equal(window.isScadaAdmin, false);
        assert.equal(btn.disabled, true);
    });

    await test("Auth 1.2: updateAdminAvatarStyle adds glowing ring for admin", () => {
        const container = document.getElementById('user-avatar-container');
        Auth.updateAdminAvatarStyle(true);
        assert.equal(container.classList.contains('ring-4'), true);
        assert.equal(container.classList.contains('ring-yellow-400'), true);

        Auth.updateAdminAvatarStyle(false);
        assert.equal(container.classList.contains('ring-4'), false);
    });

    await test("Auth 1.3: updateSavedAccounts stores up to 5 unique accounts in localStorage", () => {
        localStorage.clear();
        for (let i = 1; i <= 7; i++) {
            Auth.updateSavedAccounts({ uid: `user_${i}`, email: `u${i}@test.com`, displayName: `User ${i}` });
        }
        const accounts = JSON.parse(localStorage.getItem('scada_accounts'));
        assert.equal(accounts.length, 5);
        assert.equal(accounts[0].uid, 'user_7');
    });

    // --- MODULE 2: MONITOR ---
    console.log("\n--- Testing Module 2: Monitor (js/modules/monitor.js) ---");
    const Monitor = await import('../js/modules/monitor.js');

    await test("Monitor 2.1: calculateBatteryPercentage calculates clamped 1S and 3S ranges", () => {
        // 1S Li-ion (3.2V - 4.2V)
        assert.equal(Monitor.calculateBatteryPercentage(4.2, 4.2, 3.2), 100);
        assert.equal(Monitor.calculateBatteryPercentage(3.2, 4.2, 3.2), 0);
        assert.equal(Monitor.calculateBatteryPercentage(3.7, 4.2, 3.2), 50);
        assert.equal(Monitor.calculateBatteryPercentage(4.5, 4.2, 3.2), 100); // Clamped
        assert.equal(Monitor.calculateBatteryPercentage(2.5, 4.2, 3.2), 0);   // Clamped

        // 3S Li-ion (9.6V - 12.6V)
        assert.equal(Monitor.calculateBatteryPercentage(12.6, 12.6, 9.6), 100);
        assert.equal(Monitor.calculateBatteryPercentage(11.1, 12.6, 9.6), 50);
    });

    await test("Monitor 2.2: updateDOM updates telemetry labels and calculates delta H", () => {
        const testData = {
            do_man: 1.25,
            temp: 28.5,
            muc_nuoc: 45.0,
            sieu_am_ngoai: 40.0,
            dong_dien_tho: 520,
            pin_volt: 3.9,
            pin_phan_tram: 70,
            solar_dong_sac: 150,
            cong_dien_ap: 11.8,
            salinity_threshold: 1.5,
            flood_threshold: 80,
            gate_status: 1
        };

        Monitor.updateDOM(testData);

        assert.equal(document.getElementById('lbl-salinity').innerText, '1.25');
        assert.equal(document.getElementById('lbl-temp').innerText, '28.5');
        assert.equal(document.getElementById('lbl-water-in').innerText, '45.0');
        assert.equal(document.getElementById('lbl-water-out').innerText, '40.0');
        assert.equal(document.getElementById('lbl-water-diff').innerText, '5.0');
        assert.equal(document.getElementById('lbl-motor-current').innerText, '520');
    });

    // --- MODULE 3: CONTROL ---
    console.log("\n--- Testing Module 3: Control (js/modules/control.js) ---");
    const Control = await import('../js/modules/control.js');

    await test("Control 3.1: updateModeDOM updates Auto and Manual mode buttons", () => {
        const btnManual = document.getElementById('btn-mode-manual');
        const btnAuto = document.getElementById('btn-mode-auto');
        const badgeMode = document.getElementById('badge-mode');

        Control.updateModeDOM(1); // Auto
        assert.equal(badgeMode.innerText, "TỰ ĐỘNG AI");

        Control.updateModeDOM(0); // Manual
        assert.equal(badgeMode.innerText, "THỦ CÔNG");
    });

    await test("Control 3.2: toggleSimulation switches 3D simulation visibility and persists state", () => {
        const simSection = document.getElementById('simulation-section');
        simSection.classList.remove('hidden');

        Control.toggleSimulation();
        assert.equal(simSection.classList.contains('hidden'), true);
        assert.equal(localStorage.getItem('scada_hide_sim'), 'true');

        Control.toggleSimulation();
        assert.equal(simSection.classList.contains('hidden'), false);
        assert.equal(localStorage.getItem('scada_hide_sim'), 'false');
    });

    // --- MODULE 4: BROADCAST ---
    console.log("\n--- Testing Module 4: Broadcast (js/modules/broadcast.js) ---");
    const Broadcast = await import('../js/modules/broadcast.js');

    await test("Broadcast 4.1: updateVolumeLabel updates volume display text", () => {
        const lbl = document.getElementById('lbl-volume-val');
        Broadcast.updateVolumeLabel(25);
        assert.equal(lbl.innerText, '25 / 30');
    });

    await test("Broadcast 4.2: toggleLoopAudio updates loop status badge text", () => {
        const statusTxt = document.getElementById('txt-loop-status');
        Broadcast.toggleLoopAudio({ checked: true });
        assert.equal(statusTxt.innerText.includes("BẬT"), true);

        Broadcast.toggleLoopAudio({ checked: false });
        assert.equal(statusTxt.innerText.includes("TẮT"), true);
    });

    // --- MODULE 5: SETTINGS ---
    console.log("\n--- Testing Module 5: Settings (js/modules/settings.js) ---");
    const Settings = await import('../js/modules/settings.js');

    await test("Settings 5.1: getSavedProjects returns default projects array", () => {
        localStorage.removeItem('scada_projects');
        const projs = Settings.getSavedProjects();
        assert.equal(Array.isArray(projs), true);
        assert.equal(projs.length >= 3, true);
        assert.equal(projs[0].name.includes("Cống Ngăn Mặn"), true);
    });

    await test("Settings 5.2: populateSettingsInputs populates inputs when not activeElement", () => {
        const data = {
            salinity_threshold: 2.5,
            flood_threshold: 90,
            stall_threshold: 650,
            sensor_height: 150,
            calib_sal: -0.2,
            calib_temp: 1.0,
            calib_water_in: 0.5,
            calib_water_out: -0.5
        };
        Settings.populateSettingsInputs(data);
        assert.equal(document.getElementById('inp-sal').value, 2.5);
        assert.equal(document.getElementById('inp-flood').value, 90);
        assert.equal(document.getElementById('inp-stall').value, 650);
        assert.equal(document.getElementById('inp-height').value, 150);
        assert.equal(document.getElementById('inp-calib-sal').value, -0.2);
    });

    // --- MODULE 6: LOGS ---
    console.log("\n--- Testing Module 6: Logs (js/modules/logs.js) ---");
    const Logs = await import('../js/modules/logs.js');

    await test("Logs 6.1: renderNhatKyToHTML separates incident alerts from user actions", async () => {
        const State = await import('../js/core/state.js');
        State.updateState('allFirebaseLogs', [
            { thaoTac: "CẢNH BÁO MẶN", chiTiet: "Vượt ngưỡng 1.5ppt", timestamp: Date.now() },
            { thaoTac: "Ra lệnh mở cống (Thủ công)", chiTiet: "Thao tác trên web", timestamp: Date.now() - 1000 },
            { thaoTac: "MẤT KẾT NỐI PHAO", chiTiet: "Timeout", timestamp: Date.now() - 2000 }
        ]);

        Logs.renderNhatKyToHTML();
        const tableState = State.getState('tableState');
        assert.equal(tableState.alert.rawData.length, 2);
        assert.equal(tableState.action.rawData.length, 1);
    });

    // --- MODULE 7: MAINTENANCE ---
    console.log("\n--- Testing Module 7: Maintenance (js/modules/maintenance.js) ---");
    const Maintenance = await import('../js/modules/maintenance.js');

    await test("Maintenance 7.1: addMaintTag appends tags with comma formatting", () => {
        const input = document.getElementById('maint-note-input');
        input.value = '';
        Maintenance.addMaintTag("Bôi trơn bạc đạn");
        assert.equal(input.value, "Bôi trơn bạc đạn");

        Maintenance.addMaintTag("Lau cảm biến");
        assert.equal(input.value, "Bôi trơn bạc đạn, Lau cảm biến");
    });

    await test("Maintenance 7.2: langCapNhatBaoTriUI calculates remaining vs overdue countdown", async () => {
        const State = await import('../js/core/state.js');

        // On-schedule case (future)
        State.updateState('langMaintenanceData', {
            last_maintenance_timestamp: Date.now(),
            interval_ms: 10 * 24 * 60 * 60 * 1000 // 10 days
        });
        Maintenance.langCapNhatBaoTriUI();
        assert.equal(document.getElementById('maint-status-badge').innerText, "ĐANG VẬN HÀNH TỐT");

        // Overdue case (past)
        State.updateState('langMaintenanceData', {
            last_maintenance_timestamp: Date.now() - (40 * 24 * 60 * 60 * 1000), // 40 days ago
            interval_ms: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        Maintenance.langCapNhatBaoTriUI();
        assert.equal(document.getElementById('maint-status-badge').innerText, "CẦN BẢO TRÌ NGAY");
    });

    // --- MODULE 8: ADMIN ---
    console.log("\n--- Testing Module 8: Admin (js/modules/admin.js) ---");
    const Admin = await import('../js/modules/admin.js');

    await test("Admin 8.1: setAdminFilter and setAdminSort update filtering and sort parameters", () => {
        Admin.setAdminFilter('admin', 'Quản trị viên');
        assert.equal(document.getElementById('admin-filter-label').innerText, 'Quản trị viên');

        Admin.setAdminSort('name');
        Admin.setAdminSort('name'); // Toggles asc/desc
    });

    console.log("\n======================================================================");
    console.log(`M4 TEST RESULTS: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log("======================================================================\n");

    if (failed > 0) process.exitCode = 1;
}

runTests();
