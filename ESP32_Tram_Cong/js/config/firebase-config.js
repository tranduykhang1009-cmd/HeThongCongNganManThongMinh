/**
 * @file firebase-config.js
 * @description Firebase v10 SDK initialization and unified exports for the SCADA application.
 * @module config/firebase-config
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    updateProfile,
    updatePassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    child,
    push,
    remove,
    set,
    update,
    serverTimestamp,
    onValue,
    query,
    limitToLast,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

/**
 * Firebase Project Configuration for 'hethongcongthongminh'
 */
export const firebaseConfig = {
    apiKey: "AIzaSyCgWv3tMBnArYx1JHuasH7Yg-RARRlcRb8",
    authDomain: "hethongcongthongminh.firebaseapp.com",
    databaseURL: "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hethongcongthongminh",
    storageBucket: "hethongcongthongminh.firebasestorage.app",
    messagingSenderId: "1056991222410",
    appId: "1:1056991222410:web:36623d39ebbc5728e02b73",
    measurementId: "G-96J4Z5SFEQ"
};

// Initialize Firebase Core Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Export SDK helper methods
export {
    initializeApp,
    getAuth,
    onAuthStateChanged,
    signOut,
    updateProfile,
    updatePassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    getDatabase,
    ref,
    get,
    child,
    push,
    remove,
    set,
    update,
    serverTimestamp,
    onValue,
    query,
    limitToLast,
    onDisconnect,
    getStorage,
    storageRef,
    uploadBytes,
    getDownloadURL
};

// Public Window Bridge for backward compatibility
if (typeof window !== 'undefined') {
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
    window.push = push;
    window.remove = remove;
    window.onValue = onValue;
    window.serverTimestamp = serverTimestamp;
}
