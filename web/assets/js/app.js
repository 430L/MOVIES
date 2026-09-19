/* ============================================================================
 *  VELVET CINEMA — router + views (home, search, detail)
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};
  const { el, clear, imgUrl, placeholder, escapeHtml, stateBlock, skeletonGrid, toast } = VC.ui;
  const CFG = window.CINE_CONFIG || {};
  const view = () => document.getElementById("view");

  /* ---------------- poster card ---------------- */
  function poster(item) {
    const href = `#/${item.type}/${item.id}`;
    const src = imgUrl(item.poster, CFG.POSTER_SIZE) || placeholder(item.title, "poster");
    const img = el("img", {
      class: "poster__img", src, alt: item.title, loading: "lazy", decoding: "async",
      width: "342", height: "513",
      onerror: function () { this.onerror = null; this.src = placeholder(item.title, "poster"); },
    });
    return el("a", { class: "poster", href, "aria-label": item.title }, [
      el("span", { class: "badge-type", text: item.type === "tv" ? "TV" : "FILM" }),
      item.rating ? el("span", { class: "rating-chip", text: "★ " + item.rating }) : null,
      img,
      el("div", { class: "poster__meta" }, [
        el("div", { class: "poster__title", text: item.title }),
        el("div", { class: "poster__sub" }, [
          el("span", { text: item.year || "—" }),
          el("span", { text: item.type === "tv" ? "Series" : "Movie" }),
        ]),
      ]),
    ]);
  }

  function sectionTitle(text) {
    return el("div", { class: "section" }, [
      el("h2", { class: "section__title" }, [el("span", { text })]),
    ]);
  }

  /* ---------------- HOME ---------------- */
  async function renderHome() {
    const root = view(); clear(root);
    root.appendChild(sectionTitle("Now Showing"));
    const heroSlot = el("div", { class: "hero skeleton", style: "min-height:320px" });
    root.appendChild(heroSlot);

    const railWrap = (title) => {
      const s = sectionTitle(title);
      const rail = el("div", { class: "rail" });
      for (let i = 0; i < 8; i++) rail.appendChild(el("div", { class: "sk-card skeleton", style: "width:150px" }));
      root.appendChild(s); root.appendChild(rail);
      return rail;
    };
    const trendRail = railWrap("Trending This Week");
    const movieRail = railWrap("Popular Films");
    const tvRail = railWrap("Popular Series");

    // Hero + trending
    try {
      const trending = await VC.tmdb.trending();
      if (trending && trending.length) {
        heroSlot.replaceWith(buildHero(trending[0]));
        clear(trendRail); trending.forEach((it) => trendRail.appendChild(poster(it)));
      } else { heroSlot.remove(); }
    } catch (e) { heroSlot.replaceWith(errorState(e)); }

    try { const m = await VC.tmdb.popularMovies(); clear(movieRail); m.forEach((it) => movieRail.appendChild(poster(it))); }
    catch (e) { movieRail.replaceWith(errorState(e)); }

    try { const t = await VC.tmdb.popularTV(); clear(tvRail); t.forEach((it) => tvRail.appendChild(poster(it))); }
    catch (e) { tvRail.replaceWith(errorState(e)); }
  }

  function buildHero(item) {
    const bg = imgUrl(item.backdrop, CFG.BACKDROP_SIZE) || placeholder(item.title, "backdrop");
    return el("div", { class: "hero" }, [
      el("img", { class: "hero__bg", src: bg, alt: "", "aria-hidden": "true", loading: "eager", decoding: "async",
        onerror: function () { this.onerror = null; this.src = placeholder(item.title, "backdrop"); } }),
      el("div", { class: "hero__scrim" }),
      el("div", { class: "hero__body" }, [
        el("div", { class: "hero__kicker", text: (item.type === "tv" ? "FEATURED SERIES" : "FEATURED FILM") }),
        el("h1", { class: "hero__title", text: item.title }),
        el("p", { class: "hero__overview", text: item.overview || "" }),
        el("div", { class: "hero__cta" }, [
          el("a", { class: "btn btn--gold", href: `#/${item.type}/${item.id}` }, ["▶ View"]),
        ]),
      ]),
    ]);
  }

  /* ---------------- SEARCH ---------------- */
  async function renderSearch(q) {
    const root = view(); clear(root);
    root.appendChild(sectionTitle(q ? `Results for “${q}”` : "Search"));
    if (!q) { root.appendChild(stateBlock({ glyph: "🔍", title: "Type to search", note: "Find any film or series in the marquee above." })); return; }
    const skel = skeletonGrid(12); root.appendChild(skel);
    try {
      const results = await VC.tmdb.search(q);
      skel.remove();
      if (!results.length) { root.appendChild(stateBlock({ glyph: "🎞", title: "No matches", note: "Try a different title." })); return; }
      const grid = el("div", { class: "grid" });
      results.forEach((it) => grid.appendChild(poster(it)));
      root.appendChild(grid);
    } catch (e) { skel.remove(); root.appendChild(errorState(e)); }
  }

  /* ---------------- DETAIL ---------------- */
  async function renderDetail(type, id) {
    const root = view(); clear(root);
    root.appendChild(el("div", { class: "hero skeleton", style: "min-height:280px" }));
    let item;
    try { item = await VC.tmdb.details(type, id); }
    catch (e) { clear(root); root.appendChild(errorState(e)); return; }
    if (!item) { clear(root); root.appendChild(stateBlock({ glyph: "🎬", title: "Not found", note: "That title isn't in the catalog." })); return; }
    clear(root);

    const backdrop = imgUrl(item.backdrop, CFG.BACKDROP_SIZE) || placeholder(item.title, "backdrop");
    const posterSrc = imgUrl(item.poster, CFG.POSTER_SIZE) || placeholder(item.title, "poster");

    const facts = [];
    facts.push(el("span", { text: item.year || "—" }));
    if (item.rating) { facts.push(el("span", { class: "dot", text: "•" })); facts.push(el("span", { text: "★ " + item.rating })); }
    if (type === "movie" && item.runtime) { facts.push(el("span", { class: "dot", text: "•" })); facts.push(el("span", { text: item.runtime + " min" })); }
    if (type === "tv" && item.numberOfSeasons) { facts.push(el("span", { class: "dot", text: "•" })); facts.push(el("span", { text: item.numberOfSeasons + " season" + (item.numberOfSeasons > 1 ? "s" : "") })); }
    facts.push(el("span", { class: "dot", text: "•" }));
    facts.push(el("span", { text: type === "tv" ? "Series" : "Film" }));

    const genres = el("div", { class: "detail__genres" },
      (item.genres || []).slice(0, 5).map((g) => el("span", { class: "chip", text: g })));

    const actions = el("div", { class: "detail__actions" });
    if (type === "movie") {
      actions.appendChild(el("a", { class: "btn btn--gold", href: `#/watch/movie/${id}` }, ["▶ Enter the Theater"]));
    }

    const info = el("div", {}, [
      el("h1", { class: "detail__title", text: item.title }),
      el("div", { class: "detail__facts" }, facts),
      genres,
      el("p", { class: "detail__overview", text: item.overview || "No synopsis on file for this one." }),
      actions,
    ]);

    root.appendChild(el("div", { class: "detail" }, [
      el("div", { class: "detail__hero" }, [
        el("img", { class: "detail__backdrop", src: backdrop, alt: "", "aria-hidden": "true", decoding: "async",
          onerror: function () { this.onerror = null; this.src = placeholder(item.title, "backdrop"); } }),
        el("div", { class: "detail__scrim" }),
      ]),
      el("div", { class: "detail__body" }, [
        el("img", { class: "detail__poster", src: posterSrc, alt: item.title, decoding: "async",
          onerror: function () { this.onerror = null; this.src = placeholder(item.title, "poster"); } }),
        info,
      ]),
    ]));

    if (type === "tv") root.appendChild(await buildTVSeasons(item, id));
  }

  async function buildTVSeasons(item, id) {
    const wrap = el("div", { class: "section" }, [
      el("h2", { class: "section__title" }, [el("span", { text: "Episodes" })]),
    ]);
    const seasons = item.seasons && item.seasons.length ? item.seasons
      : [{ season_number: 1, name: "Season 1" }];
    const select = el("select", { class: "season-select", "aria-label": "Choose a season" },
      seasons.map((s) => el("option", { value: String(s.season_number), text: s.name || ("Season " + s.season_number) })));
    const bar = el("div", { class: "season-bar" }, [select]);
    const list = el("div", { class: "episodes" });
    wrap.appendChild(bar); wrap.appendChild(list);

    async function loadSeason(sn) {
      clear(list);
      for (let i = 0; i < 4; i++) list.appendChild(el("div", { class: "episode skeleton", style: "height:74px" }));
      let eps = [];
      try { eps = await VC.tmdb.season(id, sn); }
      catch (e) { clear(list); list.appendChild(errorState(e)); return; }
      clear(list);
      if (!eps.length) { list.appendChild(stateBlock({ glyph: "📺", title: "No episodes listed" })); return; }
      eps.forEach((ep) => {
        const still = imgUrl(ep.still, CFG.STILL_SIZE);
        const thumb = still
          ? el("img", { class: "episode__thumb", src: still, alt: "", loading: "lazy", decoding: "async",
              onerror: function () { this.replaceWith(emptyThumb(ep.episode_number)); } })
          : emptyThumb(ep.episode_number);
        list.appendChild(el("a", {
          class: "episode", href: `#/watch/tv/${id}/${sn}/${ep.episode_number}`,
          "aria-label": `Play S${sn} E${ep.episode_number} — ${ep.name}`,
        }, [
          thumb,
          el("div", { class: "episode__meta" }, [
            el("div", { class: "episode__no", text: `S${sn} · E${ep.episode_number}` }),
            el("div", { class: "episode__name", text: ep.name }),
          ]),
        ]));
      });
    }
    function emptyThumb(n) { return el("div", { class: "episode__thumb episode__thumb--empty", text: "E" + n }); }

    select.onchange = () => loadSeason(select.value);
    await loadSeason(seasons[0].season_number);
    return wrap;
  }

  function errorState(e) {
    return stateBlock({ glyph: "⚠", title: "Something went dark",
      note: (e && e.message) ? e.message : "Please try again." });
  }

  /* ---------------- ROUTER ---------------- */
  function parse() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, query] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query || "");
    return { parts, params };
  }

  function route() {
    const { parts, params } = parse();

    // Watch routes -> theater overlay (don't disturb the view behind it)
    if (parts[0] === "watch") {
      if (parts[1] === "movie" && parts[2]) { VC.theater.open({ type: "movie", id: parts[2], title: pendingTitle }); return; }
      if (parts[1] === "tv" && parts[2] && parts[3] && parts[4]) {
        VC.theater.open({ type: "tv", id: parts[2], season: parts[3], episode: parts[4], title: pendingTitle }); return;
      }
    }

    VC.theater.close();
    VC.ui.scrollTop();
    document.getElementById("view").focus({ preventScroll: true });

    const q = params.get("q") || "";
    const si = document.getElementById("searchInput");
    if (parts[0] === "search") { if (si && si.value !== q) si.value = q; renderSearch(q); return; }

    if (parts[0] === "movie" && parts[1]) { renderDetail("movie", parts[1]); return; }
    if (parts[0] === "tv" && parts[1]) { renderDetail("tv", parts[1]); return; }

    renderHome();
  }

  // Remember the last title clicked so the theater marquee has it instantly.
  let pendingTitle = "";
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.poster, a.episode, a.btn, .hero__cta a");
    if (a) { const t = a.getAttribute("aria-label"); if (t) pendingTitle = t.replace(/^Play\s+S\d+.*—\s*/, ""); }
  }, true);

  /* ---------------- header wiring ---------------- */
  function initHeader() {
    const form = document.getElementById("searchForm");
    const input = document.getElementById("searchInput");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      location.hash = q ? "#/search?q=" + encodeURIComponent(q) : "#/";
    });
    if (input) input.addEventListener("input", VC.ui.debounce(() => {
      const q = input.value.trim();
      if (q.length >= 2) { history.replaceState(null, "", "#/search?q=" + encodeURIComponent(q)); route(); }
    }, 450));

    const fx = document.getElementById("fxToggle");
    if (fx) fx.addEventListener("click", () => VC.ui.cycleEffects());

    // brand text from config
    const bn = document.getElementById("brandName"); if (bn && CFG.SITE_NAME) bn.textContent = CFG.SITE_NAME;
    const bt = document.getElementById("brandTag"); if (bt && CFG.SITE_TAGLINE) bt.textContent = CFG.SITE_TAGLINE;
    document.title = (CFG.SITE_NAME || "Velvet") + " Cinema";

    const fm = document.getElementById("footerMode");
    if (fm) fm.textContent = VC.tmdb.isMock()
      ? "Demo mode — add your TMDB key and set MOCK:false in config.js to go live."
      : "";
  }

  /* ---------------- boot ---------------- */
  function boot() {
    VC.ui.applyEffects(VC.ui.getEffects());
    initHeader();
    window.addEventListener("hashchange", route);
    route();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
