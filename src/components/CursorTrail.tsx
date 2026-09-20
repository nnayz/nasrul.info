/**
 * A cursor-driven highlight for the background grid. Nearby cell interiors
 * fill with white while clicks place pitched green notes into a looping spatial
 * sequencer. Horizontal position is time, vertical position is pitch, and old
 * notes slowly fade out of the composition.
 */
import { initAudio, playGridNote } from '@/lib/audio';
import { store } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Position = { x: number; y: number };
type GridCell = { column: number; row: number };
type TrailPoint = Position & { createdAt: number };
type LockedNote = Position & {
  column: number;
  createdAt: number;
  detune: number;
  lastPlayedAt: number;
  row: number;
};

const GRID_SIZE = 24;
const FOLLOW_SPEED = 26;
const GLOW_RADIUS = 28;
const TRAIL_RADIUS = 14;
const TRAIL_DURATION = 180;
const TRAIL_SPACING = 5;
const MAX_TRAIL_POINTS = 12;
const SOUND_INTERVAL = 120;
const TEMPO = 108;
const STEP_DURATION = (60 / TEMPO / 4) * 1000;
const SEQUENCE_STEPS = 32;
const LOOP_DURATION = STEP_DURATION * SEQUENCE_STEPS;
const LOCK_DURATION = Math.max(18000, LOOP_DURATION * 4.25);
const SCHEDULER_INTERVAL = 25;
const SCHEDULER_LOOKAHEAD = 100;
const MAX_STEP_VOICES = 12;
const LOCK_HOLD = 1800;
const LOCK_PULSE_DURATION = 460;
const LOCK_COLOR = '30,255,184';
const HINT_DELAY = 550;
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, summary, [role="button"], [class*="cursor-pointer"]';

// Rows form a C-major piano roll. The bottom row starts at C2 and rises through
// the scale, keeping random clicks harmonic while retaining melodic direction.
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

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

export default function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hint, setHint] = useState<Position | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (coarse || reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let target: Position = { x: 0, y: 0 };
    let glow: Position = { x: 0, y: 0 };
    let lastTrailPosition: Position = { x: 0, y: 0 };
    let trail: TrailPoint[] = [];
    let locks: LockedNote[] = [];
    let hasLocked = false;
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
    let hoveredHintCell = '';
    let hintTimer: number | null = null;
    let hintDismissed = false;
    let dragging = false;
    let lastDragCell: GridCell | null = null;
    let raf = 0;

    const hideHint = () => {
      if (hintTimer !== null) window.clearTimeout(hintTimer);
      hintTimer = null;
      hoveredHintCell = '';
      setHint(null);
    };

    const retireHint = () => {
      hintDismissed = true;
      hideHint();
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      const firstColumn = Math.floor((x - radius) / GRID_SIZE);
      const lastColumn = Math.floor((x + radius) / GRID_SIZE);
      const firstRow = Math.floor((y - radius) / GRID_SIZE);
      const lastRow = Math.floor((y + radius) / GRID_SIZE);

      for (let row = firstRow; row <= lastRow; row += 1) {
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const left = column * GRID_SIZE + 1;
          const top = row * GRID_SIZE + 1;
          const right = left + GRID_SIZE - 1;
          const bottom = top + GRID_SIZE - 1;
          const distanceX = Math.max(left - x, 0, x - right);
          const distanceY = Math.max(top - y, 0, y - bottom);
          const distance = Math.hypot(distanceX, distanceY);
          if (distance >= radius) continue;

          const falloff = Math.pow(1 - distance / radius, 3.2);
          ctx.fillStyle = `rgba(${color},${opacity * falloff})`;
          ctx.fillRect(left, top, GRID_SIZE - 1, GRID_SIZE - 1);
        }
      }
    };

    const detuneForRow = (row: number) => {
      const rows = Math.ceil(height / GRID_SIZE);
      const verticalPosition = Math.min(
        Math.max((rows - 1 - row) / Math.max(rows - 1, 1), 0),
        1,
      );
      const scaleStep = Math.round(verticalPosition * MAJOR_SCALE.length * 4);
      const octave = Math.floor(scaleStep / MAJOR_SCALE.length);
      const degree = scaleStep % MAJOR_SCALE.length;
      return (-24 + octave * 12 + MAJOR_SCALE[degree]) * 100;
    };

    const panForX = (x: number) => (x / Math.max(width, 1)) * 1.5 - 0.75;

    const sequenceStepForX = (x: number) =>
      Math.min(
        Math.floor((x / Math.max(width, 1)) * SEQUENCE_STEPS),
        SEQUENCE_STEPS - 1,
      );

    const scheduleHint = (event: PointerEvent) => {
      const appState = store.get();
      const targetElement =
        event.target instanceof Element ? event.target : null;
      if (
        hintDismissed ||
        hasLocked ||
        appState.menuOpen ||
        targetElement?.closest(INTERACTIVE_SELECTOR)
      ) {
        hideHint();
        return;
      }

      const column = Math.floor(event.clientX / GRID_SIZE);
      const row = Math.floor(event.clientY / GRID_SIZE);
      const cell = `${column}:${row}`;
      if (cell === hoveredHintCell) return;

      hideHint();
      hoveredHintCell = cell;
      hintTimer = window.setTimeout(() => {
        hintTimer = null;
        const cellRight = (column + 1) * GRID_SIZE;
        const cellBottom = (row + 1) * GRID_SIZE;
        setHint({
          x: Math.min(cellRight + 8, width - 56),
          y: Math.min(cellBottom + 8, height - 32),
        });
      }, HINT_DELAY);
    };

    const playCellSound = (now: number) => {
      const column = Math.floor(glow.x / GRID_SIZE);
      const row = Math.floor(glow.y / GRID_SIZE);
      const cell = `${column}:${row}`;
      if (cell === previousSoundCell) return;

      previousSoundCell = cell;
      if (hasLocked || !pointerInside || now - previousSoundAt < SOUND_INTERVAL)
        return;

      previousSoundAt = now;
    };

    const scheduleSequencer = () => {
      if (
        transportStartedAt === null ||
        locks.length === 0 ||
        document.visibilityState === 'hidden'
      )
        return;

      const now = performance.now();
      if (nextStepAt < now - STEP_DURATION) {
        const missedSteps = Math.floor((now - nextStepAt) / STEP_DURATION);
        nextSequenceStep += missedSteps;
        nextStepAt += missedSteps * STEP_DURATION;
      }

      while (nextStepAt <= now + SCHEDULER_LOOKAHEAD) {
        const activeStep =
          ((nextSequenceStep % SEQUENCE_STEPS) + SEQUENCE_STEPS) %
          SEQUENCE_STEPS;
        const delay = Math.max(0, (nextStepAt - now) / 1000);
        const stepNotes: LockedNote[] = [];

        for (const lock of locks) {
          const age = nextStepAt - lock.createdAt;
          if (
            sequenceStepForX(lock.x) !== activeStep ||
            age < STEP_DURATION * 0.65 ||
            age >= LOCK_DURATION
          )
            continue;

          lock.lastPlayedAt = nextStepAt;
          stepNotes.push(lock);
        }

        const voices = selectStepVoices(stepNotes);
        const densityGain = Math.min(
          1,
          Math.sqrt(6 / Math.max(voices.length, 1)),
        );
        for (const voice of voices) {
          const age = nextStepAt - voice.createdAt;
          const life = 1 - age / LOCK_DURATION;
          playGridNote(voice.detune, {
            delay,
            gain: (0.48 + life * 0.42) * densityGain,
            pan: panForX(voice.x),
          });
        }

        nextSequenceStep += 1;
        nextStepAt += STEP_DURATION;
      }
    };

    const startTransport = (now: number, x: number) => {
      if (transportStartedAt !== null) return;
      const startingStep = sequenceStepForX(x);
      transportStartedAt = now - startingStep * STEP_DURATION;
      nextSequenceStep = startingStep + 1;
      nextStepAt = now + STEP_DURATION;
      schedulerTimer = window.setInterval(
        scheduleSequencer,
        SCHEDULER_INTERVAL,
      );
    };

    const stopTransport = () => {
      if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
      schedulerTimer = null;
      transportStartedAt = null;
      nextSequenceStep = 0;
      nextStepAt = 0;
    };

    const drawPlayhead = (now: number) => {
      if (transportStartedAt === null || locks.length === 0) return;

      const travelled =
        ((now - transportStartedAt) / STEP_DURATION) * (width / SEQUENCE_STEPS);
      const x = ((travelled % width) + width) % width;
      const edgeFade = Math.sin(Math.min(Math.max(x / width, 0), 1) * Math.PI);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(30,255,184,0)');
      gradient.addColorStop(0.22, `rgba(30,255,184,${0.09 * edgeFade})`);
      gradient.addColorStop(0.62, `rgba(30,255,184,${0.09 * edgeFade})`);
      gradient.addColorStop(1, 'rgba(30,255,184,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(Math.round(x), 0, 1, height);
    };

    const draw = (now: number) => {
      raf = 0;
      const delta = Math.min((now - previousFrame) / 1000, 0.05);
      previousFrame = now;

      if (initialized) {
        const follow = 1 - Math.exp(-FOLLOW_SPEED * delta);
        glow.x += (target.x - glow.x) * follow;
        glow.y += (target.y - glow.y) * follow;
        addTrailPoints(now);
        playCellSound(now);
      }

      trail = trail.filter((point) => now - point.createdAt < TRAIL_DURATION);
      locks = locks.filter((lock) => now - lock.createdAt < LOCK_DURATION);
      if (locks.length === 0 && transportStartedAt !== null) stopTransport();
      ctx.clearRect(0, 0, width, height);

      const dark = document.documentElement.classList.contains('dark');
      const trailOpacity = dark ? 0.028 : 0.045;
      const glowOpacity = dark ? 0.78 : 1;

      drawPlayhead(now);

      for (const lock of locks) {
        const age = now - lock.createdAt;
        const fadeProgress = Math.max(
          0,
          (age - LOCK_HOLD) / (LOCK_DURATION - LOCK_HOLD),
        );
        const pulseAge = now - lock.lastPlayedAt;
        const pulse =
          pulseAge >= 0 && pulseAge < LOCK_PULSE_DURATION
            ? Math.pow(1 - pulseAge / LOCK_PULSE_DURATION, 2) * 0.3
            : 0;
        const opacity = 0.72 * Math.pow(1 - fadeProgress, 1.2) + pulse;
        drawCellGlow(lock.x, lock.y, GLOW_RADIUS, opacity, LOCK_COLOR);
      }

      for (const point of trail) {
        const life = 1 - (now - point.createdAt) / TRAIL_DURATION;
        drawCellGlow(
          point.x,
          point.y,
          TRAIL_RADIUS,
          trailOpacity * life * life,
        );
      }

      const leaveProgress = pointerInside
        ? 0
        : Math.min((now - pointerLeftAt) / TRAIL_DURATION, 1);
      const headOpacity = initialized ? 1 - leaveProgress : 0;
      drawCellGlow(glow.x, glow.y, GLOW_RADIUS, glowOpacity * headOpacity);

      const distanceToTarget = Math.hypot(target.x - glow.x, target.y - glow.y);
      const isMoving = initialized && distanceToTarget > 0.1;
      const isFading = !pointerInside && headOpacity > 0;
      if (isMoving || trail.length > 0 || locks.length > 0 || isFading)
        requestDraw();
    };

    const isGridTarget = (event: PointerEvent) => {
      const appState = store.get();
      if (appState.menuOpen) return false;

      const targetElement =
        event.target instanceof Element ? event.target : null;
      return !targetElement?.closest(INTERACTIVE_SELECTOR);
    };

    const placeNote = (
      { column, row }: GridCell,
      gain: number,
      delay = 0,
      audible = true,
    ) => {
      const now = performance.now();
      const detune = detuneForRow(row);
      const x = column * GRID_SIZE + GRID_SIZE / 2;
      const y = row * GRID_SIZE + GRID_SIZE / 2;
      const existing = locks.find(
        (lock) => lock.column === column && lock.row === row,
      );

      if (existing) {
        existing.createdAt = now;
        existing.detune = detune;
        existing.lastPlayedAt = now;
      } else {
        locks.push({
          column,
          createdAt: now,
          detune,
          lastPlayedAt: now,
          row,
          x,
          y,
        });
      }

      startTransport(now, x);
      hasLocked = true;
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
      if (
        event.pointerType === 'touch' ||
        event.button !== 0 ||
        !isGridTarget(event)
      )
        return;

      dragging = true;
      lastDragCell = null;
      hideHint();
      retireHint();
      initAudio();
      paintTo(
        {
          column: Math.floor(event.clientX / GRID_SIZE),
          row: Math.floor(event.clientY / GRID_SIZE),
        },
        1,
      );
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      target = { x: event.clientX, y: event.clientY };
      pointerInside = true;

      if (dragging && (event.buttons & 1) === 1) {
        if (isGridTarget(event)) {
          paintTo(
            {
              column: Math.floor(event.clientX / GRID_SIZE),
              row: Math.floor(event.clientY / GRID_SIZE),
            },
            0.72,
          );
        } else {
          lastDragCell = null;
        }
        hideHint();
      } else {
        dragging = false;
        lastDragCell = null;
        scheduleHint(event);
      }

      if (!initialized) {
        glow = { ...target };
        lastTrailPosition = { ...target };
        previousSoundCell = `${Math.floor(target.x / GRID_SIZE)}:${Math.floor(
          target.y / GRID_SIZE,
        )}`;
        initialized = true;
      }

      requestDraw();
    };

    const endDrag = () => {
      dragging = false;
      lastDragCell = null;
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      pointerInside = false;
      pointerLeftAt = performance.now();
      endDrag();
      hideHint();
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

    resize();
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', endDrag);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('blur', endDrag);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      themeObserver.disconnect();
      if (hintTimer !== null) window.clearTimeout(hintTimer);
      stopTransport();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[1] h-screen w-screen"
        ref={ref}
      />
      <AnimatePresence>
        {hint && (
          <motion.div
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            aria-hidden
            className="pointer-events-none fixed z-[5] flex items-center rounded-full bg-[#1EFFB8] p-2 text-black shadow-lg shadow-black/10"
            exit={{ opacity: 0, scale: 0.9, x: 2, y: 2 }}
            initial={{ opacity: 0, scale: 0.9, x: 2, y: 2 }}
            style={{ left: hint.x, top: hint.y }}
            transition={{ duration: 0.18 }}
          >
            <Music2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
