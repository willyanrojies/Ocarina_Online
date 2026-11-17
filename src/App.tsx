/**
 * Ocarina Online — Desenvolvido por Willyan (WR Gohan)
 * Componente principal que coordena cena 3D, áudio, estado e interface.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NocturnalAmbienceEngine,
  loadSavedAmbientVolume,
  saveAmbientVolume,
} from './audio/nocturnalAmbience';
import { OcarinaAudioEngine } from './audio/ocarinaAudio';
import { resolveNoteFromKey, type NoteId } from './audio/ocarinaNotes';
import { PabloEasterEggAudioEngine } from './audio/pabloEasterEggAudio';
import {
  TitleMenuMusicEngine,
  type TitleMenuMusicStatus,
} from './audio/titleMenuMusic';
import { CharacterNameplateOverlay } from './components/CharacterNameplateOverlay';
import { CrtTvOverlay } from './components/CrtTvOverlay';
import { MenuButton } from './components/MenuButton';
import { OcarinaCustomizePanel } from './components/OcarinaCustomizePanel';
import { OcarinaPanel } from './components/OcarinaPanel';
import { PabloEasterEggDialog } from './components/PabloEasterEggDialog';
import { TitleScreenOverlay } from './components/TitleScreenOverlay';
import { clampVolume } from './components/settingsPanelMath';
import { OcarinaSceneCanvas } from './scene/OcarinaSceneCanvas';
import {
  INITIAL_CHARACTER_SLOTS,
  swapOcarinaCharacterWithSlot,
  type CharacterSlotMap,
  type RearSlotId,
} from './scene/characterRoles';
import { CRT_FILTER_DEFAULT_ENABLED } from './scene/crtFilter';
import {
  loadSavedOcarinaCustomization,
  saveOcarinaCustomization,
  type OcarinaCustomizationState,
} from './scene/ocarinaCustomization';
import {
  PABLO_EASTER_EGG_DURATION_MS,
  advanceEasterEggSequence,
} from './state/pabloEasterEgg';
import { SimulatorController, type SimulatorSnapshot } from './state/simulatorEvents';

export default function App() {
  const controllerRef = useRef<SimulatorController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new SimulatorController();
  }
  const controller = controllerRef.current;

  const audioRef = useRef<OcarinaAudioEngine | null>(null);
  if (!audioRef.current) {
    audioRef.current = new OcarinaAudioEngine();
  }
  const audioEngine = audioRef.current;

  const fisherNameplateRef = useRef<HTMLButtonElement | null>(null);
  const killerNameplateRef = useRef<HTMLButtonElement | null>(null);

  const [snapshot, setSnapshot] = useState<SimulatorSnapshot>(() => controller.getSnapshot());
  const [ambientVolume, setAmbientVolume] = useState(() => loadSavedAmbientVolume());
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);

  const [ambientRunning, setAmbientRunning] = useState(false);
  const ambienceRef = useRef<NocturnalAmbienceEngine | null>(null);
  if (!ambienceRef.current) {
    ambienceRef.current = new NocturnalAmbienceEngine(ambientVolume, (running) =>
      setAmbientRunning(running),
    );
  }
  const ambienceEngine = ambienceRef.current;

  const easterEggAudioRef = useRef<PabloEasterEggAudioEngine | null>(null);
  if (!easterEggAudioRef.current) {
    easterEggAudioRef.current = new PabloEasterEggAudioEngine();
  }
  const easterEggAudio = easterEggAudioRef.current;

  const [titleMusicStatus, setTitleMusicStatus] = useState<TitleMenuMusicStatus>('idle');
  const titleMusicRef = useRef<TitleMenuMusicEngine | null>(null);
  if (!titleMusicRef.current) {
    titleMusicRef.current = new TitleMenuMusicEngine({
      onStatusChange: (status) => {
        setTitleMusicStatus(status);
        if (status === 'playing') {
          ambienceRef.current?.unlockOnAutoplaySuccess();
        }
      },
    });
  }
  const titleMusicEngine = titleMusicRef.current;

  const [appPhase, setAppPhase] = useState<'title' | 'descending' | 'playing'>('title');
  const [titleOverlayMounted, setTitleOverlayMounted] = useState(true);
  const [sceneLoadProgress, setSceneLoadProgress] = useState(0);
  const [sceneLoadReady, setSceneLoadReady] = useState(false);
  const [pabloEasterEggActive, setPabloEasterEggActive] = useState(false);
  const titleTimersRef = useRef<number[]>([]);
  const easterEggHistoryRef = useRef<NoteId[]>([]);
  const easterEggTimerRef = useRef<number | null>(null);
  const [customizingOcarina, setCustomizingOcarina] = useState(false);
  const [viewingCharacters, setViewingCharacters] = useState(false);
  const [characterSlots, setCharacterSlots] = useState<CharacterSlotMap>(INITIAL_CHARACTER_SLOTS);
  const [savedCustomization, setSavedCustomization] = useState<OcarinaCustomizationState>(() =>
    loadSavedOcarinaCustomization(),
  );
  const [draftCustomization, setDraftCustomization] = useState<OcarinaCustomizationState>(
    savedCustomization,
  );

  useEffect(() => {
    audioEngine.setVolume(0.7);
  }, [audioEngine]);

  useEffect(() => {
    const unsub = controller.subscribe(setSnapshot);
    ambienceEngine.start();
    titleMusicEngine.start();
    return () => {
      unsub();
      titleTimersRef.current.forEach((id) => window.clearTimeout(id));
      titleTimersRef.current = [];
      if (easterEggTimerRef.current !== null) {
        window.clearTimeout(easterEggTimerRef.current);
        easterEggTimerRef.current = null;
      }
      audioEngine.dispose();
      ambienceEngine.dispose();
      easterEggAudio.dispose();
      titleMusicEngine.dispose();
    };
  }, [controller, audioEngine, ambienceEngine, easterEggAudio, titleMusicEngine]);

  const triggerPabloEasterEgg = useCallback(() => {
    if (easterEggTimerRef.current !== null) {
      window.clearTimeout(easterEggTimerRef.current);
    }
    controller.releaseAll();
    audioEngine.stopAll();
    setCustomizingOcarina(false);
    setViewingCharacters(false);
    setPabloEasterEggActive(true);
    easterEggAudio.startMusic();

    easterEggTimerRef.current = window.setTimeout(() => {
      easterEggTimerRef.current = null;
      easterEggAudio.stopMusic();
      setPabloEasterEggActive(false);
    }, PABLO_EASTER_EGG_DURATION_MS);
  }, [controller, audioEngine, easterEggAudio]);

  const handleNotePress = useCallback(
    (noteId: NoteId) => {
      if (
        appPhase !== 'playing' ||
        customizingOcarina ||
        viewingCharacters ||
        pabloEasterEggActive
      ) {
        return;
      }
      const pressed = controller.pressNote(noteId);
      if (pressed) {
        audioEngine.startNote(noteId);
        const seqResult = advanceEasterEggSequence(easterEggHistoryRef.current, noteId);
        easterEggHistoryRef.current = seqResult.nextHistory;
        if (seqResult.triggered) {
          triggerPabloEasterEgg();
        }
      }
    },
    [
      appPhase,
      controller,
      audioEngine,
      customizingOcarina,
      viewingCharacters,
      pabloEasterEggActive,
      triggerPabloEasterEgg,
    ],
  );

  const handleNoteRelease = useCallback(
    (noteId: NoteId) => {
      const released = controller.releaseNote(noteId);
      if (released) {
        audioEngine.stopNote(noteId);
      }
    },
    [controller, audioEngine],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (
        appPhase !== 'playing' ||
        customizingOcarina ||
        viewingCharacters ||
        pabloEasterEggActive
      ) {
        return;
      }

      const noteId = resolveNoteFromKey(e.key);
      if (noteId) {
        e.preventDefault();
        handleNotePress(noteId);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const noteId = resolveNoteFromKey(e.key);
      if (noteId) {
        handleNoteRelease(noteId);
      }
    };

    const onBlur = () => {
      controller.releaseAll();
      audioEngine.stopAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    appPhase,
    audioEngine,
    controller,
    customizingOcarina,
    viewingCharacters,
    pabloEasterEggActive,
    handleNotePress,
    handleNoteRelease,
  ]);

  const handleAmbientVolumeChange = useCallback(
    (val: number) => {
      const next = clampVolume(val);
      setAmbientVolume(next);
      ambienceEngine.setVolume(next);
      saveAmbientVolume(next);
    },
    [ambienceEngine],
  );

  const handleVolumeChange = useCallback(
    (val: number) => {
      const next = clampVolume(val);
      setVolume(next);
      if (next > 0 && muted) {
        setMuted(false);
        audioEngine.setMuted(false);
      }
      audioEngine.setVolume(next);
    },
    [audioEngine, muted],
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, [audioEngine]);

  const handleToggleCustomizeOcarina = useCallback(() => {
    controller.releaseAll();
    audioEngine.stopAll();
    setViewingCharacters(false);
    setCustomizingOcarina((prev) => {
      if (!prev) {
        setDraftCustomization(savedCustomization);
        return true;
      }
      setDraftCustomization(savedCustomization);
      return false;
    });
  }, [controller, audioEngine, savedCustomization]);

  const handleToggleViewCharacters = useCallback(() => {
    controller.releaseAll();
    audioEngine.stopAll();
    setCustomizingOcarina(false);
    setDraftCustomization(savedCustomization);
    setViewingCharacters((prev) => !prev);
  }, [controller, audioEngine, savedCustomization]);

  const handleSelectRearCharacter = useCallback(
    (rearSlot: RearSlotId) => {
      audioEngine.playBubblePop(1.14);
      setCharacterSlots((prev) => swapOcarinaCharacterWithSlot(prev, rearSlot));
      setViewingCharacters(false);
    },
    [audioEngine],
  );

  const handleCancelCustomization = useCallback(() => {
    setDraftCustomization(savedCustomization);
    setCustomizingOcarina(false);
  }, [savedCustomization]);

  const handleApplyCustomization = useCallback(() => {
    setSavedCustomization(draftCustomization);
    saveOcarinaCustomization(draftCustomization);
    setCustomizingOcarina(false);
  }, [draftCustomization]);

  const handlePlayMenuSound = useCallback(
    (pitchMultiplier = 1) => {
      audioEngine.playBubblePop(pitchMultiplier);
    },
    [audioEngine],
  );

  const handleSceneLoadProgress = useCallback((progress: number, ready: boolean) => {
    setSceneLoadProgress((prev) => Math.max(prev, progress));
    if (ready) {
      setSceneLoadReady(true);
    }
  }, []);

  const handleStartFromTitle = useCallback(() => {
    if (appPhase !== 'title' || !sceneLoadReady) return;
    audioEngine.playBubblePop(1.12);
    titleMusicEngine.fadeOutAndStop();
    setAppPhase('descending');

    const unmountTimer = window.setTimeout(() => {
      setTitleOverlayMounted(false);
    }, 740);
    const settleTimer = window.setTimeout(() => {
      setAppPhase('playing');
    }, 1450);
    titleTimersRef.current.push(unmountTimer, settleTimer);
  }, [appPhase, audioEngine, sceneLoadReady, titleMusicEngine]);

  const handleTypeDialogChar = useCallback(
    (charIndex: number) => {
      easterEggAudio.playTypewriterTick(charIndex);
    },
    [easterEggAudio],
  );

  const crtEnabled = CRT_FILTER_DEFAULT_ENABLED;
  const activeCustomization = customizingOcarina ? draftCustomization : savedCustomization;
  const cameraMode =
    appPhase === 'title'
      ? 'title-sky'
      : pabloEasterEggActive
        ? 'pablo-easter-egg'
        : customizingOcarina
          ? 'customize-ocarina'
          : viewingCharacters
            ? 'view-characters'
            : 'default';
  const hideNotesPanel =
    appPhase !== 'playing' || customizingOcarina || viewingCharacters || pabloEasterEggActive;

  return (
    <main
      data-testid="ocarina-app"
      data-app-phase={appPhase}
      data-title-music-state={titleMusicStatus}
      data-character-state={snapshot.characterState}
      data-ocarina-character={characterSlots.ocarina}
      data-fisher-character={characterSlots.fisher}
      data-killer-character={characterSlots.killer}
      data-active-notes={snapshot.activeNotes.join(',')}
      data-crt-enabled="true"
      data-ambient-volume={ambientVolume.toFixed(2)}
      data-ambient-running={ambientRunning ? 'true' : 'false'}
      data-customize-mode={customizingOcarina ? 'true' : 'false'}
      data-characters-mode={viewingCharacters ? 'true' : 'false'}
      data-pablo-easter-egg={pabloEasterEggActive ? 'true' : 'false'}
      data-ocarina-color={activeCustomization.colorHex}
      data-ocarina-sticker={activeCustomization.stickerId}
      className="relative w-screen h-screen overflow-hidden bg-[#04031c] crt-active-grade"
    >
      <OcarinaSceneCanvas
        controller={controller}
        crtEnabled={crtEnabled}
        cameraMode={cameraMode}
        ocarinaCustomization={activeCustomization}
        characterSlots={characterSlots}
        easterEggActive={pabloEasterEggActive}
        fisherNameplateRef={fisherNameplateRef}
        killerNameplateRef={killerNameplateRef}
        onSceneLoadProgress={handleSceneLoadProgress}
      />

      {titleOverlayMounted && (
        <TitleScreenOverlay
          visible={titleOverlayMounted}
          exiting={appPhase !== 'title'}
          sceneProgress={sceneLoadProgress}
          sceneReady={sceneLoadReady}
          onPlay={handleStartFromTitle}
        />
      )}

      <MenuButton
        hidden={appPhase !== 'playing' || pabloEasterEggActive}
        ambientVolume={ambientVolume}
        ocarinaVolume={volume}
        ocarinaMuted={muted}
        customizingOcarina={customizingOcarina}
        viewingCharacters={viewingCharacters}
        onAmbientVolumeChange={handleAmbientVolumeChange}
        onOcarinaVolumeChange={handleVolumeChange}
        onToggleOcarinaMute={handleToggleMute}
        onToggleCustomizeOcarina={handleToggleCustomizeOcarina}
        onToggleViewCharacters={handleToggleViewCharacters}
        onPlayMenuSound={handlePlayMenuSound}
      />

      <CharacterNameplateOverlay
        open={viewingCharacters && !pabloEasterEggActive}
        slots={characterSlots}
        fisherButtonRef={fisherNameplateRef}
        killerButtonRef={killerNameplateRef}
        onSelectSlot={handleSelectRearCharacter}
      />

      <OcarinaCustomizePanel
        open={customizingOcarina && !pabloEasterEggActive}
        value={draftCustomization}
        onChange={setDraftCustomization}
        onCancel={handleCancelCustomization}
        onApply={handleApplyCustomization}
        onPlaySound={handlePlayMenuSound}
      />

      <OcarinaPanel
        activeNotes={snapshot.activeNotes}
        showKeyHints
        hidden={hideNotesPanel}
        onNotePress={handleNotePress}
        onNoteRelease={handleNoteRelease}
      />

      <PabloEasterEggDialog open={pabloEasterEggActive} onTypeCharacter={handleTypeDialogChar} />

      <CrtTvOverlay enabled={crtEnabled} />
    </main>
  );
}


