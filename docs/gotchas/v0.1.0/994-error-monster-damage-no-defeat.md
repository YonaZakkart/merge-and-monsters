# 994 — error: accumulated attack damage never defeated a monster

**Version**: 0.1.0
**Status**: Resolved
**Type**: error
**Found in branch**: `fix/0.1.0-checkpoint-2` (recorded as a known gap)
**Resolved in branch**: `chore/0.1.0-review-phase-1`

---

## Symptoms

Sandbox commits and PR merges lowered the active monster's HP bar to zero, but the monster stayed
on the canvas with an empty bar. No `monsterDefeated` event fired, no `monsterSlain` SFX played, no
gold was awarded, and the queue never advanced. Only "Simulate Issue Close" could defeat a monster.

---

## Reproduction

1. Launch the dungeon sandbox.
2. Click "Simulate Commit" or "Simulate PR Merge" until the monster HP bar is empty.
3. Observe: the sprite remains, the gold counter stays unchanged, and the combat log has no defeat
   entry.

The previous store code clamped HP with `Math.max(0, monster.hp - damage)` and returned the
zero-HP monster without checking the boundary.

---

## Root Cause

`simulateCommit` and `simulatePrMerge` only applied damage. The defeat branch (gold, queue advance,
combat event, processed ID, log entry) existed exclusively in `simulateIssueClose`.

---

## Solution

`damageMonster()` now returns `{ activeMonster, monsterQueue, defeated }`. When HP reaches zero it
advances the queue and reports the defeated monster. `resolveAttack()` turns that report into gold,
a `monsterDefeated` event, a combat log entry, and a namespaced processed ID. Both simulations share
this path, so commits and PR merges can now clear a floor.

---

## Verification

- `src/store/useGameStore.test.ts` — "defeats the monster and awards gold when damage reaches zero"
  and "defeats the monster on a PR merge that empties its HP".
- Event order is asserted as `xpGain`, `heroAttack`, `monsterDefeated`.
- Gold increases by `goldReward` and the next issue becomes active.

---

## References

- Task: `docs/tasks/v0.1.0/12-review-phase-1.md`
- Architecture: `docs/architecture/05-state-management.md`
- Previous record: `docs/history/v0.1.0/09-fix-checkpoint-2.md` (Known Gaps)
