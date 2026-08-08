const fs = require('fs');
const missingCSS = `
.header-main.solid-orange .logo-subtitle {
    color: rgba(255,255,255,0.9);
}

.header-main.solid-orange .search-bar {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
}

.header-main.solid-orange .search-bar:hover, .header-main.solid-orange .search-bar.focused {
    background: rgba(255,255,255,0.2);
    border-color: rgba(255,255,255,0.3);
}

.header-main.solid-orange .search-bar input {
    color: white;
}

.header-main.solid-orange .search-bar input::placeholder {
    color: rgba(255,255,255,0.7);
}

.header-main.solid-orange .search-icon {
    color: rgba(255,255,255,0.7);
}
`;
fs.appendFileSync('src/index.css', missingCSS);
console.log('Restored missing CSS');
