const fs = require('fs');

let content = fs.readFileSync('src/components/admin/AdManagerTab.tsx', 'utf-8');

const oldTabs = `<div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 w-fit mb-6 shadow-sm">
        <button 
          onClick={() => setActiveSubTab('monitor')}
          className={\`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all \${
            activeSubTab === 'monitor' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }\`}
        >
          {isFr ? 'Vue d\\'Ensemble' : 'Live Monitor'}
        </button>
        <button 
          onClick={() => {
            setEditingAd(null);
            setActiveSubTab('editor');
          }}
          className={\`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all \${
            activeSubTab === 'editor' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }\`}
        >
          {isFr ? 'Créer une Campagne' : 'Launch Campaign'}
        </button>
      </div>`;

const newTabs = `<div className="flex flex-wrap gap-2 mb-8 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
        <button 
          onClick={() => setActiveSubTab('monitor')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer \${
            activeSubTab === 'monitor' 
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30' 
              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }\`}
        >
          <MonitorPlay size={15} />
          <span>{isFr ? 'Vue d\\'Ensemble' : 'Live Monitor'}</span>
        </button>
        <button 
          onClick={() => {
            setEditingAd(null);
            setActiveSubTab('editor');
          }}
          className={\`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer \${
            activeSubTab === 'editor' 
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50 border border-orange-500/30' 
              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }\`}
        >
          <Megaphone size={15} />
          <span>{isFr ? 'Créer une Campagne' : 'Launch Campaign'}</span>
        </button>
      </div>`;

content = content.replace(oldTabs, newTabs);

fs.writeFileSync('src/components/admin/AdManagerTab.tsx', content, 'utf-8');
console.log('Patched AdManagerTab UI');
