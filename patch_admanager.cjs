const fs = require('fs');

let content = fs.readFileSync('src/components/admin/AdManagerTab.tsx', 'utf-8');

const importReplacement = `import { getSafeText } from '../../lib/utils';
import { ImageCropModal } from './ImageCropModal';
import { compressImageFile } from '../../lib/imageUtils';`;
content = content.replace("import { getSafeText } from '../../lib/utils';", importReplacement);

const stateReplacement = `  const [previewTab, setPreviewTab] = useState<string>('in-article');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
    }
  };

  const handleCropComplete = async (croppedUrl: string) => {
    if (editingAd) {
      setEditingAd({ ...editingAd, imageUrl: croppedUrl });
    }
    setCropImageSrc(null);
  };
`;
content = content.replace("  const [previewTab, setPreviewTab] = useState<string>('in-article');\n  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);", stateReplacement);

const inputReplacement = `                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editingAd.imageUrl} 
                        onChange={e => setEditingAd({ ...editingAd, imageUrl: e.target.value })} 
                        className="flex-1 bg-zinc-900 border border-zinc-700/80 text-white p-3 text-sm focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] rounded-lg shadow-inner font-mono" 
                        placeholder="https://..." 
                      />
                      <button 
                        type="button" 
                        onClick={() => openMediaSelector((url) => setEditingAd({ ...editingAd, imageUrl: url }))} 
                        className="bg-zinc-800 text-white px-4 py-2 hover:bg-zinc-700 transition-colors flex items-center justify-center rounded-lg border border-zinc-700"
                        title={isFr ? "Choisir depuis la médiathèque" : "Choose from Media Library"}
                      >
                        <ImageIcon size={18} />
                      </button>
                      <label className="bg-zinc-800 text-white px-4 py-2 hover:bg-zinc-700 transition-colors flex items-center justify-center rounded-lg border border-zinc-700 cursor-pointer" title={isFr ? "Uploader depuis l'appareil" : "Upload from Device"}>
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleDeviceUpload} />
                      </label>
                    </div>`;

content = content.replace(/<div className="flex gap-2">\s*<input[^>]+>\s*<button[^>]+>\s*<ImageIcon size=\{18\} \/>\s*<\/button>\s*<\/div>/g, inputReplacement);

const cropModalReplacement = `      {/* Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal 
          imageSrc={cropImageSrc} 
          onCropComplete={handleCropComplete} 
          onClose={() => setCropImageSrc(null)} 
          aspectRatio={editingAd?.position === 'sidebar' ? 1 : 16 / 9}
        />
      )}
    </div>
  );
}`;

content = content.replace("    </div>\n  );\n}", cropModalReplacement);

fs.writeFileSync('src/components/admin/AdManagerTab.tsx', content, 'utf-8');
console.log('Patched AdManagerTab.tsx');
