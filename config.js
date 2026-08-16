// AllRemover monetization config.
// Fill in your own links/IDs. Anything left as "" or the placeholder stays
// visible as an honest, clearly-labeled "belum diisi" slot (never faked).
window.ALLREMOVER_CONFIG = {
  // --- Donation (Saweria / Trakteer / Ko-fi). Paste your page URL. ---
  donate: {
    enabled: true,
    // e.g. "https://saweria.co/username" or "https://trakteer.id/username"
    url: "https://saweria.co/AllRemover",
    label: "Buy me a coffee"
  },

  // --- Ads. Pick ONE network. Adsterra is the pragmatic default: fast
  // approval, works on any domain/subdomain, decent RPM for a utility tool.
  // AdSense pays best long-term but needs an approved account + live domain. ---

  // Adsterra: create a "Banner" ad unit, copy its script src (the //...invoke.js
  // URL) and the key from the snippet. Leave blank to show an honest slot.
  // TEMPORARILY OFF: old account served adult/gambling ads. Re-enable with a
  // fresh Mainstream/Non-adult account + new Banner unit (paste key + scriptSrc).
  adsterra: {
    enabled: false,
    key: "1aaca550f057b7d50d2671cf8a18a37b",
    scriptSrc: "https://www.highperformanceformat.com/1aaca550f057b7d50d2671cf8a18a37b/invoke.js",
    width: 320,
    height: 50
  },

  // --- Google AdSense. Needs an approved account + your live domain. ---
  // Get these from your AdSense dashboard after approval.
  adsense: {
    enabled: false,
    client: "",   // e.g. "ca-pub-1234567890123456"
    slot: ""      // e.g. "1234567890"  (an ad unit's slot id)
  },

  // --- Affiliate links. Each entry is a clay tile. Leave `url` empty to show
  // an honest labeled placeholder (never a fake link); fill it once you're
  // approved into that program. Relevant picks for a photo/design audience. ---
  affiliates: [
    { title: "Photo & content gear", desc: "Ring lights, tripods, backdrops", url: "", emoji: "📸" },
    { title: "Design tools", desc: "Templates & pro editors", url: "", emoji: "🎨" },
    // Add more any time, e.g.:
    // { title: "Canva Pro", desc: "Design everything", url: "https://...", emoji: "✨" },
  ]
};
