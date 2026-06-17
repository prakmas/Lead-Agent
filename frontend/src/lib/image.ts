// Client-side image helpers — resize before storing so listings stay small.

const drawToDataUrl = (img: HTMLImageElement, maxSize: number, quality: number) => {
  let { width, height } = img;
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Read a File, resize to maxSize (longest edge), return a JPEG data URL.
export const fileToResizedDataUrl = (file: File, maxSize = 1000, quality = 0.82) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = await loadImage(e.target?.result as string);
        resolve(drawToDataUrl(img, maxSize, quality));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Make a small thumbnail from an existing data URL (for list/cover display).
export const dataUrlToThumb = async (dataUrl: string, maxSize = 260, quality = 0.7) => {
  const img = await loadImage(dataUrl);
  return drawToDataUrl(img, maxSize, quality);
};
