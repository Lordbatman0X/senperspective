const fs = require('fs');
let content = fs.readFileSync('src/components/admin/RssAutomationTab.tsx', 'utf-8');
// I will just find the whole return block and replace the header with something very simple.
const returnMatch = content.indexOf('return (');
if(returnMatch === -1) { console.error("No return found"); process.exit(1); }

// we will keep everything before the return block exactly the same.
const beforeReturn = content.substring(0, returnMatch);
const rest = content.substring(returnMatch);

// The original return block started around line 1015. We'll reconstruct the top of it.
// Instead of patching line by line, let's just make it cleanly:
