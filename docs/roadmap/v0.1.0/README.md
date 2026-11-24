# Roadmap — Version 0.1.0

**Version**: 0.1.0
**Status**: In Progress
**Last updated**: 2026-11-23

---

## Overview

This version delivers the full playable MVP: Vite scaffold, GitHub telemetry client, RPG mapper,
Zustand store, 60 FPS Canvas renderer, Web Audio synthesizer, and the complete HUD.

Work is split between two developers — **Y** (Yonathan) and **C** (Carlos) — so their branches
never touch the same files at the same time. Branch names end in `-Y` or `-C` to identify the
owner. Three `fix/` checkpoints merge the two parallel tracks before proceeding.

---

## Branch Plan

| No. | Branch | Owner | Phase | Depends on | Status |
|-----|--------|-------|-------|------------|--------|
| R01 | `chore/0.1.0-project-foundation` | Y | 0 — Foundation | — | Completed |
| R02 | `feature/0.1.0-scaffold-Y` | Y | 1 — Base | R01 | Completed |
| R03 | `feature/0.1.0-github-client-Y` | Y | 2 — Core modules | R02 | Completed |
| R04 | `feature/0.1.0-telemetry-mapper-C` | C | 2 — Core modules | R02 | Completed |
| R05 | `fix/0.1.0-checkpoint-1` | Y | CP-1 | R03, R04 | Completed |
| R06 | `feature/0.1.0-game-store-C` | C | 3 — State | R05 | Completed (recovered in R07) |
| R07 | `feature/0.1.0-canvas-renderer-Y` | Y | 3 — State | R05 | Completed |
| R08 | `feature/0.1.0-audio-synth-C` | C | 3 — State | R05 | Completed |
| R09 | `fix/0.1.0-checkpoint-2` | C | CP-2 | R06, R07, R08 | Completed (wiring finished in R10) |
| R10 | `feature/0.1.0-hud-components-Y` | Y | 4 — UI | R09 | Completed |
| R11 | `fix/0.1.0-checkpoint-3` | C | CP-3 | R10 | Completed |
| R12 | `chore/0.1.0-review-phase-1` | Y | 5 — Close | R11 | In Review |
| R13 | `chore/release-0.1.0` | C | 5 — Close | R12 | Planned |

---

## Parallel Work Map

```
R01  chore/foundation [Y]
  |
  v
R02  feature/scaffold-Y [Y]          <-- base: must land before anything else
  |
  +----> R03  feature/github-client-Y [Y]       |
  |                                              | -- parallel, no shared files
  +----> R04  feature/telemetry-mapper-C [C]    |
              |
              v
         fix/checkpoint-1 [Y]        <-- merges R03 + R04 into main, verifies integration
              |
  +----> R06  feature/game-store-C [C]           |
  |                                              |
  +----> R07  feature/canvas-renderer-Y [Y]      | -- parallel, no shared files
  |                                              |
  +----> R08  feature/audio-synth-C [C]          |
              |
              v
         fix/checkpoint-2 [C]        <-- merges R06 + R07 + R08, end-to-end smoke test
              |
              v
         R10  feature/hud-components-Y [Y]       <-- depends on all modules above
              |
              v
         fix/checkpoint-3 [C]        <-- final integration: wires HUD to store + engine
              |
              v
         chore/review-phase-1 [Y]    <-- stop point: full regression, no new features
              |
              v
         chore/release-0.1.0 [C]     <-- version bump, README, tag prep
```

---

## Phase Breakdown

### Phase 0 — Foundation
**Goal**: documentation and configuration base. No application code.

| Branch | Owner | Files touched |
|--------|-------|--------------|
| R01 `chore/0.1.0-project-foundation` | Y | `.kiro/`, `docs/`, `README.md`, `.gitignore` |

### Phase 1 — Base
**Goal**: a runnable Vite app with the full folder structure, palette, types, and i18n wired.

| Branch | Owner | Files touched |
|--------|-------|--------------|
| R02 `feature/0.1.0-scaffold-Y` | Y | `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/types/index.ts`, `src/lib/i18n/**` |

**Stop condition**: `pnpm dev` loads, background is `#0D0D0F`, both locale files have matching keys.

### Phase 2 — Core Modules
**Goal**: pure TypeScript modules with no shared files. Y and C work simultaneously.

| Branch | Owner | Files touched |
|--------|-------|--------------|
| R03 `feature/0.1.0-github-client-Y` | Y | `src/services/githubClient.ts`, `src/services/githubClient.test.ts`, `src/lib/etagCache.ts` |
| R04 `feature/0.1.0-telemetry-mapper-C` | C | `src/services/telemetryMapper.ts`, `src/services/telemetryMapper.test.ts` |

No file overlap. Both branches read from `src/types/index.ts` (read-only after R02 lands).

**Checkpoint 1** (`fix/0.1.0-checkpoint-1`, owner: Y):
- Pull `main` after R03 and R04 are merged
- Run `pnpm test`, `pnpm typecheck`, `pnpm biome check --write .`
- Verify `githubClient` and `telemetryMapper` integrate correctly (sandbox data flows through mapper)
- Fix any import path or type mismatches
- Update `docs/history/v0.1.0/` for R03 and R04

### Phase 3 — State & Engine
**Goal**: store, canvas loop, and audio synth. All three are independent after Checkpoint 1 lands.

| Branch | Owner | Files touched |
|--------|-------|--------------|
| R06 `feature/0.1.0-game-store-C` | C | `src/store/useGameStore.ts` |
| R07 `feature/0.1.0-canvas-renderer-Y` | Y | `src/engine/GameLoop.ts`, `src/engine/Renderer.ts` |
| R08 `feature/0.1.0-audio-synth-C` | C | `src/engine/SoundSynth.ts` |

File overlap risk: R06 and R08 both by C but on different files — no conflict.
Y (R07) only touches `src/engine/`; C (R06, R08) only touches `src/store/` and `src/engine/SoundSynth.ts`.

**Checkpoint 2** (`fix/0.1.0-checkpoint-2`, owner: C):
- Pull `main` after R06, R07, and R08 are merged
- Wire `GameLoop` to read from `useGameStore.getState()` — verify no React hook calls in engine
- Wire `SoundSynth.setMuted` / `isMuted` to the store's `muted` field
- Run full test suite and manual smoke test: canvas renders, SFX triggers on simulated events
- Fix any integration gaps between store shape and engine reads
- Update `docs/history/v0.1.0/` for R06–R08

### Phase 4 — UI
**Goal**: all four HUD React components, wired to store and engine. Single branch, single owner.

| Branch | Owner | Files touched |
|--------|-------|--------------|
| R10 `feature/0.1.0-hud-components-Y` | Y | `src/components/RepoConnectModal.tsx`, `src/components/HeroHud.tsx`, `src/components/CombatLog.tsx`, `src/components/SandboxControls.tsx`, `src/App.tsx` (composition), `src/lib/i18n/locales/en.json`, `src/lib/i18n/locales/es.json` |

**Checkpoint 3** (`fix/0.1.0-checkpoint-3`, owner: C):
- Pull `main` after R10 is merged
- Full end-to-end manual test: open app, launch sandbox, simulate all three actions, verify HUD, combat log, and canvas are in sync
- Verify PAT is not written to `localStorage`
- Verify no string literals in JSX (`grep` check)
- Run full verification suite
- Update `docs/history/v0.1.0/` for R10

### Phase 5 — Close
**Goal**: stabilization, then version bump. No new features.

| Branch | Owner | Purpose |
|--------|-------|---------|
| R12 `chore/0.1.0-review-phase-1` | Y | Full regression. Fix bugs from review. Update all docs. **Stop point — user validates.** |
| R13 `chore/release-0.1.0` | C | Bump `package.json` to `0.1.0`. Update public README. Tag prep. |

---

## File Ownership Map

This table prevents conflicts. A developer owns a file for the duration of their branch.
Once merged, the file is fair game for the next branch.

| File / folder | Branch that creates it | Owner |
|---------------|----------------------|-------|
| `src/types/index.ts` | R02 | Y (read-only after merge) |
| `src/lib/i18n/**` | R02, R10 | Y |
| `src/services/githubClient.ts` | R03 | Y |
| `src/lib/etagCache.ts` | R03 | Y |
| `src/services/telemetryMapper.ts` | R04 | C |
| `src/store/useGameStore.ts` | R06 | C |
| `src/engine/GameLoop.ts` | R07 | Y |
| `src/engine/Renderer.ts` | R07 | Y |
| `src/engine/SoundSynth.ts` | R08 | C |
| `src/components/**` | R10 | Y |
| `src/App.tsx` (composition) | R10 | Y |

---

## Checkpoint Rules

A checkpoint branch (`fix/0.1.0-checkpoint-N`) is not a feature branch. It:
1. Branches from `main` **after all its dependency branches are merged**.
2. Makes no functional changes beyond wiring, type fixes, and import corrections.
3. Runs the full verification suite and records results.
4. Updates `docs/history/v0.1.0/` for all branches merged since the last checkpoint.
5. Is merged to `main` before the next phase begins.

If a checkpoint finds a real bug, the fix goes into the checkpoint branch. If the bug is large
enough to need its own branch, a `fix/0.1.0-<slug>` is cut from `main`, merged, and the
checkpoint rebranches from the updated `main`.

---

## Stop Points

- **CP-1** (`fix/0.1.0-checkpoint-1`): integration gate between Phase 2 and Phase 3.
- **CP-2** (`fix/0.1.0-checkpoint-2`): integration gate between Phase 3 and Phase 4.
- **CP-3** (`fix/0.1.0-checkpoint-3`): integration gate before final review.
- **R12** (`chore/0.1.0-review-phase-1`): full regression stop point. User validates before R13.
- **R13** (`chore/release-0.1.0`): version close. User merges PR and creates tag `v0.1.0`.

---

## References

- `docs/tasks/v0.1.0/` — executable checklists for each branch
- `docs/history/v0.1.0/` — record of branches pushed and PRs
- `docs/adr/v0.1.0/` — technical decisions backing this plan
