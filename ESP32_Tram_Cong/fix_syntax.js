
const fs = require("fs");
let html = fs.readFileSync("login.html", "utf-8");

html = html.replace(/\.then\(\(result\) => \{\n\s*const user = result\.user;\n\s*await update/g, `.then(async (result) => {
                    const user = result.user;
                    await update`);

fs.writeFileSync("login.html", html);
console.log("Fixed syntax");
