/* ============================================================================
 *  VELVET CINEMA — CinePro Core client (the streaming backend)
 *  Resolves playable sources + subtitles by TMDB id. CinePro already proxies
 *  the upstream HLS/subtitle URLs for us and returns them as relative
 *  "/v1/proxy?data=..." paths, so we just prefix the configured base URL.
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};
  const CFG = window.CINE_CONFIG || {};
  const MOCK = () => !!CFG.MOCK || !CFG.TMDB_API_KEY;
  const base = () => String(CFG.CINEPRO_BASE || "").replace(/\/+$/, "");

  const QRANK = { "2160p": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, unknown: -1 };

  function abs(u) {
    if (!u) return u;
    if (/^https?:/.test(u)) return u;                 // already absolute
    return base() + (u.startsWith("/") ? "" : "/") + u; // relative proxy path
  }

  function normalize(json) {
    const sources = (json.sources || []).map((s, i) => ({
      id: s.id || ("src" + i),
      url: abs(s.url),
      type: (s.type || "hls").toLowerCase(),
      quality: s.quality || "unknown",
      audioTracks: s.audioTracks || [],
      provider: s.provider || { name: "Source " + (i + 1) },
    }));
    const subtitles = (json.subtitles || []).map((t, i) => ({
      url: abs(t.url),
      label: t.label || ("Subtitle " + (i + 1)),
      format: (t.format || "vtt").toLowerCase(),
    }));
    return { sources, subtitles, expiresAt: json.expiresAt || null };
  }

  async function fetchJson(path) {
    const url = base() + path;
    let res;
    try {
      res = await fetch(url, { headers: { accept: "application/json" } });
    } catch (e) {
      throw new Error("Can't reach CinePro at " + base() + ". Is it running? (" + e.message + ")");
    }
    if (!res.ok) throw new Error("CinePro responded " + res.status + " for " + path);
    return normalize(await res.json());
  }

  const cinepro = {
    isMock: MOCK,

    async movie(id) {
      if (MOCK()) return VC.MOCK.demoStream;
      return fetchJson(`/v1/movies/${encodeURIComponent(id)}`);
    },

    async episode(id, season, episode) {
      if (MOCK()) return VC.MOCK.demoStream;
      return fetchJson(`/v1/tv/${encodeURIComponent(id)}/seasons/${season}/episodes/${episode}`);
    },

    // Best source first: prefer playable HLS/mp4, then higher quality.
    rank(sources) {
      return [...sources].sort((a, b) => {
        const qa = QRANK[a.quality] ?? -1, qb = QRANK[b.quality] ?? -1;
        if (qb !== qa) return qb - qa;
        const pa = a.type === "hls" ? 1 : 0, pb = b.type === "hls" ? 1 : 0;
        return pb - pa;
      });
    },
  };

  window.VC.cinepro = cinepro;
})();
