# 12 — chore/0.1.0-review-phase-1

**Branch**: `chore/0.1.0-review-phase-1`
**Status**: PR Open
**PR**: https://github.com/YonaZakkart/merge-and-monsters/pull/12
**Owner**: Y
**Version**: 0.1.0
**Date**: 2026-11-23

---

## Objective

Full regression and stabilization of R02–R11. No new features: review the code, fix defects, verify
every acceptance criterion, and bring the documentation back in sync. This is the stop point before
the release branch (R13).

---

## What Was Done

Reviewed every file in `src/` and the full verification suite, then fixed the four defects the
checkpoint history had deferred:

- **Monster defeat by damage.** Commits and PR merges clamped monster HP at zero but never fired a
  defeat. `damageMonster()` now reports the defeated monster and `resolveAttack()` awards gold,
  advances the queue, emits `monsterDefeated`, and records a namespaced processed ID.
- **Silent level ups.** `awardXp()` changed `hero.level` without telling the engine. `mapRepoData()`
  and `resolveAttack()` now emit a `levelUp` event and a `combat.levelUp` log entry when a threshold
  is crossed, so the `LVL N` floating text and SFX finally play.
- **Reload state.** Sandbox reloads rebuilt nothing and live reloads hid the connect modal with no
  board. `merge()` now rebuilds the sandbox queue from the mock dataset (respecting defeated issues)
  and resets `connected` for live sessions so the modal returns.
- **Training Dummy.** Clearing the queue left an empty canvas. `createTrainingDummy()` is exported
  from the mapper and reused as the repeatable fallback after the last real monster falls.

Also corrected documentation drift: the task header said T09, `SandboxControls` still described a
reserved `disabled` prop, the engine doc listed the wrong floating-number triggers, and the processed
ID key was documented as `m_and_m:processed_ids` instead of the Zustand payload.

---

## Main Changes

- `src/store/useGameStore.ts`: `pendingMonsters()`, `combatState()`, `damageMonster()` rewrite,
  `resolveAttack()`, `defeatedIssueKey()`, level-up emission, rehydration rebuild.
- `src/services/telemetryMapper.ts`: exported `createTrainingDummy()` and reused it in
  `buildMonsterQueue()`.
- `src/store/useGameStore.test.ts`: 8 new tests (monster defeat by commit and PR, level up on launch
  and on simulation, Training Dummy respawn, no respawn of defeated issues, sandbox and live
  rehydration, live/sandbox issue-number isolation). 121 tests total.
- `docs/architecture/02`, `03`, `05`, `06`: behavior corrections.
- `docs/gotchas/v0.1.0/994`–`997`: one file per defect.
- `docs/tasks/v0.1.0/12-review-phase-1.md`, roadmap, INDEX, and history statuses refreshed.

---

## Verification

- [x] `pnpm build` passed
- [x] `pnpm typecheck` passed with zero errors
- [x] `pnpm biome check --write .` passed (39 files)
- [x] `pnpm test` passed (121 tests, 13 files)
- [x] No `.mp3`, `.wav`, `.ogg`, or `.mp4` files in `public/`, `src/`, or `dist/`
- [x] `sessionStorage` holds the PAT only; `localStorage` holds `m_and_m:state` and ETag entries
- [x] i18n parity: 50 keys in `en.json`, 50 in `es.json`
- [x] No hardcoded JSX text and no `any` in `src/components/`
- [x] Dev server at `http://localhost:5199` responds with the app shell
- [x] The reviewed behaviors are covered by automated tests (store rehydration, defeat paths,
  level-up events, dummy respawn, issue-number isolation)

**Manual browser validation** is the stop-point check: launch the sandbox, defeat a monster with
commit damage, clear the queue, reload, and confirm the visuals. The agent environment has no
browser driver, so the visual pass is left to the user before R13 starts.

---

## Gotchas

- `docs/gotchas/v0.1.0/994-error-monster-damage-no-defeat.md`
- `docs/gotchas/v0.1.0/995-error-silent-level-up.md`
- `docs/gotchas/v0.1.0/996-error-ephemeral-monster-after-reload.md`
- `docs/gotchas/v0.1.0/997-error-training-dummy-not-repeatable.md`

---

## Known Gaps

- `monsterAttack` events are still never emitted, so the hero HP bar is derived at connect time and
  does not decrease during play. Monster counterattacks are a v0.1.1 candidate.
- Real GitHub issue closes are still not detected (the client only fetches a closed issue count);
  the sandbox remains the way to defeat monsters.
- `combatLog` is still not persisted; a reload starts with an empty log by design.
- Live-repository sessions reopen the connect modal on reload instead of auto-reconnecting, because
  the fetched telemetry is not persisted.

---

## References

- Task: `docs/tasks/v0.1.0/12-review-phase-1.md`
- Roadmap: `docs/roadmap/v0.1.0/README.md` (Phase 5 — Close)
- Previous branch: `docs/history/v0.1.0/11-fix-checkpoint-3.md`
