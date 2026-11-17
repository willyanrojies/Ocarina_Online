import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBIENT_LAYER_DEFAULTS,
  DEFAULT_AMBIENT_VOLUME,
  MAX_AMBIENT_MASTER_GAIN,
  NocturnalAmbienceEngine,
  clampAmbientVolume,
  computeAmbientMasterGain,
  computeNextCricketDelayMs,
  makeLoopSeamless,
} from './nocturnalAmbience';

test('default ambient volume starts soft and strictly lower than ocarina default (0.7)', () => {
  assert.equal(DEFAULT_AMBIENT_VOLUME, 0.5);
  assert.ok(DEFAULT_AMBIENT_VOLUME < 0.7);

  const defaultGain = computeAmbientMasterGain(DEFAULT_AMBIENT_VOLUME);
  assert.ok(defaultGain > 0);
  // O ganho padrão em 50% fica confortavelmente abaixo do nível da nota da ocarina (~0,29 em volume 0,7)
  assert.ok(defaultGain < 0.14);
});

test('ambient volume clamps cleanly, silences completely at 0, and scales monotonically', () => {
  assert.equal(clampAmbientVolume(-0.3), 0);
  assert.equal(clampAmbientVolume(1.8), 1);
  assert.equal(clampAmbientVolume(Number.NaN), DEFAULT_AMBIENT_VOLUME);

  assert.equal(computeAmbientMasterGain(0), 0);
  assert.equal(computeAmbientMasterGain(-0.5), 0);

  const g20 = computeAmbientMasterGain(0.2);
  const g50 = computeAmbientMasterGain(0.5);
  const g100 = computeAmbientMasterGain(1.0);
  assert.ok(g20 > 0 && g20 < g50 && g50 < g100);
  assert.equal(g100, MAX_AMBIENT_MASTER_GAIN);
});

test('all 4 nocturnal ambient layers stay balanced and discreet', () => {
  assert.ok(AMBIENT_LAYER_DEFAULTS.wind > 0 && AMBIENT_LAYER_DEFAULTS.wind < 0.2);
  assert.ok(AMBIENT_LAYER_DEFAULTS.water > 0 && AMBIENT_LAYER_DEFAULTS.water < 0.2);
  assert.ok(AMBIENT_LAYER_DEFAULTS.crickets > 0 && AMBIENT_LAYER_DEFAULTS.crickets < 0.2);
  assert.ok(AMBIENT_LAYER_DEFAULTS.nightAir > 0 && AMBIENT_LAYER_DEFAULTS.nightAir < 0.2);
});

test('makeLoopSeamless produces an exact loop length with continuous equal-power crossfade', () => {
  const loopSamples = 100;
  const crossfade = 20;
  const raw = new Float32Array(loopSamples + crossfade);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = i < 50 ? 0 : 1;
  }

  const seamless = makeLoopSeamless(raw, crossfade);
  assert.equal(seamless.length, loopSamples);
  // A cauda (1.0) mescla suavemente no início (0.0) pela emenda para que sample[0] comece próximo de 1.0 sem saltos bruscos
  assert.ok(seamless[0] > 0.9);
  assert.ok(seamless[crossfade - 1] < 0.15);
  assert.equal(seamless[loopSamples - 1], 1);
});

test('computeNextCricketDelayMs generates organic non-metronomic intervals', () => {
  const shortGap = computeNextCricketDelayMs(() => 0.1);
  const midGap = computeNextCricketDelayMs(() => 0.6);
  const hushGap = computeNextCricketDelayMs(() => 0.95);
  assert.ok(shortGap >= 950 && shortGap < midGap);
  assert.ok(hushGap > midGap);
});

test('NocturnalAmbienceEngine safely manages volume and lifecycle without browser globals', () => {
  const engine = new NocturnalAmbienceEngine(DEFAULT_AMBIENT_VOLUME);
  assert.equal(engine.getVolume(), DEFAULT_AMBIENT_VOLUME);
  assert.equal(engine.isStarted(), false);
  assert.equal(engine.isRunning(), false);

  engine.start();
  assert.equal(engine.isStarted(), false);

  engine.setVolume(0);
  assert.equal(engine.getVolume(), 0);
  engine.setVolume(0.65);
  assert.equal(engine.getVolume(), 0.65);
  engine.dispose();
  assert.equal(engine.isRunning(), false);
});
