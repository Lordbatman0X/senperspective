const fs = require('fs');
const lines = fs.readFileSync('src/components/AccountDrawer.tsx', 'utf8').split(/\r?\n/);
for (let i = 1183; i < Math.min(1470, lines.length); i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
