const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Regex để tìm và xóa khối setInterval bắn data cảm biến
const regexSetInterval = /\/\/ Vòng lặp bắn Data Cảm Biến định kỳ \(5 phút = 300000ms\)[\s\S]*?\}, 300000\); \/\/ 5 phút/g;

if (regexSetInterval.test(html)) {
    html = html.replace(regexSetInterval, '');
    fs.writeFileSync('index.html', html);
    console.log("Đã xóa thành công vòng lặp setInterval.");
} else {
    console.log("Không tìm thấy vòng lặp setInterval.");
}
