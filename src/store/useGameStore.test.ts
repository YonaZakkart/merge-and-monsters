import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CombatLogEntry } from '../types';

const { fetchRepoDataMock } = vi.hoisted(() => ({ fetchRepoDataMock: vi.fn() }));

vi.mock('../services/githubClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/githubClient')>();
  return { ...actual, fetchRepoData: fetchRepoDataMock };
});

import { getSandboxData } from '../services/githubClient';
import {
  PAT_STORAGE_KEY,
  STORE_STORAGE_KEY,
  levelFromXp,
  useGameStore,
  xpThresholdForLevel,
} from './useGameStore';

const store = () => useGameStore.getState();

function logEntry(index: number): CombatLogEntry {
  return {
    id: `entry-${index}`,
    timestamp: index,
    messageKey: 'combat.commitXp',
    params: { sha: `sha-${index}`, xp: index },
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchRepoDataMock.mockReset();
  store().reset();
});

describe('useGameStore', () => {
  describe('launchSandbox', () => {
    it('connects the sandbox with the TypeScript weapon class', () => {
      store().launchSandbox();
      const state = store();

      expect(state.sandboxMode).toBe(true);
      expect(state.connected).toBe(true);
      expect(state.repoSlug).toBe(getSandboxData().slug);
      expect(state.hero.weaponClass).toBe('strictBlade');
      expect(state.activeMonster).not.toBeNull();
      expect(state.monsterQueue).toHaveLength(3);
      expect(state.combatLog).toHaveLength(8);
    });

    it('does not award XP twice when the sandbox is relaunched', () => {
      store().launchSandbox();
      const firstXp = store().hero.xp;
      store().launchSandbox();

      expect(store().hero.xp).toBe(firstXp);
      expect(store().combatLog).toHaveLength(8);
    });

    it('announces the level reached by the initial XP award', () => {
      store().launchSandbox();

      expect(store().hero.level).toBe(4);
      expect(store().combatLog[0]?.messageKey).toBe('combat.levelUp');
      expect(store().pendingEvents.some((event) => event.type === 'levelUp')).toBe(true);
    });

    it('drops any stored PAT when entering sandbox mode', async () => {
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });
      await store().connect('octo/repo', 'ghp_sandbox_secret');
      expect(sessionStorage.getItem(PAT_STORAGE_KEY)).toBe('ghp_sandbox_secret');

      store().launchSandbox();

      expect(sessionStorage.getItem(PAT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('connect', () => {
    it('maps the repository payload into hero and queue', async () => {
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });

      await store().connect('octo/repo');

      const state = store();
      expect(state.repoSlug).toBe('octo/repo');
      expect(state.connected).toBe(true);
      expect(state.sandboxMode).toBe(false);
      expect(state.hero.maxHp).toBe(463);
      expect(state.hero.hp).toBe(463);
      expect(state.hero.weaponClass).toBe('strictBlade');
      expect(state.activeMonster?.issueNumber).toBe(104);
    });

    it('keeps the PAT in sessionStorage only', async () => {
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });

      await store().connect('octo/repo', 'ghp_sandbox_secret');

      expect(sessionStorage.getItem(PAT_STORAGE_KEY)).toBe('ghp_sandbox_secret');
      const persisted = Object.keys(localStorage)
        .map((key) => localStorage.getItem(key) ?? '')
        .join(' ');
      expect(persisted).not.toContain('ghp_sandbox_secret');
      expect(JSON.stringify(store())).not.toContain('ghp_sandbox_secret');
    });
  });

  describe('simulation controls', () => {
    it('awards XP and damages the monster on simulateCommit', () => {
      store().launchSandbox();
      store().drainCombatEvents();
      const before = store();
      const monsterHp = before.activeMonster?.hp ?? 0;

      store().simulateCommit();
      const after = store();

      expect(after.hero.xp).toBeGreaterThan(before.hero.xp);
      expect(after.activeMonster?.hp).toBeLessThan(monsterHp);
      expect(after.pendingEvents.map((event) => event.type)).toEqual(['xpGain', 'heroAttack']);
      expect(after.attacking).toBe(true);
    });

    it('clears the attack flag when the engine reports the animation ended', () => {
      store().launchSandbox();
      store().simulateCommit();

      expect(store().attacking).toBe(true);
      store().setAttacking(false);
      expect(store().attacking).toBe(false);
    });

    it('ignores simulation controls outside sandbox mode', () => {
      const before = store();
      store().simulateCommit();
      store().simulatePrMerge();
      store().simulateIssueClose();

      expect(store().hero).toEqual(before.hero);
      expect(store().pendingEvents).toHaveLength(0);
    });

    it('defeats the active monster and advances the queue on simulateIssueClose', () => {
      store().launchSandbox();
      store().drainCombatEvents();
      const before = store();
      const goldBefore = before.hero.gold;
      const defeated = before.activeMonster;
      const next = before.monsterQueue[0];

      store().simulateIssueClose();
      const after = store();

      expect(after.activeMonster?.issueNumber).toBe(next?.issueNumber);
      expect(after.hero.gold).toBe(goldBefore + (defeated?.goldReward ?? 0));
      expect(after.monsterQueue).toHaveLength(2);
      expect(after.pendingEvents.at(-1)?.type).toBe('monsterDefeated');
    });

    it('defeats the monster and awards gold when damage reaches zero', () => {
      store().launchSandbox();
      store().drainCombatEvents();
      const before = store();
      const monster = before.activeMonster;
      if (!monster) throw new Error('expected an active monster');
      useGameStore.setState({ activeMonster: { ...monster, hp: 1 } });
      const next = before.monsterQueue[0];

      store().simulateCommit();
      const after = store();

      expect(after.activeMonster?.issueNumber).toBe(next?.issueNumber);
      expect(after.hero.gold).toBe(before.hero.gold + monster.goldReward);
      expect(after.pendingEvents.map((event) => event.type)).toEqual([
        'xpGain',
        'heroAttack',
        'monsterDefeated',
      ]);
      expect(after.processedIds.has(`issue:${before.repoSlug}:${monster.id}`)).toBe(true);
      expect(after.combatLog[0]?.messageKey).toBe('combat.monsterDefeated');
    });

    it('defeats the monster on a PR merge that empties its HP', () => {
      store().launchSandbox();
      store().drainCombatEvents();
      const before = store();
      const monster = before.activeMonster;
      if (!monster) throw new Error('expected an active monster');
      useGameStore.setState({ activeMonster: { ...monster, hp: 10 } });

      store().simulatePrMerge();
      const after = store();

      expect(after.activeMonster?.issueNumber).toBe(before.monsterQueue[0]?.issueNumber);
      expect(after.hero.gold).toBe(before.hero.gold + monster.goldReward);
      expect(after.pendingEvents.at(-1)?.type).toBe('monsterDefeated');
    });

    it('emits a levelUp event and log entry when XP crosses a threshold', () => {
      store().launchSandbox();
      store().drainCombatEvents();
      const before = store();
      useGameStore.setState({ hero: { ...before.hero, xp: 990, level: 4 } });

      store().simulateCommit();
      const after = store();

      expect(after.hero.level).toBe(5);
      expect(after.pendingEvents.some((event) => event.type === 'levelUp')).toBe(true);
      expect(after.combatLog[0]?.messageKey).toBe('combat.levelUp');
    });

    it('respawns a Training Dummy when the queue is exhausted', () => {
      store().launchSandbox();
      store().simulateIssueClose();
      store().simulateIssueClose();
      store().simulateIssueClose();
      store().simulateIssueClose();

      expect(store().activeMonster?.archetype).toBe('trainingDummy');
      expect(store().monsterQueue).toHaveLength(0);
    });

    it('keeps live issue numbers separate from sandbox defeats', async () => {
      store().launchSandbox();
      store().simulateIssueClose();
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });

      await store().connect('octo/repo');

      expect(store().activeMonster?.issueNumber).toBe(104);
    });

    it('does not respawn defeated issues when the sandbox is relaunched', () => {
      store().launchSandbox();
      const defeated = store().activeMonster;
      if (!defeated) throw new Error('expected an active monster');
      store().simulateIssueClose();

      store().launchSandbox();

      expect(store().activeMonster?.issueNumber).not.toBe(defeated.issueNumber);
      expect(store().processedIds.has(`issue:${store().repoSlug}:${defeated.id}`)).toBe(true);
    });
  });

  describe('combat log', () => {
    it('keeps only the latest 100 entries', () => {
      for (let index = 0; index < 101; index += 1) {
        store().addCombatLogEntry(logEntry(index));
      }

      const log = store().combatLog;
      expect(log).toHaveLength(100);
      expect(log[0]?.id).toBe('entry-100');
      expect(log.at(-1)?.id).toBe('entry-1');
    });
  });

  describe('combat events', () => {
    it('drains pending events once', () => {
      store().launchSandbox();
      const first = store().drainCombatEvents();

      expect(first.length).toBeGreaterThan(0);
      expect(store().drainCombatEvents()).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('serializes processedIds and rehydrates them as a Set', async () => {
      store().launchSandbox();
      const expectedSize = store().processedIds.size;
      const raw = localStorage.getItem(STORE_STORAGE_KEY) ?? '';

      expect(raw).toContain('processedIds');
      expect(store().processedIds).toBeInstanceOf(Set);

      await useGameStore.persist.rehydrate();

      const rehydrated = store().processedIds;
      expect(rehydrated).toBeInstanceOf(Set);
      expect(rehydrated.size).toBe(expectedSize);
    });

    it('rebuilds the sandbox queue on rehydration and keeps defeated issues out', async () => {
      store().launchSandbox();
      const defeated = store().activeMonster;
      if (!defeated) throw new Error('expected an active monster');
      store().simulateIssueClose();

      await useGameStore.persist.rehydrate();

      const state = store();
      expect(state.activeMonster).not.toBeNull();
      expect(state.activeMonster?.issueNumber).not.toBe(defeated.issueNumber);
      expect(state.processedIds.has(`issue:${state.repoSlug}:${defeated.id}`)).toBe(true);
    });

    it('reopens the connect modal on rehydration for a live repository', async () => {
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });
      await store().connect('octo/repo');
      const xp = store().hero.xp;

      await useGameStore.persist.rehydrate();

      expect(store().connected).toBe(false);
      expect(store().hero.xp).toBe(xp);
    });

    it('clears state, localStorage, and the PAT on reset', async () => {
      fetchRepoDataMock.mockResolvedValue({ ...getSandboxData(), slug: 'octo/repo' });
      await store().connect('octo/repo', 'ghp_sandbox_secret');

      store().reset();

      const state = store();
      expect(state.connected).toBe(false);
      expect(state.hero.xp).toBe(0);
      expect(state.processedIds.size).toBe(0);
      expect(sessionStorage.getItem(PAT_STORAGE_KEY)).toBeNull();
    });
  });
});

describe('xpThresholdForLevel', () => {
  it('matches the cumulative level thresholds', () => {
    expect(xpThresholdForLevel(1)).toBe(0);
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(300);
    expect(xpThresholdForLevel(4)).toBe(600);

    for (const level of [1, 2, 3, 4, 5]) {
      expect(levelFromXp(xpThresholdForLevel(level))).toBe(level);
    }
  });
});

describe('levelFromXp', () => {
  it('uses cumulative thresholds of 100 XP per level step', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
    expect(levelFromXp(693)).toBe(4);
  });
});
