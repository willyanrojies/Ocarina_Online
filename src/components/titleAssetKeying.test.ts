import test from 'node:test';
import assert from 'node:assert/strict';
import { hollowOutLoadingBarTrack, processTitleImagePixels } from './titleAssetKeying';

function createSolidBuffer(
  w: number,
  h: number,
  rgba: [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return data;
}

function setPixel(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
) {
  const p = (y * w + x) * 4;
  data[p] = rgba[0];
  data[p + 1] = rgba[1];
  data[p + 2] = rgba[2];
  data[p + 3] = rgba[3];
}

test('processTitleImagePixels keys opaque black outer background while preserving enclosed dark center', () => {
  const w = 20;
  const h = 20;
  const data = createSolidBuffer(w, h, [0, 0, 0, 255]);

  // Desenha uma moldura dourada [5..14, 5..14] envolvendo uma área escura interna [7..12, 7..12]
  for (let y = 5; y <= 14; y++) {
    for (let x = 5; x <= 14; x++) {
      const onRim = x === 5 || x === 14 || y === 5 || y === 14;
      if (onRim) {
        setPixel(data, w, x, y, [215, 140, 24, 255]);
      } else {
        setPixel(data, w, x, y, [4, 6, 12, 255]);
      }
    }
  }

  const crop = processTitleImagePixels(data, w, h, 0);

  // O canto externo agora está transparente
  assert.equal(data[3], 0);
  // O interior escuro envolvido permanece totalmente opaco (protegido pela moldura)
  assert.equal(data[(10 * w + 10) * 4 + 3], 255);
  assert.deepEqual(crop, { x: 5, y: 5, width: 10, height: 10 });
});

test('processTitleImagePixels preserves existing transparent alpha and trims margins cleanly', () => {
  const w = 16;
  const h = 16;
  const data = createSolidBuffer(w, h, [255, 255, 255, 0]);
  for (let y = 6; y <= 10; y++) {
    for (let x = 4; x <= 11; x++) {
      setPixel(data, w, x, y, [255, 210, 40, 255]);
    }
  }

  const crop = processTitleImagePixels(data, w, h, 1);
  assert.equal(data[(8 * w + 8) * 4 + 3], 255);
  assert.deepEqual(crop, { x: 3, y: 5, width: 10, height: 7 });
});

test('hollowOutLoadingBarTrack clears baked blue inside trough while preserving gold rim and top blue ocarina', () => {
  const w = 100;
  const h = 40;
  const data = createSolidBuffer(w, h, [210, 140, 25, 255]);

  // Ornamento da ocarina azul no topo em y=6, x=50 (deve continuar azul vibrante)
  setPixel(data, w, 50, 6, [45, 125, 255, 255]);
  // Borda dourada superior logo acima da canaleta em y=21 (deve ficar intacta mesmo sendo azul)
  setPixel(data, w, 30, 21, [45, 125, 255, 255]);
  // Preenchimento azul pré-pintado dentro da canaleta em y=25, x=30 (deve virar azul-marinho escuro #000721)
  setPixel(data, w, 30, 25, [86, 147, 252, 255]);

  hollowOutLoadingBarTrack(data, w, h, { x: 0, y: 0, width: w, height: h });

  // Ocarina superior intacta
  assert.deepEqual(Array.from(data.subarray((6 * w + 50) * 4, (6 * w + 50) * 4 + 4)), [
    45, 125, 255, 255,
  ]);
  // y=21 (52.5%, acima do topo da canaleta em 55.66%) intacto
  assert.deepEqual(Array.from(data.subarray((21 * w + 30) * 4, (21 * w + 30) * 4 + 4)), [
    45, 125, 255, 255,
  ]);
  // Azul da canaleta em y=25 (62.5%) limpo para azul-marinho profundo
  assert.deepEqual(Array.from(data.subarray((25 * w + 30) * 4, (25 * w + 30) * 4 + 4)), [
    0, 7, 33, 255,
  ]);
  // Borda dourada intacta
  assert.deepEqual(Array.from(data.subarray((25 * w + 5) * 4, (25 * w + 5) * 4 + 4)), [
    210, 140, 25, 255,
  ]);
});
