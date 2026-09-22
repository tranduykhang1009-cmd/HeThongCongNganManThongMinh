const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const lines = html.split('\n');
console.log('=== SEARCHING PRESENCE CODE PATHS ===');
lines.forEach((line, idx) => {
    if (line.includes('presence') || line.includes('onDisconnect') || line.includes('.info/connected')) {
        console.log(Line : );
    }
});
