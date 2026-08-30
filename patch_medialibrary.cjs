const fs = require('fs');

let content = fs.readFileSync('src/components/admin/MediaLibraryTab.tsx', 'utf-8');

const importReplacement = `import { compressImageFile } from '../../lib/imageUtils';
import { ImageCropModal } from './ImageCropModal';`;
content = content.replace("import { compressImageFile } from '../../lib/imageUtils';", importReplacement);

const stateReplacement = `  const [editingName, setEditingName] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleCropComplete = async (croppedUrl: string) => {
    if (pendingFile) {
      addMedia({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        url: croppedUrl,
        type: 'image',
        name: pendingFile.name,
        date: new Date().toISOString().split('T')[0],
      });
    } else if (selectedItem) {
      // Re-crop existing image
      addMedia({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        url: croppedUrl,
        type: 'image',
        name: selectedItem.name + ' (Cropped)',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setCropImageSrc(null);
    setPendingFile(null);
  };
`;
content = content.replace("  const [editingName, setEditingName] = useState('');\n  const [copySuccess, setCopySuccess] = useState<string | null>(null);\n  const fileInputRef = useRef<HTMLInputElement>(null);", stateReplacement);

const cropActionReplacement = `
                  <div className="pt-3 border-t border-zinc-800">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">Local Asset URL</label>
`;
content = content.replace(cropActionReplacement, `
                  <div className="pt-3 border-t border-zinc-800">
                    <button onClick={() => setCropImageSrc(selectedItem.url)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-md transition-all mb-3 flex items-center justify-center gap-2">
                      Crop & Resize Media
                    </button>
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">Local Asset URL</label>
`);

const handleFilesReplacement = `
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
        setPendingFile(file);
        setCropImageSrc(URL.createObjectURL(file));
        return; // Wait for crop
      } else {
        continue;
      }
`;
content = content.replace(/      if \(file\.type\.includes\('video'\)\) \{[\s\S]*?      \} else \{[\s\S]*?        continue;\n      \}/, handleFilesReplacement);

const modalReplacement = `
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
}`;
content = content.replace("    </div>\n  );\n}", modalReplacement);

fs.writeFileSync('src/components/admin/MediaLibraryTab.tsx', content, 'utf-8');
console.log('Patched MediaLibraryTab.tsx');
