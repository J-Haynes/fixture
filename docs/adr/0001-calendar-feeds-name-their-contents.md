# Calendar feeds name their contents in the URL

Fixture has no accounts: followed teams and hidden leagues live only in each viewer's browser, and a calendar app
fetching a feed has no way to see them. So a calendar feed's URL names exactly what it covers (one league, or a fixed
list of teams the viewer ticked), and it never changes when the viewer later follows or unfollows teams in the app.

## Considered options

- **A live "Favourites" feed** that tracks the viewer's followed teams. Rejected: without accounts the server can't
  know them, so it would really be a frozen copy that silently misses newly followed teams.
- **One feed per team only.** Rejected for picking several teams: each needs its own subscription, which on a phone
  means a confirmation dialog per team.

## Consequences

- Changing what a calendar covers (or its alert) means replacing the subscription.
- League and team slugs are permanent once they exist, because subscription URLs contain them; renaming one breaks
  every calendar that uses it without telling anyone. This includes teams the sync creates by itself, which keep their
  slug when later seeded properly.
- A viewer who subscribes to a league feed and a team feed covering the same games sees those games twice.
