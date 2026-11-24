# 10 — feature/0.1.0-hud-components-Y

**Branch**: `feature/0.1.0-hud-components-Y`
**Status**: Merged
**PR**: https://github.com/YonaZakkart/merge-and-monsters/pull/10
**Owner**: Y
**Version**: 0.1.0
**Date**: 2026-11-20

---

## What Was Done

Built the four HUD components and composed them around the canvas, so the game is finally playable
from the browser: connect a repository or launch the sandbox, watch the hero fight, simulate events,
and read the combat log.

Also closed two integration gaps left by earlier branches: the engine never played SFX (Checkpoint 2
merged only a history file), and the canvas could stay blank until the first animation frame after a
resize.

---

## Main Changes

- `src/components/RepoConnectModal.tsx` (new): native `<dialog>` overlay, slug normalization
  (`https://github.com/owner/repo` → `owner/repo`), password PAT field, disabled state while
  connecting, inline rate-limit / not-found banner, manual focus trap.
- `src/components/HeroHud.tsx` (new): name, level, weapon class, gold, gold HP bar, blue XP bar
  against the current level thresholds, mute toggle (`aria-pressed`, label switches).
- `src/components/CombatLog.tsx` (new): newest-first terminal with timestamps and `t()` messages,
  auto-scroll, empty state.
- `src/components/SandboxControls.tsx` (new): renders only in sandbox mode; three simulations plus a
  `disabled` prop reserved for Checkpoint 3.
- `src/App.tsx`: header + responsive layout (`lg:flex-row`, stacks at 360 px), modal gate on
  `connected`, canvas with an accessible name.
- `src/lib/i18n/locales/{en,es}.json`: eight new keys (50 total, parity enforced by a test).
- `src/store/useGameStore.ts`: exported `xpThresholdForLevel` for the XP bar.
- `src/engine/GameLoop.ts`: `eventTypeToSfxType` + `SoundSynth.play` per combat event; new
  `GameLoop.render()` used after a resize.
- Tests: 5 new files (modal, HUD, log, controls, locale parity) plus App and GameLoop updates.

---

## Verification

- [x] `pnpm test` passed (108 tests, 13 files)
- [x] `pnpm typecheck` passed
- [x] `pnpm biome check --write .` passed
- [x] `pnpm build` passed
- [x] Desktop 1280x900: modal on load, sandbox view with HUD + canvas + controls + 7 log entries
- [x] Mobile 360x800: stacked layout, no horizontal overflow
- [x] No string literals in JSX (all text via `t()`)
- [x] No `.mp3` / `.wav` / `.ogg` assets

---

## Gotchas

- Biome requires `role="progressbar"` elements to be focusable (`tabIndex={0}`) and prefers a native
  `<dialog>` over `role="dialog"` on a `div`. Both were applied.
- `<dialog open>` keeps its UA `position: absolute`; the overlay needs the dialog to be `relative`
  and centered by the flex parent.
- Sandbox SFX are silent for `xpGain` events on purpose: a connect drains seven XP events and would
  otherwise fire seven overlapping oscillators.

---

## Known Gaps

- `SandboxControls` is not yet disabled while an attack animation plays; the engine owns animation
  state, so this needs a store flag (Checkpoint 3).
- Real GitHub issue closes are still not detected (closed count only); the sandbox remains the way
  to defeat monsters.

---

## References

- Task: `docs/tasks/v0.1.0/10-hud-components.md`
- Roadmap: `docs/roadmap/v0.1.0/README.md` (Phase 4 — UI)
- ADR: `docs/adr/v0.1.0/06-i18n-en-es.md`
- Architecture: `docs/architecture/06-hud-and-ui.md`
