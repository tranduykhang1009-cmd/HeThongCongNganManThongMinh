/**
 * @file loader.mjs
 * @description Node.js ESM loader to mock CDN https:// imports during unit testing.
 */

export async function resolve(specifier, context, defaultResolve) {
    if (specifier.startsWith('https://')) {
        return {
            shortCircuit: true,
            url: `mock:${specifier}`
        };
    }
    return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
    if (url.startsWith('mock:https://')) {
        return {
            shortCircuit: true,
            format: 'module',
            source: `
                export const initializeApp = () => ({});
                export const getAuth = () => ({ currentUser: { uid: 'TEST_UID', email: 'test@admin.com' } });
                export const onAuthStateChanged = (auth, cb) => () => {};
                export const signOut = async () => {};
                export const updateProfile = async () => {};
                export const updatePassword = async () => {};
                export const signInWithEmailAndPassword = async () => {};
                export const GoogleAuthProvider = class {};
                export const signInWithPopup = async () => {};
                export const getDatabase = () => ({});
                export const ref = (db, path) => ({ db, path });
                export const get = async () => ({ val: () => ({}) });
                export const child = () => ({});
                export const push = async (r, val) => ({ key: 'MOCK_KEY_' + Date.now() });
                export const remove = async () => {};
                export const set = async () => {};
                export const update = async () => {};
                export const serverTimestamp = () => Date.now();
                export const onValue = (r, cb) => () => {};
                export const query = (r) => r;
                export const limitToLast = (n) => n;
                export const onDisconnect = () => ({ set: async () => {} });
                export const getStorage = () => ({});
                export const storageRef = () => ({});
                export const uploadBytes = async () => {};
                export const getDownloadURL = async () => 'https://mock.storage/avatar.png';
            `
        };
    }
    return defaultLoad(url, context, defaultLoad);
}
