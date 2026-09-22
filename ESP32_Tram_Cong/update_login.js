
const fs = require("fs");
let html = fs.readFileSync("login.html", "utf-8");

html = html.replace(
    /import { getDatabase, ref, set, get, child } from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.9\.0\/firebase-database\.js";/,
    `import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";`
);

// Function to inject update logic
const injectUpdate = (code, searchStr, loginType, isEmailPassword = false) => {
    const replacement = `
                    const user = result.user;
                    update(ref(db, \`web_users/\${user.uid}\`), {
                        email: user.email || "Khách ẩn danh",
                        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Guest_" + user.uid.substring(0,5)),
                        loginType: "${loginType}",
                        lastLogin: new Date().toISOString()
                    }).catch(console.error);
`;
    if (isEmailPassword) {
        return code.replace(searchStr, searchStr + `\n                    const user = auth.currentUser;\n                    update(ref(db, \`web_users/\${user.uid}\`), {\n                        email: user.email || loginEmail,\n                        displayName: user.displayName || loginEmail.split("@")[0],\n                        loginType: "${loginType}",\n                        lastLogin: new Date().toISOString()\n                    }).catch(console.error);`);
    }
    return code.replace(searchStr, searchStr + replacement);
};

// Google Login
html = html.replace(
    /const user = result\.user;/,
    `const user = result.user;
                    update(ref(db, \`web_users/\${user.uid}\`), {
                        email: user.email || "Khách ẩn danh",
                        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User_" + user.uid.substring(0,5)),
                        loginType: "google",
                        lastLogin: new Date().toISOString()
                    }).catch(console.error);`
);

// Guest Login
html = html.replace(
    /signInAnonymously\(auth\)\n\s*\.then\(\(\) => \{/,
    `signInAnonymously(auth)
                .then((result) => {
                    const user = result.user;
                    update(ref(db, \`web_users/\${user.uid}\`), {
                        email: "Khách ẩn danh",
                        displayName: "Guest_" + user.uid.substring(0,5),
                        loginType: "guest",
                        lastLogin: new Date().toISOString()
                    }).catch(console.error);`
);

// Email Password Login
html = html.replace(
    /await signInWithEmailAndPassword\(auth, loginEmail, password\);/,
    `const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
                const user = userCredential.user;
                update(ref(db, \`web_users/\${user.uid}\`), {
                    email: user.email || loginEmail,
                    displayName: user.displayName || loginEmail.split("@")[0],
                    loginType: "email",
                    lastLogin: new Date().toISOString()
                }).catch(console.error);`
);

fs.writeFileSync("login.html", html);
console.log("Updated login.html");
