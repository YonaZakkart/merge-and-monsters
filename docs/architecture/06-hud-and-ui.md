# HUD and UI

**Last updated**: 2026-11-23
**Version**: 0.1.0

---

## Layout

```text
+-------------------------------------------------------+
|  HeroHud (left)       Canvas Viewport     [Mute] [?]  |
|  - hero name          (60 FPS game scene)             |
|  - HP bar                                             |
|  - XP bar             +-------------------------+     |
|  - weapon class       |  dungeon floor          |     |
|  - gold counter       |  hero sprite            |     |
|                       |  monster sprite         |     |
|                       |  HP bars                |     |
|                       |  damage numbers         |     |
|                       +-------------------------+     |
|                                                       |
|  CombatLog (bottom) — terminal-style scrolling log    |
|                                                       |
|  SandboxControls (if sandbox mode)                    |
|  [Simulate Commit]  [Simulate PR Merge]               |
|  [Simulate Issue Close]                               |
+-------------------------------------------------------+
```

The `RepoConnectModal` is a full-screen overlay shown before connection. Once connected or in sandbox mode, it closes and the game layout appears.

The layout is a single column below the `lg` breakpoint (HUD, canvas, controls, log) and a two-column
row above it (HUD on the left, canvas and panels on the right). The canvas keeps a 16:9 box at every
width.

---

## Component Responsibilities

### RepoConnectModal

- Native `<dialog open>` inside a fixed overlay, `aria-modal` and `aria-labelledby` set
- Input: `owner/repo` slug or full GitHub URL. `normalizeSlug` strips `https://`, `www.`, a trailing
  slash, and `.git`
- Input: optional PAT (password field, stored only in `sessionStorage`)
- Button: "Connect Repository" — calls `store.connect(slug, pat?)`, disabled while pending
- Button: "Launch Dungeon Sandbox" — calls `store.launchSandbox()`
- Shows a non-blocking inline banner: `connect.errorRateLimit` for `RateLimitError`, otherwise
  `connect.errorNotFound`
- Focus starts on the slug input and Tab is trapped inside the dialog

### HeroHud

- Reads `store.hero` via hook
- Displays name, HP bar (gold fill), XP bar (blue fill), level, weapon class, gold
- HP fill is `hp / maxHp`; XP fill is `(xp - xpThresholdForLevel(level)) / (xpThresholdForLevel(level + 1) - xpThresholdForLevel(level))`
- Contains the mute toggle button (calls `store.setMuted` and plays `uiClick`)
- Does not write to the store except via the mute action

### CombatLog

- Reads `store.combatLog` via hook
- Renders entries as a fixed-height scrolling terminal with monospace font, newest first
- Resets `scrollTop` to 0 whenever the log changes, so the newest entry stays visible
- Each entry has a timestamp (`<time>`) and a translated event description

### SandboxControls

- Only renders when `store.sandboxMode === true`
- Three buttons: Simulate Commit, Simulate PR Merge, Simulate Issue Close
- Each button calls the corresponding store action and plays `uiClick`
- Reads `store.attacking` and disables all three buttons while the engine plays a hero attack
  animation, so rapid clicks cannot stack animations. The engine clears the flag when the animation
  ends; it is never persisted.

---

## Color Palette

| Token | Value | Use |
|-------|-------|-----|
| Background | `#0D0D0F` | Page, HUD panels, modal |
| Gold | `#D4AF37` | Borders, HP fill, headings, gold counter |
| Text | `#E8E8E8` | Body copy |
| Danger | `#C0392B` | Monster HP, critical numbers |
| Muted | `#555566` | Disabled, placeholders |
| XP fill | `#2980B9` | XP bar fill |

---

## Typography

- UI text: system sans-serif via Tailwind default
- Combat Log: monospace (`font-mono`)
- Canvas damage numbers: Canvas 2D `font` property, bold monospace 16 px
- No custom fonts loaded. No external font requests.

---

## Accessibility

- All interactive controls have accessible names (via `aria-label` or visible text).
- Focus is trapped inside `RepoConnectModal` while it is open, starting on the slug input.
- Mute toggle has a visible label and `aria-pressed` state.
- Progress bars use `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and
  `tabIndex={0}` so they are reachable by keyboard.
- The canvas exposes `role="img"` with a translated `aria-label`.
- Color is not the only indicator of state (HP bars also show numeric values).
- No motion-only indicators; floating numbers also appear in the combat log.

---

## i18n

All user-visible strings in components go through `t()`. The combat log entries are translated event descriptions assembled by `telemetryMapper.ts` using i18n keys. No string literals in JSX.

---

## References

- `docs/adr/v0.1.0/06-i18n-en-es.md`
- `src/components/`
- `src/lib/i18n/locales/`
