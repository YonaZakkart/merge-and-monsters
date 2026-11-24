# 996 — error: sandbox reload left the canvas without a monster

**Version**: 0.1.0
**Status**: Resolved
**Type**: error
**Found in branch**: `feature/0.1.0-hud-components-Y` (recorded in `fix/0.1.0-checkpoint-3`)
**Resolved in branch**: `chore/0.1.0-review-phase-1`

---

## Symptoms

After reloading the page in sandbox mode, the HUD, canvas, controls, and log mounted, but the
right-center of the canvas was empty. `activeMonster` and `monsterQueue` were not persisted, and the
connect modal stays hidden because `connected` is persisted, so the player had no way to rebuild the
queue. Live-repository sessions had the same dead end: no modal, no controls, no monster.

---

## Reproduction

1. Launch the sandbox.
2. Reload the page.
3. Observe: `sandboxMode` and `connected` are true, but `activeMonster` is null and the canvas has no
   monster. There is no button to relaunch the sandbox.

---

## Root Cause

`persist` only saved `repoSlug`, `connected`, `sandboxMode`, `hero`, `muted`, and `processedIds`.
`merge()` rehydrated those fields without rebuilding combat state, and `App.tsx` hides
`RepoConnectModal` whenever `connected` is true.

---

## Solution

`merge()` now rebuilds combat state after rehydration:

- Sandbox sessions rebuild the queue from the mock dataset with `pendingMonsters()`, excluding issues
  whose namespaced ID is already in `processedIds`. Defeated issues stay defeated; an exhausted queue
  falls back to the Training Dummy.
- Live-repository sessions set `connected: false`, so the connect modal reappears instead of leaving
  a frozen, empty board. Hero XP, gold, and level remain persisted.

---

## Verification

- `src/store/useGameStore.test.ts` — "rebuilds the sandbox queue on rehydration and keeps defeated
  issues out" and "reopens the connect modal on rehydration for a live repository".
- Manual reload of the dev server: sandbox mode renders the next monster; live mode shows the modal.

---

## References

- Task: `docs/tasks/v0.1.0/12-review-phase-1.md`
- Architecture: `docs/architecture/05-state-management.md`
- Previous record: `docs/history/v0.1.0/11-fix-checkpoint-3.md` (Known Gaps)
