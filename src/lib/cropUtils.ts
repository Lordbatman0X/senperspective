export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => {
      // If anonymous CORS failed, retry without crossOrigin
      if (image.getAttribute('crossOrigin')) {
        const fallbackImg = new Image();
        fallbackImg.addEventListener('load', () => resolve(fallbackImg));
        fallbackImg.addEventListener('error', (err) => reject(err));
        fallbackImg.src = url;
      } else {
        reject(new Error('Failed to load image'));
      }
    });
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return imageSrc;

    // Cap output resolution to standard HD to prevent heavy memory usage
    const targetWidth = Math.min(pixelCrop.width, 1600);
    const targetHeight = Math.round(targetWidth * (pixelCrop.height / pixelCrop.width));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(imageSrc);
            return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        }, 'image/jpeg', 0.88);
      } catch (canvasErr) {
        console.warn('[cropUtils] Canvas export tainted, returning original image:', canvasErr);
        resolve(imageSrc);
      }
    });
  } catch (err) {
    console.warn('[cropUtils] getCroppedImg failed, returning original image:', err);
    return imageSrc;
  }
}
