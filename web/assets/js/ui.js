/* ============================================================================
 *  VELVET CINEMA — shared UI helpers (no framework)
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};
  const CFG = window.CINE_CONFIG || {};

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, props = {}, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    if (children != null) append(node, children);
    return node;
  }
  function append(parent, child) {
    if (child == null) return;
    if (Array.isArray(child)) child.forEach((c) => append(parent, c));
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- images ---------- */
  function imgUrl(path, size) {
    if (!path) return null;
    if (/^https?:|^data:/.test(path)) return path;
    return `${CFG.IMG_BASE}/${size}${path}`;
  }

  // Deterministic velvet SVG placeholder (used for missing art & mock mode).
  function placeholder(title, kind = "poster") {
    const w = kind === "poster" ? 342 : 780;
    const h = kind === "poster" ? 513 : 439;
    const initials = String(title || "?").trim().slice(0, 1).toUpperCase();
    const hue = 355; // velvet red
    const seed = hashStr(title || "x");
    const rot = seed % 20 - 10;
    const svg =
`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='hsl(${hue} 60% 16%)'/>
      <stop offset='1' stop-color='hsl(${hue} 70% 7%)'/>
    </linearGradient>
    <pattern id='folds' width='16' height='16' patternUnits='userSpaceOnUse' patternTransform='rotate(90)'>
      <rect width='16' height='16' fill='hsl(${hue} 60% 12%)'/>
      <rect width='7' height='16' fill='hsl(${hue} 62% 15%)'/>
    </pattern>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)'/>
  <rect width='100%' height='100%' fill='url(#folds)' opacity='0.35'/>
  <rect x='10' y='10' width='${w - 20}' height='${h - 20}' fill='none' stroke='%23d4af37' stroke-opacity='0.55' stroke-width='2' rx='6'/>
  <g transform='translate(${w / 2} ${h / 2 - 30}) rotate(${rot})' fill='none' stroke='%23d4af37' stroke-opacity='0.7' stroke-width='4'>
    <circle r='34'/><circle r='9'/>
    <circle cx='0' cy='-20' r='6'/><circle cx='19' cy='9' r='6'/><circle cx='-19' cy='9' r='6'/>
  </g>
  <text x='50%' y='${h / 2 + 46}' text-anchor='middle' fill='%23f6ead2' font-family='Georgia,serif' font-size='${kind === "poster" ? 34 : 52}' font-weight='700'>${escapeHtml(initials)}</text>
  <text x='50%' y='${h - 40}' text-anchor='middle' fill='%23cbb78e' font-family='Georgia,serif' font-size='16'>${escapeHtml(clip(title, kind === "poster" ? 26 : 60))}</text>
</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\n\s*/g, " "));
  }
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function clip(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- misc ---------- */
  function debounce(fn, ms) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  let toastTimer;
  function toast(msg, ms = 2600) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" }); }

  /* ---------- states ---------- */
  function stateBlock({ glyph = "❖", title = "", note = "" } = {}) {
    return el("div", { class: "state" }, [
      el("div", { class: "state__glyph", "aria-hidden": "true", text: glyph }),
      title ? el("div", { class: "state__title", text: title }) : null,
      note ? el("p", { class: "muted", text: note }) : null,
    ]);
  }
  function skeletonGrid(n = 12) {
    const grid = el("div", { class: "grid" });
    for (let i = 0; i < n; i++) grid.appendChild(el("div", { class: "sk-card skeleton" }));
    return grid;
  }

  /* ---------- effects level manager ---------- */
  const EFFECTS = ["full", "lite", "off"];
  function detectDefaultEffects() {
    try {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return "off";
      const mem = navigator.deviceMemory || 8;
      const cores = navigator.hardwareConcurrency || 8;
      if (mem <= 4 || cores <= 2) return "lite";
    } catch {}
    return "full";
  }
  function getEffects() {
    return store.get("vc:effects", null) || detectDefaultEffects();
  }
  function applyEffects(level) {
    if (!EFFECTS.includes(level)) level = "full";
    document.body.dataset.effects = level;
    store.set("vc:effects", level);
    const lbl = $("#fxLabel"); if (lbl) lbl.textContent = level.toUpperCase();
    const btn = $("#fxToggle"); if (btn) btn.setAttribute("aria-label", "Cinema effects: " + level);
    window.dispatchEvent(new CustomEvent("vc:effects", { detail: level }));
  }
  function cycleEffects() {
    const cur = document.body.dataset.effects || "full";
    applyEffects(EFFECTS[(EFFECTS.indexOf(cur) + 1) % EFFECTS.length]);
    toast("Cinema effects: " + document.body.dataset.effects.toUpperCase());
  }

  window.VC.ui = {
    $, $$, el, append, clear, escapeHtml, imgUrl, placeholder, debounce, store,
    toast, scrollTop, stateBlock, skeletonGrid,
    getEffects, applyEffects, cycleEffects,
  };
})();
