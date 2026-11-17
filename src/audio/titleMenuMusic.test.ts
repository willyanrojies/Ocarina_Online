import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TITLE_MENU_MUSIC_FADE_IN_MS,
  TITLE_MENU_MUSIC_FADE_OUT_MS,
  TITLE_MENU_MUSIC_MAX_VOLUME,
  TITLE_MENU_MUSIC_PATH,
  TitleMenuMusicEngine,
  type TitleMusicAudioLike,
  computeMenuMusicFadeInVolume,
  computeMenuMusicFadeOutVolume,
} from './titleMenuMusic';

function createFakeAudio(options: { blockPlay?: boolean } = {}): TitleMusicAudioLike & {
  playCalls: number;
  pauseCalls: number;
} {
  const el = {
    loop: false,
    preload: 'none',
    volume: 1,
    currentTime: 0,
    paused: true,
    playCalls: 0,
    pauseCalls: 0,
    play() {
      el.playCalls += 1;
      if (options.blockPlay) {
        return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
      }
      el.paused = false;
      return Promise.resolve();
    },
    pause() {
      el.pauseCalls += 1;
      el.paused = true;
    },
  };
  return el;
}

test('title menu music asset path and gentle volume match Easter Egg parity', () => {
  assert.equal(TITLE_MENU_MUSIC_PATH, '/assets/aistudio/Under_Still_Skies_cbbf38e3.mp3');
  assert.equal(TITLE_MENU_MUSIC_MAX_VOLUME, 0.22);
  assert.ok(TITLE_MENU_MUSIC_MAX_VOLUME <= 0.25);
});

test('fade-in volume ramps smoothly from 0 to target max volume', () => {
  assert.equal(computeMenuMusicFadeInVolume(0, 1000, 0.22), 0);
  const mid = computeMenuMusicFadeInVolume(500, 1000, 0.22);
  assert.ok(mid > 0 && mid < 0.22);
  assert.equal(computeMenuMusicFadeInVolume(1000, 1000, 0.22), 0.22);
  assert.equal(computeMenuMusicFadeInVolume(2500, 1000, 0.22), 0.22);
});

test('fade-out volume ramps smoothly from current volume to 0', () => {
  assert.equal(computeMenuMusicFadeOutVolume(0.22, 0, 1500), 0.22);
  assert.ok(Math.abs(computeMenuMusicFadeOutVolume(0.22, 750, 1500) - 0.11) < 1e-6);
  assert.equal(computeMenuMusicFadeOutVolume(0.22, 1500, 1500), 0);
  assert.equal(computeMenuMusicFadeOutVolume(0.22, 2200, 1500), 0);
});

test('TitleMenuMusicEngine loops menu track and fades out + stops cleanly on Play', async () => {
  const fakeAudio = createFakeAudio();
  const statuses: string[] = [];
  const engine = new TitleMenuMusicEngine({
    createAudio: () => fakeAudio,
    onStatusChange: (status) => statuses.push(status),
  });

  engine.start();
  await Promise.resolve();

  assert.equal(fakeAudio.loop, true);
  assert.equal(fakeAudio.playCalls, 1);
  assert.equal(fakeAudio.paused, false);
  assert.equal(engine.getStatus(), 'playing');

  // Simula a música já tendo feito fade-in antes do clique em Play
  fakeAudio.volume = TITLE_MENU_MUSIC_MAX_VOLUME;
  engine.fadeOutAndStop(60);
  assert.equal(engine.getStatus(), 'fading-out');

  await new Promise((resolve) => setTimeout(resolve, 110));

  assert.equal(engine.getStatus(), 'stopped');
  assert.equal(fakeAudio.paused, true);
  assert.equal(fakeAudio.volume, 0);
  assert.equal(fakeAudio.currentTime, 0);
  assert.deepEqual(statuses, ['playing', 'fading-out', 'stopped']);
  assert.ok(TITLE_MENU_MUSIC_FADE_IN_MS > 0 && TITLE_MENU_MUSIC_FADE_OUT_MS >= 1000);

  engine.dispose();
});

test('TitleMenuMusicEngine cancels pending autoplay state when stopped before unlock', async () => {
  const fakeAudio = createFakeAudio({ blockPlay: true });
  const engine = new TitleMenuMusicEngine({
    createAudio: () => fakeAudio,
  });

  engine.start();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(engine.getStatus(), 'awaiting-unlock');
  engine.fadeOutAndStop();
  assert.equal(engine.getStatus(), 'stopped');
  assert.equal(fakeAudio.paused, true);
  assert.equal(fakeAudio.volume, 0);

  engine.dispose();
});
