const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetClass = 'class="text-[10px] text-slate-400 dark:text-slate-500 font-bold h-3 mb-1"';
const newClass = 'class="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 mt-0.5"';

html = html.split(targetClass).join(newClass);
fs.writeFileSync('index.html', html);
console.log('Replaced classes successfully');
