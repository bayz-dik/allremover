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
const downloadBtn = $("download");
const overlay = $("overlay"), modal = $("modal"), openPremium = $("open-premium");
const modalClose = $("modal-close"), unlockBtn = $("unlock");
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

// ---------- file intake (single or batch) ----------
function acceptFiles(files) {
  const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
  if (!imgs.length) { showState("error"); errMsg.textContent = "Filenya bukan gambar. Coba JPG atau PNG."; return; }

  if (imgs.length > 1) {
    if (!isPro) {
      // free: take the first, invite to Pro for the rest. Honest, not silent.
      acceptSingle(imgs[0]);
      openModal();
      showToast("Banyak foto sekaligus itu fitur Pro");
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
  stEmpty.querySelector(".msg").textContent = "Foto siap. Tekan Hapus Background.";
  tray.querySelector(".big").textContent = file.name.length > 24 ? file.name.slice(0, 22) + "…" : file.name;
}

// ---------- upload wiring ----------
tray.addEventListener("click", () => fileInput.click());
tray.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener("change", (e) => { if (e.target.files.length) acceptFiles(e.target.files); });
["dragenter", "dragover"].forEach(ev => tray.addEventListener(ev, (e) => { e.preventDefault(); tray.classList.add("dragover"); }));
["dragleave", "drop"].forEach(ev => tray.addEventListener(ev, (e) => { e.preventDefault(); tray.classList.remove("dragover"); }));
tray.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) acceptFiles(e.dataTransfer.files); });

// ---------- run single ----------
runBtn.addEventListener("click", async () => {
  if (!sourceFile) return;
  runBtn.disabled = true; resetBtn.disabled = true;
  showState("loading");
  loadingMsg.textContent = "Nyiapin mesin (sekali download aja)...";
  bar.style.width = "8%";
  try {
    const blob = await removeBackground(sourceFile, {
      progress: (key, current, total) => {
        const pct = total ? Math.round((current / total) * 100) : 0;
        if (key.startsWith("fetch")) { loadingMsg.textContent = "Download mesin AI... " + pct + "%"; bar.style.width = Math.max(8, pct * 0.6) + "%"; }
        else { loadingMsg.textContent = "Motong background... " + pct + "%"; bar.style.width = (60 + pct * 0.4) + "%"; }
      }
    });
    bar.style.width = "100%";
    cutoutBlob = blob;
    if (cutoutURL) URL.revokeObjectURL(cutoutURL);
    cutoutURL = URL.createObjectURL(blob);
    currentBg = "transparent";
    await renderResult();
    await updateQualityDims();
    resultPanel.hidden = false;
    showState("empty");
    stEmpty.querySelector(".msg").textContent = "Jadi! Download di bawah.";
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Background kebuang!");
  } catch (err) {
    console.error(err);
    showState("error");
    errMsg.textContent = navigator.onLine ? "Gagal proses. Coba foto lain atau ulangi." : "Butuh internet buat download mesin AI pertama kali. Sambungin dulu ya.";
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
downloadBtn.addEventListener("click", async () => {
  if (!cutoutBlob) return;
  const cap = (quality === "hd" && isPro) ? null : FREE_MAX;
  const outURL = await composite(cutoutURL, currentBg, cap);
  const a = document.createElement("a");
  a.href = outURL; a.download = "allremover-cutout.png"; a.click();
  showToast(quality === "hd" && isPro ? "Kesimpen (HD)" : "Kesimpen ke Download");
});

// ---------- reset ----------
resetBtn.addEventListener("click", () => {
  sourceFile = null; cutoutBlob = null;
  if (cutoutURL) { URL.revokeObjectURL(cutoutURL); cutoutURL = null; }
  fileInput.value = "";
  imgBefore.removeAttribute("src"); imgAfter.removeAttribute("src");
  resultPanel.hidden = true;
  runBtn.disabled = true; resetBtn.disabled = true;
  showState("empty");
  stEmpty.querySelector(".msg").textContent = "Belum ada foto, pilih dulu ya.";
  tray.querySelector(".big").textContent = "Ketuk buat pilih foto";
});

// ================= BATCH (Pro) =================
function addToBatch(files) {
  files.forEach(f => {
    const item = { file: f, name: f.name.replace(/\.[^.]+$/, ""), srcURL: URL.createObjectURL(f), cutoutBlob: null, cutoutURL: null, status: "queued" };
    batch.push(item);
  });
  batchPanel.hidden = false;
  renderBatch();
  batchPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(files.length + " foto masuk antrian");
}
function renderBatch() {
  batchGrid.innerHTML = batch.map((it, i) => {
    const src = it.cutoutURL || it.srcURL;
    const alpha = it.status === "done" ? " alpha" : "";
    const badge = it.status === "done" ? "✓ jadi" : it.status === "working" ? "…" : "antri";
    const spin = it.status === "working" ? `<div class="b-spin"><div class="spinner"></div></div>` : "";
    return `<div class="batch-item${alpha}" data-i="${i}"><img src="${src}" alt="${it.name}" />${spin}<span class="b-badge">${badge}</span></div>`;
  }).join("");
  const done = batch.filter(b => b.status === "done").length;
  batchZip.disabled = done === 0;
  batchStatus.textContent = batch.length ? `${done}/${batch.length} selesai` : "";
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
  showToast("Antrian beres!");
});
batchClear.addEventListener("click", () => {
  batch.forEach(it => { URL.revokeObjectURL(it.srcURL); if (it.cutoutURL) URL.revokeObjectURL(it.cutoutURL); });
  batch = []; batchPanel.hidden = true; renderBatch();
});
batchZip.addEventListener("click", async () => {
  const done = batch.filter(b => b.status === "done" && b.cutoutBlob);
  if (!done.length) return;
  batchZip.disabled = true;
  const prev = batchZip.textContent; batchZip.textContent = "Nyiapin ZIP...";
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
    showToast("ZIP kesimpen");
  } catch (e) {
    console.error(e); showToast("Gagal bikin ZIP");
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
  qNote.textContent = "Pro aktif. Pilih HD buat export full-res, atau taruh banyak foto sekaligus di tray.";
}
// Persist the demo unlock so a reload doesn't silently drop Pro (the modal
// promises "buat kamu coba di perangkat ini"). localStorage may throw in
// private mode, so guard it.
try { if (localStorage.getItem("allremover_pro") === "1") applyPro(); } catch (e) {}
unlockBtn.addEventListener("click", () => {
  applyPro();
  try { localStorage.setItem("allremover_pro", "1"); } catch (e) {}
  closeModal();
  showToast("Fitur Pro kebuka (demo)");
  if (!resultPanel.hidden) proControls.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

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
  if (isPro) { slot.remove(); return; }   // Pro = "tanpa iklan, selamanya"

  const at = CFG.adsterra || {}, ad = CFG.adsense || {};

  // Adsterra first: fast approval, any domain. Its invoke.js reads atOptions
  // off window, so set that before injecting the script.
  if (at.enabled && isFilled(at.key) && isFilled(at.scriptSrc)) {
    const w = at.width || 320, h = at.height || 50;
    window.atOptions = { key: at.key, format: "iframe", height: h, width: w, params: {} };
    slot.innerHTML = `<div class="ad-frame"><div class="lbl">Iklan</div>
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
    slot.innerHTML = `<div class="ad-frame"><div class="lbl">Iklan</div>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ad.client)}" data-ad-slot="${esc(ad.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn("AdSense not ready", e); }
    return;
  }

  if (!at.enabled && !ad.enabled) { slot.remove(); return; }
  slot.innerHTML = `<div class="ad-frame"><div class="lbl">Slot Iklan</div>
    <div class="placeholder-note">Slot iklan siap. Isi <code>adsterra.key</code> &amp; <code>adsterra.scriptSrc</code> di <code>config.js</code> (approval cepat), atau pakai AdSense setelah di-approve.</div></div>`;
}
function initTiles() {
  const tiles = $("tiles"); const frags = [];
  const d = CFG.donate || {};
  if (d.enabled) {
    if (isFilled(d.url)) {
      frags.push(`<a class="tile donate" href="${esc(d.url)}" target="_blank" rel="noopener">
        <span class="emoji" aria-hidden="true">☕</span>
        <span><span class="t">${esc(d.label || "Traktir kopi")}</span><span class="d">Dukung lewat donasi</span></span></a>`);
    } else {
      frags.push(`<div class="tile donate placeholder">
        <span class="emoji" aria-hidden="true">☕</span>
        <span><span class="t">${esc(d.label || "Traktir kopi")}</span><span class="d">[isi <code>donate.url</code> di config.js]</span></span></div>`);
    }
  }
  const affs = Array.isArray(CFG.affiliates) ? CFG.affiliates : [];
  affs.forEach(a => {
    if (isFilled(a.url)) {
      frags.push(`<a class="tile" href="${esc(a.url)}" target="_blank" rel="sponsored noopener">
        <span class="emoji" aria-hidden="true">${esc(a.emoji || "🔗")}</span>
        <span><span class="t">${esc(a.title || "Partner")}</span><span class="d">${esc(a.desc || "Link affiliate")}</span></span></a>`);
    }
  });
  if (!affs.some(a => isFilled(a.url))) {
    frags.push(`<div class="tile placeholder">
      <span class="emoji" aria-hidden="true">🔗</span>
      <span><span class="t">Slot Affiliate</span><span class="d">[tambah di <code>affiliates</code> config.js]</span></span></div>`);
  }
  tiles.innerHTML = frags.join("");
}
initAds();
initTiles();
