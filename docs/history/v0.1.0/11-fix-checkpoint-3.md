# 11 — fix/0.1.0-checkpoint-3

**Branch**: `fix/0.1.0-checkpoint-3`
**Status**: Merged
**PR**: https://github.com/YonaZakkart/merge-and-monsters/pull/11
**Owner**: C
**Version**: 0.1.0
**Date**: 2026-11-22

---

## Objective

Final integration gate before the stabilization review (R12). Full end-to-end pass of the completed
application plus a targeted security check on PAT handling.

No new functionality. No new feature code.

---

## Pre-conditions

- [x] R10 `feature/0.1.0-hud-components-Y` merged to `main`

---

## What Was Done

Closed the two integration gaps R10 deferred, and made the documented `biome check .` command
actually pass:

- **Attack lock.** Added a transient `attacking: boolean` plus `setAttacking()` to `useGameStore`.
  `simulateCommit()` and `simulatePrMerge()` raise it when they queue a `heroAttack`;
  `GameLoop.renderFrame()` lowers it on the first frame where `animation.heroAttacking` is false.
  `SandboxControls` reads the flag and disables all three buttons while an attack animation plays,
  so rapid clicks can no longer stack overlapping animations. The flag is never persisted.
- **PAT hardening.** `launchSandbox()` now removes `m_and_m:pat` from `sessionStorage`, so a token
  entered in a previous real-repo connection cannot linger after switching to sandbox mode.
- **Tooling.** `biome.json` now ignores `dist` and `coverage`, so `biome check .` no longer lints
  minified bundle output. `vite.config.ts` imports `node:path` (`useNodejsImportProtocol`).

---

## Main Changes

- `src/store/useGameStore.ts`: `attacking` state, `setAttacking()`, attack flag raised on commit and
  PR simulations, PAT cleared on sandbox launch.
- `src/engine/GameLoop.ts`: clears the store flag when the attack animation ends.
- `src/components/SandboxControls.tsx`: reads `attacking` and merges it with the `disabled` prop.
- `biome.json`, `vite.config.ts`: scoped lint inputs and Node builtin protocol.
- Tests: store (2 new), controls (2 new), engine loop (1 new) — 113 total.

---

## Verification

- [x] `npx tsc --noEmit` passes with zero errors
- [x] `npx biome check .` passes clean (39 files)
- [x] `npx vitest run` passed (113 tests, 13 files)
- [x] `npx vite build` passed
- [x] No `.mp3`, `.wav`, `.ogg`, or `.mp4` files in `public/`, `src/`, or `dist/`

**End-to-end run in the desktop browser at `http://localhost:5199`** (Spanish locale default):

- [x] Modal on load, focus starts on the slug input
- [x] "Iniciar Sandbox del calabozo" closes the modal and mounts HUD + canvas + controls + log
- [x] HUD reads `Adventurer`, level 4, `Hoja Estricta`, gold 0, HP 463/463, XP 693
- [x] Canvas sampled 11 distinct colors including gold walls and sprite skin tones at 1191x670
- [x] "Simular commit": XP 693 -> 763 (+70), new log line `Commit b2c3d4e otorga 70 XP.`, all three
      buttons disabled immediately after the click
- [x] "Simular cierre de issue": gold 0 -> 10, new log line with `+10 oro otorgado`, controls stay
      enabled because no attack animation starts
- [x] Mute toggles to `Activar sonido` with `aria-pressed="true"` and survives a reload
- [x] `sessionStorage` stays empty and `localStorage` holds only `m_and_m:state`

**Static checks:**

- [x] i18n parity: 50 keys in `en.json`, 50 in `es.json`, no differences
- [x] No `any` in `src/components/`
- [x] No hardcoded JSX text (`return.*"[A-Z]` has no matches)

---

## Gotchas

- The Review pane stops `requestAnimationFrame` when it is not painting, so in that pane the attack
  flag can stay raised after a click until the tab is focused again. Real users click on a visible
  tab, where the loop clears the flag within `ATTACK_FRAMES` (250 ms). The engine-clears-flag path is
  covered by a unit test that drives the loop manually.
- `Tab` key navigation cannot be exercised in the offscreen Review pane (no default focus movement),
  so the focus trap was verified by code review plus the initial-focus test, not by keystroke.

---

## Known Gaps

- Monster HP can still reach 0 from accumulated commit/PR damage without emitting `monsterDefeated`,
  awarding gold, or advancing the queue. `simulateIssueClose` remains the only way to defeat a
  monster. Tracked for the stabilization review.
- After a reload the sandbox restores `hero`, `muted`, and `processedIds`, but `activeMonster` and
  `monsterQueue` are ephemeral, so the canvas shows no monster until the sandbox is relaunched.

---

## References

- Task: `docs/tasks/v0.1.0/11-checkpoint-3.md`
- Roadmap: `docs/roadmap/v0.1.0/README.md` (CP-3)
- Checkpoint 2: `docs/history/v0.1.0/09-fix-checkpoint-2.md`
- R10: `docs/history/v0.1.0/10-feature-hud-components-Y.md`
