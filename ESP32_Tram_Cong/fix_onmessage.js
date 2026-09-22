const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The replacement using regex this time
const oldOnMessageRegex = /if \(img\) \{\s*if \(img\.src && img\.src\.startsWith\('blob:'\)\) \{\s*URL\.revokeObjectURL\(img\.src\);\s*\}\s*img\.src = URL\.createObjectURL\(event\.data\);\s*\}/;

const newOnMessage = `if (img) {
                    if (img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                    const objUrl = URL.createObjectURL(event.data);
                    img.src = objUrl;
                    
                    const imgBlur = document.getElementById('cam-bg-blur');
                    if (imgBlur) {
                        imgBlur.src = objUrl;
                        imgBlur.classList.remove('hidden');
                    }
                }`;

if (oldOnMessageRegex.test(html)) {
    html = html.replace(oldOnMessageRegex, newOnMessage);
    fs.writeFileSync('index.html', html);
    console.log('Fixed onmessage successfully');
} else {
    console.log('Regex did not match!');
}
