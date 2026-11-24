# 995 — error: level ups were silent

**Version**: 0.1.0
**Status**: Resolved
**Type**: error
**Found in branch**: `feature/0.1.0-game-store-C`
**Resolved in branch**: `chore/0.1.0-review-phase-1`

---

## Symptoms

Crossing an XP threshold raised `hero.level` and moved the HUD XP bar, but nothing else happened.
No `levelUp` combat event reached the engine, so the "LVL N" floating text and the `levelUp` SFX
never played. The combat log never showed `combat.levelUp`, even though both locale files already
contained the key and `GameLoop.eventTypeToSfxType` mapped the event.

---

## Reproduction

1. Launch the sandbox (the initial telemetry award reaches level 4).
2. Inspect `pendingEvents`: only `xpGain` events are present.
3. Simulate enough commits to cross the next threshold and inspect the combat log: no level entry.

---

## Root Cause

`awardXp()` recomputed the level but no caller compared the previous and next levels. `levelUp` was
handled by the engine and the i18n catalog but never emitted by the store.

---

## Solution

`mapRepoData()` and `resolveAttack()` compare `hero.level` before and after the award. When it
increases, they push a `levelUp` combat event and prepend a `combat.levelUp` log entry. The initial
sandbox/real connection now announces the level reached by the historical telemetry.

---

## Verification

- `src/store/useGameStore.test.ts` — "announces the level reached by the initial XP award" and
  "emits a levelUp event and log entry when XP crosses a threshold".
- `src/engine/GameLoop.test.ts` already covered the animation and SFX mapping for `levelUp`.

---

## References

- Task: `docs/tasks/v0.1.0/12-review-phase-1.md`
- Architecture: `docs/architecture/03-game-engine.md`
- Design: `.kiro/specs/merge-and-monsters/design.md` (SFX list includes `levelUp`)
