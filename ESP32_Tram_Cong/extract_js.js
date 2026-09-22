const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptStart = html.indexOf('<script type="module">');
const scriptEnd = html.lastIndexOf('</script>');
const js = html.substring(scriptStart + 22, scriptEnd);
fs.writeFileSync('temp.js', js);
console.log("Wrote temp.js");
