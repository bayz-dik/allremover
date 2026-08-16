// AllRemover, client-side background remover + honest monetization wiring.
// The AI engine runs fully in the browser: no server, no upload, no key.
import { removeBackground } from "https://esm.sh/@imgly/background-removal@1.5.5";

const CFG = window.ALLREMOVER_CONFIG || {};
const $ = (id) => document.getElementById(id);

const tray = $("tray"), fileInput = $("file"), runBtn = $("run"), resetBtn = $("reset");
const stEmpty = $("state-empty"), stLoad = $("state-loading"), stErr = $("state-error");
const bar = $("bar"), loadingMsg = $("loading-msg"), errMsg = $("error-msg");
const resultPanel = $("result-panel"), imgBefore = $("img-before"), imgAfter = $("img-after");
const cmpAfterWrap = $("cmp-after-wrap"), cmpRange = $("cmp-range");
const downloadBtn = $("download"), shareBtn = $("share");
const overlay = $("overlay"), modal = $("modal"), openPremium = $("open-premium");
const modalClose = $("modal-close");
const proControls = $("pro-controls");
const toast = $("toast"), toastMsg = $("toast-msg");
// quality + batch
const qStd = $("q-std"), qHd = $("q-hd"), qDim = $("q-dim"), qNote = $("q-note");
const batchPanel = $("batch-panel"), batchGrid = $("batch-grid"), batchRun = $("batch-run"),
      batchZip = $("batch-zip"), batchClear = $("batch-clear"), batchStatus = $("batch-status");

const FREE_MAX = 1500;   // free export capped to this longest edge
let sourceFile = null, cutoutBlob = null, cutoutURL = null, isPro = false, currentBg = "transparent";
let quality = "std";     // "std" (capped) or "hd" (full-res, Pro)
let batch = [];          // [{file, name, srcURL, cutoutBlob, cutoutURL, status}]

// ---------- states ----------
function showState(which) {
  stEmpty.hidden = which !== "empty";
  stLoad.hidden = which !== "loading";
  stErr.hidden = which !== "error";
}
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// reveal a hidden .reveal card: unhide, then add .in on the next frame so the
// transition runs. Idempotent — safe to call every time the panel is shown.
function reveal(el) {
  if (!el) return;
  el.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
}

// one-shot confetti burst on a finished cutout. CSS handles reduced-motion
// (the layer is display:none there), so bail early to skip the DOM work too.
function celebrate() {
  const layer = $("confetti");
  const mascot = document.querySelector(".mascot");
  if (mascot && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mascot.classList.remove("cheer"); void mascot.offsetWidth; mascot.classList.add("cheer");
  }
  if (!layer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#E76F51", "#2E9366", "#E9B949", "#B7E5BA", "#1F724F"];
  const n = 34;
  let html = "";
  for (let i = 0; i < n; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 180;
    const dur = 1000 + Math.random() * 500;
    const c = colors[i % colors.length];
    html += `<i style="left:${left}%;background:${c};animation-delay:${delay}ms;animation-duration:${dur}ms"></i>`;
  }
  layer.innerHTML = html;
  layer.hidden = false;
  clearTimeout(celebrate._t);
  celebrate._t = setTimeout(() => { layer.hidden = true; layer.innerHTML = ""; }, 1900);
}

// ---------- file intake (single or batch) ----------
function acceptFiles(files) {
  const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
  if (!imgs.length) { showState("error"); errMsg.textContent = "That's not an image. Try a JPG or PNG."; return; }

  if (imgs.length > 1) {
    if (!isPro) {
      // free: take the first, invite to Pro for the rest. Honest, not silent.
      acceptSingle(imgs[0]);
      openModal();
      showToast("Batches are a Pro thing");
      return;
    }
    addToBatch(imgs);
    return;
  }
  acceptSingle(imgs[0]);
}

function acceptSingle(file) {
  sourceFile = file;
  imgBefore.src = URL.createObjectURL(file);
  runBtn.disabled = false; resetBtn.disabled = false;
  showState("empty");
  stEmpty.querySelector(".msg").textContent = "Photo's ready. Hit Remove Background.";
  tray.querySelector(".big").textContent = file.name.length > 24 ? file.name.slice(0, 22) + "…" : file.name;
}

// ---------- upload wiring ----------
tray.addEventListener("click", () => fileInput.click());
tray.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener("change", (e) => { if (e.target.files.length) acceptFiles(e.target.files); });
["dragenter", "dragover"].forEach(ev => tray.addEventListener(ev, (e) => { e.preventDefault(); tray.classList.add("dragover"); }));
["dragleave", "drop"].forEach(ev => tray.addEventListener(ev, (e) => { e.preventDefault(); tray.classList.remove("dragover"); }));
tray.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) acceptFiles(e.dataTransfer.files); });

// ---------- try a sample (no upload needed) ----------
const trySample = $("try-sample");
if (trySample) trySample.addEventListener("click", async () => {
  trySample.disabled = true;
  try {
    const res = await fetch("sample.png");
    const blob = await res.blob();
    acceptSingle(new File([blob], "sample.png", { type: "image/png" }));
    showToast("Sample loaded. Hit Remove Background");
    runBtn.focus();
  } catch (e) {
    console.error(e); showToast("Couldn't load the sample");
  } finally { trySample.disabled = false; }
});

// ---------- run single ----------
runBtn.addEventListener("click", async () => {
  if (!sourceFile) return;
  runBtn.disabled = true; resetBtn.disabled = true;
  showState("loading");
  loadingMsg.textContent = "Warming up the engine (one-time download)...";
  bar.style.width = "8%";
  try {
    const blob = await removeBackground(sourceFile, {
      progress: (key, current, total) => {
        const pct = total ? Math.round((current / total) * 100) : 0;
        if (key.startsWith("fetch")) { loadingMsg.textContent = "Downloading AI engine... " + pct + "%"; bar.style.width = Math.max(8, pct * 0.6) + "%"; }
        else { loadingMsg.textContent = "Cutting out the background... " + pct + "%"; bar.style.width = (60 + pct * 0.4) + "%"; }
      }
    });
    bar.style.width = "100%";
    cutoutBlob = blob;
    if (cutoutURL) URL.revokeObjectURL(cutoutURL);
    cutoutURL = URL.createObjectURL(blob);
    currentBg = "transparent";
    await renderResult();
    await updateQualityDims();
    reveal(resultPanel);
    updateShareAvail();
    showState("empty");
    stEmpty.querySelector(".msg").textContent = "Done! Grab it below.";
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Background's gone!");
    celebrate();
  } catch (err) {
    console.error(err);
    showState("error");
    errMsg.textContent = navigator.onLine ? "Something went wrong. Try another photo or run it again." : "First run needs internet to grab the AI engine. Hop online and try again.";
  } finally { runBtn.disabled = false; resetBtn.disabled = false; }
});

async function renderResult() {
  if (currentBg === "transparent") { imgAfter.src = cutoutURL; cmpAfterWrap.classList.add("alpha"); return; }
  cmpAfterWrap.classList.remove("alpha");
  imgAfter.src = await composite(cutoutURL, currentBg, null);
}

// before/after slider: drive the --split var on the .compare wrapper
if (cmpRange) {
  const cmp = document.getElementById("compare");
  const setSplit = (v) => cmp.style.setProperty("--split", v + "%");
  cmpRange.addEventListener("input", (e) => setSplit(e.target.value));
  setSplit(cmpRange.value);
}

// Compose cutout onto a background at a target longest-edge (cap=null => full res).
// Returns a data URL (PNG).
async function composite(url, bg, cap) {
  const img = await loadImage(url);
  let w = img.naturalWidth, h = img.naturalHeight;
  if (cap && Math.max(w, h) > cap) {
    const s = cap / Math.max(w, h);
    w = Math.round(w * s); h = Math.round(h * s);
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (bg && bg !== "transparent") { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/png");
}

// show the real output dimensions for the chosen quality
async function updateQualityDims() {
  if (!cutoutURL) { qDim.textContent = ""; return; }
  const img = await loadImage(cutoutURL);
  const full = img.naturalWidth + "×" + img.naturalHeight;
  if (quality === "hd") {
    qDim.textContent = "· " + full + " px (full)";
  } else {
    let w = img.naturalWidth, h = img.naturalHeight;
    if (Math.max(w, h) > FREE_MAX) { const s = FREE_MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
    qDim.textContent = "· " + w + "×" + h + " px" + (full === (w + "×" + h) ? "" : " (dari " + full + ")");
  }
}

// ---------- quality segmented control ----------
qStd.addEventListener("click", () => setQuality("std"));
qHd.addEventListener("click", () => {
  if (!isPro) { openModal(); showToast("HD full-res kebuka di Pro"); return; }
  setQuality("hd");
});
function setQuality(q) {
  quality = q;
  qStd.classList.toggle("active", q === "std");
  qHd.classList.toggle("active", q === "hd");
  updateQualityDims();
}

// ---------- download single ----------
async function exportBlob() {
  const cap = (quality === "hd" && isPro) ? null : FREE_MAX;
  const dataURL = await composite(cutoutURL, currentBg, cap);
  const res = await fetch(dataURL);
  return res.blob();
}
downloadBtn.addEventListener("click", async () => {
  if (!cutoutBlob) return;
  const cap = (quality === "hd" && isPro) ? null : FREE_MAX;
  const outURL = await composite(cutoutURL, currentBg, cap);
  const a = document.createElement("a");
  a.href = outURL; a.download = "allremover-cutout.png"; a.click();
  showToast(quality === "hd" && isPro ? "Saved (HD)" : "Saved to your downloads");
});

// ---------- share (Web Share API, files level) ----------
// Only show the button where sharing a file actually works, so we never ship a
// dead control. Falls back to sharing the site link if file-share is missing.
function updateShareAvail() {
  const canShare = !!(navigator.canShare && navigator.share);
  shareBtn.hidden = !canShare;
}
shareBtn.addEventListener("click", async () => {
  if (!cutoutBlob) return;
  shareBtn.disabled = true;
  try {
    // exportBlob() composites from cutoutURL (the removed-bg result), never the
    // original upload — so what gets shared is always the cut-out image.
    const blob = await exportBlob();
    const file = new File([blob], "allremover-cutout.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "AllRemover", text: "Cut this out with AllRemover" });
    } else if (navigator.share) {
      await navigator.share({ title: "AllRemover", text: "Free background remover, right in your browser", url: location.href });
    }
  } catch (e) {
    if (e && e.name !== "AbortError") { console.error(e); showToast("Couldn't share"); }
  } finally { shareBtn.disabled = false; }
});

// ---------- reset ----------
resetBtn.addEventListener("click", () => {
  sourceFile = null; cutoutBlob = null;
  if (cutoutURL) { URL.revokeObjectURL(cutoutURL); cutoutURL = null; }
  fileInput.value = "";
  imgBefore.removeAttribute("src"); imgAfter.removeAttribute("src");
  resultPanel.hidden = true; resultPanel.classList.remove("in");
  runBtn.disabled = true; resetBtn.disabled = true;
  showState("empty");
  stEmpty.querySelector(".msg").textContent = "No photo yet, pick one first.";
  tray.querySelector(".big").textContent = "Tap to pick a photo";
});

// ================= BATCH (Pro) =================
function addToBatch(files) {
  files.forEach(f => {
    const item = { file: f, name: f.name.replace(/\.[^.]+$/, ""), srcURL: URL.createObjectURL(f), cutoutBlob: null, cutoutURL: null, status: "queued" };
    batch.push(item);
  });
  batchPanel.hidden = false;
  reveal(batchPanel);
  renderBatch();
  batchPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(files.length + " photos queued up");
}
function renderBatch() {
  batchGrid.innerHTML = batch.map((it, i) => {
    const src = it.cutoutURL || it.srcURL;
    const alpha = it.status === "done" ? " alpha" : "";
    const badge = it.status === "done" ? "✓ done" : it.status === "working" ? "…" : "queued";
    const spin = it.status === "working" ? `<div class="b-spin"><div class="spinner"></div></div>` : "";
    return `<div class="batch-item${alpha}" data-i="${i}"><img src="${src}" alt="${it.name}" />${spin}<span class="b-badge">${badge}</span></div>`;
  }).join("");
  const done = batch.filter(b => b.status === "done").length;
  batchZip.disabled = done === 0;
  batchStatus.textContent = batch.length ? `${done}/${batch.length} done` : "";
}
batchRun.addEventListener("click", async () => {
  if (!batch.length) return;
  batchRun.disabled = true; batchClear.disabled = true;
  for (const it of batch) {
    if (it.status === "done") continue;
    it.status = "working"; renderBatch();
    try {
      const blob = await removeBackground(it.file);
      it.cutoutBlob = blob;
      if (it.cutoutURL) URL.revokeObjectURL(it.cutoutURL);
      it.cutoutURL = URL.createObjectURL(blob);
      it.status = "done";
    } catch (e) { console.error(e); it.status = "error"; }
    renderBatch();
  }
  batchRun.disabled = false; batchClear.disabled = false;
  showToast("Queue's done!");
});
batchClear.addEventListener("click", () => {
  batch.forEach(it => { URL.revokeObjectURL(it.srcURL); if (it.cutoutURL) URL.revokeObjectURL(it.cutoutURL); });
  batch = []; batchPanel.hidden = true; batchPanel.classList.remove("in"); renderBatch();
});
batchZip.addEventListener("click", async () => {
  const done = batch.filter(b => b.status === "done" && b.cutoutBlob);
  if (!done.length) return;
  batchZip.disabled = true;
  const prev = batchZip.textContent; batchZip.textContent = "Zipping...";
  try {
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = new JSZip();
    for (const it of done) {
      // Pro batch always exports full-res transparent PNG
      const dataURL = await composite(it.cutoutURL, "transparent", null);
      const b64 = dataURL.split(",")[1];
      zip.file(it.name + "-nobg.png", b64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "allremover-batch.zip"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("ZIP saved");
  } catch (e) {
    console.error(e); showToast("Couldn't build the ZIP");
  } finally { batchZip.textContent = prev; batchZip.disabled = false; }
});

// ---------- premium modal ----------
let lastFocused = null;
function openModal() { lastFocused = document.activeElement; overlay.hidden = false; modalClose.focus(); document.addEventListener("keydown", onModalKey); }
function closeModal() { overlay.hidden = true; document.removeEventListener("keydown", onModalKey); if (lastFocused) lastFocused.focus(); }
function onModalKey(e) {
  if (e.key === "Escape") { closeModal(); return; }
  if (e.key === "Tab") {
    const list = Array.from(modal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
openPremium.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
function applyPro() {
  isPro = true; proControls.hidden = false;
  qHd.classList.remove("locked");
  qNote.textContent = "Pro's on. Pick HD for full-res export, or drop a bunch of photos in the tray at once.";
}

// ================= PRO via Firebase Auth + Firestore =================
// Free tier never touches Firebase. We only load it when the user opens the
// Pro modal (or is already signed in on a returning visit — see below). Pro
// state comes from the server-written `proUntil`, so it can't be faked client
// side and it follows the account across devices.
const proAuthBox = $("pro-auth"), proSubBox = $("pro-subscribe"), proActiveBox = $("pro-active");
const loginBtn = $("login-google"), subscribeBtn = $("subscribe");
const logoutBtn = $("logout"), logoutActiveBtn = $("logout-active");
const proAccount = $("pro-account"), proActiveMsg = $("pro-active-msg");
let currentUser = null;

function showProState(which) {
  if (proAuthBox) proAuthBox.hidden = which !== "auth";
  if (proSubBox) proSubBox.hidden = which !== "subscribe";
  if (proActiveBox) proActiveBox.hidden = which !== "active";
}

// Reflect a signed-in user + their subscription in the modal and the app.
async function refreshProForUser(user) {
  currentUser = user;
  if (!user) { showProState("auth"); return; }
  const { getProUntil } = await import("./firebase-pro.js");
  let until = null;
  try { until = await getProUntil(user.uid); } catch (e) { console.warn("Pro check failed", e); }
  if (until) {
    applyPro();
    const d = until.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    if (proActiveMsg) proActiveMsg.textContent = `Pro is active until ${d}.`;
    showProState("active");
  } else {
    if (proAccount) proAccount.textContent = `Signed in as ${user.email}`;
    showProState("subscribe");
  }
}

if (loginBtn) loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  try {
    try { localStorage.setItem("allremover_signedin", "1"); } catch (e) {}
    const { loginWithGoogle } = await import("./firebase-pro.js");
    const user = await loginWithGoogle();
    // user is null when we fell back to redirect; the page will reload and
    // completeRedirectLogin() picks it up. Otherwise it's an immediate popup login.
    if (user) await refreshProForUser(user);
  } catch (e) {
    console.error("sign-in error", e);
    showToast("Sign-in failed: " + (e && e.code ? e.code : "unknown"));
  } finally { loginBtn.disabled = false; }
});

async function doLogout() {
  try {
    const { logout } = await import("./firebase-pro.js");
    await logout();
  } catch (e) { console.error(e); }
  currentUser = null;
  showProState("auth");
  showToast("Signed out");
}
if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
if (logoutActiveBtn) logoutActiveBtn.addEventListener("click", doLogout);

// Payment wiring comes next (Midtrans). For now the subscribe button is a
// clearly-labeled placeholder so the flow is testable end-to-end without
// charging anyone.
if (subscribeBtn) subscribeBtn.addEventListener("click", () => {
  showToast("Payment coming soon");
});

// On load, if the user signed in before, Firebase restores the session. We
// check quietly WITHOUT forcing the SDK on free users: only resume if a prior
// sign-in flag is set, so first-time/free visitors stay Firebase-free.
try {
  if (localStorage.getItem("allremover_signedin") === "1") {
    import("./firebase-pro.js").then(async ({ watchAuth, completeRedirectLogin }) => {
      // finish a pending mobile redirect sign-in, if any
      await completeRedirectLogin();
      watchAuth((user) => {
        if (user) { localStorage.setItem("allremover_signedin", "1"); refreshProForUser(user); }
        else { localStorage.removeItem("allremover_signedin"); showProState("auth"); }
      });
    });
  }
} catch (e) {}

// ---------- pro background swatches ----------
document.querySelectorAll(".swatch[data-bg]").forEach(sw => sw.addEventListener("click", () => {
  document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
  sw.classList.add("active"); currentBg = sw.dataset.bg;
  if (cutoutBlob) renderResult();
}));
$("custom-bg").addEventListener("input", (e) => {
  document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
  e.target.closest(".swatch").classList.add("active"); currentBg = e.target.value;
  if (cutoutBlob) renderResult();
});

// =====================================================================
//  MONETIZATION, config-driven. Real link => real tile. Empty => honest slot.
// =====================================================================
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function isFilled(v) { return typeof v === "string" && v.trim() && !/^https:\/\/\.\.\.$/.test(v.trim()); }

function initAds() {
  const slot = $("ad-slot");
  if (isPro) { slot.remove(); return; }   // Pro = "no ads, ever"

  const at = CFG.adsterra || {}, ad = CFG.adsense || {};

  // Adsterra first: fast approval, any domain. Its invoke.js reads atOptions
  // off window, so set that before injecting the script.
  if (at.enabled && isFilled(at.key) && isFilled(at.scriptSrc)) {
    const w = at.width || 320, h = at.height || 50;
    window.atOptions = { key: at.key, format: "iframe", height: h, width: w, params: {} };
    slot.innerHTML = `<div class="ad-frame"><div class="lbl">Ad</div>
      <div id="ad-host" style="min-height:${h}px;display:grid;place-items:center"></div></div>`;
    const s = document.createElement("script");
    s.async = true; s.src = at.scriptSrc;
    $("ad-host").appendChild(s);
    return;
  }

  if (ad.enabled && isFilled(ad.client) && isFilled(ad.slot)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ad.client);
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
    slot.innerHTML = `<div class="ad-frame"><div class="lbl">Ad</div>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ad.client)}" data-ad-slot="${esc(ad.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn("AdSense not ready", e); }
    return;
  }

  if (!at.enabled && !ad.enabled) { slot.remove(); return; }
  slot.innerHTML = `<div class="ad-frame"><div class="lbl">Ad slot</div>
    <div class="placeholder-note">Ad slot ready. Fill in <code>adsterra.key</code> &amp; <code>adsterra.scriptSrc</code> in <code>config.js</code> (quick approval), or use AdSense once approved.</div></div>`;
}
function initTiles() {
  const tiles = $("tiles"); const frags = [];
  const d = CFG.donate || {};
  if (d.enabled) {
    if (isFilled(d.url)) {
      frags.push(`<a class="tile donate" href="${esc(d.url)}" target="_blank" rel="noopener">
        <span class="emoji" aria-hidden="true">☕</span>
        <span><span class="t">${esc(d.label || "Buy me a coffee")}</span><span class="d">Chip in with a donation</span></span></a>`);
    } else {
      frags.push(`<div class="tile donate placeholder">
        <span class="emoji" aria-hidden="true">☕</span>
        <span><span class="t">${esc(d.label || "Buy me a coffee")}</span><span class="d">[set <code>donate.url</code> in config.js]</span></span></div>`);
    }
  }
  const affs = Array.isArray(CFG.affiliates) ? CFG.affiliates : [];
  affs.forEach(a => {
    const emoji = esc(a.emoji || "🔗");
    const title = esc(a.title || "Partner");
    const desc = esc(a.desc || "Affiliate link");
    if (isFilled(a.url)) {
      frags.push(`<a class="tile" href="${esc(a.url)}" target="_blank" rel="sponsored noopener">
        <span class="emoji" aria-hidden="true">${emoji}</span>
        <span><span class="t">${title}</span><span class="d">${desc}</span></span></a>`);
    } else if (a.title) {
      // labeled placeholder: shows the real slot design, honestly "coming soon"
      frags.push(`<div class="tile placeholder">
        <span class="emoji" aria-hidden="true">${emoji}</span>
        <span><span class="t">${title}</span><span class="d">Coming soon</span></span></div>`);
    }
  });
  if (!affs.length) {
    frags.push(`<div class="tile placeholder">
      <span class="emoji" aria-hidden="true">🔗</span>
      <span><span class="t">Affiliate slot</span><span class="d">[add one in <code>affiliates</code> in config.js]</span></span></div>`);
  }
  tiles.innerHTML = frags.join("");
}
initAds();
initTiles();

// ---------- PWA: install prompt + service worker ----------
const installBtn = $("install");
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});
if (installBtn) installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (installBtn) installBtn.hidden = true;
  showToast("AllRemover installed!");
});
// register the service worker (offline shell). Only on https/localhost.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW failed", e));
  });
}
