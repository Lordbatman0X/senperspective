const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf-8');

// The logic we want: solid-press is white background, dark text
css = css.replace(/.header-main.solid-press .logo-subtitle {\n    color: rgba\(255,255,255,0.9\);\n}/g, '');

css = css.replace(/\.header-main\.solid-press .search-bar {[^}]*}/g, '');
css = css.replace(/\.header-main\.solid-press .search-bar:hover, .header-main.solid-press .search-bar.focused {[^}]*}/g, '');
css = css.replace(/\.header-main\.solid-press .search-bar input {[^}]*}/g, '');
css = css.replace(/\.header-main\.solid-press .search-bar input::placeholder {[^}]*}/g, '');
css = css.replace(/\.header-main\.solid-press .search-icon {[^}]*}/g, '');

fs.writeFileSync('src/index.css', css);
console.log('Fixed CSS');
