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
- Bekerja offline setelah engine ter-cache.

## Jalankan lokal

Karena `app.js` memuat ES module dari CDN, buka lewat server lokal (bukan `file://`):

```bash
python -m http.server 8777
# lalu buka http://localhost:8777
```

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
| `DESIGN.md` | Arah desain: palet, tipografi, motion |
| `preview-logo.html` | Pratinjau logo di berbagai ukuran |

## Privasi

Foto diproses di browser dan tidak diunggah. Satu-satunya trafik keluar adalah unduhan
engine AI sekali di awal dan skrip jaringan iklan pihak ketiga (terpisah dari foto).

## Lisensi

MIT
