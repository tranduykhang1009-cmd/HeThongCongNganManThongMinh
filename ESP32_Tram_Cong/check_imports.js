const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match, count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[2];
    const lines = code.split('\n');
    lines.forEach((l, idx) => {
        if (l.includes('import')) {
            console.log('Script #' + count + ' Line ' + (idx + 1) + ': ' + l);
        }
    });
}
