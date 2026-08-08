const fs = require('fs');
let file = fs.readFileSync('src/index.css', 'utf-8');
file = file.replace(/#E85D42/g, '#1e3a8a');
file = file.replace(/#e85d42/gi, '#1e3a8a');
file = file.replace(/rgba\(232,\s*93,\s*66/g, 'rgba(30, 58, 138');
file = file.replace(/Montserrat/g, 'Inter');
file = file.replace(/solid-orange/g, 'solid-press');
fs.writeFileSync('src/index.css', file);
fs.unlinkSync('update_css.js'); // clean up the bad one
console.log('Update complete');
