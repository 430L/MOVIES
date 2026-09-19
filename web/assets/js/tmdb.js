/* ============================================================================
 *  VELVET CINEMA — TMDB catalog client
 *  Browsing/search/metadata only. Streaming comes from CinePro (cinepro.js).
 *  Falls back to bundled fixtures when CINE_CONFIG.MOCK is true.
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};
  const CFG = window.CINE_CONFIG || {};
  const MOCK = () => !!CFG.MOCK || !CFG.TMDB_API_KEY;

  const API = "https://api.themoviedb.org/3";
  const cache = new Map(); // simple in-memory response cache

  async function get(path, params = {}) {
    const key = path + JSON.stringify(params);
    if (cache.has(key)) return cache.get(key);
    const url = new URL(API + path);
    url.searchParams.set("api_key", CFG.TMDB_API_KEY || "");
    url.searchParams.set("language", CFG.TMDB_LANG || "en-US");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).status_message || ""; } catch {}
      throw new Error(`TMDB ${res.status}${detail ? " — " + detail : ""}`);
    }
    const json = await res.json();
    cache.set(key, json);
    return json;
  }

  /* ---------- normalization ---------- */
  const year = (d) => (d && /^\d{4}/.test(d) ? d.slice(0, 4) : "");

  function normalize(raw, forced) {
    if (!raw) return null;
    const type = forced || raw.media_type || (raw.title ? "movie" : "tv");
    if (type !== "movie" && type !== "tv") return null;
    return {
      id: raw.id,
      type,
      title: raw.title || raw.name || "Untitled",
      year: year(raw.release_date || raw.first_air_date),
      rating: raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : null,
      poster: raw.poster_path || null,
      backdrop: raw.backdrop_path || null,
      overview: raw.overview || "",
      genres: (raw.genres || []).map((g) => g.name),
    };
  }
  const normList = (arr, forced) => (arr || []).map((r) => normalize(r, forced)).filter(Boolean);

  /* ---------- public API ---------- */
  const tmdb = {
    isMock: MOCK,

    async trending() {
      if (MOCK()) return VC.MOCK.trending();
      const j = await get("/trending/all/week");
      return normList(j.results).filter((x) => x.type === "movie" || x.type === "tv").slice(0, 18);
    },

    async popularMovies() {
      if (MOCK()) return VC.MOCK.movies;
      const j = await get("/movie/popular");
      return normList(j.results, "movie").slice(0, 18);
    },

    async popularTV() {
      if (MOCK()) return VC.MOCK.tv;
      const j = await get("/tv/popular");
      return normList(j.results, "tv").slice(0, 18);
    },

    async search(q) {
      if (!q) return [];
      if (MOCK()) {
        const needle = q.toLowerCase();
        return [...VC.MOCK.movies, ...VC.MOCK.tv].filter((x) => x.title.toLowerCase().includes(needle));
      }
      const j = await get("/search/multi", { query: q, include_adult: "false" });
      return normList(j.results).filter((x) => x.type === "movie" || x.type === "tv");
    },

    async details(type, id) {
      if (MOCK()) return VC.MOCK.byId(type, id);
      const j = await get(`/${type}/${id}`);
      const item = normalize(j, type);
      if (type === "tv") {
        item.seasons = (j.seasons || [])
          .filter((s) => s.season_number > 0 || (j.seasons.length === 1))
          .map((s) => ({ season_number: s.season_number, name: s.name, episode_count: s.episode_count }));
        item.numberOfSeasons = j.number_of_seasons;
      } else {
        item.runtime = j.runtime || null;
      }
      return item;
    },

    async season(id, seasonNumber) {
      if (MOCK()) {
        const show = VC.MOCK.byId("tv", id);
        const s = (show && show.seasons || []).find((x) => x.season_number === Number(seasonNumber));
        return s ? s.episodes : [];
      }
      const j = await get(`/tv/${id}/season/${seasonNumber}`);
      return (j.episodes || []).map((e) => ({
        episode_number: e.episode_number,
        season_number: e.season_number,
        name: e.name || `Episode ${e.episode_number}`,
        overview: e.overview || "",
        still: e.still_path || null,
        runtime: e.runtime || null,
      }));
    },
  };

  window.VC.tmdb = tmdb;
})();
