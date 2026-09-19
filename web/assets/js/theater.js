/* ============================================================================
 *  VELVET CINEMA — the theater
 *  Builds the auditorium, runs the show (load -> curtains part -> film-leader
 *  countdown -> feature), and gives clean fullscreen. Overlaid on everything.
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};
  const { el, clear } = VC.ui;

  let state = null; // { root, player, ctx, ranked, subs, timers:[] }

  function effects() { return document.body.dataset.effects || "full"; }

  function statusBlock({ title, note, spinner = false, actions = [] }) {
    return el("div", { class: "screen__status" }, [
      spinner ? el("div", { class: "reel", "aria-hidden": "true" }) : el("div", { class: "state__glyph", text: "⚠" }),
      el("div", { class: "state__title", text: title }),
      note ? el("p", { class: "muted", text: note }) : null,
      actions.length ? el("div", { class: "center-row" }, actions) : null,
    ]);
  }

  function build(ctx) {
    const marqueeLabel = ctx.type === "tv"
      ? `NOW SHOWING · S${ctx.season} E${ctx.episode}`
      : "NOW SHOWING";

    const video = el("video", { class: "screen__video", tabindex: "-1" });

    const screen = el("div", { class: "screen screen--idle" }, [
      video,
      el("div", { class: "fx fx-vignette" }),
      el("div", { class: "fx fx-grain" }),
      el("div", { class: "fx fx-flicker" }),
      el("div", { class: "fx fx-dust" }),
      el("div", { class: "countdown is-done" }, [
        el("div", { class: "leader" }, [
          el("div", { class: "leader__ring" }),
          el("div", { class: "leader__cross" }),
          el("div", { class: "leader__sweep" }),
          el("div", { class: "leader__num", text: "" }),
        ]),
        el("div", { class: "fx fx-grain" }),
      ]),
    ]);

    const curtains = el("div", { class: "curtains" }, [
      el("div", { class: "curtain curtain--left" }),
      el("div", { class: "curtain curtain--right" }),
      el("div", { class: "curtain-marquee" }, [
        el("div", { class: "curtain-marquee__frame" }, [
          el("div", { class: "curtain-marquee__lamp", text: marqueeLabel }),
          el("div", { class: "curtain-marquee__title", text: ctx.title || "Feature Presentation" }),
          el("div", { class: "curtain-marquee__lamp", text: "✦ ✦ ✦" }),
        ]),
      ]),
    ]);

    const frame = el("div", { class: "screen-frame" }, [screen, curtains]);

    // ---- control bar ----
    const srcSel = el("select", { class: "tsel", id: "srcSel", "aria-label": "Source & quality" });
    const subSel = el("select", { class: "tsel", id: "subSel", "aria-label": "Subtitles" });

    const bar = el("div", { class: "theater__bar" }, [
      el("button", { class: "tctl", type: "button", title: "Exit theater",
        onclick: exitToDetail }, ["✕ EXIT"]),
      el("div", { class: "theater__title", text: ctx.title || "" }),
      el("label", { class: "tctl", style: "gap:8px" }, ["REEL", srcSel]),
      el("label", { class: "tctl", style: "gap:8px" }, ["SUBS", subSel]),
      el("button", { class: "tctl", type: "button", title: "Cinema effects",
        onclick: () => VC.ui.cycleEffects() }, ["✷ FX"]),
      el("button", { class: "tctl", type: "button", title: "Fullscreen",
        onclick: goFullscreen }, ["⛶ FULL"]),
    ]);

    const root = el("div", { class: "theater", id: "theaterRoot" }, [
      el("div", { class: "theater__stage" }, [frame, el("div", { class: "theater__seats" })]),
      bar,
    ]);

    return { root, screen, video, srcSel, subSel, curtainsOpenTarget: root };
  }

  function goFullscreen() {
    if (!state) return;
    const v = state.video;
    try {
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS
      else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
      else VC.ui.toast("Fullscreen isn't available here.");
    } catch { VC.ui.toast("Fullscreen isn't available here."); }
  }

  function exitToDetail() {
    if (!state) { location.hash = "#/"; return; }
    const c = state.ctx;
    location.hash = c.type === "tv" ? `#/tv/${c.id}` : `#/movie/${c.id}`;
  }

  function delay(ms) { return new Promise((r) => { const t = setTimeout(r, ms); state && state.timers.push(t); }); }

  async function runCountdown() {
    const lvl = effects();
    if (lvl === "off") return;
    const from = lvl === "lite" ? 3 : 5;
    const dur = lvl === "lite" ? 550 : 850;
    const cd = state.screen.querySelector(".countdown");
    const num = cd.querySelector(".leader__num");
    cd.classList.remove("is-done");
    for (let n = from; n >= 1; n--) {
      num.textContent = String(n);
      await delay(dur);
      if (!state) return; // theater closed mid-countdown
    }
    cd.classList.add("is-done");
  }

  function fillSourceSelect() {
    const sel = state.srcSel; clear(sel);
    state.ranked.forEach((s, i) => {
      const q = (s.quality || "unknown").toUpperCase();
      const label = `${q} · ${s.provider && s.provider.name ? s.provider.name : "Source " + (i + 1)}`;
      sel.appendChild(el("option", { value: String(i), text: label }));
    });
    sel.onchange = () => switchSource(Number(sel.value));
  }

  function fillSubSelect(usable) {
    const sel = state.subSel; clear(sel);
    sel.appendChild(el("option", { value: "off", text: "Off" }));
    usable.forEach((s, i) => sel.appendChild(el("option", { value: String(i), text: s.label })));
    sel.onchange = () => {
      if (sel.value === "off") state.player.hideSubtitles();
      else state.player.showSubtitle(Number(sel.value));
    };
    sel.disabled = usable.length === 0;
    if (usable.length === 0) sel.appendChild(el("option", { value: "off", text: "None available" }));
  }

  function showStatus(node) {
    hideStatus();
    state._status = node;
    state.screen.appendChild(node);
  }
  function hideStatus() {
    if (state && state._status && state._status.parentNode) state._status.remove();
    if (state) state._status = null;
  }

  async function switchSource(index, { withCountdown = false } = {}) {
    if (!state) return;
    const source = state.ranked[index];
    if (!source) return;
    showStatus(statusBlock({ title: "Switching reels…", spinner: true }));
    state.player.onReady = () => {
      hideStatus();
      state.player.play();
    };
    state.player.onError = onPlaybackError;
    try {
      await state.player.load(source);
      if (withCountdown) { await runCountdown(); }
    } catch (e) {
      onPlaybackError(e.message || "This source won't play.");
    }
  }

  function onPlaybackError(msg) {
    if (!state) return;
    showStatus(statusBlock({
      title: "The reel jammed",
      note: msg || "That source didn't play.",
      actions: [
        el("button", { class: "btn btn--gold", onclick: () => switchSource(Number(state.srcSel.value)) }, ["Retry"]),
        state.ranked.length > 1
          ? el("button", { class: "btn btn--ghost", onclick: nextSource }, ["Try next source"])
          : null,
      ].filter(Boolean),
    }));
  }
  function nextSource() {
    const cur = Number(state.srcSel.value);
    const next = (cur + 1) % state.ranked.length;
    state.srcSel.value = String(next);
    switchSource(next);
  }

  async function open(ctx) {
    close(); // ensure clean slate
    const dom = build(ctx);
    state = { root: dom.root, screen: dom.screen, video: dom.video, srcSel: dom.srcSel,
              subSel: dom.subSel, ctx, ranked: [], subs: [], timers: [], player: null, _status: null };

    document.body.appendChild(dom.root);
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    showStatus(statusBlock({ title: "Threading the projector…",
      note: VC.cinepro.isMock() ? "Demo mode — playing a sample reel." : "Finding the best source for you.",
      spinner: true }));

    // Fetch sources from CinePro
    let data;
    try {
      data = ctx.type === "tv"
        ? await VC.cinepro.episode(ctx.id, ctx.season, ctx.episode)
        : await VC.cinepro.movie(ctx.id);
    } catch (e) {
      if (!state) return;
      showStatus(statusBlock({
        title: "The reel jammed",
        note: e.message || "Couldn't reach the projection booth.",
        actions: [
          el("button", { class: "btn btn--gold", onclick: () => open(ctx) }, ["Try again"]),
          el("button", { class: "btn btn--ghost", onclick: exitToDetail }, ["Back"]),
        ],
      }));
      return;
    }
    if (!state) return;

    const ranked = VC.cinepro.rank(data.sources || []);
    if (ranked.length === 0) {
      showStatus(statusBlock({
        title: "No reels in the vault",
        note: "CinePro found no playable sources for this title. It may not be available yet.",
        actions: [ el("button", { class: "btn btn--ghost", onclick: exitToDetail }, ["Back"]) ],
      }));
      return;
    }
    state.ranked = ranked;
    state.subs = data.subtitles || [];

    // Build player
    const player = new VC.Player(dom.video);
    state.player = player;
    dom.video.controls = true;
    player.onError = onPlaybackError;
    player.onReady = () => { hideStatus(); };

    fillSourceSelect();

    try {
      await player.load(ranked[0]);
    } catch (e) {
      onPlaybackError(e.message);
    }
    if (!state) return;

    // Subtitles (async; safe if it fails)
    let usable = [];
    try { usable = await player.setSubtitles(state.subs); } catch {}
    if (!state) return;
    fillSubSelect(usable);

    hideStatus();
    dom.screen.classList.remove("screen--idle");

    // Part the curtains, roll the leader, then the feature.
    state.root.classList.add("is-open");
    await runCountdown();
    if (!state) return;
    player.play();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      // let native fullscreen handle its own Esc first
      if (document.fullscreenElement) return;
      exitToDetail();
    }
  }

  function close() {
    if (!state) return;
    state.timers.forEach(clearTimeout);
    try { state.player && state.player.destroy(); } catch {}
    if (state.root && state.root.parentNode) state.root.remove();
    document.removeEventListener("keydown", onKey);
    document.documentElement.style.overflow = "";
    state = null;
  }

  window.VC.theater = { open, close, isOpen: () => !!state };
})();
