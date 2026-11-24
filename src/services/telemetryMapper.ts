import type {
  CombatEvent,
  MonsterArchetype,
  MonsterEntity,
  RawCommit,
  RawIssue,
  RawPr,
  WeaponClass,
} from '../types/index';

// -------------------------------------
// XP Calculation
// -------------------------------------

const MIN_DELTA_LINES = 1;
const MAX_DELTA_LINES = 2000;
const XP_PER_MERGED_PR = 50;

/** Diff churn (additions + deletions) clamped to [1, 2000]. */
function clampDeltaLines(lines: number): number {
  return Math.max(MIN_DELTA_LINES, Math.min(MAX_DELTA_LINES, lines));
}

/** XP awarded by a single commit: floor(25 * ln(1 + delta_lines)). */
function commitXp(commit: RawCommit): number {
  const deltaLines = clampDeltaLines(commit.stats.additions + commit.stats.deletions);
  return Math.floor(25 * Math.log(1 + deltaLines));
}

/**
 * Calculate XP from commits and PRs.
 * Returns `{ totalXp, newProcessedIds }`.
 *
 * Formula per commit: floor(25 * ln(1 + delta_lines)), delta_lines clamped to [1, 2000].
 * Each merged PR adds 50 XP. IDs already in processedIds award nothing.
 */
export function calculateXp(
  commits: RawCommit[],
  mergedPrs: RawPr[],
  processedIds: Set<string>
): { totalXp: number; newProcessedIds: Set<string> } {
  const newCommits = commits.filter((commit) => !processedIds.has(commit.sha));
  const newPrs = mergedPrs.filter((pr) => !processedIds.has(String(pr.id)));

  const commitXpTotal = newCommits.reduce((sum, commit) => sum + commitXp(commit), 0);
  const totalXp = commitXpTotal + XP_PER_MERGED_PR * newPrs.length;

  const newProcessedIds = new Set([
    ...processedIds,
    ...newCommits.map((commit) => commit.sha),
    ...newPrs.map((pr) => String(pr.id)),
  ]);

  return { totalXp, newProcessedIds };
}

// -------------------------------------
// Weapon Class Derivation
// -------------------------------------

/** Map a repository's primary language to a weapon class. */
export function deriveWeaponClass(language: string | null): WeaponClass {
  const mapping: Record<string, WeaponClass> = {
    TypeScript: 'strictBlade',
    JavaScript: 'scriptDagger',
    Python: 'scriptStaff',
    Rust: 'ironFang',
    Go: 'goHammer',
    Java: 'castMace',
    'C++': 'rawEdge',
    C: 'rawEdge',
    Dockerfile: 'containerShield',
    Shell: 'containerShield',
    Ruby: 'gemRod',
  };
  if (language === null) return 'adventurerFist';
  const normalized = language.trim();
  return mapping[normalized] ?? 'adventurerFist';
}

// -------------------------------------
// Max HP Calculation
// -------------------------------------

/**
 * Calculate max HP based on repository health.
 * Returns a value in [100, 500].
 *
 * Formula: 100 + close_ratio * 150 + README bonus 100 + CI bonus 150, capped at 500.
 */
export function calculateMaxHp(
  closedIssues: number,
  totalIssues: number,
  hasReadme: boolean,
  hasCi: boolean
): number {
  if (totalIssues <= 0) return 100;

  const ratio = Math.min(1, Math.max(0, closedIssues / totalIssues));
  const hp = 100 + ratio * 150 + (hasReadme ? 100 : 0) + (hasCi ? 150 : 0);

  return Math.max(100, Math.min(500, Math.round(hp)));
}

// -------------------------------------
// Monster Queue Building
// -------------------------------------

const DAY_MS = 86_400_000;
const MAX_AGE_DAYS = 60;

interface ArchetypeRule {
  labels: string[];
  archetype: MonsterArchetype;
  baseHp: number;
}

const ARCHETYPE_RULES: ArchetypeRule[] = [
  { labels: ['bug', 'critical'], archetype: 'regressionGolem', baseHp: 150 },
  { labels: ['enhancement', 'feature'], archetype: 'backlogWraith', baseHp: 100 },
  { labels: ['documentation', 'chore', 'debt'], archetype: 'debtSlime', baseHp: 75 },
];

const DEFAULT_ARCHETYPE: MonsterArchetype = 'mysteryCrawler';
const DEFAULT_BASE_HP = 75;

function resolveArchetype(issue: RawIssue): ArchetypeRule {
  const labels = issue.labels.map((label) => label.name.toLowerCase());
  return (
    ARCHETYPE_RULES.find((rule) => rule.labels.some((label) => labels.includes(label))) ?? {
      labels: [],
      archetype: DEFAULT_ARCHETYPE,
      baseHp: DEFAULT_BASE_HP,
    }
  );
}

/** The repeatable practice monster used when a repository has no open issues left. */
export function createTrainingDummy(): MonsterEntity {
  return {
    id: -1,
    archetype: 'trainingDummy',
    name: 'Training Dummy',
    hp: 50,
    maxHp: 50,
    goldReward: 0,
    issueNumber: 0,
  };
}

/** Build the monster queue from open issues, sorted by severity (highest HP first). */
export function buildMonsterQueue(openIssues: RawIssue[]): MonsterEntity[] {
  if (openIssues.length === 0) return [createTrainingDummy()];

  return openIssues
    .filter((issue) => !issue.labels.some((label) => label.name === 'pull_request'))
    .map((issue) => {
      const rule = resolveArchetype(issue);
      const ageDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(issue.created_at).getTime()) / DAY_MS)
      );
      const maxHp = Math.round(rule.baseHp * (1 + 0.15 * Math.min(ageDays, MAX_AGE_DAYS)));

      return {
        id: issue.number,
        archetype: rule.archetype,
        name: issue.title || `Issue #${issue.number}`,
        hp: maxHp,
        maxHp,
        goldReward: 0,
        issueNumber: issue.number,
      };
    })
    .sort((a, b) => b.maxHp - a.maxHp)
    .map((monster, index) => ({ ...monster, goldReward: 10 + index }));
}

// -------------------------------------
// Combat Event Mapping
// -------------------------------------

/** Map new commits, PRs, and closed issues to combat events. */
export function mapToCombatEvents(
  newCommits: RawCommit[],
  newPrs: RawPr[],
  closedIssues: RawIssue[]
): CombatEvent[] {
  const timestamp = Date.now();

  return [
    ...newCommits.map((commit) => ({
      type: 'xpGain' as const,
      xp: commitXp(commit),
      timestamp,
    })),
    ...newPrs.map(() => ({
      type: 'xpGain' as const,
      xp: XP_PER_MERGED_PR,
      timestamp,
    })),
    ...closedIssues.map(() => ({
      type: 'monsterDefeated' as const,
      timestamp,
    })),
  ];
}
