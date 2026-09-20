/**
 * A cursor-driven highlight for the background grid. Nearby cell interiors
 * fill with white while clicks place pitched green notes into a looping spatial
 * sequencer. Horizontal position is pitch (high on the left) and vertical
 * position is time, playing from the bottom up like piano tiles.
 */
import { initAudio, playGridNote, stopMusic } from '@/lib/audio';
import { PRESETS, type Preset } from '@/lib/presets';
import { store } from '@/lib/store';
import { useEffect, useRef } from 'react';

type Position = { x: number; y: number };
type GridCell = { column: number; row: number };
type TrailPoint = Position & { createdAt: number };
type LockedNote = Position & {
  column: number;
  createdAt: number;
  detune: number;
  duration: number;
  lastPlayedAt: number;
  midi: number;
  row: number;
  step: number;
  velocity: number;
};

// The size the glow and trail radii were tuned against; both scale from it so a
// coarser grid still lights the same amount of screen.
const BASE_GRID_SIZE = 24;
const FOLLOW_SPEED = 26;
const GLOW_RADIUS = 28;
const TRAIL_RADIUS = 14;
const TRAIL_DURATION = 180;
const TRAIL_SPACING = 5;
const MAX_TRAIL_POINTS = 12;
const SOUND_INTERVAL = 120;
const SCHEDULER_INTERVAL = 25;
const SCHEDULER_LOOKAHEAD = 100;
const MAX_STEP_VOICES = 12;
const MAX_NOTES = 512;
const LOCK_PULSE_DURATION = 460;
const LOCK_COLOR = '30,255,184';
const MIN_TIMELINE_SCREENS = 2;
const STRIKE_INSET = 1;

// Columns form a C-major scale. The left column is high and the right column
// is low, keeping random clicks harmonic while retaining melodic direction.
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const stepDurationForTempo = (tempo: number, stepsPerBeat: number) =>
  (60 / tempo / stepsPerBeat) * 1000;

function selectStepVoices(notes: LockedNote[]) {
  const newestByPitch = new Map<number, LockedNote>();
  for (const note of notes) {
    const existing = newestByPitch.get(note.detune);
    if (!existing || note.createdAt > existing.createdAt) {
      newestByPitch.set(note.detune, note);
    }
  }

  const pitches = [...newestByPitch.values()].sort(
    (first, second) => first.detune - second.detune,
  );
  if (pitches.length <= MAX_STEP_VOICES) return pitches;

  return Array.from({ length: MAX_STEP_VOICES }, (_, index) => {
    const pitchIndex = Math.round(
      (index * (pitches.length - 1)) / (MAX_STEP_VOICES - 1),
    );
    return pitches[pitchIndex];
  });
}

export default function MusicSequencer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = Math.max(canvas.clientWidth, 1);
    let height = Math.max(canvas.clientHeight, 1);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let target: Position = { x: 0, y: 0 };
    let glow: Position = { x: 0, y: 0 };
    let lastTrailPosition: Position = { x: 0, y: 0 };
    let trail: TrailPoint[] = [];
    let locks: LockedNote[] = [];
    let hasLocked = false;
    let gridSize = store.get().gridSize;
    let radiusScale = gridSize / BASE_GRID_SIZE;
    let tempo = store.get().tempo;
    let sequenceSteps = store.get().loopSteps;
    let stepsPerBeat = store.get().stepsPerBeat;
    let worldHeight = Math.max(
      height * MIN_TIMELINE_SCREENS,
      sequenceSteps * gridSize,
    );
    let viewOffset = 0;
    let renderedGridOffsetY = 0;
    let stepDuration = stepDurationForTempo(tempo, stepsPerBeat);
    let playing = store.get().sequencerPlaying;
    let pausedStep = 0;
    let transportStartedAt: number | null = null;
    let nextSequenceStep = 0;
    let nextStepAt = 0;
    let schedulerTimer: number | null = null;
    let initialized = false;
    let pointerInside = false;
    let pointerLeftAt = 0;
    let previousFrame = performance.now();
    let previousSoundCell = '';
    let previousSoundAt = 0;
    let dragging = false;
    let lastDragCell: GridCell | null = null;
    let touchPanning = false;
    let touchStart:
      (Position & { pointerId: number; viewOffset: number }) | null = null;
    let raf = 0;

    const updateWorldHeight = () => {
      worldHeight = Math.max(
        height * MIN_TIMELINE_SCREENS,
        sequenceSteps * gridSize,
      );
      viewOffset = Math.min(viewOffset, Math.max(0, worldHeight - height));
    };

    const relayoutLocks = () => {
      updateWorldHeight();
      for (const lock of locks) {
        lock.y = worldYForStep(lock.step);
        lock.row = Math.floor(lock.y / gridSize);
        lock.column = columnForMidi(lock.midi);
        lock.x = lock.column * gridSize + gridSize / 2;
      }
    };

    const resize = () => {
      width = Math.max(canvas.clientWidth, 1);
      height = Math.max(canvas.clientHeight, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      relayoutLocks();
      requestDraw();
    };

    const requestDraw = () => {
      if (!raf && document.visibilityState === 'visible') {
        previousFrame = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    const addTrailPoints = (now: number) => {
      const dx = glow.x - lastTrailPosition.x;
      const dy = glow.y - lastTrailPosition.y;
      const distance = Math.hypot(dx, dy);
      if (distance < TRAIL_SPACING) return;

      const steps = Math.min(Math.floor(distance / TRAIL_SPACING), 4);
      for (let index = 1; index <= steps; index += 1) {
        const progress = index / steps;
        trail.push({
          createdAt: now - (steps - index) * 4,
          x: lastTrailPosition.x + dx * progress,
          y: lastTrailPosition.y + dy * progress,
        });
      }

      lastTrailPosition = { ...glow };
      if (trail.length > MAX_TRAIL_POINTS) {
        trail = trail.slice(-MAX_TRAIL_POINTS);
      }
    };

    const drawCellGlow = (
      x: number,
      y: number,
      radius: number,
      opacity: number,
      color = '255,255,255',
    ) => {
      if (opacity <= 0) return;

      const firstColumn = Math.floor((x - radius) / gridSize);
      const lastColumn = Math.floor((x + radius) / gridSize);
      const firstRow = Math.floor(
        (y - radius - renderedGridOffsetY) / gridSize,
      );
      const lastRow = Math.floor(
        (y + radius - renderedGridOffsetY) / gridSize,
      );

      for (let row = firstRow; row <= lastRow; row += 1) {
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const left = column * gridSize + 1;
          const top = renderedGridOffsetY + row * gridSize + 1;
          const right = left + gridSize - 1;
          const bottom = top + gridSize - 1;
          const distanceX = Math.max(left - x, 0, x - right);
          const distanceY = Math.max(top - y, 0, y - bottom);
          const distance = Math.hypot(distanceX, distanceY);
          if (distance >= radius) continue;

          const falloff = Math.pow(1 - distance / radius, 3.2);
          ctx.fillStyle = `rgba(${color},${opacity * falloff})`;
          ctx.fillRect(left, top, gridSize - 1, gridSize - 1);
        }
      }
    };

    const detuneForDegree = (degree: number) => {
      const octave = Math.floor(degree / MAJOR_SCALE.length);
      const note = degree % MAJOR_SCALE.length;
      return (-24 + octave * 12 + MAJOR_SCALE[note]) * 100;
    };

    const detuneForColumn = (column: number) => {
      const columns = Math.ceil(width / gridSize);
      const horizontalPosition = Math.min(
        Math.max((columns - 1 - column) / Math.max(columns - 1, 1), 0),
        1,
      );
      return detuneForDegree(
        Math.round(horizontalPosition * MAJOR_SCALE.length * 4),
      );
    };

    const panForX = (x: number) => (x / Math.max(width, 1)) * 1.5 - 0.75;

    const worldYForStep = (step: number) =>
      worldHeight - ((step + 0.5) / sequenceSteps) * worldHeight;

    const sequenceStepForY = (y: number) =>
      Math.min(
        Math.floor(
          ((worldHeight - y) / Math.max(worldHeight, 1)) * sequenceSteps,
        ),
        sequenceSteps - 1,
      );

    const playCellSound = (now: number) => {
      const column = Math.floor(glow.x / gridSize);
      const row = Math.floor((glow.y + visibleCanvasOffset(now)) / gridSize);
      const cell = `${column}:${row}`;
      if (cell === previousSoundCell) return;

      previousSoundCell = cell;
      if (hasLocked || !pointerInside || now - previousSoundAt < SOUND_INTERVAL)
        return;

      previousSoundAt = now;
    };

    const scheduleSequencer = () => {
      if (
        !playing ||
        transportStartedAt === null ||
        locks.length === 0 ||
        document.visibilityState === 'hidden'
      )
        return;

      const now = performance.now();
      if (nextStepAt < now - stepDuration) {
        const missedSteps = Math.floor((now - nextStepAt) / stepDuration);
        nextSequenceStep += missedSteps;
        nextStepAt += missedSteps * stepDuration;
      }

      while (nextStepAt <= now + SCHEDULER_LOOKAHEAD) {
        const activeStep =
          ((nextSequenceStep % sequenceSteps) + sequenceSteps) % sequenceSteps;
        const delay = Math.max(0, (nextStepAt - now) / 1000);
        const stepNotes: LockedNote[] = [];

        for (const lock of locks) {
          const age = nextStepAt - lock.createdAt;
          if (lock.step !== activeStep || age < stepDuration * 0.65) continue;

          lock.lastPlayedAt = nextStepAt;
          stepNotes.push(lock);
        }

        const voices = selectStepVoices(stepNotes);
        const densityGain = Math.min(
          1,
          Math.sqrt(6 / Math.max(voices.length, 1)),
        );
        for (const voice of voices) {
          playGridNote(voice.detune, {
            delay,
            duration: Math.max(0.12, (voice.duration * stepDuration) / 1000),
            gain: 0.78 * densityGain,
            pan: panForX(voice.x),
            velocity: voice.velocity,
          });
        }

        nextSequenceStep += 1;
        nextStepAt += stepDuration;
      }
    };

    const currentStepPosition = (now: number) =>
      transportStartedAt === null
        ? pausedStep
        : Math.max(0, (now - transportStartedAt) / stepDuration);

    const maxViewOffset = () => Math.max(0, worldHeight - height);

    const strikeY = () => height - (STRIKE_INSET + 0.5) * gridSize;

    const viewOffsetForStep = (step: number) => {
      const loopPosition =
        ((step % sequenceSteps) + sequenceSteps) % sequenceSteps;
      return worldYForStep(loopPosition) - strikeY();
    };

    const visibleCanvasOffset = (now: number) =>
      playing && !reduced
        ? viewOffsetForStep(currentStepPosition(now))
        : viewOffset;

    const stopScheduler = () => {
      if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    };

    const resumeTransport = (now: number) => {
      if (!playing || locks.length === 0) return;
      stopScheduler();
      transportStartedAt = now - pausedStep * stepDuration;
      nextSequenceStep = Math.ceil(pausedStep);
      nextStepAt =
        now + Math.max(0, nextSequenceStep - pausedStep) * stepDuration;
      schedulerTimer = window.setInterval(
        scheduleSequencer,
        SCHEDULER_INTERVAL,
      );
      scheduleSequencer();
    };

    const pauseTransport = (now: number) => {
      pausedStep = currentStepPosition(now);
      viewOffset = Math.min(
        maxViewOffset(),
        Math.max(0, viewOffsetForStep(pausedStep)),
      );
      stopScheduler();
      transportStartedAt = null;
      stopMusic();
    };

    const resetTransport = () => {
      stopScheduler();
      pausedStep = 0;
      transportStartedAt = null;
      nextSequenceStep = 0;
      nextStepAt = 0;
      viewOffset = maxViewOffset();
      stopMusic();
    };

    const applyGridSize = (nextGridSize: number) => {
      gridSize = nextGridSize;
      radiusScale = gridSize / BASE_GRID_SIZE;
      canvas.parentElement?.style.setProperty('--grid-size', `${gridSize}px`);
      relayoutLocks();
    };

    const columnForMidi = (midi: number) => {
      const columns = Math.ceil(width / gridSize);
      const normalized = Math.min(1, Math.max(0, (midi - 36) / 48));
      return Math.round((columns - 1) * (1 - normalized));
    };

    const applyPreset = (preset: Preset) => {
      // Backdated so every note clears the scheduler's "just drawn" guard and
      // the loop sounds complete from the first pass.
      const createdAt = performance.now() - 1000;
      sequenceSteps = preset.steps;
      stepsPerBeat = preset.stepsPerBeat;
      stepDuration = stepDurationForTempo(tempo, stepsPerBeat);
      updateWorldHeight();
      locks = preset.notes
        .slice(0, MAX_NOTES)
        .map(([step, midi, duration, velocity]) => {
          const column = columnForMidi(midi);
          const y = worldYForStep(step);
          return {
            column,
            createdAt,
            detune: (midi - 60) * 100,
            duration,
            lastPlayedAt: 0,
            midi,
            row: Math.floor(y / gridSize),
            step,
            velocity,
            x: column * gridSize + gridSize / 2,
            y,
          };
        });

      hasLocked = locks.length > 0;
      resetTransport();
      store.setNoteCount(locks.length);
    };

    const drawStrikeBoundary = (dark: boolean) => {
      const top = height - (STRIKE_INSET + 1) * gridSize + 1;
      const columns = Math.ceil(width / gridSize);
      ctx.save();
      ctx.fillStyle = dark
        ? 'rgba(255,255,255,0.72)'
        : 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 0.75;
      for (let column = 0; column < columns; column += 1) {
        const left = column * gridSize + 1;
        ctx.fillRect(left, top, gridSize - 1, gridSize - 1);
        ctx.strokeRect(left + 0.5, top + 0.5, gridSize - 2, gridSize - 2);
      }
      ctx.restore();
    };

    const draw = (now: number) => {
      raf = 0;
      const delta = Math.min((now - previousFrame) / 1000, 0.05);
      previousFrame = now;

      if (initialized) {
        const follow = reduced ? 1 : 1 - Math.exp(-FOLLOW_SPEED * delta);
        glow.x += (target.x - glow.x) * follow;
        glow.y += (target.y - glow.y) * follow;
        if (!reduced) addTrailPoints(now);
        playCellSound(now);
      }

      trail = trail.filter((point) => now - point.createdAt < TRAIL_DURATION);
      ctx.clearRect(0, 0, width, height);

      const dark = document.documentElement.classList.contains('dark');
      const trailOpacity = dark ? 0.028 : 0.045;
      const glowOpacity = dark ? 0.78 : 1;
      const canvasOffset = visibleCanvasOffset(now);
      renderedGridOffsetY = -(
        ((canvasOffset % gridSize) + gridSize) %
        gridSize
      );
      canvas.parentElement?.style.setProperty(
        '--grid-offset-y',
        `${renderedGridOffsetY}px`,
      );
      drawStrikeBoundary(dark);

      for (const lock of locks) {
        const screenY = lock.y - canvasOffset;
        const glowRadius = GLOW_RADIUS * radiusScale;
        if (screenY < -glowRadius || screenY > height + glowRadius) continue;
        const pulseAge = now - lock.lastPlayedAt;
        const pulse =
          pulseAge >= 0 && pulseAge < LOCK_PULSE_DURATION
            ? Math.pow(1 - pulseAge / LOCK_PULSE_DURATION, 2) * 0.3
            : 0;
        drawCellGlow(lock.x, screenY, glowRadius, 0.64 + pulse, LOCK_COLOR);
      }

      for (const point of trail) {
        const life = 1 - (now - point.createdAt) / TRAIL_DURATION;
        drawCellGlow(
          point.x,
          point.y,
          TRAIL_RADIUS * radiusScale,
          trailOpacity * life * life,
        );
      }

      const leaveProgress = pointerInside
        ? 0
        : Math.min((now - pointerLeftAt) / TRAIL_DURATION, 1);
      const headOpacity = initialized ? 1 - leaveProgress : 0;
      drawCellGlow(
        glow.x,
        glow.y,
        GLOW_RADIUS * radiusScale,
        glowOpacity * headOpacity,
      );

      const distanceToTarget = Math.hypot(target.x - glow.x, target.y - glow.y);
      const isMoving = initialized && distanceToTarget > 0.1;
      const isFading = !pointerInside && headOpacity > 0;
      const isPulsing = locks.some(
        (lock) => now - lock.lastPlayedAt < LOCK_PULSE_DURATION,
      );
      if (isMoving || trail.length > 0 || playing || isPulsing || isFading)
        requestDraw();
    };

    const positionForEvent = (event: PointerEvent): Position => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: Math.min(width - 0.01, Math.max(0, event.clientX - bounds.left)),
        y: Math.min(height - 0.01, Math.max(0, event.clientY - bounds.top)),
      };
    };

    const gridCellForPosition = (position: Position): GridCell => ({
      column: Math.floor(position.x / gridSize),
      row: Math.floor(
        (position.y + visibleCanvasOffset(performance.now())) / gridSize,
      ),
    });

    // Input belongs to this work surface alone. The surrounding header and
    // transport are siblings, so their clicks can never paint through.
    const isGridTarget = () => {
      if (store.get().menuOpen) return false;
      return true;
    };

    const placeNote = (
      { column, row }: GridCell,
      gain: number,
      delay = 0,
      audible = true,
    ) => {
      const now = performance.now();
      const detune = detuneForColumn(column);
      const midi = Math.round(60 + detune / 100);
      const step = sequenceStepForY(row * gridSize + gridSize / 2);
      const x = column * gridSize + gridSize / 2;
      const y = row * gridSize + gridSize / 2;
      const existingIndex = locks.findIndex(
        (lock) => lock.column === column && lock.row === row,
      );
      const existing = locks[existingIndex];

      if (store.get().presetId) store.markSequenceEdited();

      if (store.get().musicTool === 'erase') {
        if (existingIndex < 0) return;
        locks.splice(existingIndex, 1);
        hasLocked = locks.length > 0;
        store.setNoteCount(locks.length);
        if (!hasLocked) {
          playing = false;
          resetTransport();
          store.setSequencerPlaying(false);
        }
        requestDraw();
        return;
      }

      if (existing) {
        existing.createdAt = now;
        existing.detune = detune;
        existing.midi = midi;
        existing.lastPlayedAt = now;
        existing.step = step;
      } else {
        if (locks.length >= MAX_NOTES) return;
        locks.push({
          column,
          createdAt: now,
          detune,
          duration: Math.max(1, stepsPerBeat * 0.9),
          lastPlayedAt: now,
          midi,
          row,
          step,
          velocity: 0.72,
          x,
          y,
        });
      }

      hasLocked = true;
      store.setNoteCount(locks.length);
      if (audible) playGridNote(detune, { delay, gain, pan: panForX(x) });
      requestDraw();
    };

    const paintTo = (nextCell: GridCell, gain: number) => {
      if (!lastDragCell) {
        placeNote(nextCell, gain);
        lastDragCell = nextCell;
        return;
      }

      const previousCell = lastDragCell;
      const columnDistance = nextCell.column - previousCell.column;
      const rowDistance = nextCell.row - previousCell.row;
      const steps = Math.max(Math.abs(columnDistance), Math.abs(rowDistance));
      if (steps === 0) return;

      const painted = new Set<string>();
      const soundStride = Math.max(1, Math.ceil(steps / 10));
      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        const cell = {
          column: Math.round(previousCell.column + columnDistance * progress),
          row: Math.round(previousCell.row + rowDistance * progress),
        };
        const key = `${cell.column}:${cell.row}`;
        if (painted.has(key)) continue;
        painted.add(key);
        placeNote(
          cell,
          gain,
          Math.min(step * 0.014, 0.12),
          step % soundStride === 0 || step === steps,
        );
      }

      lastDragCell = nextCell;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isGridTarget()) return;
      const position = positionForEvent(event);

      if (event.pointerType === 'touch') {
        canvas.setPointerCapture(event.pointerId);
        touchPanning = false;
        touchStart = {
          pointerId: event.pointerId,
          viewOffset,
          ...position,
        };
        return;
      }

      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);

      dragging = true;
      lastDragCell = null;
      initAudio();
      paintTo(gridCellForPosition(position), 1);
    };

    const onMove = (event: PointerEvent) => {
      const position = positionForEvent(event);
      if (event.pointerType === 'touch') {
        if (touchStart?.pointerId === event.pointerId) {
          const deltaX = position.x - touchStart.x;
          const deltaY = position.y - touchStart.y;
          if (!touchPanning && Math.hypot(deltaX, deltaY) > 10) {
            if (!playing && Math.abs(deltaY) > Math.abs(deltaX)) {
              touchPanning = true;
            } else {
              touchStart = null;
            }
          }

          if (touchPanning && touchStart) {
            viewOffset = Math.min(
              maxViewOffset(),
              Math.max(0, touchStart.viewOffset - deltaY),
            );
            requestDraw();
          }
        }
        return;
      }

      if (!isGridTarget()) {
        if (pointerInside) {
          pointerInside = false;
          pointerLeftAt = performance.now();
        }
        lastDragCell = null;
        requestDraw();
        return;
      }

      target = position;
      pointerInside = true;

      if (dragging && (event.buttons & 1) === 1) {
        paintTo(gridCellForPosition(position), 0.72);
      } else {
        dragging = false;
        lastDragCell = null;
      }

      if (!initialized) {
        glow = { ...target };
        lastTrailPosition = { ...target };
        previousSoundCell = `${Math.floor(target.x / gridSize)}:${Math.floor(
          target.y / gridSize,
        )}`;
        initialized = true;
      }

      requestDraw();
    };

    const endDrag = () => {
      dragging = false;
      lastDragCell = null;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (
        event.pointerType === 'touch' &&
        touchStart?.pointerId === event.pointerId &&
        !touchPanning
      ) {
        const tap = touchStart;
        if (isGridTarget()) {
          initAudio();
          placeNote(gridCellForPosition(tap), 1);
        }
      }
      touchStart = null;
      touchPanning = false;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      endDrag();
    };

    const cancelInteraction = () => {
      touchStart = null;
      touchPanning = false;
      endDrag();
    };

    const onWheel = (event: WheelEvent) => {
      if (playing || store.get().menuOpen) return;
      const verticalDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.shiftKey
            ? event.deltaX
            : 0;
      if (Math.abs(verticalDelta) < 0.5) return;

      event.preventDefault();
      viewOffset = Math.min(
        maxViewOffset(),
        Math.max(0, viewOffset + verticalDelta),
      );
      requestDraw();
    };

    const onPointerLeave = () => {
      pointerInside = false;
      pointerLeftAt = performance.now();
      endDrag();
      requestDraw();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        requestDraw();
      }
    };

    const themeObserver = new MutationObserver(requestDraw);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true,
    });

    let previousStoreState = store.get();
    const unsubscribe = store.subscribe(() => {
      const nextState = store.get();
      const previous = previousStoreState;
      // Claimed up front: the work below writes back to the store, and a
      // re-entrant listener must not replay the same signal.
      previousStoreState = nextState;

      const now = performance.now();
      const clearRequested =
        nextState.clearSequenceSignal !== previous.clearSequenceSignal;
      const restartRequested =
        nextState.restartSequenceSignal !== previous.restartSequenceSignal;
      const presetRequested = nextState.presetSignal !== previous.presetSignal;
      const tempoChanged = nextState.tempo !== tempo;
      const meterChanged = nextState.stepsPerBeat !== stepsPerBeat;
      const lengthChanged = nextState.loopSteps !== sequenceSteps;
      const soundStopped = previous.sound === 'on' && nextState.sound !== 'on';

      if (nextState.gridSize !== gridSize) applyGridSize(nextState.gridSize);
      if (soundStopped) stopMusic();

      if (clearRequested) {
        tempo = nextState.tempo;
        stepsPerBeat = nextState.stepsPerBeat;
        sequenceSteps = nextState.loopSteps;
        stepDuration = stepDurationForTempo(tempo, stepsPerBeat);
        updateWorldHeight();
        locks = [];
        hasLocked = false;
        playing = false;
        resetTransport();
      } else {
        if (tempoChanged || meterChanged || lengthChanged) {
          pausedStep = currentStepPosition(now);
          stopScheduler();
          transportStartedAt = null;
          tempo = nextState.tempo;
          stepsPerBeat = nextState.stepsPerBeat;
          sequenceSteps = nextState.loopSteps;
          stepDuration = stepDurationForTempo(tempo, stepsPerBeat);
          relayoutLocks();
        }

        // After the tempo: a preset arrives with its own, and its notes are
        // laid out against the step duration they were written for.
        if (presetRequested) {
          const preset = PRESETS.find(
            (entry) => entry.id === nextState.presetId,
          );
          if (preset) applyPreset(preset);
        }

        if (restartRequested) resetTransport();

        const shouldPlay = nextState.sequencerPlaying && locks.length > 0;
        if (shouldPlay) {
          const needsResume =
            !playing ||
            tempoChanged ||
            meterChanged ||
            lengthChanged ||
            restartRequested ||
            !schedulerTimer;
          playing = true;
          if (needsResume) resumeTransport(now);
        } else if (playing || transportStartedAt !== null) {
          pauseTransport(now);
          playing = false;
        }
      }

      requestDraw();
    });

    resize();
    canvas.parentElement?.style.setProperty('--grid-size', `${gridSize}px`);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', cancelInteraction);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', cancelInteraction);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', cancelInteraction);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', cancelInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      unsubscribe();
      canvas.parentElement?.style.removeProperty('--grid-size');
      canvas.parentElement?.style.removeProperty('--grid-offset-y');
      resetTransport();
      cancelAnimationFrame(raf);
      store.setNoteCount(0);
      store.setSequencerPlaying(false);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[1] overflow-hidden">
      <div aria-hidden className="stage-grid" />
      <canvas
        aria-hidden
        className="absolute inset-0 z-[1] h-full w-full cursor-crosshair touch-none"
        ref={ref}
      />
    </div>
  );
}
