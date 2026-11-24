# Telemetry Mapping

**Last updated**: 2026-11-23
**Version**: 0.1.0

---

## Responsibility

`src/services/githubClient.ts` fetches raw data from the GitHub REST API.
`src/services/telemetryMapper.ts` converts that raw data into typed RPG entities.

Both modules are pure at their boundary: `telemetryMapper.ts` has no side effects and no imports from the store or engine.

---

## GitHub Client

### Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /repos/{owner}/{repo}` | Repository metadata: language, open issue count, default branch |
| `GET /repos/{owner}/{repo}/commits` | Recent commits with stats |
| `GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc` | Recently closed pull requests, filtered to `merged_at !== null` |
| `GET /repos/{owner}/{repo}/issues?state=open` | Open issues for monster spawning |
| `GET /repos/{owner}/{repo}/contents/README.md` | README presence check |
| `GET /repos/{owner}/{repo}/actions/workflows` | CI workflow check |

### Request Budget

A cold connect issues 12 requests: repository metadata, the commits window, five per-commit detail
requests (for `additions` / `deletions`), merged pull requests, open issues, the closed issue count,
README presence, and CI workflows. Every request stores its own ETag, so later polls resolve as
`304` and consume no quota.

`openIssueCount` is taken from the filtered open issue list (entries with `pull_request` removed),
not from the repository's `open_issues_count`, so the HUD counter and the monster queue always agree.

`closedIssueCount` is read from the `Link` header of `GET /issues?state=closed&per_page=1` (the
`rel="last"` page number). That endpoint lists pull requests as issues, so the close ratio used for
hero max HP is approximate.

### ETag Caching

Every request stores its `ETag` response header in `localStorage` keyed by URL. On the next poll, the client sends `If-None-Match: <etag>`. A `304 Not Modified` response returns the cached payload without consuming API quota.

```text
localStorage key format: etag:<encoded-url>
localStorage value format: { etag: string, data: unknown, timestamp: number }
```

### Rate Limit Handling

- On `403` or `429`: display a non-blocking banner. Offer the user a PAT input or Sandbox mode.
- PAT is stored in `sessionStorage` only. Never in `localStorage`. Never logged.
- Unauthenticated limit: 60 req/hr. Authenticated: 5,000 req/hr.

### Sandbox Mode

When Sandbox is active, `githubClient.ts` returns a static mock dataset instead of calling the API. The mock includes:
- 5 commits with varying diff sizes
- 2 merged PRs
- 4 open issues with different labels and ages
- A TypeScript primary language

---

## Telemetry Mapper

All functions in `telemetryMapper.ts` are pure: same inputs always produce same outputs.

### Hero XP

```
XP_commit = floor(25 * ln(1 + delta_lines)) + 50 * n_pr
```

- `delta_lines`: net additions + deletions per commit, clamped to [1, 2000] to reward atomic commits over mega-diffs.
- `n_pr`: count of merged PRs in the fetched window.
- XP accumulates. Level thresholds are cumulative: level 2 at 100 XP, level 3 at 300, level 4 at 600
  (each step adds `level * 100`).

### Hero Weapon Class

Determined by the repository's primary language (GitHub `language` field):

| Language | Weapon Class |
|----------|-------------|
| TypeScript | Strict Blade |
| JavaScript | Script Dagger |
| Python | Script Staff |
| Rust | Iron Fang |
| Go | Go Hammer |
| Java | Cast Mace |
| C / C++ | Raw Edge |
| Dockerfile / Shell | Container Shield |
| Ruby | Gem Rod |
| Other / null | Adventurer Fist |

### Hero Max HP

Derived from repository health, capped at 500:

```
max_hp = 100
       + (closed_issues / total_issues) * 150   // issue close ratio, 0–150
       + readme_present ? 100 : 0               // README bonus
       + ci_workflows_present ? 150 : 0         // CI bonus
```

### Monster Archetypes

Each open issue maps to one monster by label:

| Label(s) | Archetype | Base HP |
|----------|-----------|---------|
| `bug`, `critical` | Regression Golem | 150 |
| `enhancement`, `feature` | Backlog Wraith | 100 |
| `documentation`, `chore`, `debt` | Debt Slime | 75 |
| (no matching label) | Mystery Crawler | 75 |

### Monster HP Formula

```
HP_monster = base_severity * (1 + 0.15 * age_days)
```

- `age_days`: days since issue was opened, capped at 60.
- Example: a `bug` issue open for 30 days → `150 * (1 + 0.15 * 30) = 150 * 5.5 = 825 HP`.

### Training Dummy

If the repository has zero open issues, a fixed "Training Dummy" monster spawns with 50 HP and no gold reward. It allows the player to test commit attacks without a real issue queue. The dummy is repeatable: when every queued monster has been defeated, the store spawns a fresh one instead of leaving the canvas empty.

---

## Processed Event IDs

To prevent duplicate XP on page refresh:
- Commit SHAs awarded XP are stored in `localStorage`.
- Merged PR IDs awarded XP are stored the same way.
- Defeated issues are stored as `issue:<owner/repo>:<issueNumber>`, namespaced so sandbox numbers
  cannot collide with a live repository's issue numbers.
- The set is serialized as an array inside the Zustand persist payload under the key
  `m_and_m:state`.

---

## References

- `docs/adr/v0.1.0/05-telemetry-octokit-etag.md`
- `src/services/githubClient.ts`
- `src/services/telemetryMapper.ts`
- `src/types/index.ts`
