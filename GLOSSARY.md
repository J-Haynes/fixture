# Fixture

A mobile-first app showing upcoming fixtures, live scores and recent results for a hand-picked set of leagues, with no
accounts: each viewer's choices live on their own device.

## Language

### Competitions and games

**League**:
Any competition Fixture covers, whether a domestic league, a cup, an international tournament or a motorsport series.
_Avoid_: Competition (fine in prose, but "league" is the name of the thing), tournament, series

**League short name**:
The brief name a league goes by where space is tight, such as EPL, UCL, A-League, SRP or Supercars. Each league has
exactly one.
_Avoid_: League code, abbreviation (some short names aren't abbreviations)

**Season**:
One edition of a league, named by year (`2026`) or year span (`2026-2027`). Each league has exactly one **current
season** at a time.

**Season rollover**:
The moment a league's next season becomes its current season, once the old one is over and the next one's fixtures
are published. Everything that shows "the current season", including calendar feeds, moves to the new season with it.
_Avoid_: New season import (the import follows the rollover)

**Fixture**:
One scheduled game or motorsport session in a season, whatever its status (scheduled, live, finished, postponed,
cancelled).
_Avoid_: Match, game, event (except for motorsport, where the fixture is an event)

**Postponed fixture**:
A fixture that won't be played at its listed time and has no new time yet. It stays at its original time, clearly
marked postponed, until it is rescheduled, when the same fixture moves to its new time.
_Avoid_: Delayed, rescheduled (that's what happens to it next)

**Typical duration**:
How long a fixture in a given league usually lasts from kickoff, used to block out time in a calendar. Distinct from
the longer window during which a game might still be live.

**Cancelled fixture**:
A fixture that won't be played at all. It stays visible, marked cancelled, rather than disappearing.

**Team**:
A club or national side. A team is shared across every league it plays in, so Arsenal is one team in both the Premier
League and the Champions League.

### Viewer choices

**Followed team**:
A team the viewer has starred. Following is global, not per league.
_Avoid_: Favourite, my team (except as the UI label "My teams")

### Calendars

**Calendar feed**:
A subscribable URL that a calendar app polls, listing current-season fixtures, past and future, for either one league
or a fixed list of teams. A feed covers exactly what its URL names; it never follows later changes to the viewer's
in-app choices.
_Avoid_: ics export, calendar download, subscription (that's the viewer's act of adding a feed)

**League feed**:
A calendar feed of every fixture in one league's current season. Shown to viewers as "All".

**Team feed**:
A calendar feed of every fixture involving any of a fixed list of teams the viewer picked, across the current season of
every league they play in. Shown to viewers as "Custom".
_Avoid_: Favourites feed, my teams feed (it does not update when the viewer follows another team)
