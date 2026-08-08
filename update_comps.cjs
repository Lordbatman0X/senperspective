const fs = require('fs');

// Layout.tsx
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf-8');
layout = layout.replace(/solid-orange/g, 'solid-press');
layout = layout.replace(/<div className="logo">Perspective<\/div>/g, '<div className="logo">View Point</div>');
layout = layout.replace(/<div className="logo-subtitle">GROUP<\/div>/g, '<div className="logo-subtitle">PRESS</div>');
layout = layout.replace(/Perspective Group est une filiale de Boukari Corp/g, 'View Point Press est une filiale de Boukari Corp');
layout = layout.replace(/Perspective Group is a subsidiary of Boukari Corp/g, 'View Point Press is a subsidiary of Boukari Corp');
layout = layout.replace(/About Perspective Group/g, 'About View Point Press');
layout = layout.replace(/© 2025 Perspective Group/g, '© 2025 View Point Press');
fs.writeFileSync('src/components/Layout.tsx', layout);

// Applet context or other strings?
// Let's just check the index.html
let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/<title>.*<\/title>/g, '<title>View Point Press</title>');
fs.writeFileSync('index.html', html);

console.log('Update complete');
