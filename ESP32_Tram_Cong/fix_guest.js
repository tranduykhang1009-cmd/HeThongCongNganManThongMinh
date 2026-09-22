
const fs = require("fs");
let html = fs.readFileSync("login.html", "utf-8");

html = html.replace(
    /signInAnonymously\(auth\)\s*\.then\(\(\) => \{/g,
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

fs.writeFileSync("login.html", html);
console.log("Fixed guest login update");
