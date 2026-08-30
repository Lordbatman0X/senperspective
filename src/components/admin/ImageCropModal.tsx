import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { getCroppedImg } from '../../lib/cropUtils';

interface ImageCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onClose: () => void;
  aspectRatio?: number;
}

export function ImageCropModal({ imageSrc, onCropComplete, onClose, aspectRatio = 16 / 9 }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-brand-white dark:bg-zinc-900 border border-brand-border w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-gray-50 dark:bg-zinc-800">
          <h3 className="font-extrabold uppercase tracking-widest text-[#E85D42] text-sm">Crop & Resize Media</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative flex-1 bg-zinc-950 overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 border-t border-brand-border bg-gray-50 dark:bg-zinc-800 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#E85D42]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-brand-border bg-white dark:bg-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all">Cancel</button>
            <button onClick={showCroppedImage} className="px-4 py-2 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider shadow flex items-center gap-2 transition-all">
              <Check size={16} /> Save Cropped Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
