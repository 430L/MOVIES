/* ============================================================================
 *  VELVET CINEMA — player (hls.js + native fallback + subtitles)
 * ==========================================================================*/
(function () {
  window.VC = window.VC || {};

  function srtToVtt(txt) {
    const body = txt
      .replace(/\r+/g, "")
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2"); // 00:00:01,000 -> 00:00:01.000
    return "WEBVTT\n\n" + body.trim() + "\n";
  }
  function ensureVtt(txt) {
    return /^﻿?WEBVTT/.test(txt.trim()) ? txt : "WEBVTT\n\n" + txt.trim() + "\n";
  }

  class Player {
    constructor(video) {
      this.video = video;
      this.hls = null;
      this.blobUrls = [];
      this.onError = null;   // (message) => void
      this.onReady = null;   // () => void
      video.crossOrigin = "anonymous";
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      this._onVideoError = () => {
        if (this.onError) this.onError("This reel won't play. Try another source below.");
      };
      video.addEventListener("error", this._onVideoError);
    }

    async load(source) {
      this._teardownStream();
      const v = this.video;
      const type = (source.type || "hls").toLowerCase();
      const url = source.url;

      if (type === "hls") {
        const nativeHls = v.canPlayType("application/vnd.apple.mpegurl");
        if (nativeHls) {
          v.src = url;
        } else if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls({
            capLevelToPlayerSize: true,   // don't fetch levels bigger than the screen
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 30,
            enableWorker: true,
            lowLatencyMode: false,
            startLevel: -1,
            fragLoadingMaxRetry: 4,
            manifestLoadingMaxRetry: 3,
          });
          this.hls = hls;
          hls.on(window.Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else if (this.onError) this.onError("Playback failed on this source. Try another below.");
          });
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => { if (this.onReady) this.onReady(); });
          hls.loadSource(url);
          hls.attachMedia(v);
        } else {
          throw new Error("Your browser can't play HLS streams.");
        }
      } else if (type === "dash") {
        throw new Error("This source is MPEG-DASH, which isn't supported. Try another source.");
      } else {
        // mp4 / mkv / webm / http progressive
        v.src = url;
      }
      if (this.hls == null && this.onReady) {
        v.addEventListener("loadedmetadata", () => this.onReady && this.onReady(), { once: true });
      }
    }

    /* Build <track> elements from CinePro subtitles. Off by default. */
    async setSubtitles(subs) {
      this._clearTracks();
      const usable = [];
      for (const s of subs || []) {
        const fmt = (s.format || "vtt").toLowerCase();
        if (fmt === "ass" || fmt === "ssa") continue; // not renderable client-side
        try {
          const res = await fetch(s.url);
          if (!res.ok) continue;
          let text = await res.text();
          text = fmt === "srt" ? srtToVtt(text) : ensureVtt(text);
          const blob = new Blob([text], { type: "text/vtt" });
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrls.push(blobUrl);
          const track = document.createElement("track");
          track.kind = "subtitles";
          track.label = s.label;
          track.srclang = (s.label || "sub").slice(0, 2).toLowerCase();
          track.src = blobUrl;
          this.video.appendChild(track);
          usable.push({ label: s.label });
        } catch { /* skip broken subtitle */ }
      }
      // ensure all start hidden
      this.hideSubtitles();
      return usable; // list actually attached, in order
    }

    showSubtitle(index) {
      const tt = this.video.textTracks;
      for (let i = 0; i < tt.length; i++) tt[i].mode = i === index ? "showing" : "disabled";
    }
    hideSubtitles() {
      const tt = this.video.textTracks;
      for (let i = 0; i < tt.length; i++) tt[i].mode = "disabled";
    }

    play() { const p = this.video.play(); if (p && p.catch) p.catch(() => {}); }

    _clearTracks() {
      this.video.querySelectorAll("track").forEach((t) => t.remove());
      this.blobUrls.forEach((u) => URL.revokeObjectURL(u));
      this.blobUrls = [];
    }
    _teardownStream() {
      if (this.hls) { try { this.hls.destroy(); } catch {} this.hls = null; }
      try { this.video.removeAttribute("src"); this.video.load(); } catch {}
    }
    destroy() {
      this._teardownStream();
      this._clearTracks();
      this.video.removeEventListener("error", this._onVideoError);
    }
  }

  window.VC.Player = Player;
})();
