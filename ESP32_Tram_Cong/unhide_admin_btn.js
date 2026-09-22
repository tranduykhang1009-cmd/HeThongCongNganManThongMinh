
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf-8");

html = html.replace(
    /updateAdminAvatarStyle\(true\);/g,
    `updateAdminAvatarStyle(true);
                        const btnAdmin = document.getElementById("btn-admin-panel");
                        if (btnAdmin) btnAdmin.classList.remove("hidden");`
);

html = html.replace(
    /updateAdminAvatarStyle\(false\);/g,
    `updateAdminAvatarStyle(false);
                        const btnAdmin = document.getElementById("btn-admin-panel");
                        if (btnAdmin) btnAdmin.classList.add("hidden");`
);

fs.writeFileSync("index.html", html);
console.log("Updated admin button visibility in index.html");
