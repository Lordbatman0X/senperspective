import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.tsx';
let content = readFileSync(file, 'utf8');

// Remove full-screen "Loading articles" overlay, keep top-edge syncbar
const oldBlock = `{!-- Glassy sync indicator -- shows while fresh content loads from the cloud -->
        {isLoadingArticles && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#E85D42] to-transparent animate-[syncbar_1.2s_ease-in-out_infinite]" />
            <style>{@keyframes syncbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }}</style>
          </div>
        )}
        {/* Full loading screen on first visit when no articles loaded yet */}
        {isLoadingArticles && rawArticles.length === 0 && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-[#0a0a0a]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#E85D42] border-t-transparent animate-spin" />
              <p className="text-sm text-zinc-400 font-mono">Chargement des articles...</p>
            </div>
          </div>
        )}
        <NotificationToastHost />`;

const newBlock = `{!-- Glassy sync indicator -- top edge only, no full-screen overlay -->
        {isLoadingArticles && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#E85D42] to-transparent animate-[syncbar_1.2s_ease-in-out_infinite]" />
            <style>{@keyframes syncbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }}</style>
          </div>
        )}
        {/* Articles always show from cache while fresh content loads in background */}
        <NotificationToastHost />`;

if (!content.includes('{<!-- Full loading screen')) {
  console.log('Trying broader search...');
}

// Check line endings
const hasCRLF = content.includes('\r\n');
console.log('CRLF:', hasCRLF);

const idx = content.indexOf('<!-- Full loading screen');
console.log('Index of "Full loading screen":', idx);

if (idx === -1) {
  // Try alternative
  const altIdx = content.indexOf('Full loading');
  console.log('Alt index:', altIdx);
}

writeFileSync('debug-out.txt', `CRLF: ${hasCRLF}\nIndex: ${idx}\nAlt: ${content.indexOf('Full loading')}\nFirst 200 chars:\n${content.substring(0, 200)}`);
