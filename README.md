# AllRemover

> Hapus background foto **gratis, langsung di HP kamu**. Gak upload, gak daftar, gak ada server.

AllRemover adalah penghapus background yang berjalan **100% di browser**. Model AI-nya
(`@imgly/background-removal`) diunduh sekali lalu di-cache, dan setiap pemrosesan terjadi
di perangkat pengguna — foto tidak pernah dikirim ke server mana pun.

## Kenapa on-device?

| | AllRemover (on-device) | API cloud berbayar |
|---|---|---|
| Biaya per gambar | **Rp0** | Bayar per gambar |
| Biaya saat viral | **Tetap Rp0** | Naik seiring pemakaian |
| Privasi | Foto tak keluar HP | Foto diupload |
| Butuh API key | Tidak | Ya (harus dirahasiakan) |

Karena pemrosesan ditanggung perangkat pengguna, biaya operasional tetap nol berapa pun
jumlah pengunjung. Monetisasi lewat iklan + donasi, bukan lewat menombok biaya server.

## Fitur

- Hapus background satu foto, drag & drop atau ketuk.
- Download PNG transparan.
- **Pro (demo, unlock lokal):** export HD full-res, ganti warna background, proses banyak
  foto sekaligus + download ZIP, tanpa iklan.
- Bekerja **offline penuh** setelah kunjungan pertama: app shell, engine AI (esm.sh), dan
  model (staticimgly.com) semuanya di-cache oleh service worker. Sekali online buat
  ngunduh mesin, setelah itu motong background jalan tanpa internet.

## Jalankan lokal

Karena `app.js` memuat ES module dari CDN, buka lewat server lokal (bukan `file://`):

```bash
python -m http.server 8777
# lalu buka http://localhost:8777
```

## Deploy ke Vercel

Repo ini statis (tanpa build step), jadi deploy-nya instan:

1. Buka https://vercel.com → **Add New → Project**.
2. **Import** repo `bayz-dik/allremover` (login pakai GitHub).
3. Framework Preset: **Other**. Build Command: kosong. Output Directory: `.` (root).
4. **Deploy**. Selesai — dapat URL `https://allremover.vercel.app` (atau nama pilihanmu).

`vercel.json` sudah mengatur header `sw.js` (no-cache + `Service-Worker-Allowed`)
supaya PWA/offline berfungsi benar. Tiap `git push` ke `main` otomatis re-deploy.

Alternatif CLI: `npm i -g vercel && vercel --prod` dari folder ini.

## PWA (Progressive Web App)

Situs bisa dipasang seperti aplikasi ("Add to Home Screen"):

- `manifest.webmanifest` — nama, ikon (192/512/maskable), warna tema, mode standalone.
- `sw.js` — service worker: cache app shell (UI kebuka offline setelah kunjungan
  pertama) **dan** engine AI + model (esm.sh, staticimgly.com) di bucket terpisah,
  jadi motong background pun jalan offline. Bucket engine tidak ikut ke-reset saat
  app shell di-update, supaya model multi-MB tidak ke-download ulang.
- Tombol **Pasang** di header muncul otomatis di browser yang mendukung
  `beforeinstallprompt` (mis. Chrome Android/desktop). Di iOS pakai
  Safari → Share → *Add to Home Screen*.

PWA butuh HTTPS — jalan di GitHub Pages & Vercel, tidak di `file://`.


## Monetisasi

Semua diatur di `config.js` — kosong = slot placeholder yang jujur, tidak pernah iklan palsu.

- **Iklan:** default **Adsterra** (approval cepat, jalan di domain apa pun). Isi `adsterra.key`
  dan `adsterra.scriptSrc` dari ad unit "Banner" kamu. AdSense tersedia sebagai alternatif
  (`adsense.enabled`) untuk nanti saat trafik besar.
- **Donasi:** isi `donate.url` (Saweria / Trakteer / Ko-fi).
- **Affiliate:** tambahkan entri di array `affiliates`.

## Struktur

| File | Isi |
|---|---|
| `index.html` | Markup + seluruh style (claymorphic design system) |
| `app.js` | Logika remove-bg, Pro, batch, monetisasi |
| `config.js` | Konfigurasi iklan/donasi/affiliate |
| `logo.svg` | Logo (mascot blob) |
| `manifest.webmanifest` | Metadata PWA (ikon, warna, standalone) |
| `sw.js` | Service worker (cache app shell, offline) |
| `vercel.json` | Header deploy (SW + manifest) |
| `DESIGN.md` | Arah desain: palet, tipografi, motion |
| `preview-logo.html` | Pratinjau logo di berbagai ukuran |

## Privasi

Foto diproses di browser dan tidak diunggah. Satu-satunya trafik keluar adalah unduhan
engine AI + model sekali di awal (esm.sh & staticimgly.com, di-cache buat offline) dan
skrip jaringan iklan pihak ketiga (terpisah dari foto).

## Lisensi

MIT
