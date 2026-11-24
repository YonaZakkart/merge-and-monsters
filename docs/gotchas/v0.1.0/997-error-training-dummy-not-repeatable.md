# 997 — error: Training Dummy disappeared after the queue was cleared

**Version**: 0.1.0
**Status**: Resolved
**Type**: error
**Found in branch**: `feature/0.1.0-game-store-C`
**Resolved in branch**: `chore/0.1.0-review-phase-1`

---

## Symptoms

After closing every sandbox issue, `activeMonster` became `null` and `monsterQueue` was empty. The
canvas showed no target, so "Simulate Commit" and "Simulate PR Merge" could no longer deal damage or
demonstrate a defeat. The design document calls the Training Dummy a repeatable monster for
repositories with zero open issues.

---

## Reproduction

1. Launch the sandbox.
2. Click "Simulate Issue Close" four times (one per open issue).
3. Observe: the right-center of the canvas is empty and further attacks have no target.

---

## Root Cause

`buildMonsterQueue([])` returned a Training Dummy only when the repository had zero open issues at
fetch time. `simulateIssueClose()` advanced to `nextMonster ?? null`, so an exhausted in-game queue
ended the encounter permanently.

---

## Solution

`createTrainingDummy()` is now exported from `telemetryMapper.ts` and reused in three places:
`buildMonsterQueue`, the store's `combatState()`, and the queue-advance paths. When the last real
monster falls, a fresh Training Dummy takes its place; defeating the dummy spawns another one, which
makes the practice target repeatable as designed.

---

## Verification

- `src/store/useGameStore.test.ts` — "respawns a Training Dummy when the queue is exhausted".
- `src/services/telemetryMapper.test.ts` — the dummy factory still returns 50 HP and zero gold.

---

## References

- Task: `docs/tasks/v0.1.0/12-review-phase-1.md`
- Design: `.kiro/specs/merge-and-monsters/design.md` (Error Handling & Edge Cases)
- Architecture: `docs/architecture/02-telemetry-mapping.md`
