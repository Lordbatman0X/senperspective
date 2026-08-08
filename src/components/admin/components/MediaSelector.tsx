import React, { useState } from 'react';
import { useStore, MediaItem } from '../../../store';
import { Film, Image as ImageIcon, Search, X } from 'lucide-react';

interface MediaSelectorProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function MediaSelector({ onSelect, onClose }: MediaSelectorProps) {
  const { media } = useStore();
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'gif'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (media || []).filter(m => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-brand-white dark:bg-zinc-900 border border-brand-border h-[80vh] max-w-4xl w-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-gray-50 dark:bg-zinc-800">
          <div>
            <h3 className="font-extrabold uppercase tracking-widest text-[#E85D42] text-sm flex items-center gap-1.5">
              <ImageIcon size={16} /> Select Asset from Médiathèque
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">CHOOSE OR INTERPOLATE ONE FROM DEVICE LIST</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-1.5">
            {(['all', 'image', 'video', 'gif'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                  filter === f 
                    ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950 shadow-sm' 
                    : 'bg-white dark:bg-zinc-900 border-brand-border hover:border-[#E85D42]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
            <input 
              type="text"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-brand-border text-xs focus:outline-none focus:border-[#E85D42] font-semibold"
            />
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 bg-gray-50/50 dark:bg-zinc-900/50">
          {filtered.map(m => (
            <div 
              key={m.id} 
              onClick={() => { onSelect(m.url); onClose(); }} 
              className="aspect-square bg-brand-white p-1 border border-brand-border hover:border-[#E85D42] cursor-pointer hover:shadow-md transition-all relative group overflow-hidden flex flex-col"
            >
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center relative">
                {m.type === 'video' ? (
                  <Film size={32} className="text-zinc-400" />
                ) : m.url && m.url.trim() !== '' ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-zinc-400" />
                )}
              </div>
              <div className="p-1 px-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-[10px] font-bold truncate text-zinc-700 dark:text-zinc-300" title={m.name}>
                  {m.name}
                </p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-400 italic text-xs leading-relaxed border-2 border-dashed border-brand-border">
              No matching assets inside the library. Import some inside the Médiathèque tab!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
