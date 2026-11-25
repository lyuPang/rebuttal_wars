import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<string>>();

function isBackground(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 225 && max - min < 24;
}

function removeBackground(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext('2d', { willReadFrequently: true });
        if (!g) return resolve(src);
        g.drawImage(img, 0, 0);
        const data = g.getImageData(0, 0, w, h);
        const px = data.data;
        const visited = new Uint8Array(w * h);
        const stack: number[] = [];
        const pushIf = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const i = y * w + x;
          if (visited[i]) return;
          const o = i * 4;
          if (!isBackground(px[o], px[o + 1], px[o + 2])) return;
          visited[i] = 1;
          stack.push(i);
        };
        for (let x = 0; x < w; x++) {
          pushIf(x, 0);
          pushIf(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          pushIf(0, y);
          pushIf(w - 1, y);
        }
        while (stack.length) {
          const i = stack.pop()!;
          px[i * 4 + 3] = 0;
          const x = i % w;
          const y = (i - x) / w;
          pushIf(x + 1, y);
          pushIf(x - 1, y);
          pushIf(x, y + 1);
          pushIf(x, y - 1);
        }
        g.putImageData(data, 0, 0);
        canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : src), 'image/png');
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function useTransparentImage(src: string): string {
  const [out, setOut] = useState<string>(src);
  useEffect(() => {
    let alive = true;
    let p = cache.get(src);
    if (!p) {
      p = removeBackground(src);
      cache.set(src, p);
    }
    p.then((url) => {
      if (alive) setOut(url);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return out;
}

export function preloadTransparent(srcs: string[]): void {
  for (const s of srcs) {
    if (!cache.has(s)) cache.set(s, removeBackground(s));
  }
}
