export interface TitleAssetCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Remove fundos externos sólidos opacos (preto ou branco) usando flood-fill
 * de 4 vizinhos a partir das bordas, preservando áreas escuras internas (como o azul do brasão),
 * e calcula o recorte justo ao redor dos pixels não transparentes.
 */
export function processTitleImagePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cropPaddingPx = 6,
): TitleAssetCropBox {
  const total = width * height;
  if (total === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const cornerIndices = [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1,
  ];
  let transparentCorners = 0;
  let blackCorners = 0;
  let whiteCorners = 0;

  for (const idx of cornerIndices) {
    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = data[p + 3];
    if (a <= 16) {
      transparentCorners++;
    } else if (Math.max(r, g, b) <= 24) {
      blackCorners++;
    } else if (Math.min(r, g, b) >= 230 && Math.max(r, g, b) - Math.min(r, g, b) <= 24) {
      whiteCorners++;
    }
  }

  // Só executa o recorte de fundo pela borda quando os cantos são preto opaco ou branco opaco
  if (transparentCorners < 2 && (blackCorners >= 2 || whiteCorners >= 2)) {
    const mode: 'black' | 'white' = blackCorners >= whiteCorners ? 'black' : 'white';
    const isBg = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const matchesBg = (idx: number): boolean => {
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const a = data[p + 3];
      if (a <= 16) return true;
      if (mode === 'black') {
        return Math.max(r, g, b) <= 14;
      }
      return Math.min(r, g, b) >= 232 && Math.max(r, g, b) - Math.min(r, g, b) <= 24;
    };

    const tryPush = (idx: number) => {
      if (isBg[idx] === 0 && matchesBg(idx)) {
        isBg[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < width; x++) {
      tryPush(x);
      tryPush((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      tryPush(y * width);
      tryPush(y * width + (width - 1));
    }

    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % width;
      const cy = (cur - cx) / width;

      if (cx > 0) tryPush(cur - 1);
      if (cx + 1 < width) tryPush(cur + 1);
      if (cy > 0) tryPush(cur - width);
      if (cy + 1 < height) tryPush(cur + width);
    }

    for (let i = 0; i < total; i++) {
      if (isBg[i]) {
        data[i * 4 + 3] = 0;
      }
    }

    // Suavização anti-serrilhamento na borda e recuperação de brilho no anel externo de 2px
    if (mode === 'black') {
      const ringDist = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        if (isBg[i]) continue;
        const x = i % width;
        const y = (i - x) / width;
        const touchesBg =
          (x > 0 && isBg[i - 1]) ||
          (x + 1 < width && isBg[i + 1]) ||
          (y > 0 && isBg[i - width]) ||
          (y + 1 < height && isBg[i + width]);
        if (touchesBg) ringDist[i] = 1;
      }
      for (let i = 0; i < total; i++) {
        if (isBg[i] || ringDist[i] === 1) continue;
        const x = i % width;
        const y = (i - x) / width;
        const touchesRing1 =
          (x > 0 && ringDist[i - 1] === 1) ||
          (x + 1 < width && ringDist[i + 1] === 1) ||
          (y > 0 && ringDist[i - width] === 1) ||
          (y + 1 < height && ringDist[i + width] === 1);
        if (touchesRing1) ringDist[i] = 2;
      }

      for (let i = 0; i < total; i++) {
        if (ringDist[i] === 0) continue;
        const p = i * 4;
        const maxCh = Math.max(data[p], data[p + 1], data[p + 2]);
        if (maxCh < 54) {
          const factor = Math.max(0, Math.min(1, (maxCh - 10) / 44));
          const newAlpha = Math.round(data[p + 3] * factor);
          data[p + 3] = newAlpha;
          if (newAlpha > 8) {
            const lift = Math.min(2.4, 255 / newAlpha);
            data[p] = Math.min(255, Math.round(data[p] * lift));
            data[p + 1] = Math.min(255, Math.round(data[p + 1] * lift));
            data[p + 2] = Math.min(255, Math.round(data[p + 2] * lift));
          }
        }
      }
    }
  }

  // Caixa delimitadora justa dos pixels visíveis de primeiro plano (alfa > 10)
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  const cropX = Math.max(0, minX - cropPaddingPx);
  const cropY = Math.max(0, minY - cropPaddingPx);
  const cropRight = Math.min(width - 1, maxX + cropPaddingPx);
  const cropBottom = Math.min(height - 1, maxY + cropPaddingPx);

  return {
    x: cropX,
    y: cropY,
    width: cropRight - cropX + 1,
    height: cropBottom - cropY + 1,
  };
}

const processedUrlCache = new Map<string, Promise<string>>();

/**
 * Carrega uma imagem de `src`, reduz fontes muito grandes para <=1024px de largura
 * para recorte rápido na thread principal, remove molduras pretas/brancas externas,
 * ajusta as margens transparentes e armazena em cache a URL resultante.
 */
export function loadProcessedTitleAssetUrl(src: string, maxDim = 1024): Promise<string> {
  const cacheKey = `${src}::${maxDim}`;
  const existing = processedUrlCache.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        const scale = rawW > maxDim ? maxDim / rawW : 1;
        const w = Math.max(1, Math.round(rawW * scale));
        const h = Math.max(1, Math.round(rawH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const crop = processTitleImagePixels(imageData.data, w, h, 4);
        ctx.putImageData(imageData, 0, 0);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = crop.width;
        outCanvas.height = crop.height;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(src);
          return;
        }
        outCtx.drawImage(
          canvas,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );

        const releaseTempCanvases = () => {
          canvas.width = 0;
          canvas.height = 0;
          outCanvas.width = 0;
          outCanvas.height = 0;
        };

        if (typeof outCanvas.toBlob === 'function') {
          outCanvas.toBlob((blob) => {
            const url = blob ? URL.createObjectURL(blob) : outCanvas.toDataURL('image/png');
            releaseTempCanvases();
            resolve(url);
          }, 'image/png');
        } else {
          const url = outCanvas.toDataURL('image/png');
          releaseTempCanvases();
          resolve(url);
        }
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  processedUrlCache.set(cacheKey, promise);
  return promise;
}

/**
 * Margens normalizadas exatas da canaleta dourada interna dentro da moldura recortada
 * da barra de carregamento, calibradas para a geometria em pixels da arte.
 */
export const LOADING_BAR_TRACK_INSET = {
  leftPct: 9.9,
  topPct: 55.66,
  widthPct: 79.48,
  heightPct: 15.5,
} as const;

/**
 * Substitui o preenchimento azul estático pré-pintado (e a borda direita) dentro da cápsula
 * da barra pela cor exata do fundo azul-marinho vazio de cada linha, permitindo que uma
 * barra dinâmica de 0%..100% anime com perfeição dentro da moldura dourada intacta.
 */
export function hollowOutLoadingBarTrack(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  crop: TitleAssetCropBox,
): void {
  const x0 = Math.max(0, crop.x + Math.floor(crop.width * 0.096));
  const x1 = Math.min(width - 1, crop.x + Math.ceil(crop.width * 0.768));
  const xSample = Math.min(width - 1, crop.x + Math.floor(crop.width * 0.8));
  const xCapMin = crop.x + Math.floor(crop.width * 0.715);
  const y0 = Math.max(0, crop.y + Math.floor(crop.height * 0.553));
  const y1 = Math.min(height - 1, crop.y + Math.ceil(crop.height * 0.714));

  for (let y = y0; y <= y1; y++) {
    // Amostra a cor autêntica da canaleta vazia na região direita da mesma linha
    const sp = (y * width + xSample) * 4;
    const sr = data[sp];
    const sg = data[sp + 1];
    const sb = data[sp + 2];
    const isAuthenticNavySample = sr <= 20 && sg <= 45 && sb >= 15 && sb <= 95;
    const emptyR = isAuthenticNavySample ? sr : 0;
    const emptyG = isAuthenticNavySample ? sg : 7;
    const emptyB = isAuthenticNavySample ? sb : 33;

    let insideBakedBarOnRow = false;
    for (let x = x0; x <= x1; x++) {
      const p = (y * width + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const a = data[p + 3];
      if (a < 20) continue;

      const isBakedBlueFill =
        (b >= 68 && b > r + 26) ||
        (b >= 105 && g >= 72 && r < 145 && b >= r + 12);

      // Também limpa a borda escura da extremidade direita da barra azul estática (~74% da largura)
      const isBakedRightCapSeam =
        insideBakedBarOnRow &&
        x >= xCapMin &&
        r <= 36 &&
        g <= 52 &&
        b <= 110;

      if (isBakedBlueFill || isBakedRightCapSeam) {
        insideBakedBarOnRow = true;
        data[p] = emptyR;
        data[p + 1] = emptyG;
        data[p + 2] = emptyB;
      }
    }
  }
}

const processedLoadingBarCache = new Map<string, Promise<string>>();

export function loadProcessedLoadingBarAssetUrl(src: string): Promise<string> {
  const existing = processedLoadingBarCache.get(src);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        const maxDim = 880;
        const scale = rawW > maxDim ? maxDim / rawW : 1;
        const w = Math.max(1, Math.round(rawW * scale));
        const h = Math.max(1, Math.round(rawH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const crop = processTitleImagePixels(imageData.data, w, h, 2);
        hollowOutLoadingBarTrack(imageData.data, w, h, crop);
        ctx.putImageData(imageData, 0, 0);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = crop.width;
        outCanvas.height = crop.height;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(src);
          return;
        }
        outCtx.drawImage(
          canvas,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );

        const releaseTempCanvases = () => {
          canvas.width = 0;
          canvas.height = 0;
          outCanvas.width = 0;
          outCanvas.height = 0;
        };

        if (typeof outCanvas.toBlob === 'function') {
          outCanvas.toBlob((blob) => {
            const url = blob ? URL.createObjectURL(blob) : outCanvas.toDataURL('image/png');
            releaseTempCanvases();
            resolve(url);
          }, 'image/png');
        } else {
          const url = outCanvas.toDataURL('image/png');
          releaseTempCanvases();
          resolve(url);
        }
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  processedLoadingBarCache.set(src, promise);
  return promise;
}
