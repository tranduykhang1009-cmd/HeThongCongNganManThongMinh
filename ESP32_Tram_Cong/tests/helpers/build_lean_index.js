const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const indexPath = path.join(rootDir, 'index.html');
const originalHtml = fs.readFileSync(indexPath, 'utf8');
const lines = originalHtml.split('\n');

const headLines = [
    '<!DOCTYPE html>',
    '<html lang="vi">',
    '<head>',
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
    '    <title>Hệ Thống Giám Sát & Điều Khiển Cống Ngăn Mặn Thông Minh</title>',
    '    ',
    '    <link rel="icon" type="image/png" href="logo (2).png">',
    '',
    '    <!-- Frameworks & CSS Libraries -->',
    '    <script src="https://cdn.tailwindcss.com"></script>',
    '    <script> tailwind.config = { darkMode: \'class\' }; </script>',
    '    <script src="https://unpkg.com/lucide@latest"></script>',
    '    <script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"></script>',
    '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
    '',
    '    <!-- Modular CSS Stylesheet -->',
    '    <link rel="stylesheet" href="css/main.css">',
    '</head>'
];

// 2. Body Start & Nav/Topbar/Sidebar: lines 1410 to 1915 (0-indexed: lines 1409 to 1915)
const bodyNavLines = lines.slice(1409, 1915);

// 3. Main Container and Modals (lines 1956 to 3358)
const mainAndModals1 = lines.slice(1955, 3358);

// 4. Modal Admin: lines 5682 to 5775 (0-indexed: lines 5681 to 5775)
const modalAdminLines = lines.slice(5681, 5775);

// 5. Modal Profile: lines 6459 to 6542 (0-indexed: lines 6458 to 6542)
const modalProfileLines = lines.slice(6458, 6542);

// 6. Floating Telegram Button: lines 6664 to 6673 (0-indexed: lines 6663 to 6673)
const telegramButtonLines = lines.slice(6663, 6673);

// 7. Floating Action Menu: lines 6778 to 6781 (0-indexed: lines 6777 to 6781)
const actionMenuLines = lines.slice(6777, 6781);

// 8. Closing Body and Script Entrypoint
const footerLines = [
    '',
    '    <!-- Main Modular ES6 Application Entrypoint -->',
    '    <script type="module" src="js/app.js"></script>',
    '</body>',
    '</html>'
];

let fullLines = [
    ...headLines,
    ...bodyNavLines,
    ...mainAndModals1,
    ...modalAdminLines,
    ...modalProfileLines,
    ...telegramButtonLines,
    ...actionMenuLines,
    ...footerLines
];

let newHtml = fullLines.join('\n');

// Ensure all 7 tab containers have class 'tab-content hidden ...'
newHtml = newHtml.replace('id="tab-monitor" class="tab-content active', 'id="tab-monitor" class="tab-content hidden');
newHtml = newHtml.replace('id="tab-control" class="tab-content w-full', 'id="tab-control" class="tab-content hidden w-full');
newHtml = newHtml.replace('id="tab-bao-tri" class="tab-content w-full px-4 sm:px-6 md:px-8 space-y-4 pb-safe"', 'id="tab-bao-tri" class="tab-content hidden w-full px-4 sm:px-6 md:px-8 space-y-4 pb-safe"');

const backupPath = path.join(rootDir, 'index.html.backup');
if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, originalHtml, 'utf8');
    console.log('Backed up original index.html to index.html.backup');
}

fs.writeFileSync(indexPath, newHtml, 'utf8');
console.log('Successfully refactored index.html');
console.log('Original lines:', lines.length, 'Original size:', originalHtml.length);
console.log('Lean lines:', newHtml.split('\n').length, 'Lean size:', newHtml.length);
