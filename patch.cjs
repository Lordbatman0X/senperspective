const fs = require('fs');
const content = fs.readFileSync('src/components/admin/RssAutomationTab.tsx', 'utf-8');
const lines = content.split('\n');

const fix = `
            </div>
        </div>
        {/* Clean Newsroom Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveNewsroomTab('drafts')}
            className={\`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer \${
              activeNewsroomTab === 'drafts'
`;
lines.splice(1051, 0, ...fix.split('\n'));
fs.writeFileSync('src/components/admin/RssAutomationTab.tsx', lines.join('\n'));
