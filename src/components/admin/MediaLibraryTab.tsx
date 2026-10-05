import React, { useState, useRef } from 'react';
import { MediaItem } from '../../store';
import {
  UploadCloud, Search, Trash2, Copy, FileText, Film, Image as ImageIcon,
  X, Check, Eye, Loader2, CheckSquare, Square, Layers, Sparkles
} from 'lucide-react';
import { compressImageFile } from '../../lib/imageUtils';
import { ImageCropModal } from './ImageCropModal';

interface MediaLibraryTabProps {
  media: MediaItem[];
  addMedia: (m: MediaItem) => void;
  addMediaBatch?: (items: MediaItem[]) => Promise<void>;
  deleteMedia: (id: string) => void;
  deleteMediaBatch?: (ids: string[]) => void;
  updateMediaName: (id: string, name: string) => void;
}

export function MediaLibraryTab({
  media,
  addMedia,
  addMediaBatch,
  deleteMedia,
  deleteMediaBatch,
  updateMediaName,
}: MediaLibraryTabProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'gif'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Bulk Upload & Selection States
  const [uploadMode, setUploadMode] = useState<'bulk' | 'crop'>('bulk');
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    filename: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const handleCropComplete = async (croppedUrl: string) => {
    if (pendingFile) {
      addMedia({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        url: croppedUrl,
        type: 'image',
        name: pendingFile.name,
        date: new Date().toISOString().split('T')[0],
      });
      setStatusMessage({ tone: 'ok', text: `Image « ${pendingFile.name} » recadrée et ajoutée !` });
      setTimeout(() => setStatusMessage(null), 4000);
    } else if (selectedItem) {
      addMedia({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        url: croppedUrl,
        type: 'image',
        name: selectedItem.name + ' (Cropped)',
        date: new Date().toISOString().split('T')[0],
      });
      setStatusMessage({ tone: 'ok', text: `Nouvelle version recadrée enregistrée !` });
      setTimeout(() => setStatusMessage(null), 4000);
    }
    setCropImageSrc(null);
    setPendingFile(null);
  };

  /**
   * Bulk file processor: handles multiple images, gifs and videos cleanly without blocking.
   */
  const handleFiles = async (files: FileList | File[], forceBulk = false) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Single image in crop mode -> open crop modal
    if (fileArray.length === 1 && fileArray[0].type.startsWith('image/') && !forceBulk && uploadMode === 'crop') {
      const file = fileArray[0];
      setPendingFile(file);
      setCropImageSrc(URL.createObjectURL(file));
      return;
    }

    // Bulk upload mode: process all files
    setUploadProgress({
      active: true,
      current: 0,
      total: fileArray.length,
      filename: fileArray[0].name,
    });
    setStatusMessage(null);

    const newMediaItems: MediaItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress({
        active: true,
        current: i + 1,
        total: fileArray.length,
        filename: file.name,
      });

      let url = '';
      let type: 'image' | 'video' | 'gif' = 'image';

      try {
        if (file.type.includes('video')) {
          type = 'video';
          url = URL.createObjectURL(file);
        } else if (file.type.includes('gif')) {
          type = 'gif';
          url = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve((r.result as string) || '');
            r.readAsDataURL(file);
          });
        } else if (file.type.startsWith('image/')) {
          type = 'image';
          // Compress for smooth cloud sync and lightweight asset delivery
          url = await compressImageFile(file, 1600, 1200, 0.80);
        } else {
          continue;
        }

        if (url) {
          newMediaItems.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7) + i,
            url,
            type,
            name: file.name,
            date: today,
          });
        }
      } catch (err) {
        console.error(`Erreur d'import pour ${file.name}:`, err);
      }
    }

    if (newMediaItems.length > 0) {
      if (addMediaBatch) {
        await addMediaBatch(newMediaItems);
      } else {
        newMediaItems.forEach(item => addMedia(item));
      }
      setStatusMessage({
        tone: 'ok',
        text: `${newMediaItems.length} fichier(s) importé(s) avec succès dans la Médiathèque !`,
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } else {
      setStatusMessage({
        tone: 'error',
        text: 'Aucun fichier valide n’a pu être importé.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }

    setUploadProgress(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files, e.dataTransfer.files.length > 1);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files, e.target.files.length > 1);
      e.target.value = '';
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  const filtered = (media || []).filter((m) => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = (m.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const triggerSelect = (item: MediaItem) => {
    if (isMultiSelectMode) {
      toggleSelectItem(item.id);
      return;
    }
    setSelectedItem(item);
    setEditingName(item.name);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Supprimer définitivement les ${selectedIds.size} média(s) sélectionnés ?`)) return;

    if (deleteMediaBatch) {
      deleteMediaBatch(Array.from(selectedIds));
    } else {
      selectedIds.forEach(id => deleteMedia(id));
    }

    if (selectedItem && selectedIds.has(selectedItem.id)) {
      setSelectedItem(null);
    }
    setSelectedIds(new Set());
    setStatusMessage({ tone: 'ok', text: 'Médias sélectionnés supprimés.' });
    setTimeout(() => setStatusMessage(null), 4000);
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

      {/* Status Notification Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-lg text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
          statusMessage.tone === 'ok'
            ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-200'
            : 'bg-red-950/80 border border-red-700/80 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.tone === 'ok' ? <Check size={16} className="text-emerald-400" /> : <X size={16} className="text-red-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drag and Drop Uploader Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all ${
          dragActive
            ? 'border-[#E85D42] bg-[#E85D42]/10 scale-[1.005]'
            : 'border-zinc-800 bg-zinc-900/80 backdrop-blur-md hover:border-zinc-700'
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
        <UploadCloud size={46} className={`mb-3 transition-colors ${dragActive ? 'text-[#E85D42]' : 'text-zinc-300'}`} />
        <h3 className="text-lg font-black uppercase tracking-wider mb-1 text-zinc-100 flex items-center gap-2">
          <span>Téléversement Médias & Photos</span>
          <span className="text-[10px] bg-[#E85D42]/20 text-[#E85D42] border border-[#E85D42]/30 px-2 py-0.5 rounded font-mono font-bold">
            SUPPORT BULK
          </span>
        </h3>
        <p className="text-xs text-zinc-400 max-w-lg leading-relaxed mb-4">
          Glissez-déposez vos fichiers par lot ou sélectionnez plusieurs images à la fois.
          Formats acceptés : JPG, PNG, WebP, GIF animés et vidéos courtes.
        </p>

        {/* Upload Mode Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onButtonClick}
            disabled={uploadProgress?.active}
            className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-md shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Layers size={14} />
            Sélectionner en masse (Bulk Upload)
          </button>
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setUploadMode('bulk')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                uploadMode === 'bulk'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Import direct (sans recadrage)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('crop')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                uploadMode === 'crop'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Mode recadrage (1 par 1)
            </button>
          </div>
        </div>

        {/* Real-time Bulk Upload Progress Bar */}
        {uploadProgress?.active && (
          <div className="w-full max-w-md mt-6 bg-zinc-950 border border-zinc-700/80 rounded-lg p-4 space-y-2.5 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-200">
              <span className="flex items-center gap-2 text-[#E85D42]">
                <Loader2 size={13} className="animate-spin" />
                Traitement groupé en cours…
              </span>
              <span>
                {uploadProgress.current} / {uploadProgress.total} fichier(s)
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#E85D42] to-amber-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.max(5, Math.round((uploadProgress.current / uploadProgress.total) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-zinc-400 truncate">
              Fichier en cours : <span className="text-zinc-200">{uploadProgress.filename}</span>
            </p>
          </div>
        )}
      </div>

      {/* Filter, Search & Bulk Actions Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-4 border border-zinc-800 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'image', 'video', 'gif'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest border rounded-md transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-[#E85D42] border-[#E85D42] text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-700 hover:border-[#E85D42] hover:text-white'
                }`}
              >
                {f === 'all' ? `Tous (${media.length})` : f}
              </button>
            ))}
            <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) setSelectedIds(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              <CheckSquare size={13} />
              {isMultiSelectMode ? 'Quitter sélection' : 'Sélection groupée'}
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-700/80 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42] font-semibold placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Multi-Select Toolbar (appears when multi-select active) */}
        {isMultiSelectMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white cursor-pointer"
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare size={14} className="text-[#E85D42]" />
                ) : (
                  <Square size={14} />
                )}
                {selectedIds.size === filtered.length && filtered.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <span className="text-xs font-mono text-zinc-400">
                <strong className="text-white">{selectedIds.size}</strong> sélectionné(s) sur {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                  Supprimer la sélection ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Media Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const isSelected = selectedIds.has(m.id);
            return (
              <div
                key={m.id}
                onClick={() => triggerSelect(m)}
                className={`bg-zinc-900/80 backdrop-blur-md border rounded-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#E85D42] ring-2 ring-[#E85D42]/40 bg-zinc-900'
                    : 'border-zinc-800 hover:border-[#E85D42]'
                }`}
              >
                {/* Selection Checkbox */}
                {(isMultiSelectMode || isSelected) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectItem(m.id);
                    }}
                    className="absolute top-2 left-2 z-10 p-1 rounded bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
                    title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-[#E85D42]" />
                    ) : (
                      <Square size={16} className="text-zinc-400" />
                    )}
                  </button>
                )}

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
            );
          })}

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
                    <button onClick={() => setCropImageSrc(selectedItem.url)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-md transition-all mb-3 flex items-center justify-center gap-2">
                      Crop & Resize Media
                    </button>
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

      {cropImageSrc && (
        <ImageCropModal 
          imageSrc={cropImageSrc} 
          onCropComplete={handleCropComplete} 
          onClose={() => { setCropImageSrc(null); setPendingFile(null); }} 
          aspectRatio={16 / 9}
        />
      )}
    </div>
  );
}
