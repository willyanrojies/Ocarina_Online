import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWindowEmissiveStrength,
  transformScenarioTexturePixels,
} from './scenarioTextureProcessor';

test('computeWindowEmissiveStrength detects bright golden window/lantern texels only', () => {
  // Pixels de janela e lanterna luminosos amostrados de cenario.glb
  assert.ok(computeWindowEmissiveStrength(255, 200, 76) > 0.75);
  assert.ok(computeWindowEmissiveStrength(244, 186, 62) > 0.75);
  assert.ok(computeWindowEmissiveStrength(195, 142, 50) > 0.35);

  // Pedra, porta de madeira, telhado azul-escuro, flor violeta e musgo verde não são emissivos
  assert.equal(computeWindowEmissiveStrength(138, 101, 71), 0);
  assert.equal(computeWindowEmissiveStrength(96, 82, 74), 0);
  assert.equal(computeWindowEmissiveStrength(28, 36, 78), 0);
  assert.equal(computeWindowEmissiveStrength(165, 58, 188), 0);
  assert.equal(computeWindowEmissiveStrength(75, 125, 38), 0);
});

test('transformScenarioTexturePixels cools muddy stone and boosts emissive windows cleanly', () => {
  const pixels = new Uint8ClampedArray([
    255, 200, 76, 255,  // pixel 0: vidro de janela acesa
    130, 118, 108, 255, // pixel 1: pedra neutra amarelada
    165, 58, 188, 255,  // pixel 2: flor violeta
  ]);

  const { albedo, emissive } = transformScenarioTexturePixels(pixels, 3);

  // Pixel 0 emite forte âmbar dourado quente
  assert.ok(emissive[0] > 200);
  assert.ok(emissive[1] > 120);
  assert.ok(emissive[2] < 60);
  assert.ok(albedo[0] >= 245);

  // Pixel 1 (pedra) permanece não emissivo e fica visivelmente mais frio (maior razão B/R)
  assert.equal(emissive[4], 0);
  assert.equal(emissive[5], 0);
  assert.equal(emissive[6], 0);
  assert.ok(albedo[6] / albedo[4] > 108 / 130 + 0.08);

  // Pixel 2 (flor) mantém saturação azul/violeta intensa e permanece não emissivo
  assert.equal(emissive[8], 0);
  assert.ok(albedo[10] > albedo[9] + 50);
});
