# Game Engine — Canvas Renderer

**Last updated**: 2026-11-23
**Version**: 0.1.0

---

## Responsibility

`src/engine/GameLoop.ts` owns the `requestAnimationFrame` loop.
`src/engine/Renderer.ts` performs all canvas draw calls.

Neither module imports React hooks or triggers re-renders. They read game state exclusively via `useGameStore.getState()`.

---

## GameLoop

```text
GameLoop.start(canvas: HTMLCanvasElement)
  -> stores canvas ref and 2D context
  -> resets the animation state
  -> draws one frame synchronously (no blank canvas while rAF is pending)
  -> starts the rAF loop

GameLoop.stop()
  -> cancels the rAF handle and clears the refs

Each frame:
  1. Read state: useGameStore.getState()
  2. Drain pending CombatEvents (state.drainCombatEvents()) and apply them
  3. Advance animation timers (hero, monster, particles, shake, floating numbers)
  4. Call drawScene(ctx, width, height, { hero, activeMonster }, animationState)
  5. Schedule the next frame
```

The loop is started once by `App.tsx` after the canvas element mounts. It is stopped on unmount.
`applyCombatEvent` and `advanceAnimation` are exported so the animation rules can be unit tested.

---

## Renderer

Draw order per frame (painter's algorithm, back to front):

1. **Background**: tiled dungeon floor pattern (programmatic, no image assets)
2. **Dungeon walls**: top and side borders drawn with rectangles
3. **Monster sprite**: idle bob or attack flash, positioned right-center
4. **Hero sprite**: idle bob or attack swing, positioned left-center
5. **HP bars**: monster bar above monster, hero bar above hero
6. **Floating damage numbers**: rise and fade over ~40 frames
7. **Screen shake offset**: applied to the entire canvas transform on critical hits
8. **Particle bursts**: small rectangles emitted on hit, fade over ~30 frames

### Sprites

Sprites are drawn entirely with Canvas 2D API calls (rectangles, arcs, lines). No image files. Each character has two animation frames (idle A, idle B) that alternate every 30 ticks to produce a subtle bob effect.

### Screen Shake

On a critical hit event, the canvas context is translated by a random offset within `[-shakeIntensity, +shakeIntensity]` on both axes. Intensity decays by 15% per frame (`SHAKE_DECAY` 0.85) until it reaches zero. A hit is critical when its damage is at least `CRIT_DAMAGE_THRESHOLD` (50).

```text
shake_intensity = 8   // pixels, on crit
decay_factor    = 0.85
```

### Floating Damage Numbers

Each combat event spawns floating text at the affected sprite:
- `heroAttack` and `monsterAttack`: the damage value, gold (`#D4AF37`) for hero attacks and red
  (`#C0392B`) for monster attacks
- `xpGain`: `+N XP` above the hero
- `levelUp`: `LVL N` above the hero, plus a gold particle burst
- `monsterDefeated`: no number, only a red particle burst

Font: monospace bold, 16 px. Motion: rises 2 px per frame, fades linearly over 40 frames.

---

## Animation State

`GameLoop.ts` maintains a local animation state object that is never stored in Zustand. It resets on `start()`.

```typescript
interface AnimationState {
  tick: number;
  heroBobTick: number;
  monsterBobTick: number;
  heroAttacking: boolean;
  heroAttackTick: number;
  monsterAttacking: boolean;
  monsterAttackTick: number;
  shakeIntensity: number;
  particles: Particle[];      // { x, y, vx, vy, life, color }
  floatingNumbers: FloatingNumber[]; // { x, y, text, color, life }
}
```

Animation constants live in `Renderer.ts`: `BOB_PERIOD` 60 (frame alternates every 30 ticks),
`ATTACK_FRAMES` 15, `FLOATING_NUMBER_LIFETIME` 40, `PARTICLE_LIFETIME` 30, `PARTICLE_COUNT` 10,
`SHAKE_INTENSITY` 8, `SHAKE_DECAY` 0.85, `CRIT_DAMAGE_THRESHOLD` 50.

---

## Canvas Dimensions

The canvas element fills its container via CSS. `App.tsx` sets `canvas.width` and `canvas.height`
from `getBoundingClientRect()` multiplied by `devicePixelRatio`, and re-runs the resize on a
`ResizeObserver` callback. The renderer works in device pixels and derives its sprite scale from
`height` (`clamp(floor(height / 180), 2, 4)`).

All colors are hex literals in `COLORS`; CSS custom properties do not resolve inside canvas styles
(see `docs/gotchas/v0.1.0/993-trap-canvas-css-vars.md`).

---

## References

- `docs/adr/v0.1.0/03-engine-canvas-decoupled.md`
- `src/engine/GameLoop.ts`
- `src/engine/Renderer.ts`
- `src/store/useGameStore.ts`
