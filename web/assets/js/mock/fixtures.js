/* ============================================================================
 *  VELVET CINEMA — mock fixtures
 *  Used only when CINE_CONFIG.MOCK === true, so the whole site (browse, detail,
 *  theater, effects, player) works with NO TMDB key and NO running CinePro.
 *  Posters/backdrops are drawn as SVG placeholders at render time, so nothing
 *  here needs the network.
 * ==========================================================================*/
(function () {
  const GENRES = ["Drama", "Sci-Fi", "Thriller", "Comedy", "Horror", "Romance", "Action", "Mystery", "Noir", "Fantasy"];
  const g = (...i) => i.map((n) => GENRES[n]);

  const movie = (id, title, year, rating, genres, overview) => ({
    id, type: "movie", title, year, rating, genres,
    poster: null, backdrop: null, overview,
  });
  const tv = (id, title, year, rating, genres, overview, seasons) => ({
    id, type: "tv", title, year, rating, genres,
    poster: null, backdrop: null, overview, seasons,
  });

  const MOVIES = [
    movie(101, "Neon Boulevard", 2001, 8.1, g(8, 1, 2), "A rain-slicked detective chases a signal that shouldn't exist through a city that never powers down."),
    movie(102, "The Velvet Hour", 1999, 7.6, g(0, 5), "Two strangers share the last screening of a dying picture palace and decide the night should never end."),
    movie(103, "Chrome Sunset", 2003, 7.9, g(1, 6), "A courier with a stolen memory races the dawn across a desert of dead satellites."),
    movie(104, "Static Angels", 2000, 7.2, g(4, 7), "The broadcast comes back on at 3:33 a.m., and it is calling everyone in the building by name."),
    movie(105, "Midnight Matinee", 1998, 8.4, g(0, 3), "A projectionist realizes the film he's been threading for forty years has started predicting the future."),
    movie(106, "Paper Moonlight", 2002, 7.0, g(5, 3), "A forger of movie posters falls for the woman in every one he paints."),
    movie(107, "Grand Illusionist", 2004, 8.6, g(0, 7, 9), "A stage magician gambles his greatest secret against a rival who cheats with something real."),
    movie(108, "Cassette Heart", 1997, 7.4, g(5, 0), "Everything she wants to say is on a mixtape she keeps forgetting to hand over."),
    movie(109, "Zero Gravity Diner", 2005, 6.9, g(3, 1), "The only all-night diner in low orbit serves regulars who are each running from a different planet."),
    movie(110, "Last Reel Standing", 2000, 8.0, g(6, 2), "When the multiplex is marked for demolition, the ushers stage one final, dangerous premiere."),
    movie(111, "Silver Static", 2001, 7.7, g(8, 4), "A film noir that keeps rewinding itself until the detective finally notices he's the killer."),
    movie(112, "Drive-In Comet", 1999, 7.1, g(9, 5), "A comet returns every fifty years, and so does the boy who promised to meet her under it."),
  ];

  const TV = [
    tv(201, "The Late Show Tapes", 2002, 8.3, g(3, 7),
      "Restorers of a lost variety show discover each episode leaks into the week it's watched.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 8, "Pilot Frequency", "Test Pattern", "Guest Star", "Dead Air", "Rerun", "Sweeps Week", "Cliffhanger", "Series Finale") },
       { season_number: 2, name: "Season 2", episodes: episodes(2, 6, "Cold Open", "Laugh Track", "Bumper", "Commercial Break", "Bloopers", "Sign Off") }]),
    tv(202, "Velvetpunk", 2003, 8.0, g(1, 6),
      "In a chrome-and-crimson metropolis, a repo crew reclaims memories people couldn't pay for.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 6, "Downpayment", "Interest", "Collateral", "Default", "Foreclosure", "Balance Due") }]),
    tv(203, "Grain & Shadow", 1999, 7.8, g(8, 7),
      "An anthology shot on decaying film stock, where every scratch on the print is a clue.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 5, "Reel One", "Splice", "Overexposed", "Underexposed", "The Final Cut") }]),
    tv(204, "Marquee", 2001, 7.5, g(0, 5),
      "The staff of a struggling picture palace keep the lights on one desperate week at a time.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 7, "Box Office", "Concession", "Double Feature", "Intermission", "Matinee", "Midnight", "Closing Time") }]),
    tv(205, "Signal Hill", 2004, 8.2, g(4, 9),
      "A town at the foot of a broadcast tower where nobody can quite remember changing the channel.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 8, "Channel 1", "Snow", "Vertical Hold", "Ghosting", "Rabbit Ears", "Colour Bars", "No Signal", "Off Air") }]),
    tv(206, "Afterglow Arcade", 2000, 7.3, g(9, 3),
      "Every high score at the neon arcade unlocks a memory that isn't yours to keep.",
      [{ season_number: 1, name: "Season 1", episodes: episodes(1, 6, "Insert Coin", "1UP", "Continue?", "Bonus Stage", "Boss Fight", "Game Over") }]),
  ];

  function episodes(season, count, ...names) {
    const arr = [];
    for (let i = 1; i <= count; i++) {
      arr.push({
        episode_number: i,
        season_number: season,
        name: names[i - 1] || ("Episode " + i),
        still: null,
        overview: "A restored broadcast surfaces and someone in the room recognizes themselves in it.",
        runtime: 42,
      });
    }
    return arr;
  }

  window.VC = window.VC || {};
  window.VC.MOCK = {
    movies: MOVIES,
    tv: TV,
    byId(type, id) {
      const list = type === "tv" ? TV : MOVIES;
      return list.find((x) => String(x.id) === String(id)) || null;
    },
    trending() {
      // interleave a few movies and shows
      return [MOVIES[6], TV[0], MOVIES[4], TV[4], MOVIES[0], TV[1], MOVIES[9], MOVIES[2]];
    },
    // A public, CORS-friendly HLS test stream (Big Buck Bunny via Mux).
    demoStream: {
      sources: [
        { id: "mux-720", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", type: "hls", quality: "720p", audioTracks: [{ language: "en", label: "English" }], provider: { id: "demo", name: "Demo Reel" } },
      ],
      subtitles: [],
    },
  };
})();
