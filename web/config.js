/* ============================================================================
 *  VELVET CINEMA — configuration
 *  ----------------------------------------------------------------------------
 *  This is the ONLY file you need to edit to host the site.
 *  It is plain JS (no build step). Change the values, save, upload.
 * ==========================================================================*/
window.CINE_CONFIG = {
  /* --------------------------------------------------------------------------
   *  1) TMDB — used for browsing, search, posters and metadata.
   *     Get a free key at https://www.themoviedb.org/settings/api
   *     (the "API Read Access Token" is NOT this — use the v3 "API Key").
   *
   *     NOTE: because this is a pure static site, this key is visible to
   *     anyone who opens the page source. That is expected for this setup.
   *     If that matters to you, restrict the key or put a proxy in front.
   * ------------------------------------------------------------------------*/
  TMDB_API_KEY: "b5a665e3a448a789570fe3f0e2df595b",

  /* --------------------------------------------------------------------------
   *  2) CinePro Core — the streaming backend (folder /cinepro in this repo).
   *     Point this at wherever you are running it. No trailing slash.
   *       local dev:   http://localhost:3000
   *       hosted:      https://cinepro.yourdomain.tld
   * ------------------------------------------------------------------------*/
  CINEPRO_BASE: "http://localhost:3000",

  /* --------------------------------------------------------------------------
   *  3) MOCK mode — set true to run the whole site with built-in demo data
   *     and a public test stream, WITHOUT a TMDB key or a running CinePro.
   *     Great for previewing the look & feel. Set false for the real thing.
   * ------------------------------------------------------------------------*/
  MOCK: false,

  /* --------------------------------------------------------------------------
   *  Cosmetic / advanced (safe to leave as-is)
   * ------------------------------------------------------------------------*/
  SITE_NAME: "VELVET",
  SITE_TAGLINE: "· CINEMA ·",

  // TMDB image sizes — kept small on purpose for low-end devices.
  IMG_BASE: "https://image.tmdb.org/t/p",
  POSTER_SIZE: "w342",   // grid posters
  BACKDROP_SIZE: "w780", // hero / detail backdrops
  STILL_SIZE: "w300",    // TV episode thumbnails

  // Default region/language for TMDB.
  TMDB_LANG: "en-US",
};
