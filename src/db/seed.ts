/**
 * Seeds the database with Super Rugby Pacific 2026 + NRL 2026 data.
 * Run with: npm run db:seed
 *
 * Idempotent — safe to run multiple times. Skips fixture insert if data exists.
 */
import { eq, count } from 'drizzle-orm';
import { db } from './index';
import { sports, leagues, seasons, teams, fixtures } from './schema';

async function main() {
  console.log('🌱 Seeding database...\n');

  // ══════════════════════════════════════════════════════════════════════════════
  // Rugby Union — Super Rugby Pacific 2026
  // ══════════════════════════════════════════════════════════════════════════════

  const [rugbyUnion] = await db
    .insert(sports)
    .values({ name: 'Rugby Union', slug: 'rugby' })
    .onConflictDoUpdate({ target: sports.slug, set: { name: 'Rugby Union' } })
    .returning();
  console.log(`✓ Sport: ${rugbyUnion.name} (id ${rugbyUnion.id})`);

  const [superRugby] = await db
    .insert(leagues)
    .values({
      sportId:   rugbyUnion.id,
      name:      'Super Rugby Pacific',
      shortName: 'SRP',
      slug:      'super-rugby-pacific',
      country:   'International',
      logoUrl:   '/logos/Super_Rugby_Pacific_logo.png',
      isActive:  true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: 'Super Rugby Pacific', shortName: null, logoUrl: '/logos/Super_Rugby_Pacific_logo.png' },
    })
    .returning();
  console.log(`✓ League: ${superRugby.name} (id ${superRugby.id})`);

  const [srpSeason] = await db
    .insert(seasons)
    .values({ leagueId: superRugby.id, year: '2026', isCurrent: true })
    .onConflictDoUpdate({
      target: [seasons.leagueId, seasons.year],
      set: { isCurrent: true },
    })
    .returning();
  console.log(`✓ Season: SRP ${srpSeason.year} (id ${srpSeason.id})`);

  const srpTeams = [
    { sportId: rugbyUnion.id, name: 'Blues',           shortName: 'BLU', slug: 'blues',          country: 'New Zealand', logoUrl: '/rugby/blues.png'        },
    { sportId: rugbyUnion.id, name: 'Chiefs',           shortName: 'CHI', slug: 'chiefs',         country: 'New Zealand', logoUrl: '/rugby/chiefs.svg'        },
    { sportId: rugbyUnion.id, name: 'Crusaders',        shortName: 'CRU', slug: 'crusaders',      country: 'New Zealand', logoUrl: '/rugby/crusaders.png'     },
    { sportId: rugbyUnion.id, name: 'Highlanders',      shortName: 'HIG', slug: 'highlanders',    country: 'New Zealand', logoUrl: '/rugby/highlanders.png'   },
    { sportId: rugbyUnion.id, name: 'Hurricanes',       shortName: 'HUR', slug: 'hurricanes',     country: 'New Zealand', logoUrl: '/rugby/hurricanes.png'    },
    { sportId: rugbyUnion.id, name: 'ACT Brumbies',     shortName: 'BRU', slug: 'brumbies',       country: 'Australia',   logoUrl: '/rugby/brumbies.svg'      },
    { sportId: rugbyUnion.id, name: 'Queensland Reds',  shortName: 'RED', slug: 'reds',           country: 'Australia',   logoUrl: '/rugby/reds.png'          },
    { sportId: rugbyUnion.id, name: 'NSW Waratahs',     shortName: 'WAR', slug: 'waratahs',       country: 'Australia',   logoUrl: '/rugby/waratahs.svg'      },
    { sportId: rugbyUnion.id, name: 'Western Force',    shortName: 'FOR', slug: 'force',          country: 'Australia',   logoUrl: '/rugby/westernforce.png'  },
    { sportId: rugbyUnion.id, name: 'Fijian Drua',      shortName: 'DRU', slug: 'fijian-drua',    country: 'Fiji',        logoUrl: '/rugby/drua.png'          },
    { sportId: rugbyUnion.id, name: 'Moana Pasifika',   shortName: 'MOA', slug: 'moana-pasifika', country: 'Pacific',     logoUrl: '/rugby/moana.png'         },
  ];

  await db.insert(teams).values(srpTeams)
    .onConflictDoUpdate({ target: teams.slug, set: { name: teams.name } });
  console.log(`✓ Teams: ${srpTeams.length} SRP teams upserted`);

  const [{ srpCount }] = await db
    .select({ srpCount: count() })
    .from(fixtures)
    .where(eq(fixtures.seasonId, srpSeason.id));

  if (srpCount > 0) {
    console.log(`  ↳ Fixtures exist (${srpCount} rows) — skipping SRP fixture seed`);
  } else {
    const allSrpTeams = await db.select().from(teams).where(eq(teams.sportId, rugbyUnion.id));
    const bySlug = Object.fromEntries(allSrpTeams.map(t => [t.slug, t.id]));

    const fixtureData = [
      // Round 14 · Fri 22 – Sat 23 May 2026 (finished)
      { seasonId: srpSeason.id, homeTeamId: bySlug['blues'],         awayTeamId: bySlug['crusaders'],     scheduledAt: new Date('2026-05-22T08:05:00Z'), status: 'finished', round: 'Round 14', homeScore: 28, awayScore: 21 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['hurricanes'],    awayTeamId: bySlug['chiefs'],        scheduledAt: new Date('2026-05-22T10:05:00Z'), status: 'finished', round: 'Round 14', homeScore: 15, awayScore: 24 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['brumbies'],      awayTeamId: bySlug['reds'],          scheduledAt: new Date('2026-05-23T07:45:00Z'), status: 'finished', round: 'Round 14', homeScore: 31, awayScore: 15 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['waratahs'],      awayTeamId: bySlug['fijian-drua'],   scheduledAt: new Date('2026-05-23T09:05:00Z'), status: 'finished', round: 'Round 14', homeScore: 22, awayScore: 19 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['force'],         awayTeamId: bySlug['highlanders'],   scheduledAt: new Date('2026-05-23T11:05:00Z'), status: 'finished', round: 'Round 14', homeScore: 14, awayScore: 27 },
      // Round 15 · Fri 29 – Sat 30 May 2026 (finished)
      { seasonId: srpSeason.id, homeTeamId: bySlug['crusaders'],     awayTeamId: bySlug['chiefs'],        scheduledAt: new Date('2026-05-29T08:05:00Z'), status: 'finished', round: 'Round 15', homeScore: 17, awayScore: 25 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['blues'],         awayTeamId: bySlug['hurricanes'],    scheduledAt: new Date('2026-05-29T10:05:00Z'), status: 'finished', round: 'Round 15', homeScore: 34, awayScore: 17 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['highlanders'],   awayTeamId: bySlug['reds'],          scheduledAt: new Date('2026-05-30T07:45:00Z'), status: 'finished', round: 'Round 15', homeScore: 22, awayScore: 15 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['moana-pasifika'],awayTeamId: bySlug['waratahs'],      scheduledAt: new Date('2026-05-30T07:45:00Z'), status: 'finished', round: 'Round 15', homeScore: 28, awayScore: 21 },
      { seasonId: srpSeason.id, homeTeamId: bySlug['fijian-drua'],   awayTeamId: bySlug['brumbies'],      scheduledAt: new Date('2026-05-30T09:05:00Z'), status: 'finished', round: 'Round 15', homeScore: 13, awayScore: 29 },
      // Round 16 · Fri 5 – Sat 6 Jun 2026
      { seasonId: srpSeason.id, homeTeamId: bySlug['chiefs'],        awayTeamId: bySlug['blues'],         scheduledAt: new Date('2026-06-05T08:05:00Z'), status: 'scheduled', round: 'Round 16' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['crusaders'],     awayTeamId: bySlug['hurricanes'],    scheduledAt: new Date('2026-06-05T10:05:00Z'), status: 'scheduled', round: 'Round 16' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['brumbies'],      awayTeamId: bySlug['highlanders'],   scheduledAt: new Date('2026-06-06T07:45:00Z'), status: 'scheduled', round: 'Round 16' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['reds'],          awayTeamId: bySlug['force'],         scheduledAt: new Date('2026-06-06T09:05:00Z'), status: 'scheduled', round: 'Round 16' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['waratahs'],      awayTeamId: bySlug['moana-pasifika'],scheduledAt: new Date('2026-06-06T09:05:00Z'), status: 'scheduled', round: 'Round 16' },
      // Round 17 · Sat 13 Jun 2026
      { seasonId: srpSeason.id, homeTeamId: bySlug['blues'],         awayTeamId: bySlug['brumbies'],      scheduledAt: new Date('2026-06-13T07:35:00Z'), status: 'scheduled', round: 'Round 17' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['hurricanes'],    awayTeamId: bySlug['highlanders'],   scheduledAt: new Date('2026-06-13T08:05:00Z'), status: 'scheduled', round: 'Round 17' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['chiefs'],        awayTeamId: bySlug['fijian-drua'],   scheduledAt: new Date('2026-06-13T10:05:00Z'), status: 'scheduled', round: 'Round 17' },
      { seasonId: srpSeason.id, homeTeamId: bySlug['reds'],          awayTeamId: bySlug['waratahs'],      scheduledAt: new Date('2026-06-13T09:05:00Z'), status: 'scheduled', round: 'Round 17' },
    ];

    await db.insert(fixtures).values(fixtureData);
    console.log(`✓ Fixtures: ${fixtureData.length} SRP fixtures inserted`);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Rugby League — NRL 2026
  // ══════════════════════════════════════════════════════════════════════════════

  const [rugbyLeague] = await db
    .insert(sports)
    .values({ name: 'Rugby League', slug: 'rugby-league' })
    .onConflictDoUpdate({ target: sports.slug, set: { name: 'Rugby League' } })
    .returning();
  console.log(`\n✓ Sport: ${rugbyLeague.name} (id ${rugbyLeague.id})`);

  const [nrl] = await db
    .insert(leagues)
    .values({
      sportId:   rugbyLeague.id,
      name:      'National Rugby League',
      shortName: 'NRL',
      slug:      'nrl',
      country:   'Australia',
      logoUrl:   '/logos/nrl.svg',
      isActive:  true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: 'National Rugby League', logoUrl: '/logos/nrl.svg' },
    })
    .returning();
  console.log(`✓ League: ${nrl.name} (id ${nrl.id})`);

  const [nrlSeason] = await db
    .insert(seasons)
    .values({ leagueId: nrl.id, year: '2026', isCurrent: true })
    .onConflictDoUpdate({
      target: [seasons.leagueId, seasons.year],
      set: { isCurrent: true },
    })
    .returning();
  console.log(`✓ Season: NRL ${nrlSeason.year} (id ${nrlSeason.id})`);

  const nrlTeams = [
    { sportId: rugbyLeague.id, name: 'Brisbane Broncos',           shortName: 'BRI', slug: 'broncos',   country: 'Australia',   logoUrl: '/rugbyleague/brisbanebroncos.svg'          },
    { sportId: rugbyLeague.id, name: 'Canberra Raiders',           shortName: 'CAN', slug: 'raiders',   country: 'Australia',   logoUrl: '/rugbyleague/canberraraiders.svg'          },
    { sportId: rugbyLeague.id, name: 'Canterbury Bulldogs',        shortName: 'CBY', slug: 'bulldogs',  country: 'Australia',   logoUrl: '/rugbyleague/canterburybulldogs.svg'       },
    { sportId: rugbyLeague.id, name: 'Cronulla Sharks',            shortName: 'CRO', slug: 'sharks',    country: 'Australia',   logoUrl: '/rugbyleague/cronullasharks.svg'           },
    { sportId: rugbyLeague.id, name: 'Dolphins',                   shortName: 'DOL', slug: 'dolphins',  country: 'Australia',   logoUrl: '/rugbyleague/dolphins.svg'                 },
    { sportId: rugbyLeague.id, name: 'Gold Coast Titans',          shortName: 'GCT', slug: 'titans',    country: 'Australia',   logoUrl: '/rugbyleague/goldcoasttitans.svg'          },
    { sportId: rugbyLeague.id, name: 'Manly Sea Eagles',           shortName: 'MAN', slug: 'sea-eagles',country: 'Australia',   logoUrl: '/rugbyleague/manlyseaeagles.svg'           },
    { sportId: rugbyLeague.id, name: 'Melbourne Storm',            shortName: 'MEL', slug: 'storm',     country: 'Australia',   logoUrl: '/rugbyleague/melbournestorm.svg'           },
    { sportId: rugbyLeague.id, name: 'Newcastle Knights',          shortName: 'NEW', slug: 'knights',   country: 'Australia',   logoUrl: '/rugbyleague/newcastleknights.svg'         },
    { sportId: rugbyLeague.id, name: 'North Queensland Cowboys',   shortName: 'NQC', slug: 'cowboys',   country: 'Australia',   logoUrl: '/rugbyleague/northqueenslandcowboys.svg'   },
    { sportId: rugbyLeague.id, name: 'Parramatta Eels',            shortName: 'PAR', slug: 'eels',      country: 'Australia',   logoUrl: '/rugbyleague/parramattaeels.svg'           },
    { sportId: rugbyLeague.id, name: 'Penrith Panthers',           shortName: 'PEN', slug: 'panthers',  country: 'Australia',   logoUrl: '/rugbyleague/penrithpanthers.svg'          },
    { sportId: rugbyLeague.id, name: 'South Sydney Rabbitohs',     shortName: 'SSY', slug: 'rabbitohs', country: 'Australia',   logoUrl: '/rugbyleague/southsydneyrabbitohs.svg'    },
    { sportId: rugbyLeague.id, name: 'St George Illawarra Dragons',shortName: 'SGI', slug: 'dragons',   country: 'Australia',   logoUrl: '/rugbyleague/stgeorgeillawarradragons.svg' },
    { sportId: rugbyLeague.id, name: 'Sydney Roosters',            shortName: 'SYD', slug: 'roosters',  country: 'Australia',   logoUrl: '/rugbyleague/sydneyroosters.svg'           },
    { sportId: rugbyLeague.id, name: 'New Zealand Warriors',       shortName: 'NZW', slug: 'warriors',  country: 'New Zealand', logoUrl: '/rugbyleague/warriors.svg'                 },
    { sportId: rugbyLeague.id, name: 'Wests Tigers',               shortName: 'WST', slug: 'tigers',    country: 'Australia',   logoUrl: '/rugbyleague/weststigers.svg'              },
  ];

  await db.insert(teams).values(nrlTeams)
    .onConflictDoUpdate({ target: teams.slug, set: { name: teams.name } });
  console.log(`✓ Teams: ${nrlTeams.length} NRL teams upserted`);
  console.log('  ↳ NRL fixtures will be populated by the sync cron (npm run sync)');

  // ══════════════════════════════════════════════════════════════════════════════
  // Football — FIFA World Cup 2026
  // ══════════════════════════════════════════════════════════════════════════════

  const [football] = await db
    .insert(sports)
    .values({ name: 'Football', slug: 'football' })
    .onConflictDoUpdate({ target: sports.slug, set: { name: 'Football' } })
    .returning();
  console.log(`\n✓ Sport: ${football.name} (id ${football.id})`);

  const [worldCup] = await db
    .insert(leagues)
    .values({
      sportId:   football.id,
      name:      'FIFA World Cup',
      shortName: 'WC',
      slug:      'fifa-world-cup',
      country:   'International',
      logoUrl:   '/logos/fifa-world-cup.png',
      isActive:  true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: 'FIFA World Cup', shortName: null, logoUrl: '/logos/fifa-world-cup.png' },
    })
    .returning();
  console.log(`✓ League: ${worldCup.name} (id ${worldCup.id})`);

  await db
    .insert(seasons)
    .values({ leagueId: worldCup.id, year: '2026', isCurrent: true })
    .onConflictDoUpdate({
      target: [seasons.leagueId, seasons.year],
      set: { isCurrent: true },
    });
  console.log(`✓ Season: World Cup 2026`);

  // Country name → ISO 3166-1 alpha-2 code, matching TheSportsDB team names exactly.
  const COUNTRY_FLAG: Record<string, string> = {
    'Algeria':            'dz',
    'Argentina':          'ar',
    'Australia':          'au',
    'Austria':            'at',
    'Belgium':            'be',
    'Bosnia-Herzegovina': 'ba',
    'Brazil':             'br',
    'Canada':             'ca',
    'Cape Verde':         'cv',
    'Colombia':           'co',
    'Croatia':            'hr',
    'Curaçao':            'cw',
    'Czech Republic':     'cz',
    'DR Congo':           'cd',
    'Ecuador':            'ec',
    'Egypt':              'eg',
    'England':            'gb-eng',
    'France':             'fr',
    'Germany':            'de',
    'Ghana':              'gh',
    'Haiti':              'ht',
    'Iran':               'ir',
    'Iraq':               'iq',
    'Ivory Coast':        'ci',
    'Japan':              'jp',
    'Jordan':             'jo',
    'Mexico':             'mx',
    'Morocco':            'ma',
    'Netherlands':        'nl',
    'New Zealand':        'nz',
    'Norway':             'no',
    'Panama':             'pa',
    'Paraguay':           'py',
    'Portugal':           'pt',
    'Qatar':              'qa',
    'Saudi Arabia':       'sa',
    'Scotland':           'gb-sct',
    'Senegal':            'sn',
    'South Africa':       'za',
    'South Korea':        'kr',
    'Spain':              'es',
    'Sweden':             'se',
    'Switzerland':        'ch',
    'Tunisia':            'tn',
    'Turkey':             'tr',
    'USA':                'us',
    'Uruguay':            'uy',
    'Uzbekistan':         'uz',
  };

  const wcTeams = Object.entries(COUNTRY_FLAG).map(([name, code]) => ({
    sportId:   football.id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    slug:      `wc-${code}`,
    country:   name,
    logoUrl:   `/country/${code}.svg`,
  }));

  await db.insert(teams).values(wcTeams)
    .onConflictDoUpdate({ target: teams.slug, set: { logoUrl: teams.logoUrl } });
  console.log(`✓ Teams: ${wcTeams.length} World Cup nations upserted`);
  console.log('  ↳ World Cup fixtures will be populated by the sync cron (npm run sync)');

  // ══════════════════════════════════════════════════════════════════════════════
  // Motorsport — Formula 1 2026 + V8 Supercars 2026
  // ══════════════════════════════════════════════════════════════════════════════

  const [motorsport] = await db
    .insert(sports)
    .values({ name: 'Motorsport', slug: 'motorsport' })
    .onConflictDoUpdate({ target: sports.slug, set: { name: 'Motorsport' } })
    .returning();
  console.log(`\n✓ Sport: ${motorsport.name} (id ${motorsport.id})`);

  const [formulaOne] = await db
    .insert(leagues)
    .values({
      sportId:   motorsport.id,
      name:      'Formula 1',
      slug:      'formula-1',
      country:   'International',
      logoUrl:   '/logos/formula-1.png',
      isActive:  true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: 'Formula 1', shortName: null, logoUrl: '/logos/formula-1.png' },
    })
    .returning();
  console.log(`✓ League: ${formulaOne.name} (id ${formulaOne.id})`);

  await db
    .insert(seasons)
    .values({ leagueId: formulaOne.id, year: '2026', isCurrent: true })
    .onConflictDoUpdate({
      target: [seasons.leagueId, seasons.year],
      set: { isCurrent: true },
    });
  console.log(`✓ Season: F1 2026`);

  const [v8Supercars] = await db
    .insert(leagues)
    .values({
      sportId:   motorsport.id,
      name:      'V8 Supercars',
      slug:      'v8-supercars',
      country:   'Australia',
      logoUrl:   '/logos/v8-supercars.png',
      isActive:  true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: 'V8 Supercars', shortName: null, logoUrl: '/logos/v8-supercars.png' },
    })
    .returning();
  console.log(`✓ League: ${v8Supercars.name} (id ${v8Supercars.id})`);

  await db
    .insert(seasons)
    .values({ leagueId: v8Supercars.id, year: '2026', isCurrent: true })
    .onConflictDoUpdate({
      target: [seasons.leagueId, seasons.year],
      set: { isCurrent: true },
    });
  console.log(`✓ Season: V8 Supercars 2026`);
  console.log('  ↳ Motorsport fixtures will be populated by the sync cron (npm run sync)');

  console.log('\n✅ Seed complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
