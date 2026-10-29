# Fixture JSON feed

`GET https://www.fixture.nz/api/feed` returns upcoming fixtures or recent results as JSON, for dashboards and other
apps (e.g. [Homepage](https://gethomepage.dev)). It is public, needs no key, sends `Access-Control-Allow-Origin: *`,
and is CDN-cached for 2 minutes, so polling more often than that gains nothing.

It covers the same data as the site: today ±14 days, for the leagues listed in the [README](../README.md).

## Parameters

All optional.

| Param | Default | Meaning |
|---|---|---|
| `view` | `upcoming` | `upcoming`: scheduled, live, postponed and cancelled games, soonest first. `results`: finished games, newest first. |
| `limit` | `10` | Number of items, 1–50. |
| `leagues` | all | Comma-separated league slugs, e.g. `nrl,premier-league`. |
| `teams` | all | Comma-separated team slugs; a game matches if either side is listed. Combine with `leagues` to narrow further. |
| `tz` | `Pacific/Auckland` | IANA time zone for the `kickoff` and `summary` labels, e.g. `Europe/London`. |

An invalid value returns `400` with `{ "error": "…" }`.

**League slugs:** `super-rugby-pacific`, `nrl`, `afl`, `a-league-men`, `premier-league`, `champions-league`,
`formula-1`, `v8-supercars`, `nba`, `nations-championship`, `rugby-championship`, `rugby-world-cup`,
`all-blacks-tests`.

**Team slugs** appear in every item (`home.slug`, `away.slug`). To find one, fetch a league's games and read them,
e.g. `/api/feed?leagues=premier-league&limit=50`. Clubs keep one slug across competitions, so following
`epl-arsenal` covers the Premier League and the Champions League.

## Response

```json
{
  "view": "upcoming",
  "updatedAt": "2026-10-28T03:15:00.000Z",
  "items": [
    {
      "id": 1234,
      "league": "Premier League",
      "leagueSlug": "premier-league",
      "leagueLogo": "https://www.fixture.nz/logos/premier-league.png",
      "round": "Round 10",
      "title": "Arsenal v Chelsea",
      "home": { "name": "Arsenal", "slug": "epl-arsenal", "logo": "https://www.fixture.nz/epl/arsenal.png" },
      "away": { "name": "Chelsea", "slug": "epl-chelsea", "logo": "https://www.fixture.nz/epl/chelsea.png" },
      "homeScore": null,
      "awayScore": null,
      "score": null,
      "podium": null,
      "status": "scheduled",
      "scheduledAt": "2026-10-31T17:30:00Z",
      "kickoff": "Sun, 1 Nov, 6:30 am",
      "summary": "Sun, 1 Nov, 6:30 am"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `title` | "Home v Away", or the event name for motorsport (no teams). |
| `league` | Short name when there is one (e.g. `SRP`), else the full name. |
| `leagueLogo` | Absolute URL of the league's logo, or `null`. Logos are drawn for dark backgrounds. |
| `home` / `away` | `null` for motorsport. `logo` is an absolute URL of the team's badge, or `null`. |
| `score` | `"2–1"` (en dash) once there is a score, else `null`. |
| `podium` | Motorsport results: driver names, first to third. Otherwise `null`. |
| `status` | `scheduled`, `live`, `finished`, `postponed` or `cancelled`. |
| `scheduledAt` | UTC, ISO 8601. |
| `kickoff` | `scheduledAt` formatted in `tz`. |
| `summary` | One display label: the kickoff time, `LIVE 12–7`, the final score, `Postponed` or `Cancelled`. |

## Homepage

Use the `customapi` widget with `display: dynamic-list`, mapping `title` to the row name and `summary` to its label:

```yaml
- Sport:
    - Upcoming:
        icon: https://www.fixture.nz/icon.svg
        href: https://www.fixture.nz
        widget:
          type: customapi
          url: https://www.fixture.nz/api/feed?limit=8
          refreshInterval: 120000
          display: dynamic-list
          mappings:
            items: items
            name: title
            label: summary
    - Results:
        icon: https://www.fixture.nz/icon.svg
        href: https://www.fixture.nz
        widget:
          type: customapi
          url: https://www.fixture.nz/api/feed?view=results&limit=5
          refreshInterval: 300000
          display: dynamic-list
          mappings:
            items: items
            name: title
            label: summary
```

Homepage fetches `customapi` URLs from its server, so the dashboard's own CSP and CORS don't matter. Add
`leagues=` or `teams=` to the URL to filter, and `tz=` if the server should show times outside New Zealand time.
