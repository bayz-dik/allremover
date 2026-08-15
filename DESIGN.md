---
name: AllRemover
description: Playful claymorphic background remover. Chunky soft-clay controls, one coral accent, a friendly cut-out mascot.
colors:
  primary: "#1F724F"
  primary-bright: "#2E9366"
  mint: "#B7E5BA"
  mint-soft: "#DBEFE1"
  cream: "#F2FBF3"
  ink: "#12352A"
  muted: "#3F6B57"
  accent: "#E76F51"
  accent-ink: "#5A1E12"
  clay-light: "#FFFFFF"
  clay-dark: "#B7D8C2"
  on-primary: "#FFFFFF"
  gold: "#E9B949"
  gold-ink: "#3A2A00"
  danger: "#B23A2A"
  success: "#1F724F"
typography:
  display:
    fontFamily: -apple-system, SF Pro Rounded
    fontSize: 2.75rem
    fontWeight: 800
    letterSpacing: -0.03em
  h2:
    fontFamily: -apple-system, SF Pro Rounded
    fontSize: 1.35rem
    fontWeight: 700
    letterSpacing: -0.01em
  body:
    fontFamily: -apple-system, SF Pro Text
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: -apple-system, SF Pro Rounded
    fontSize: 0.9rem
    fontWeight: 700
rounded:
  sm: 16px
  md: 26px
  lg: 40px
  blob: 60px
  pill: 999px
spacing:
  xs: 8px
  sm: 14px
  md: 22px
  lg: 36px
  xl: 56px
components:
  clay-card:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.lg}"
    padding: 32px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: 16px
  button-clay:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: 16px
  button-donate:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: 16px
  chip-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.pill}"
    padding: 8px
---

## Overview

AllRemover is a background remover that feels like a squishy toy, not a control
panel. The single, specific reference: **soft-clay / Play-Doh objects photographed
on a bright surface**. Everything looks moulded and rounded, with a light coming
from the top-left, colored soft shadows (never grey), and one springy accent. The
old grey neumorphic version read as slop precisely because grey soft-UI is the AI
default; the fix is not more effects, it is a real, specific material world with
color and character.

The mascot is a friendly rounded blob getting lifted cleanly out of a scene, which
is literally what the product does. It shows up in the logo, the empty state, and
the success moment. That repeated character is the identity motif.

Three material languages, each with a job (kept from the brief, but re-cast in clay):

- **Claymorphism** is the base: chunky mint/green clay cards and buttons with
  colored soft shadows and a top-left sheen. This is the whole personality.
- **Glassmorphism** is used only for things that float above the clay: the premium
  modal and the toast. Frosted, tinted green, not on the base cards.
- **Skeuomorphism** is the dose that sells it: the drop zone is a real tray with a
  transparency-checker interior, the primary button squishes when pressed, the
  premium plan carries a gold seal.

Audience: casual users, mostly on phones. Tone: santai, sedikit kata, ramah.
Dial: ENERGY 3 / RHYTHM 2 / MOTION 2. This is a "nagih", bouncy tool, so it is
allowed to move and to have personality, unlike a public-service page.

## Colors

A green clay world with a single coral accent and a gold reserved for premium.

- **Cream (#F2FBF3):** the surface everything sits on, a warm minty off-white.
- **Mint (#B7E5BA) and Mint-soft (#DBEFE1):** the clay fills for idle buttons and
  cards. Ink on mint is 9.5:1.
- **Primary (#1F724F) and Primary-bright (#2E9366):** deep clay green for the main
  action and headings. White on primary is 5.87:1.
- **Ink (#12352A):** near-black forest green for text. 8.66:1 on cream.
- **Muted (#3F6B57):** secondary text, 5.76:1 on cream.
- **Accent (#E76F51):** coral, the ONE springy accent. It appears on the donate
  button, the logo spark, and active states, and nowhere else. Used with white on
  large text / icons (3.09:1, large only) or with accent-ink on light coral fills.
- **Gold (#E9B949) / gold-ink (#3A2A00):** premium only.
- **Clay-light (#FFFFFF) / clay-dark (#B7D8C2):** the two clay shadows. The dark
  shadow is a green-grey, never neutral grey. That is what keeps it warm, not slop.

## Typography

System font, rounded variant first (SF Pro Rounded on Apple → renders on iPhone as
asked). Rounded type matches the clay world; the round terminals echo the moulded
shapes. Body uses SF Pro Text for readability.

- **Display (2.75rem, 800, -0.03em):** the AllRemover wordmark and hero line.
- **H2 (1.35rem, 700):** section labels.
- **Body (1rem, 1.55):** instructions.
- **Label (0.9rem, 700):** buttons and chips, rounded and confident.

## Layout

Single centered column, ~600px. Rhythm varies (RHYTHM 2): a big playful hero with
the mascot, a tight tool card, then a monetization strip that looks like a shelf of
clay tiles. On phones everything stacks; previews go side-by-side on wider screens.

## Elevation & Depth

Colored clay depth, not grey neumorphism:

- **Raised** (cards, idle buttons): soft shadow uses clay-dark green
  (18px 18px 30px #B7D8C2) + light top-left (-18px -18px 30px #FFFFFF), plus a
  subtle inner top highlight so it looks moulded, not flat.
- **Pressed** (active button, tray interior): shadows move inset and the button
  scales to 0.96 with a springy easing, like pressing dough.
- **Floating** (modal, toast): real cast shadow + green-tinted backdrop blur.

MOTION 2: press-squish on buttons, a gentle mascot bob on the empty state (respects
prefers-reduced-motion), scroll-reveal on the result. No endless glow loops.

## Shapes

Big, soft, moulded. blob (60px) for the hero mascot container, lg (40) for cards,
pill for buttons, md (26) for previews, sm (16) for chips. Radius varies by role so
it is not "everything is a pill".

## Components

- **clay-card:** the cream base card, raised with colored shadow.
- **button-primary:** deep-green squishy primary key.
- **button-clay:** mint idle buttons (download, reset, secondary).
- **button-donate:** coral donate button, the only coral button.
- **chip-gold:** the PRO marker.

## Do's and Don'ts

- **Do** keep shadows colored (green-grey + white). A neutral grey shadow instantly
  turns this back into slop.
- **Do** keep the mascot present and consistent: logo, empty state, success.
- **Do** keep coral for exactly one job (donate + spark + active), gold for premium
  only. One deliberate accent each.
- **Do** let buttons squish and the mascot bob. Personality is the point here.
- **Do** label monetization honestly: real link or an explicit "[isi link]"
  placeholder. Never fake an ad or a sponsor.
- **Don't** use grey. Anywhere structural. The world is green clay.
- **Don't** put glass on the base cards. Glass floats above only.
- **Don't** stack template animations (fade+float+scale+bounce on everything). Motion
  is choreographed to press, reveal, and the mascot only.
- **Don't** invent stats, testimonials, sponsor logos, or compliance badges.
- **Don't** claim the premium is paid: it is an honest on-device demo unlock.
