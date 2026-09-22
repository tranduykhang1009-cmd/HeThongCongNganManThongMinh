const fs = require('fs');

console.log('=== RUNNING COMPREHENSIVE SUITE FOR SCADA & PRESENCE ===');

const html = fs.readFileSync('index.html', 'utf8');
console.log('index.html size: ' + html.length + ' bytes');

// 1. Tag matching
for (const tag of ['button', 'table', 'tbody', 'thead', 'tr', 'th']) {
    const opens = (html.match(new RegExp('<' + tag + '(\\s|>|$)', 'gi')) || []).length;
    const closes = (html.match(new RegExp('</' + tag + '>', 'gi')) || []).length;
    console.log('Tag <' + tag + '>: opened ' + opens + ', closed ' + closes);
    if (opens !== closes) {
        console.warn('WARNING: Tag <' + tag + '> count mismatch: ' + opens + ' vs ' + closes);
    }
}

// 2. Extract and check syntax of each script
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match, count = 0, syntaxErrors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    let code = match[2].trim();
    if (!code) {
        console.log('Script #' + count + ': empty / external src');
        continue;
    }
    // Comment out import statements line by line
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

console.log('\nSyntax validation completed: ' + count + ' scripts, ' + syntaxErrors + ' errors.');
if (syntaxErrors > 0) process.exit(1);
