import React, { useState, useRef } from 'react';
import { MediaItem } from '../../store';
import { UploadCloud, Search, Trash2, Copy, FileText, Film, Image as ImageIcon, X, Check, Eye } from 'lucide-react';
import { compressImageFile } from '../../lib/imageUtils';

interface MediaLibraryTabProps {
  media: MediaItem[];
  addMedia: (m: MediaItem) => void;
  deleteMedia: (id: string) => void;
  updateMediaName: (id: string, name: string) => void;
}

export function MediaLibraryTab({ media, addMedia, deleteMedia, updateMediaName }: MediaLibraryTabProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'gif'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress helper
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return compressImageFile(file, maxWidth, maxHeight, 0.72);
  };

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      let url = '';
      let type: 'image' | 'video' | 'gif' = 'image';

      if (file.type.includes('video')) {
        type = 'video';
        // For video, we create an Object URL for preview
        url = URL.createObjectURL(file);
      } else if (file.type.includes('gif')) {
        type = 'gif';
        // Read directly as Base64/DataURL for local storage
        url = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(file);
        });
      } else if (file.type.startsWith('image/')) {
        type = 'image';
        url = await resizeImage(file, 1020, 1020);
      } else {
        continue;
      }

      addMedia({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        url,
        type,
        name: file.name,
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  const filtered = (media || []).filter((m) => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const triggerSelect = (item: MediaItem) => {
    setSelectedItem(item);
    setEditingName(item.name);
  };

  const saveEditedName = () => {
    if (selectedItem && editingName.trim()) {
      updateMediaName(selectedItem.id, editingName.trim());
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-3">
        <h2 className="text-3xl font-black uppercase tracking-widest text-zinc-100">Médiathèque</h2>
        <p className="text-xs text-zinc-200 uppercase tracking-wider font-mono">Pressroom Asset Upload</p>
      </div>

      {/* Drag and Drop Uploader Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-[#E85D42] bg-[#E85D42]/10'
            : 'border-zinc-800 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.gif"
          className="hidden"
          onChange={handleFileInput}
        />
        <UploadCloud size={48} className={`mb-4 transition-colors ${dragActive ? 'text-[#E85D42]' : 'text-zinc-200'}`} />
        <h3 className="text-lg font-black uppercase tracking-wider mb-2 text-zinc-100">Drag & Drop device media</h3>
        <p className="text-sm text-zinc-200 max-w-md leading-relaxed mb-4">
          Upload cover assets or body content images directly from your computer or phone. Supported formats: images, animated GIFs, and videos.
        </p>
        <button
          type="button"
          className="bg-[#E85D42] hover:bg-[#c94931] text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-md shadow-md active:scale-95 transition-all cursor-pointer"
        >
          Select Files from Device
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-4 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap gap-2">
          {(['all', 'image', 'video', 'gif'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border rounded-md transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#E85D42] border-[#E85D42] text-white shadow-sm'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-700 hover:border-[#E85D42] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-zinc-200" />
          <input
            type="text"
            placeholder="Search media files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-700/80 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] font-semibold placeholder-zinc-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Media Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => triggerSelect(m)}
              className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg overflow-hidden group cursor-pointer hover:border-[#E85D42] hover:shadow-xl transition-all relative flex flex-col justify-between"
            >
              <div className="aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden relative">
                {m.type === 'video' ? (
                  <Film size={48} className="text-zinc-500" />
                ) : m.url && m.url.trim() !== '' ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <ImageIcon size={48} className="text-zinc-500" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="p-2 bg-white/20 backdrop-blur-md text-white hover:bg-[#E85D42] transition-colors rounded-full">
                    <Eye size={18} />
                  </span>
                </div>
              </div>
              <div className="p-3 border-t border-zinc-800">
                <p className="text-xs font-bold truncate text-zinc-100 mb-1" title={m.name}>
                  {m.name}
                </p>
                <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-200">
                  <span className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-xs">{m.type}</span>
                  <span>{m.date}</span>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-200 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-zinc-800 bg-zinc-900/60 rounded-lg">
              No pressroom media matching filter / search terms.
            </div>
          )}
        </div>

        {/* Media Detail Inspector Panel */}
        <div className="border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-2xl rounded-lg flex flex-col justify-between h-fit lg:sticky lg:top-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2 text-zinc-100">
              <FileText size={16} className="text-[#E85D42]" /> Asset Inspector
            </h3>
            {selectedItem ? (
              <div className="space-y-6">
                <div className="aspect-video bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden flex items-center justify-center">
                  {selectedItem.type === 'video' ? (
                    <Film size={32} className="text-zinc-500" />
                  ) : selectedItem.url && selectedItem.url.trim() !== '' ? (
                    <img src={selectedItem.url} alt={selectedItem.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon size={32} className="text-zinc-500" />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">Rename File</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-zinc-800 pt-3">
                    <div>
                      <span className="text-zinc-200 block uppercase">Type</span>
                      <span className="font-bold uppercase text-zinc-200">{selectedItem.type}</span>
                    </div>
                    <div>
                      <span className="text-zinc-200 block uppercase">Uploaded</span>
                      <span className="font-bold text-zinc-200">{selectedItem.date}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">Local Asset URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={selectedItem.url.substring(0, 50) + '...'}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] font-mono p-1.5 rounded-md select-all cursor-not-allowed"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedItem.url, selectedItem.id)}
                        className="bg-zinc-950 border border-zinc-700 hover:bg-[#E85D42] hover:border-[#E85D42] text-zinc-200 hover:text-white p-2 rounded-md transition-colors cursor-pointer"
                        title="Copy to Markdown link"
                      >
                        {copySuccess === selectedItem.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-[9px] text-[#E85D42] mt-1 font-semibold">Copy and paste this URL in Markdown bodies to display images.</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t border-zinc-800">
                  <button
                    onClick={saveEditedName}
                    className="flex-1 bg-[#E85D42] hover:bg-[#c94931] text-white font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-md transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this asset?')) {
                        deleteMedia(selectedItem.id);
                        setSelectedItem(null);
                      }
                    }}
                    className="p-2 border border-red-900/50 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-md transition-colors cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-zinc-200 italic text-xs leading-relaxed">
                Select an asset from the library on the left to inspect variables, grab inline URLs, rename captions, or remove.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
