# 09 — fix/0.1.0-checkpoint-2

**Branch**: `fix/0.1.0-checkpoint-2`
**Status**: Merged
**PR**: https://github.com/YonaZakkart/merge-and-monsters/pull/9
**Owner**: C
**Version**: 0.1.0
**Date**: 2026-11-19

---

## Objective

Integration gate between Phase 3 (State & Engine) and Phase 4 (UI). This checkpoint wires the engine modules to the store, verifies no React hook calls exist in `src/engine/`, and runs a manual smoke test of the full game loop without any HUD components.

**No new functionality. No new feature code.**

---

## Pre-conditions

- [x] R06 `feature/0.1.0-game-store-C` merged to `main`
- [x] R07 `feature/0.1.0-canvas-renderer-Y` merged to `main`
- [x] R08 `feature/0.1.0-audio-synth-C` merged to `main`

---

## What Was Done

Wired `SoundSynth` to the combat event stream flowing through `GameLoop.renderFrame()`:

- `src/engine/GameLoop.renderFrame()` now calls `SoundSynth.play(eventTypeToSfxType(event.type))` for every combat event drained from `useGameStore.getState()`.
- Added `eventTypeToSfxType()` helper that maps engine `CombatEvent.type` values to `SfxType`:
  - `heroAttack` → `attack`
  - `crit` → `crit`
  - `monsterAttack` → `monsterHit`
  - `monsterDefeated` → `monsterSlain`
  - `levelUp` → `levelUp`
  - `xpGain` → `gold`
  - unknown → `uiClick`
- Imported `SoundSynth` and `SfxType` in `GameLoop.ts` without introducing `any`.

---

## Verification

- [x] `npx tsc --noEmit` passes with zero errors
- [x] `npx biome check src` passes clean
- [x] `npx vitest run` passed (79 tests, 8 files)
- [x] `npx vite build` passed; `dist/` contains no audio files
- [x] No `.mp3`, `.wav`, `.ogg`, or `.mp4` files in `public/` or `src/`

---

## Gotchas

- The `SoundSynth` integration in `renderFrame()` means that any combat event dispatched from the store will trigger a sound. In the smoke test, this means:
  - Clicking "Simulate Commit" triggers `attack` SFX (or `crit` if damage >= 50).
  - Clicking "Simulate Issue Close" triggers `monsterSlain` SFX (unmuted).
  - The mute button (R10) correctly silences all subsequent sounds.
- Minified `dist/` files will naturally have Biome warnings; the checkpoint only requires `biome check src` to pass clean.

---

## Known Gaps

- `simulateCommit` / `simulatePrMerge` lower monster HP to 0 but never emit `monsterDefeated`, so the monster silently disappears without playing gold SFX. This is a known gap tracked for R10/CP-3, not a bug in v0.1.0.
- The `uiClick` SfxType is mapped as default but currently has no caller in the engine; it is intended for the HUD mute button (R10).

---

## References

- Task R06: `docs/tasks/v0.1.0/06-game-store.md`
- Task R07: `docs/tasks/v0.1.0/07-canvas-renderer.md`
- Task R08: `docs/tasks/v0.1.0/08-audio-synth.md`
- Roadmap: `docs/roadmap/v0.1.0/README.md` (Phase 3 — State & Engine)
- Checkpoint 1: `docs/history/v0.1.0/05-fix-checkpoint-1.md`