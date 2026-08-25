const fs = require('fs');
const content = fs.readFileSync('src/components/admin/RssAutomationTab.tsx', 'utf-8');
const lines = content.split('\n');

// Find the index of "Bilingual newsroom orchestrator:"
let startIdx = lines.findIndex(l => l.includes('Bilingual newsroom orchestrator:'));
// Find the index of "Editorial Staging & Drafts"
let endIdx = lines.findIndex(l => l.includes('Editorial Staging & Drafts'));

// The tabs start at `<div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 overflow-x-auto">`
// which is a few lines before endIdx.
while (!lines[endIdx].includes('<div className="flex items-center gap-2')) {
  endIdx--;
}

const newBlock = `
              </p>
            </div>
          </div>
        </div>
        {/* Clean Newsroom Tab Navigation Bar */}
`;

lines.splice(startIdx + 2, endIdx - startIdx - 2, ...newBlock.split('\n'));
fs.writeFileSync('src/components/admin/RssAutomationTab.tsx', lines.join('\n'));
