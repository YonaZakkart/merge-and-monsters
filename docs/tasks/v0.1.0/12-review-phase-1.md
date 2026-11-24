# T12 — Review Phase 1

**Branch**: `chore/0.1.0-review-phase-1`
**Owner**: Y
**Status**: Completed
**Version**: 0.1.0

---

## Objective

Code review and stabilization of R02–R11. No new features. Fix all lint, typecheck, and test
failures. Verify all acceptance criteria. Update documentation.

This is a stop point: the release phase (R13) does not start until the user validates this branch.

---

## Scope

- Review all source files in `src/`
- Run full verification suite
- Fix any bugs or quality issues found
- Update architecture docs if behavior changed
- Update task statuses in `docs/tasks/v0.1.0/`

---

## Review Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Required | Commits and PR merges could empty a monster's HP without a defeat event, gold, queue advance, or dedupe | `damageMonster()` + `resolveAttack()` share the defeat path with issue closes |
| 2 | Required | Level ups changed `hero.level` silently; `levelUp` events and `combat.levelUp` entries were never emitted | `mapRepoData()` and `resolveAttack()` compare levels and emit the event + log entry |
| 3 | Required | Reloading the sandbox left `activeMonster` null with no way to rebuild it; live sessions had no modal either | `merge()` rebuilds the sandbox queue and reopens the modal for live repositories |
| 4 | Required | The Training Dummy disappeared after the queue was cleared, contradicting the design | `createTrainingDummy()` is reused as the repeatable fallback |
| 5 | Nit | `docs/tasks/v0.1.0/12-review-phase-1.md` header said T09 and referenced R10 | Corrected |
| 6 | Nit | Architecture docs drifted on floating numbers, SandboxControls, persistence, and processed IDs | Corrected |

Findings 1–4 are recorded in `docs/gotchas/v0.1.0/994`–`997`.

---

## Checklist

- [x] `pnpm build` passes clean
- [x] `pnpm typecheck` passes with zero errors and zero `any`
- [x] `pnpm biome check --write .` passes clean
- [x] `pnpm test` passes (all test files)
- [x] All acceptance criteria from T02–T11 verified by tests and code review
- [x] Canvas loop verified not to trigger React re-renders (code review: only `getState()` reads)
- [x] No external audio files in `public/` or `dist/`
- [x] PAT not present in `localStorage` after a connect flow
- [x] Both locale files have matching keys
- [x] `docs/tasks/v0.1.0/` statuses updated for T02–T12
- [x] `docs/INDEX.md` history table updated
- [x] Bugs found recorded in `docs/gotchas/v0.1.0/`
- [x] Branch pushed and PR opened
- [ ] User validation received before proceeding to R13

---

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass, zero errors |
| `pnpm biome check --write .` | Pass, 39 files |
| `pnpm test` | Pass, 121 tests, 13 files |
| `pnpm build` | Pass, static bundle in `dist/` |
| Audio assets | None in `public/`, `src/`, or `dist/` |
| Locale parity | 50 keys in `en.json`, 50 in `es.json` |
| PAT storage | `sessionStorage` only; cleared on sandbox launch and reset |

Manual browser validation is the stop-point check: launch the sandbox, defeat a monster with commit
damage, clear the queue, reload, and confirm the visuals. This environment has no browser driver, so
the visual pass is left to the user before R13 starts. The underlying behaviors are covered by the
store tests listed in `docs/history/v0.1.0/12-chore-review-phase-1.md`.

---

## Acceptance Criteria

1. All automated checks pass.
2. Manual smoke test: load app, launch sandbox, simulate all three actions, verify HUD updates and combat log entries appear.
3. No `TODO` comments remain in `src/` that are unresolved.
4. Documentation accurately reflects the implemented system.

---

## References

- `docs/roadmap/v0.1.0/README.md` — stop point definition
- `docs/tasks/v0.1.0/` — all previous tasks
