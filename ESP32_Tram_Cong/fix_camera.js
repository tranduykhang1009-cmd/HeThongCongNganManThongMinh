const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix mouse zoom coordinates
const oldMouseMath = `        // Tọa độ chuột so với tâm khung hình
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;`;

const newMouseMath = `        // Tọa độ chuột so với góc trên bên trái (phù hợp với origin-top-left)
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;`;

if (html.includes(oldMouseMath)) {
    html = html.replace(oldMouseMath, newMouseMath);
    console.log('Fixed zoom math');
}

// 2. Add blur background img
const oldImgTag = `<img id="cam-stream" src="" alt="Live Camera Stream" class="hidden w-full h-full object-contain pointer-events-none origin-top-left z-0">`;
const newImgTags = `<img id="cam-bg-blur" src="" alt="" class="hidden absolute inset-0 w-full h-full object-cover blur-xl opacity-60 z-0 scale-110 pointer-events-none">
                    <img id="cam-stream" src="" alt="Live Camera Stream" class="hidden w-full h-full object-contain pointer-events-none origin-top-left z-10 relative">`;

if (html.includes(oldImgTag)) {
    html = html.replace(oldImgTag, newImgTags);
    console.log('Added blur background element');
} else {
    // Maybe z-0 was changed or something, let's try a regex
    const imgRegex = /<img id="cam-stream" [^>]*z-0[^>]*>/;
    if (imgRegex.test(html)) {
        html = html.replace(imgRegex, newImgTags);
        console.log('Added blur background element (via regex)');
    }
}

// 3. Update wsCam.onmessage and decrease watchdog
const oldOnMessage = `if (event.data instanceof Blob) {
                if (img) {
                    if (img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                    img.src = URL.createObjectURL(event.data);
                }
            }`;

const newOnMessage = `if (event.data instanceof Blob) {
                if (img) {
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
                }
            }`;

if (html.includes(oldOnMessage)) {
    html = html.replace(oldOnMessage, newOnMessage);
    console.log('Updated onmessage to handle blur background');
}

// Decrease watchdog to 1500ms
html = html.replace('}, 3000);', '}, 1500);');
console.log('Decreased watchdog to 1.5s');

fs.writeFileSync('index.html', html);
console.log('Camera fixes applied successfully');
