/**
 * Seeds sports, leagues, each league's first season, and teams. Fixtures come from
 * the sync, which also rolls seasons over (or use `npm run season`).
 * Run with: npm run db:seed
 *
 * Idempotent — safe to run multiple times.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { sports, leagues, seasons, teams, externalIds } from './schema';
import { setCurrentSeason } from '@/lib/sync/seasons';

/**
 * Gives a league its first current season. A league that already has a current season
 * is left alone, so re-seeding never undoes a rollover. Returns the current year.
 */
async function ensureSeason(leagueId: number, year: string): Promise<string> {
  const [current] = await db
    .select({ year: seasons.year })
    .from(seasons)
    .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isCurrent, true)));
  if (current) return current.year;

  await setCurrentSeason(leagueId, year);
  return year;
}

interface SeedTeam {
  /** TheSportsDB idTeam, saved to external_ids so the sync never has to guess by name */
  tsdbId:    string;
  name:      string;
  shortName: string;
  slug:      string;
  country:   string;
}

/**
 * Upserts a team-sport league, its first season, its teams (logo at `${logoDir}/<slug minus prefix>.png`)
 * and each team's TheSportsDB mapping.
 */
async function seedTeamLeague(opts: {
  sportId: number; slug: string; name: string; shortName: string | null; country: string;
  logoUrl: string; season: string; teams: SeedTeam[]; logoDir: string;
}) {
  const { sportId, slug, name, shortName, country, logoUrl, season, logoDir } = opts;

  const [league] = await db
    .insert(leagues)
    .values({ sportId, name, shortName, slug, country, logoUrl, isActive: true })
    .onConflictDoUpdate({ target: leagues.slug, set: { name, shortName, logoUrl } })
    .returning();
  console.log(`✓ League: ${league.name} (id ${league.id})`);
  console.log(`✓ Season: ${name} ${await ensureSeason(league.id, season)} (current)`);

  const rows = await db
    .insert(teams)
    .values(opts.teams.map(t => ({
      sportId, name: t.name, shortName: t.shortName, slug: t.slug, country: t.country,
      logoUrl: `${logoDir}/${t.slug.slice(t.slug.indexOf('-') + 1)}.png`,
    })))
    .onConflictDoUpdate({
      target: teams.slug,
      set: { name: sql`excluded.name`, shortName: sql`excluded.short_name`, logoUrl: sql`excluded.logo_url` },
    })
    .returning({ id: teams.id, slug: teams.slug });

  const idBySlug = new Map(rows.map(r => [r.slug, r.id]));
  for (const t of opts.teams) {
    await db.insert(externalIds)
      .values({ entityType: 'team', entityId: idBySlug.get(t.slug)!, provider: 'thesportsdb', externalId: t.tsdbId })
      .onConflictDoUpdate({
        target: [externalIds.provider, externalIds.entityType, externalIds.externalId],
        set:    { entityId: idBySlug.get(t.slug)! },
      });
  }
  console.log(`✓ Teams: ${opts.teams.length} ${name} teams + TheSportsDB mappings upserted`);
}

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

  console.log(`✓ Season: SRP ${await ensureSeason(superRugby.id, '2026')} (current)`);

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
  console.log('  ↳ SRP fixtures will be populated by the sync cron (npm run sync)');

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

  console.log(`✓ Season: NRL ${await ensureSeason(nrl.id, '2026')} (current)`);

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

  console.log(`✓ Season: World Cup ${await ensureSeason(worldCup.id, '2026')} (current)`);

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

  console.log(`✓ Season: F1 ${await ensureSeason(formulaOne.id, '2026')} (current)`);

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

  console.log(`✓ Season: V8 Supercars ${await ensureSeason(v8Supercars.id, '2026')} (current)`);
  console.log('  ↳ Motorsport fixtures will be populated by the sync cron (npm run sync)');

  // ══════════════════════════════════════════════════════════════════════════════
  // Australian Football — AFL
  // ══════════════════════════════════════════════════════════════════════════════

  const [australianFootball] = await db
    .insert(sports)
    .values({ name: 'Australian Football', slug: 'australian-football' })
    .onConflictDoUpdate({ target: sports.slug, set: { name: 'Australian Football' } })
    .returning();
  console.log(`\n✓ Sport: ${australianFootball.name} (id ${australianFootball.id})`);

  const aflTeams: SeedTeam[] = [
    { tsdbId: '135684', name: 'Adelaide Crows',      shortName: 'ADE', slug: 'afl-adelaide',         country: 'Australia' },
    { tsdbId: '135685', name: 'Brisbane Lions',      shortName: 'BRI', slug: 'afl-brisbane',         country: 'Australia' },
    { tsdbId: '135686', name: 'Carlton Blues',       shortName: 'CAR', slug: 'afl-carlton',          country: 'Australia' },
    { tsdbId: '135687', name: 'Collingwood Magpies', shortName: 'COL', slug: 'afl-collingwood',      country: 'Australia' },
    { tsdbId: '135688', name: 'Essendon Bombers',    shortName: 'ESS', slug: 'afl-essendon',         country: 'Australia' },
    { tsdbId: '135689', name: 'Fremantle Dockers',   shortName: 'FRE', slug: 'afl-fremantle',        country: 'Australia' },
    { tsdbId: '135690', name: 'Geelong Cats',        shortName: 'GEE', slug: 'afl-geelong',          country: 'Australia' },
    { tsdbId: '135691', name: 'Gold Coast Suns',     shortName: 'GCS', slug: 'afl-gold-coast',       country: 'Australia' },
    { tsdbId: '135692', name: 'GWS Giants',          shortName: 'GWS', slug: 'afl-gws',              country: 'Australia' },
    { tsdbId: '135693', name: 'Hawthorn Hawks',      shortName: 'HAW', slug: 'afl-hawthorn',         country: 'Australia' },
    { tsdbId: '135694', name: 'Melbourne Demons',    shortName: 'MEL', slug: 'afl-melbourne',        country: 'Australia' },
    { tsdbId: '135695', name: 'North Melbourne',     shortName: 'NTH', slug: 'afl-north-melbourne',  country: 'Australia' },
    { tsdbId: '135696', name: 'Port Adelaide',       shortName: 'PTA', slug: 'afl-port-adelaide',    country: 'Australia' },
    { tsdbId: '135697', name: 'Richmond Tigers',     shortName: 'RIC', slug: 'afl-richmond',         country: 'Australia' },
    { tsdbId: '135698', name: 'St Kilda Saints',     shortName: 'STK', slug: 'afl-st-kilda',         country: 'Australia' },
    { tsdbId: '135699', name: 'Sydney Swans',        shortName: 'SYD', slug: 'afl-sydney',           country: 'Australia' },
    { tsdbId: '135700', name: 'West Coast Eagles',   shortName: 'WCE', slug: 'afl-west-coast',       country: 'Australia' },
    { tsdbId: '135701', name: 'Western Bulldogs',    shortName: 'WBD', slug: 'afl-western-bulldogs', country: 'Australia' },
  ];

  await seedTeamLeague({
    sportId: australianFootball.id, slug: 'afl', name: 'AFL', shortName: 'AFL', country: 'Australia',
    logoUrl: '/logos/afl.png', season: '2026', teams: aflTeams, logoDir: '/afl',
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Football — A-League Men + Premier League
  // ══════════════════════════════════════════════════════════════════════════════

  const aLeagueTeams: SeedTeam[] = [
    { tsdbId: '134472', name: 'Adelaide United',          shortName: 'ADL', slug: 'alm-adelaide-united',          country: 'Australia' },
    { tsdbId: '149411', name: 'Auckland FC',              shortName: 'AFC', slug: 'alm-auckland-fc',              country: 'New Zealand' },
    { tsdbId: '134476', name: 'Brisbane Roar',            shortName: 'BRI', slug: 'alm-brisbane-roar',            country: 'Australia' },
    { tsdbId: '134479', name: 'Central Coast Mariners',   shortName: 'CCM', slug: 'alm-central-coast-mariners',   country: 'Australia' },
    { tsdbId: '138063', name: 'Macarthur FC',             shortName: 'MAC', slug: 'alm-macarthur',                country: 'Australia' },
    { tsdbId: '134634', name: 'Melbourne City',           shortName: 'MCY', slug: 'alm-melbourne-city',           country: 'Australia' },
    { tsdbId: '134477', name: 'Melbourne Victory',        shortName: 'MVC', slug: 'alm-melbourne-victory',        country: 'Australia' },
    { tsdbId: '134474', name: 'Newcastle Jets',           shortName: 'NEW', slug: 'alm-newcastle-jets',           country: 'Australia' },
    { tsdbId: '134481', name: 'Perth Glory',              shortName: 'PER', slug: 'alm-perth-glory',              country: 'Australia' },
    { tsdbId: '134473', name: 'Sydney FC',                shortName: 'SYD', slug: 'alm-sydney-fc',                country: 'Australia' },
    { tsdbId: '134475', name: 'Wellington Phoenix',       shortName: 'WEL', slug: 'alm-wellington-phoenix',       country: 'New Zealand' },
    { tsdbId: '134480', name: 'Western Sydney Wanderers', shortName: 'WSW', slug: 'alm-western-sydney-wanderers', country: 'Australia' },
  ];

  await seedTeamLeague({
    sportId: football.id, slug: 'a-league-men', name: 'A-League Men', shortName: 'A-League', country: 'Australia',
    logoUrl: '/logos/a-league-men.png', season: '2026-2027', teams: aLeagueTeams, logoDir: '/aleague',
  });

  const eplTeams: SeedTeam[] = [
    { tsdbId: '133604', name: 'Arsenal',                shortName: 'ARS', slug: 'epl-arsenal',           country: 'England' },
    { tsdbId: '133601', name: 'Aston Villa',            shortName: 'AVL', slug: 'epl-aston-villa',       country: 'England' },
    { tsdbId: '134301', name: 'Bournemouth',            shortName: 'BOU', slug: 'epl-bournemouth',       country: 'England' },
    { tsdbId: '134355', name: 'Brentford',              shortName: 'BRE', slug: 'epl-brentford',         country: 'England' },
    { tsdbId: '133619', name: 'Brighton & Hove Albion', shortName: 'BHA', slug: 'epl-brighton',          country: 'England' },
    { tsdbId: '133610', name: 'Chelsea',                shortName: 'CHE', slug: 'epl-chelsea',           country: 'England' },
    { tsdbId: '133625', name: 'Coventry City',          shortName: 'COV', slug: 'epl-coventry-city',     country: 'England' },
    { tsdbId: '133632', name: 'Crystal Palace',         shortName: 'CRY', slug: 'epl-crystal-palace',    country: 'England' },
    { tsdbId: '133615', name: 'Everton',                shortName: 'EVE', slug: 'epl-everton',           country: 'England' },
    { tsdbId: '133600', name: 'Fulham',                 shortName: 'FUL', slug: 'epl-fulham',            country: 'England' },
    { tsdbId: '133617', name: 'Hull City',              shortName: 'HUL', slug: 'epl-hull-city',         country: 'England' },
    { tsdbId: '133622', name: 'Ipswich Town',           shortName: 'IPS', slug: 'epl-ipswich-town',      country: 'England' },
    { tsdbId: '133635', name: 'Leeds United',           shortName: 'LEE', slug: 'epl-leeds-united',      country: 'England' },
    { tsdbId: '133602', name: 'Liverpool',              shortName: 'LIV', slug: 'epl-liverpool',         country: 'England' },
    { tsdbId: '133613', name: 'Manchester City',        shortName: 'MCI', slug: 'epl-manchester-city',   country: 'England' },
    { tsdbId: '133612', name: 'Manchester United',      shortName: 'MUN', slug: 'epl-manchester-united', country: 'England' },
    { tsdbId: '134777', name: 'Newcastle United',       shortName: 'NEW', slug: 'epl-newcastle-united',  country: 'England' },
    { tsdbId: '133720', name: 'Nottingham Forest',      shortName: 'NFO', slug: 'epl-nottingham-forest', country: 'England' },
    { tsdbId: '133603', name: 'Sunderland',             shortName: 'SUN', slug: 'epl-sunderland',        country: 'England' },
    { tsdbId: '133616', name: 'Tottenham Hotspur',      shortName: 'TOT', slug: 'epl-tottenham',         country: 'England' },
  ];

  await seedTeamLeague({
    sportId: football.id, slug: 'premier-league', name: 'Premier League', shortName: null, country: 'England',
    logoUrl: '/logos/premier-league.png', season: '2026-2027', teams: eplTeams, logoDir: '/epl',
  });

  // Clubs outside our domestic leagues. Clubs we already have (e.g. the Premier League sides)
  // are matched by TheSportsDB ID, so one team row covers every competition it plays in.
  const uclClubs: SeedTeam[] = [
    { tsdbId: '133650', name: 'Borussia Dortmund',   shortName: 'DOR', slug: 'club-borussia-dortmund',   country: 'Germany'     },
    { tsdbId: '133660', name: 'Stuttgart',           shortName: 'STU', slug: 'club-stuttgart',           country: 'Germany'     },
    { tsdbId: '133664', name: 'Bayern Munich',       shortName: 'BAY', slug: 'club-bayern-munich',       country: 'Germany'     },
    { tsdbId: '133670', name: 'Napoli',              shortName: 'NAP', slug: 'club-napoli',              country: 'Italy'       },
    { tsdbId: '133681', name: 'Inter Milan',         shortName: 'INT', slug: 'club-inter-milan',         country: 'Italy'       },
    { tsdbId: '133682', name: 'Roma',                shortName: 'ROM', slug: 'club-roma',                country: 'Italy'       },
    { tsdbId: '133711', name: 'Lille',               shortName: 'LIL', slug: 'club-lille',               country: 'France'      },
    { tsdbId: '133714', name: 'Paris Saint-Germain', shortName: 'PSG', slug: 'club-paris-saint-germain', country: 'France'      },
    { tsdbId: '133722', name: 'Real Betis',          shortName: 'BET', slug: 'club-real-betis',          country: 'Spain'       },
    { tsdbId: '133729', name: 'Atlético Madrid',     shortName: 'ATM', slug: 'club-atletico-madrid',     country: 'Spain'       },
    { tsdbId: '133738', name: 'Real Madrid',         shortName: 'MAD', slug: 'club-real-madrid',         country: 'Spain'       },
    { tsdbId: '133739', name: 'Barcelona',           shortName: 'FCB', slug: 'club-barcelona',           country: 'Spain'       },
    { tsdbId: '133740', name: 'Villarreal',          shortName: 'VLR', slug: 'club-villarreal',          country: 'Spain'       },
    { tsdbId: '133753', name: 'AEK Athens',          shortName: 'AEK', slug: 'club-aek-athens',          country: 'Greece'      },
    { tsdbId: '133758', name: 'Feyenoord',           shortName: 'FEY', slug: 'club-feyenoord',           country: 'Netherlands' },
    { tsdbId: '133768', name: 'PSV Eindhoven',       shortName: 'PSV', slug: 'club-psv-eindhoven',       country: 'Netherlands' },
    { tsdbId: '133789', name: 'Club Brugge',         shortName: 'BRU', slug: 'club-club-brugge',         country: 'Belgium'     },
    { tsdbId: '133804', name: 'Galatasaray',         shortName: 'GAL', slug: 'club-galatasaray',         country: 'Turkey'      },
    { tsdbId: '133807', name: 'Fenerbahçe',          shortName: 'FEN', slug: 'club-fenerbahce',          country: 'Turkey'      },
    { tsdbId: '133822', name: 'Lens',                shortName: 'LNS', slug: 'club-lens',                country: 'France'      },
    { tsdbId: '134090', name: 'Slovan Bratislava',   shortName: 'SLB', slug: 'club-slovan-bratislava',   country: 'Slovakia'    },
    { tsdbId: '134114', name: 'Porto',               shortName: 'POR', slug: 'club-porto',               country: 'Portugal'    },
    { tsdbId: '134126', name: 'Shakhtar Donetsk',    shortName: 'SHK', slug: 'club-shakhtar-donetsk',    country: 'Ukraine'     },
    { tsdbId: '134243', name: 'Como',                shortName: 'COM', slug: 'club-como',                country: 'Italy'       },
    { tsdbId: '134570', name: 'Viking',              shortName: 'VIK', slug: 'club-viking',              country: 'Norway'      },
    { tsdbId: '134695', name: 'RB Leipzig',          shortName: 'RBL', slug: 'club-rb-leipzig',          country: 'Germany'     },
    { tsdbId: '135497', name: 'Bodø/Glimt',          shortName: 'BOD', slug: 'club-bodo-glimt',         country: 'Norway'      },
    { tsdbId: '135708', name: 'Sporting CP',         shortName: 'SCP', slug: 'club-sporting-cp',         country: 'Portugal'    },
    { tsdbId: '136036', name: 'Slavia Prague',       shortName: 'SLA', slug: 'club-slavia-prague',       country: 'Czechia'     },
    { tsdbId: '137261', name: 'LASK',                shortName: 'LAS', slug: 'club-lask',                country: 'Austria'     },
    { tsdbId: '138341', name: 'Sabah Baku',          shortName: 'SAB', slug: 'club-sabah-baku',          country: 'Azerbaijan'  },
  ];

  await seedTeamLeague({
    sportId: football.id, slug: 'champions-league', name: 'UEFA Champions League', shortName: 'Champions League',
    country: 'Europe', logoUrl: '/logos/champions-league.png', season: '2026-2027', teams: uclClubs, logoDir: '/clubs',
  });

  console.log('\n✅ Seed complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
