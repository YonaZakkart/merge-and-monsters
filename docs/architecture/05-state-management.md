# State Management

**Last updated**: 2026-11-23
**Version**: 0.1.0

---

## Responsibility

`src/store/useGameStore.ts` is the single Zustand store. It holds all game state that must survive a React render cycle or a page refresh. The canvas engine reads it via `getState()`; React components subscribe to it via hooks.

---

## Store Shape

```typescript
interface GameStore {
  // Connection
  repoSlug: string | null;
  connected: boolean;
  sandboxMode: boolean;

  // Hero
  hero: HeroState;

  // Combat
  monsterQueue: MonsterEntity[];
  activeMonster: MonsterEntity | null;
  combatLog: CombatLogEntry[];

  // Audio
  muted: boolean;

  // Processed IDs (dedup)
  processedIds: Set<string>;

  // Engine bridge (not persisted)
  pendingEvents: CombatEvent[];
  attacking: boolean;

  // Actions
  connect: (slug: string, pat?: string) => Promise<void>;
  launchSandbox: () => void;
  simulateCommit: () => void;
  simulatePrMerge: () => void;
  simulateIssueClose: () => void;
  setMuted: (muted: boolean) => void;
  setAttacking: (attacking: boolean) => void;
  addCombatLogEntry: (entry: CombatLogEntry) => void;
  advanceMonsterQueue: () => void;
  drainCombatEvents: () => CombatEvent[];
  reset: () => void;
}
```

---

## HeroState Shape

```typescript
interface HeroState {
  name: string;
  xp: number;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  weaponClass: WeaponClass;
}
```

---

## Persistence

The store uses Zustand's `persist` middleware with `localStorage` as the storage backend.

Persisted fields:
- `repoSlug`
- `connected`
- `sandboxMode`
- `hero`
- `processedIds` (serialized as an array, deserialized back to `Set`)
- `muted`

Not persisted (rebuilt on reconnect or refresh):
- `monsterQueue`
- `activeMonster`
- `combatLog`

On rehydration, `merge()` rebuilds combat state:

- In sandbox mode, the queue is rebuilt from the mock dataset and filtered against the defeated
  issue IDs stored in `processedIds`. The next undefeated issue becomes active; an exhausted queue
  falls back to the Training Dummy.
- In live-repository mode, the fetched telemetry is not persisted, so `connected` is reset to `false`
  and `RepoConnectModal` reappears. Hero progress is kept.

---

## Hero Progression

- `levelFromXp(xp)` uses cumulative thresholds: level 2 at 100 XP, level 3 at 300, level 4 at 600
  (`threshold += level * 100`).
- `connect` and `launchSandbox` heal the hero to `maxHp` and derive the weapon class from the
  repository language.
- When an XP award crosses a threshold, the store emits a `levelUp` combat event and prepends a
  `combat.levelUp` log entry.
- Sandbox simulations award XP and also damage the active monster: a commit deals its XP value as
  damage, a PR merge deals 50 (which is also the crit threshold). Damage that reaches zero HP
  defeats the monster, awards `goldReward`, advances the queue, and records the issue as defeated.
  Closing an issue defeats it directly. When the queue is exhausted, a fresh Training Dummy spawns.

## Canvas Sync Strategy

`GameLoop.ts` calls `useGameStore.getState()` on every animation frame. It reads:
- `hero.hp`, `hero.maxHp` for the hero HP bar
- `activeMonster` for the monster sprite, HP bar, and name

The store appends `CombatEvent` objects to `pendingEvents` (never persisted). `GameLoop.ts` calls
`drainCombatEvents()` once per frame, which returns the batch and clears it. The loop then turns each
event into animation state (attack flags, shake, particles, floating numbers), so animations never
depend on React renders.

---

## Processed IDs

`processedIds` is a `Set<string>` containing:
- Commit SHAs that have already awarded XP
- Merged PR IDs that have already awarded XP
- Defeated issues, namespaced as `issue:<owner/repo>:<issueNumber>` so sandbox numbers cannot
  collide with a live repository's issues. The v0.1.0 client only fetches a closed issue count, so
  real issue closes are not detected yet.

On reconnect, the client fetches fresh data, then filters out any IDs already in this set before mapping to RPG events. This prevents duplicate awards after a page refresh.

---

## References

- `docs/adr/v0.1.0/02-state-zustand-localstorage.md`
- `src/store/useGameStore.ts`
- `src/engine/GameLoop.ts`
