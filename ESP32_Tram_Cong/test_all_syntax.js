const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Test script tags
const scriptRegex = <script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, count = 0, errors = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    let code = match[1].trim();
    if (!code) continue;
    // Remove imports for syntax checking
    code = code.replace(/import\r\nst+[\s\S]*?from\r\ns+['\"][^'\"]+['\"];?/g, '// import')
               .replace(/import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?/g, '// import');
    try {
        new Function(code);
        console.log(`Script #${count}: Syntay OK`);
    } catch (e) {
        console.error(`Script #${count} SYNTAX ERROR: ${e.message}`);
        errors++;
    }
}
console.log(`Total scripts: ${count}, Errors: ${errors}`);
