// AllRemover monetization config.
// Fill in your own links/IDs. Anything left as "" or the placeholder stays
// visible as an honest, clearly-labeled "belum diisi" slot (never faked).
window.ALLREMOVER_CONFIG = {
  // --- Donation (Saweria / Trakteer / Ko-fi). Paste your page URL. ---
  donate: {
    enabled: true,
    // e.g. "https://saweria.co/username" or "https://trakteer.id/username"
    url: "",
    label: "Traktir kopi"
  },

  // --- Ads. Pick ONE network. Adsterra is the pragmatic default: fast
  // approval, works on any domain/subdomain, decent RPM for a utility tool.
  // AdSense pays best long-term but needs an approved account + live domain. ---

  // Adsterra: create a "Banner" ad unit, copy its script src (the //...invoke.js
  // URL) and the key from the snippet. Leave blank to show an honest slot.
  adsterra: {
    enabled: true,
    key: "",                 // e.g. "abcd1234ef..."  (the atOptions 'key')
    scriptSrc: "",           // e.g. "//pl123456.effectiveratecpm.com/abcd.../invoke.js"
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

  // --- Affiliate links. Add as many as you want; each becomes a clay tile. ---
  affiliates: [
    // { title: "Canva Pro", desc: "Desain lanjutan", url: "https://...", emoji: "🎨" },
    // { title: "Hosting murah", desc: "Buat website kamu", url: "https://...", emoji: "🚀" },
  ]
};
