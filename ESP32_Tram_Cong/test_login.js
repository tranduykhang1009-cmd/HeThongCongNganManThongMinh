const fs = require('fs');

console.log('=== RUNNING TESTS ON LOGIN.HTML ===');
const html = fs.readFileSync('login.html', 'utf8');
console.log('login.html size: ' + html.length + ' bytes');

const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match, count = 0, syntaxErrors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    let code = match[2].trim();
    if (!code) {
        console.log('Script #' + count + ': empty / external src');
        continue;
    }
    const cleanedCode = code.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
            return '// ' + line;
        }
        return line;
    }).join('\n');

    try {
        new Function(cleanedCode);
        console.log('Script #' + count + ': Syntax VALID (Lines: ' + code.split('\n').length + ')');
    } catch (e) {
        console.error('Script #' + count + ' SYNTAX ERROR: ' + e.message);
        syntaxErrors++;
    }
}
console.log('\nLogin syntax validation completed: ' + count + ' scripts, ' + syntaxErrors + ' errors.');
if (syntaxErrors > 0) process.exit(1);
