#!/usr/bin/env python3
"""AllRemover promo caption generator.

Sekali jalan, keluarin banyak caption promosi siap tempel — bahasa Indonesia
DAN Inggris, format nyesuain tiap platform (X pendek + hashtag, IG caption +
emoji, TikTok hook, Telegram/Discord santai). Tinggal copy-paste ke platform
atau jadwalin di Meta Business Suite.

Pakai:
    python3 generate.py                # 12 caption campur, tampil di layar
    python3 generate.py -n 20          # 20 caption
    python3 generate.py -p ig -l id    # cuma Instagram, Indonesia
    python3 generate.py --seed 7       # hasil sama tiap kali (reproducible)
    python3 generate.py -o promo.txt   # simpan ke file

Nggak butuh dependency apa pun (stdlib only).
"""
import argparse
import random
import textwrap

URL = "https://temanbaik.web.id"

# Angle = alasan orang peduli. Tiap caption = satu angle, biar variatif.
HOOKS = {
    "id": [
        "Hapus background foto tanpa aplikasi berat.",
        "Background foto ganggu? Sekali ketuk, ilang.",
        "Foto produk kelihatan profesional dalam 3 detik.",
        "Nggak perlu Photoshop buat hapus background.",
        "Fotomu, background-nya minggat. Gratis.",
        "Bikin foto jualan makin rapi tanpa ribet.",
        "Stop bayar app buat hapus background.",
        "Background putih bersih buat marketplace? Bisa.",
    ],
    "en": [
        "Remove photo backgrounds with zero apps.",
        "Annoying background? One tap and it's gone.",
        "Pro-looking product photos in 3 seconds.",
        "No Photoshop needed to cut out backgrounds.",
        "Your photo, minus the background. Free.",
        "Clean up your shop photos, no hassle.",
        "Stop paying apps to erase backgrounds.",
        "Clean white background for your listings? Done.",
    ],
}

# Nilai jual utama — dipilih acak biar tiap post beda sudut.
VALUES = {
    "id": [
        "100% jalan di HP kamu — foto nggak diupload ke server mana pun.",
        "Gratis selamanya, tanpa daftar, tanpa watermark.",
        "Jalan offline setelah kunjungan pertama.",
        "Privasi aman: fotomu nggak pernah keluar dari HP.",
        "Nggak ada batas jumlah foto. Motong sepuasnya.",
        "Bisa dipasang kayak aplikasi (Add to Home Screen).",
    ],
    "en": [
        "Runs 100% on your phone — photos never touch a server.",
        "Free forever, no signup, no watermark.",
        "Works offline after your first visit.",
        "Private by design: your photos never leave your device.",
        "No limit on how many photos you cut out.",
        "Installs like an app (Add to Home Screen).",
    ],
}

CTA = {
    "id": ["Coba sekarang", "Langsung cobain", "Buka aja", "Gratis, cobain"],
    "en": ["Try it now", "Give it a go", "Check it out", "Free, try it"],
}

HASHTAGS = {
    "id": ["#hapusbackground", "#editfoto", "#jualanonline", "#olshop",
            "#fotoproduk", "#gratis", "#tanpaaplikasi"],
    "en": ["#removebackground", "#photoediting", "#ecommerce", "#nobg",
           "#productphotography", "#free", "#webapp"],
}

# Batas & gaya per platform. limit=None artinya nggak ada batas ketat.
PLATFORMS = {
    "x":        {"limit": 280, "tags": 2, "emoji": True,  "name": "X (Twitter)"},
    "ig":       {"limit": None, "tags": 5, "emoji": True,  "name": "Instagram"},
    "tiktok":   {"limit": 150, "tags": 4, "emoji": True,  "name": "TikTok"},
    "fb":       {"limit": None, "tags": 3, "emoji": False, "name": "Facebook"},
    "telegram": {"limit": None, "tags": 0, "emoji": True,  "name": "Telegram"},
    "discord":  {"limit": None, "tags": 0, "emoji": True,  "name": "Discord"},
}

EMOJI = ["✂️", "🪄", "📸", "✨", "🔥", "🚀", "💚"]


def make_caption(rng, platform, lang):
    """Rakit satu caption utuh untuk satu platform + bahasa."""
    cfg = PLATFORMS[platform]
    hook = rng.choice(HOOKS[lang])
    value = rng.choice(VALUES[lang])
    cta = rng.choice(CTA[lang])
    lead = (rng.choice(EMOJI) + " ") if cfg["emoji"] else ""

    body = f"{lead}{hook} {value}"
    tail = f"{cta}: {URL}"

    tags = ""
    if cfg["tags"]:
        picked = rng.sample(HASHTAGS[lang], min(cfg["tags"], len(HASHTAGS[lang])))
        tags = " ".join(picked)

    # Rakit sesuai batas. Kalau ada limit dan kepanjangan, buang value dulu,
    # lalu hashtag, sampai muat — hook + link + CTA selalu dipertahankan.
    def assemble(with_value, with_tags):
        parts = [lead + hook]
        if with_value:
            parts.append(value)
        parts.append(tail)
        text = " ".join(parts)
        if with_tags and tags:
            text += "\n" + tags
        return text

    for wv, wt in [(True, True), (True, False), (False, True), (False, False)]:
        text = assemble(wv, wt)
        if cfg["limit"] is None or len(text) <= cfg["limit"]:
            return text
    # fallback paling minimal: hook + link, dipotong keras kalau masih lebih
    text = f"{lead}{hook} {URL}"
    if cfg["limit"] and len(text) > cfg["limit"]:
        text = text[: cfg["limit"]]
    return text


def main():
    ap = argparse.ArgumentParser(description="AllRemover promo caption generator")
    ap.add_argument("-n", type=int, default=12, help="jumlah caption (default 12)")
    ap.add_argument("-p", "--platform", choices=list(PLATFORMS), default=None,
                    help="satu platform saja (default: campur semua)")
    ap.add_argument("-l", "--lang", choices=["id", "en"], default=None,
                    help="satu bahasa saja (default: campur id+en)")
    ap.add_argument("--seed", type=int, default=None,
                    help="seed biar hasil sama tiap kali")
    ap.add_argument("-o", "--out", default=None, help="simpan ke file")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    platforms = [args.platform] if args.platform else list(PLATFORMS)
    langs = [args.lang] if args.lang else ["id", "en"]

    lines = []
    for i in range(args.n):
        platform = rng.choice(platforms)
        lang = rng.choice(langs)
        caption = make_caption(rng, platform, lang)
        header = f"[{PLATFORMS[platform]['name']} · {lang.upper()}]"
        lines.append(f"{header}\n{caption}\n")

    output = ("\n" + "-" * 40 + "\n").join(lines)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Tersimpan {args.n} caption ke {args.out}")
    else:
        print(output)


# ponytail: self-check — pastikan tiap platform yang punya limit nggak pernah
# ke-generate caption over-limit, dan link selalu ikut. Jalanin: python3 generate.py --test
def _selfcheck():
    rng = random.Random(0)
    for platform, cfg in PLATFORMS.items():
        for lang in ("id", "en"):
            for _ in range(200):
                c = make_caption(rng, platform, lang)
                if cfg["limit"] is not None:
                    assert len(c) <= cfg["limit"], f"{platform} over limit: {len(c)}"
                assert URL in c, f"{platform}/{lang}: link hilang"
    print("selfcheck OK")


if __name__ == "__main__":
    import sys
    if "--test" in sys.argv:
        _selfcheck()
    else:
        main()
