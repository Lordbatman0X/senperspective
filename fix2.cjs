const fs = require('fs');
let content = fs.readFileSync('src/components/admin/RssAutomationTab.tsx', 'utf-8');

const startStr = '<div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">';
const endStr = '{/* Clean Newsroom Tab Navigation Bar */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if(startIndex > -1 && endIndex > -1) {
  const newHeader = `
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Newsroom Editorial Desk
              </h2>
            </div>
          </div>
        </div>
        
  `;
  content = content.substring(0, startIndex) + newHeader + content.substring(endIndex);
  
  // also let's clean up any weird artifacts left from previous patches between 1050 and 1070
  // Actually the above string replacement removes everything in between!
  fs.writeFileSync('src/components/admin/RssAutomationTab.tsx', content);
  console.log("Replaced header block");
} else {
  console.log("Could not find start or end block");
}
