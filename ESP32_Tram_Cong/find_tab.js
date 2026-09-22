const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('id="tab-settings"')) {
        console.log('Found tab-settings at line: ' + (i+1));
        break;
    }
}
